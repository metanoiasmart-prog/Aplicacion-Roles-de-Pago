import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Empleado, HistoricoSueldo, HistoricoLaboral } from "@/types/nomina";

interface EmpleadoDetailDialogProps {
  empleado: Empleado | null;
  open: boolean;
  onClose: () => void;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const formatDate = (dateStr: string) => {
  // Parsear la fecha correctamente evitando problemas de zona horaria
  // Al usar split y crear la fecha con componentes, se evita el desfase de UTC
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-EC", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// Calcula días trabajados acumulados de todos los periodos
const calcularDiasTrabajadosAcumulados = (empleado: Empleado): number => {
  let diasTotales = 0;
  const hoy = new Date();

  if (empleado.historicoLaboral && empleado.historicoLaboral.length > 0) {
    for (const periodo of empleado.historicoLaboral) {
      const inicio = new Date(periodo.fechaIngreso);
      const fin = periodo.fechaSalida ? new Date(periodo.fechaSalida) : null;
      if (fin) {
        const dias = Math.floor((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
        diasTotales += Math.max(0, dias);
      }
    }
  }

  if (empleado.activo && !empleado.fechaSalida) {
    const fechaIngreso = new Date(empleado.fechaIngreso);
    const diasPeriodoActual = Math.floor((hoy.getTime() - fechaIngreso.getTime()) / (1000 * 60 * 60 * 24));
    diasTotales += Math.max(0, diasPeriodoActual);
  }

  return Math.max(0, diasTotales);
};

export default function EmpleadoDetailDialog({ empleado, open, onClose }: EmpleadoDetailDialogProps) {
  if (!empleado) return null;

  const diasTrabajadosTotal = calcularDiasTrabajadosAcumulados(empleado);
  const cumpleFDR = diasTrabajadosTotal > 365;

  // Construir lista de periodos para visualización correcta
  const periodosLaborales: { fechaIngreso: string; fechaSalida?: string; esActual: boolean }[] = [];
  
  // Agregar periodos históricos (cerrados)
  if (empleado.historicoLaboral && empleado.historicoLaboral.length > 0) {
    empleado.historicoLaboral.forEach(periodo => {
      periodosLaborales.push({
        fechaIngreso: periodo.fechaIngreso,
        fechaSalida: periodo.fechaSalida,
        esActual: false,
      });
    });
  }
  
  // Agregar periodo actual (si existe y no está ya en el histórico como cerrado)
  const periodoActualYaEnHistorico = empleado.historicoLaboral?.some(
    p => p.fechaIngreso === empleado.fechaIngreso && p.fechaSalida === empleado.fechaSalida
  );
  
  if (!periodoActualYaEnHistorico) {
    periodosLaborales.push({
      fechaIngreso: empleado.fechaIngreso,
      fechaSalida: empleado.fechaSalida,
      esActual: true,
    });
  }

  // Ordenar por fecha de ingreso ascendente (más antiguo primero), con periodo activo al final
  periodosLaborales.sort((a, b) => {
    // Periodos activos van al final
    if (a.esActual && !a.fechaSalida) return 1;
    if (b.esActual && !b.fechaSalida) return -1;
    // Ordenar cronológicamente por fecha de ingreso (ascendente)
    return new Date(a.fechaIngreso).getTime() - new Date(b.fechaIngreso).getTime();
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{empleado.nombreCompleto}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información general */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Información General</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cédula:</span>
                <p className="font-medium">{empleado.cedula}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Cargo:</span>
                <p className="font-medium">{empleado.cargo}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Sueldo Actual:</span>
                <p className="font-medium">{formatCurrency(empleado.sueldoNominal)}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <p className="font-medium">{empleado.activo ? "Activo" : "Inactivo"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Días Trabajados (acumulados):</span>
                <p className="font-medium">{diasTrabajadosTotal} días</p>
              </div>
              <div>
                <span className="text-muted-foreground">Fondos de Reserva:</span>
                <p className="font-medium">
                  {cumpleFDR ? "Activo" : `Faltan ${Math.max(0, 365 - diasTrabajadosTotal)} días`}
                </p>
              </div>
            </div>
          </Card>

          {/* Histórico Laboral */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Histórico Laboral</h3>
            {periodosLaborales.length > 0 ? (
              <div className="space-y-2">
                {periodosLaborales.map((periodo, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg text-sm ${
                      periodo.esActual && !periodo.fechaSalida 
                        ? "bg-muted/30 border border-border" 
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="text-muted-foreground">Ingreso: </span>
                          <span className="font-medium">{formatDate(periodo.fechaIngreso)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Salida: </span>
                          <span className="font-medium">
                            {periodo.fechaSalida ? formatDate(periodo.fechaSalida) : "(Periodo activo)"}
                          </span>
                        </div>
                      </div>
                      {periodo.esActual && !periodo.fechaSalida && (
                        <span className="text-xs font-medium">Actual</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin registros laborales</p>
            )}
          </Card>

          {/* Histórico de Sueldos */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Histórico de Sueldos</h3>
            {empleado.historicoSueldos && empleado.historicoSueldos.length > 0 ? (
              <div className="space-y-2">
                {[...empleado.historicoSueldos].reverse().map((cambio, index) => {
                  const esAumento = cambio.sueldoNuevo > cambio.sueldoAnterior;
                  const diferencia = cambio.sueldoNuevo - cambio.sueldoAnterior;
                  
                  return (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg text-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatDate(cambio.fecha)}</span>
                          <span className="text-muted-foreground">—</span>
                          <span className="font-medium">
                            {esAumento ? "Ascenso" : "Descenso"}: {esAumento ? "+" : ""}{formatCurrency(diferencia)}
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-muted-foreground line-through">
                          {formatCurrency(cambio.sueldoAnterior)}
                        </span>
                        <span className="font-medium">→</span>
                        <span className="font-medium">
                          {formatCurrency(cambio.sueldoNuevo)}
                        </span>
                      </div>
                      {cambio.motivo && (
                        <p className="text-muted-foreground text-xs mt-1">{cambio.motivo}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin cambios de sueldo registrados</p>
            )}
          </Card>

          {/* Configuración */}
          <Card className="p-4 space-y-3">
            <h3 className="font-semibold">Configuración de Pagos</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Mensualiza Décimos:</span>
                <p className="font-medium">{empleado.mensualizaDecimos ? "Sí" : "No"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Gana Fondos de Reserva:</span>
                <p className="font-medium">{empleado.ganaFondoReserva ? "Sí (automático)" : "No"}</p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
