import { Empleado, RolPagosRow, DatosConfig } from "@/types/nomina";
import { forwardRef } from "react";
interface RolEmpleadoDocumentProps {
  empleado: Empleado;
  rol: RolPagosRow;
  datos: DatosConfig;
}
const formatCurrency = (value: number): string => {
  if (value === 0) return "-";
  return value.toFixed(2);
};
const RolEmpleadoDocument = forwardRef<HTMLDivElement, RolEmpleadoDocumentProps>(({
  empleado,
  rol,
  datos
}, ref) => {
  const ingresos = [{
    label: "Sueldo Ganado",
    value: rol.sueldoGanado
  }, {
    label: "Horas Extras 50%",
    value: rol.valorHoras50
  }, {
    label: "Horas Extras 100%",
    value: rol.valorHoras100
  }, {
    label: "Bonificación",
    value: rol.bonificacion
  }, {
    label: "Viáticos",
    value: rol.viaticos
  }, {
    label: "Décimo Tercero Mensualizado",
    value: rol.decimoTerceroMensualizado
  }, {
    label: "Décimo Cuarto Mensualizado",
    value: rol.decimoCuartoMensualizado
  }, {
    label: "Fondo de Reserva",
    value: rol.valorFondoReserva
  }];
  const descuentos = [{
    label: "Préstamo al Empleado",
    value: rol.prestamosEmpleado
  }, {
    label: "Anticipo Sueldo",
    value: rol.anticipoSueldo
  }, {
    label: "Aporte 9.45%",
    value: rol.aporte945
  }, {
    label: "Aporte Personal",
    value: rol.aportePersonalManual
  }, {
    label: "Otros Descuentos",
    value: rol.otrosDescuentos
  }, {
    label: "Préstamo IESS",
    value: rol.prestamosIess
  }];
  return <div ref={ref} className="bg-white text-black w-[210mm] min-h-[297mm] mx-auto print:shadow-none" style={{
    fontFamily: "'Poppins', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
  }}>
        {/* Header */}
        <div className="px-10 py-8 border-b border-black">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {/* Company Logo */}
              {datos.logoUrl && (
                <img 
                  src={datos.logoUrl} 
                  alt={datos.empresa}
                  className="h-14 w-auto max-w-[100px] object-contain"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold tracking-wide uppercase">{datos.empresa}</h1>
                <p className="text-sm mt-1">RUC: {datos.ruc}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider">Período</p>
              <p className="text-lg font-semibold">{datos.mes} {datos.anio}</p>
            </div>
          </div>
        </div>

        {/* Document Title */}
        

        {/* Content */}
        <div className="px-10 py-8">
          {/* Employee Information */}
          <div className="mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider mb-4 border-b border-black pb-2">
              Datos del Empleado
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs uppercase tracking-wide">Nombre Completo</p>
                <p className="text-lg font-semibold">{empleado.nombreCompleto || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">Cargo</p>
                <p className="text-lg font-semibold">{empleado.cargo || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">Cédula</p>
                <p className="text-base">{empleado.cedula || "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">Fecha de Ingreso</p>
                <p className="text-base">{empleado.fechaIngreso}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-4 pt-4 border-t border-black">
              <div>
                <p className="text-xs uppercase tracking-wide">Sueldo Nominal</p>
                <p className="text-xl font-bold">$ {formatCurrency(rol.sueldoNominal)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide">Días Trabajados</p>
                <p className="text-xl font-bold">{rol.diasTrabajados} <span className="text-sm font-normal">/ 30 días</span></p>
              </div>
            </div>
          </div>

          {/* Income and Deductions Tables */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            {/* Income Column */}
            <div>
              <div className="border-b border-black pb-2 mb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wider">Ingresos</h3>
              </div>
              <div>
                {ingresos.map((item, idx) => <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-300">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium tabular-nums">
                      $ {formatCurrency(item.value)}
                    </span>
                  </div>)}
              </div>
              <div className="border-t-2 border-black pt-2 mt-2 flex justify-between items-center">
                <span className="font-semibold uppercase text-sm">Total Ingresos</span>
                <span className="font-bold text-lg tabular-nums">$ {formatCurrency(rol.totalGanado)}</span>
              </div>
            </div>

            {/* Deductions Column */}
            <div>
              <div className="border-b border-black pb-2 mb-2">
                <h3 className="font-semibold text-sm uppercase tracking-wider">Descuentos</h3>
              </div>
              <div>
                {descuentos.map((item, idx) => <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-300">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium tabular-nums">
                      $ {formatCurrency(item.value)}
                    </span>
                  </div>)}
              </div>
              <div className="border-t-2 border-black pt-2 mt-2 flex justify-between items-center">
                <span className="font-semibold uppercase text-sm">Total Descuentos</span>
                <span className="font-bold text-lg tabular-nums">$ {formatCurrency(rol.totalDescuentos)}</span>
              </div>
            </div>
          </div>

          {/* Net Pay Summary */}
          <div className="border-t-2 border-b-2 border-black py-6 mb-10">
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider mb-1">Total Ingresos</p>
                <p className="text-xl font-semibold tabular-nums">$ {formatCurrency(rol.totalGanado)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider mb-1">Total Descuentos</p>
                <p className="text-xl font-semibold tabular-nums">$ {formatCurrency(rol.totalDescuentos)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs uppercase tracking-wider mb-1">Neto a Recibir</p>
                <p className="text-3xl font-bold tabular-nums">$ {formatCurrency(rol.netoRecibir)}</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-16 mt-16">
            <div className="text-center">
              <div className="h-16 mb-2"></div>
              <div className="border-t-2 border-black pt-3 mx-4">
                <p className="text-sm font-semibold uppercase tracking-wide">Empleador / Representante</p>
                <p className="text-xs mt-1">Firma</p>
              </div>
            </div>
            <div className="text-center">
              <div className="h-16 mb-2"></div>
              <div className="border-t-2 border-black pt-3 mx-4">
                <p className="text-sm font-semibold uppercase tracking-wide">Recibí Conforme</p>
                <p className="text-xs mt-1">{empleado.nombreCompleto}</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-6 border-t border-black text-center">
            
          </div>
        </div>
      </div>;
});
RolEmpleadoDocument.displayName = "RolEmpleadoDocument";
export default RolEmpleadoDocument;