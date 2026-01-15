import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Empleado } from "@/types/nomina";
import { Switch } from "@/components/ui/switch";
import { DateInput } from "@/components/ui/date-input";
import EmpleadoDetailDialog from "./EmpleadoDetailDialog";

interface NominaModuleProps {
  empleados: Empleado[];
  onUpdate: (empleados: Empleado[]) => void;
  empresa: string;
}

interface LocalEmpleadoState {
  [key: string]: Partial<Empleado> & {
    sueldoPendiente?: number;
    fechaSalidaPendiente?: string;
    nuevoIngresoPendiente?: string;
  };
}

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

const cumpleFDR = (empleado: Empleado): boolean => {
  const diasTrabajados = calcularDiasTrabajadosAcumulados(empleado);
  return diasTrabajados > 365;
};

export default function NominaModule({
  empleados,
  onUpdate,
  empresa
}: NominaModuleProps) {
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [localState, setLocalState] = useState<LocalEmpleadoState>({});

  useEffect(() => {
    const newLocalState: LocalEmpleadoState = {};
    empleados.forEach(emp => {
      if (!localState[emp.id]) {
        newLocalState[emp.id] = {
          nombreCompleto: emp.nombreCompleto,
          cargo: emp.cargo,
          cedula: emp.cedula,
          sueldoPendiente: emp.sueldoNominal
        };
      } else {
        newLocalState[emp.id] = {
          ...localState[emp.id],
          sueldoPendiente: localState[emp.id].sueldoPendiente ?? emp.sueldoNominal
        };
      }
    });
    setLocalState(newLocalState);
  }, [empleados.length]);

  useEffect(() => {
    const updated = empleados.map(emp => {
      if (!emp.ganaFondoReserva && cumpleFDR(emp)) {
        return {
          ...emp,
          ganaFondoReserva: true
        };
      }
      return emp;
    });
    const hasChanges = updated.some((emp, i) => emp.ganaFondoReserva !== empleados[i].ganaFondoReserva);
    if (hasChanges) {
      onUpdate(updated);
    }
  }, [empleados]);

  const handleLocalChange = (id: string, field: string, value: string) => {
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const handleSueldoChange = (id: string, value: string) => {
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        sueldoPendiente: parseFloat(value) || 0
      }
    }));
  };

  const handleFechaSalidaChange = (id: string, value: string) => {
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        fechaSalidaPendiente: value
      }
    }));
  };

  const handleNuevoIngresoChange = (id: string, value: string) => {
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        nuevoIngresoPendiente: value
      }
    }));
  };

  const commitLocalChanges = () => {
    const updated = empleados.map(emp => {
      const local = localState[emp.id];
      if (!local) return emp;
      return {
        ...emp,
        nombreCompleto: local.nombreCompleto ?? emp.nombreCompleto,
        cargo: local.cargo ?? emp.cargo,
        cedula: local.cedula ?? emp.cedula
      };
    });
    onUpdate(updated);
  };

  const handleSueldoBlur = (id: string) => {
    const local = localState[id];
    if (!local || local.sueldoPendiente === undefined) return;
    const empleado = empleados.find(e => e.id === id);
    if (!empleado) return;
    const nuevoSueldo = local.sueldoPendiente;
    if (nuevoSueldo !== empleado.sueldoNominal) {
      const nuevoHistorico = {
        fecha: new Date().toISOString().split("T")[0],
        sueldoAnterior: empleado.sueldoNominal,
        sueldoNuevo: nuevoSueldo
      };
      const updated = empleados.map(emp => {
        if (emp.id !== id) return emp;
        return {
          ...emp,
          sueldoNominal: nuevoSueldo,
          historicoSueldos: [...(emp.historicoSueldos || []), nuevoHistorico]
        };
      });
      onUpdate(updated);
    }
  };

  const handleFechaSalidaBlur = (id: string) => {
    const local = localState[id];
    if (!local || !local.fechaSalidaPendiente) return;
    const empleado = empleados.find(e => e.id === id);
    if (!empleado) return;
    const fechaSalida = local.fechaSalidaPendiente;
    const nuevoHistorialLaboral = {
      fechaIngreso: empleado.fechaIngreso,
      fechaSalida: fechaSalida
    };
    
    const updated = empleados.map(emp => {
      if (emp.id !== id) return emp;
      return {
        ...emp,
        fechaSalida: fechaSalida,
        activo: false,
        historicoLaboral: [...(emp.historicoLaboral || []), nuevoHistorialLaboral]
      };
    });
    
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        fechaSalidaPendiente: undefined
      }
    }));
    onUpdate(updated);
  };

  const handleNuevoIngresoBlur = (id: string) => {
    const local = localState[id];
    if (!local || !local.nuevoIngresoPendiente) return;
    const empleado = empleados.find(e => e.id === id);
    if (!empleado) return;
    const nuevoIngreso = local.nuevoIngresoPendiente;

    const updated = empleados.map(emp => {
      if (emp.id !== id) return emp;
      return {
        ...emp,
        fechaIngreso: nuevoIngreso,
        fechaSalida: undefined,
        activo: true
      };
    });
    
    setLocalState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        nuevoIngresoPendiente: undefined
      }
    }));
    onUpdate(updated);
  };

  useEffect(() => {
    const handleBeforeUnload = () => commitLocalChanges();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [localState, empleados]);

  const handleUpdate = (id: string, field: keyof Empleado, value: any) => {
    const updated = empleados.map(emp => {
      if (emp.id !== id) return emp;
      return {
        ...emp,
        [field]: value
      };
    });
    onUpdate(updated);
  };

  const handleDelete = (id: string) => {
    onUpdate(empleados.filter(emp => emp.id !== id));
    setLocalState(prev => {
      const newState = { ...prev };
      delete newState[id];
      return newState;
    });
  };

  const openEmpleadoDetail = (empleado: Empleado) => {
    commitLocalChanges();
    const local = localState[empleado.id];
    const nombre = local?.nombreCompleto ?? empleado.nombreCompleto;
    if (nombre.trim() !== "") {
      setSelectedEmpleado({
        ...empleado,
        nombreCompleto: nombre
      });
      setDialogOpen(true);
    }
  };

  const handleBlur = () => {
    commitLocalChanges();
  };

  // Estilos compartidos
  const inputBaseClass = "h-10 text-sm rounded-none border-0 border-b border-transparent focus-visible:border-border focus-visible:ring-0 bg-transparent w-full px-0";
  const headerClass = "text-left p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 bg-background z-10">
            <tr className="border-b border-border">
              <th className={`${headerClass} w-12`}>No.</th>
              <th className={`${headerClass} min-w-[240px]`}>Nombre Completo</th>
              <th className={`${headerClass} min-w-[180px]`}>Cargo</th>
              <th className={`${headerClass} min-w-[140px]`}>Fecha de Ingreso</th>
              <th className={`text-right p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[120px]`}>Sueldo Nominal Mensual</th>
              <th className={`${headerClass} min-w-[140px]`}>Fecha de Salida</th>
              <th className={`${headerClass} min-w-[140px]`}>Fecha de Reingreso</th>
              <th className={`${headerClass} min-w-[140px]`}>Cédula de Identidad</th>
              <th className={`text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground w-20`}>Activo</th>
              <th className={`text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]`}>Mensualiza Décimos</th>
              <th className={`text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground min-w-[100px]`}>Acumula Fondo de Reserva</th>
              <th className={`text-center p-4 text-xs font-medium uppercase tracking-wider text-muted-foreground w-16`}></th>
            </tr>
          </thead>
          <tbody>
            {empleados.map((empleado, index) => {
              const cumpleCondicionFDR = cumpleFDR(empleado);
              const diasTrabajados = calcularDiasTrabajadosAcumulados(empleado);
              const diasRestantes = Math.max(0, 365 - diasTrabajados);
              const local = localState[empleado.id] || {};
              const nombreLocal = local.nombreCompleto ?? empleado.nombreCompleto;
              const cargoLocal = local.cargo ?? empleado.cargo;
              const cedulaLocal = local.cedula ?? empleado.cedula;
              const sueldoLocal = local.sueldoPendiente ?? empleado.sueldoNominal;
              const tieneNombre = nombreLocal.trim() !== "";
              const tieneContratoTerminado = !!empleado.fechaSalida && !empleado.activo;
              const tieneFechaSalidaPendiente = !!local.fechaSalidaPendiente;
              const mostrarNuevoIngreso = tieneFechaSalidaPendiente || tieneContratoTerminado;
              
              return (
                <tr 
                  key={empleado.id} 
                  className={`border-b border-border transition-colors ${tieneContratoTerminado && !local.nuevoIngresoPendiente ? "opacity-50" : "hover:bg-muted/30"}`}
                >
                  <td className="p-4 text-sm tabular-nums align-middle">{index + 1}</td>
                  <td className="p-4 align-middle">
                    <Input 
                      value={nombreLocal} 
                      onChange={e => handleLocalChange(empleado.id, "nombreCompleto", e.target.value)} 
                      onBlur={handleBlur} 
                      className={inputBaseClass}
                      placeholder="Nombre completo" 
                    />
                  </td>
                  <td className="p-4 align-middle">
                    <Input 
                      value={cargoLocal} 
                      onChange={e => handleLocalChange(empleado.id, "cargo", e.target.value)} 
                      onBlur={handleBlur} 
                      className={inputBaseClass}
                      placeholder="Cargo" 
                    />
                  </td>
                  <td className="p-4 align-middle">
                    <DateInput
                      value={empleado.fechaIngreso}
                      onChange={value => handleUpdate(empleado.id, "fechaIngreso", value)}
                      className={inputBaseClass}
                    />
                  </td>
                  <td className="p-4 align-middle">
                    <Input 
                      type="number" 
                      value={sueldoLocal} 
                      onChange={e => handleSueldoChange(empleado.id, e.target.value)} 
                      onBlur={() => handleSueldoBlur(empleado.id)} 
                      className={`${inputBaseClass} text-right tabular-nums`}
                      step="0.01" 
                    />
                  </td>
                  <td className="p-4 align-middle">
                    <DateInput
                      value={local.fechaSalidaPendiente !== undefined ? local.fechaSalidaPendiente : (empleado.activo ? "" : empleado.fechaSalida || "")}
                      onChange={value => handleFechaSalidaChange(empleado.id, value)}
                      onBlur={() => handleFechaSalidaBlur(empleado.id)}
                      className={inputBaseClass}
                    />
                  </td>
                  <td className="p-4 align-middle">
                    {mostrarNuevoIngreso ? (
                      <DateInput
                        value={local.nuevoIngresoPendiente || ""}
                        onChange={value => handleNuevoIngresoChange(empleado.id, value)}
                        onBlur={() => handleNuevoIngresoBlur(empleado.id)}
                        className={`${inputBaseClass} border-b-border`}
                        placeholder="dd/mm/aaaa"
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="p-4 align-middle">
                    <Input 
                      value={cedulaLocal} 
                      onChange={e => handleLocalChange(empleado.id, "cedula", e.target.value)} 
                      onBlur={handleBlur} 
                      className={`${inputBaseClass} tabular-nums`}
                      placeholder="0000000000" 
                      maxLength={10} 
                    />
                  </td>
                  <td className="p-4 text-center align-middle">
                    <Switch 
                      checked={empleado.activo} 
                      onCheckedChange={checked => handleUpdate(empleado.id, "activo", checked)} 
                    />
                  </td>
                  <td className="p-4 text-center align-middle">
                    <Switch 
                      checked={empleado.mensualizaDecimos} 
                      onCheckedChange={checked => handleUpdate(empleado.id, "mensualizaDecimos", checked)} 
                    />
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="flex flex-col gap-1 items-center justify-end">
                      <Switch checked={empleado.ganaFondoReserva} disabled={true} />
                      <span className="text-xs text-muted-foreground tabular-nums text-center">
                        {cumpleCondicionFDR ? "+365d" : `${diasRestantes}d`}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {tieneNombre && (
                        <button 
                          onClick={() => openEmpleadoDetail(empleado)} 
                          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <span className="text-sm">Ver</span>
                        </button>
                      )}
                      <button 
                        onClick={() => handleDelete(empleado.id)} 
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <span className="text-sm">×</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {empleados.length === 0 && (
          <div className="p-16 text-center">
            <p className="text-muted-foreground">No hay empleados registrados</p>
            <p className="text-sm text-muted-foreground mt-1">Agregue un nuevo empleado para comenzar</p>
          </div>
        )}
      </div>

      <EmpleadoDetailDialog 
        empleado={selectedEmpleado} 
        open={dialogOpen} 
        onClose={() => setDialogOpen(false)} 
      />
    </div>
  );
}
