import { Input } from "@/components/ui/input";
import { Empleado, RolPagosRow, DatosConfig } from "@/types/nomina";
import { calcularRolPagosConDecimos, tieneDerechoFondoReserva } from "@/utils/calculosNomina";

interface RolPagosModuleProps {
  empleados: Empleado[];
  datos: DatosConfig;
  rolPagos: Record<string, RolPagosRow>;
  onUpdateRolPagos: (rolPagos: Record<string, RolPagosRow>) => void;
}

export default function RolPagosModule({
  empleados,
  datos,
  rolPagos,
  onUpdateRolPagos
}: RolPagosModuleProps) {
  const empleadosActivos = empleados.filter(e => e.activo);
  const hayDecimos = empleadosActivos.some(e => e.mensualizaDecimos);

  // Calcular número de columnas dinámicamente
  const colsDatosEmpleado = 6;
  // Ingresos: Sueldo Ganado, H50, VH50, H100, VH100, Bonificación, Viáticos, Total Ganado = 8 columnas base
  // Con décimos: +2 (Décimo Tercero, Décimo Cuarto) = 10 columnas
  const colsIngresosBase = 8;
  const colsIngresos = hayDecimos ? colsIngresosBase + 2 : colsIngresosBase;
  // Descuentos: Préstamo Empleado, Anticipo Sueldo, Aporte 9.45%, Aporte Personal, Otros Descuentos, Préstamo IESS, Total Descuentos = 7 columnas
  const colsDescuentos = 7;
  const colsLiquidacion = 4;

  const handleUpdate = (empleadoId: string, field: keyof RolPagosRow, value: number) => {
    const empleado = empleados.find(e => e.id === empleadoId);
    if (!empleado) return;
    
    // Validar que no sea un campo calculado
    const camposEditables: (keyof RolPagosRow)[] = [
      'diasNoTrabajados', 'diasPermisoMedico',
      'horas50', 'horas100', 'bonificacion', 'viaticos',
      'prestamosEmpleado', 'anticipoSueldo', 'aportePersonalManual', 'otrosDescuentos', 'prestamosIess',
      'valorFondoReserva' // Fondo de Reserva ahora es manual
    ];
    
    if (!camposEditables.includes(field)) {
      console.warn(`Campo ${field} es calculado y no debe ser editable`);
      return;
    }
    
    // Validación especial para Fondo de Reserva: solo si tiene derecho
    if (field === 'valorFondoReserva' && !tieneDerechoFondoReserva(empleado)) {
      console.warn('Empleado no tiene derecho a Fondo de Reserva (antigüedad < 365 días)');
      return;
    }
    
    // No permitir valores negativos
    const valorValidado = Math.max(0, value);
    
    const updated = {
      ...rolPagos[empleadoId],
      [field]: valorValidado
    };
    const recalculated = calcularRolPagosConDecimos(empleado, updated, empleado.mensualizaDecimos);
    onUpdateRolPagos({
      ...rolPagos,
      [empleadoId]: recalculated
    });
  };

  const formatCurrency = (value: number) => {
    return value.toFixed(2);
  };

  // Calculate totals
  const totals = empleadosActivos.reduce((acc, emp) => {
    const row = rolPagos[emp.id];
    if (!row) return acc;
    return {
      sueldoNominal: acc.sueldoNominal + row.sueldoNominal,
      sueldoGanado: acc.sueldoGanado + row.sueldoGanado,
      valorHoras50: acc.valorHoras50 + row.valorHoras50,
      valorHoras100: acc.valorHoras100 + row.valorHoras100,
      bonificacion: acc.bonificacion + row.bonificacion,
      viaticos: acc.viaticos + row.viaticos,
      decimoTerceroMensualizado: acc.decimoTerceroMensualizado + row.decimoTerceroMensualizado,
      decimoCuartoMensualizado: acc.decimoCuartoMensualizado + row.decimoCuartoMensualizado,
      totalGanado: acc.totalGanado + row.totalGanado,
      prestamosEmpleado: acc.prestamosEmpleado + row.prestamosEmpleado,
      anticipoSueldo: acc.anticipoSueldo + row.anticipoSueldo,
      aporte945: acc.aporte945 + row.aporte945,
      aportePersonalManual: acc.aportePersonalManual + row.aportePersonalManual,
      otrosDescuentos: acc.otrosDescuentos + row.otrosDescuentos,
      prestamosIess: acc.prestamosIess + row.prestamosIess,
      totalDescuentos: acc.totalDescuentos + row.totalDescuentos,
      subtotal: acc.subtotal + row.subtotal,
      valorFondoReserva: acc.valorFondoReserva + row.valorFondoReserva,
      depositoIess: acc.depositoIess + row.depositoIess,
      netoRecibir: acc.netoRecibir + row.netoRecibir
    };
  }, {
    sueldoNominal: 0,
    sueldoGanado: 0,
    valorHoras50: 0,
    valorHoras100: 0,
    bonificacion: 0,
    viaticos: 0,
    decimoTerceroMensualizado: 0,
    decimoCuartoMensualizado: 0,
    totalGanado: 0,
    prestamosEmpleado: 0,
    anticipoSueldo: 0,
    aporte945: 0,
    aportePersonalManual: 0,
    otrosDescuentos: 0,
    prestamosIess: 0,
    totalDescuentos: 0,
    subtotal: 0,
    valorFondoReserva: 0,
    depositoIess: 0,
    netoRecibir: 0
  });

  // Estilos compartidos para inputs editables
  const inputClass = "h-8 text-left text-sm w-20 rounded-none border-0 border-b border-transparent focus-visible:border-border focus-visible:ring-0 bg-transparent tabular-nums px-1";
  
  // Estilos para celdas calculadas (negrilla, no editable)
  const calculatedCellClass = "p-3 text-left text-sm font-semibold tabular-nums";
  
  // Estilos para celdas de encabezado calculadas (negrilla)
  const calculatedHeaderClass = "text-left p-3 text-xs font-bold text-foreground";
  
  // Estilos para celdas de encabezado editables (normal)
  const editableHeaderClass = "text-left p-3 text-xs font-medium text-muted-foreground";

  // Ancho fijo de columnas para alineación perfecta
  const colWidths = {
    num: "w-[40px]",
    nombre: "w-[140px]",
    cargo: "w-[100px]",
    sueldoNominal: "w-[100px]",
    diasNoTrab: "w-[80px]",
    diasPerm: "w-[80px]",
    sueldoGanado: "w-[95px]",
    horas50: "w-[65px]",
    valorH50: "w-[90px]",
    horas100: "w-[65px]",
    valorH100: "w-[95px]",
    bonificacion: "w-[80px]",
    viaticos: "w-[70px]",
    decimo13: "w-[110px]",
    decimo14: "w-[110px]",
    totalGanado: "w-[95px]",
    prestamo: "w-[95px]",
    anticipo: "w-[80px]",
    aporte945: "w-[100px]",
    aportePersonal: "w-[100px]",
    otrosDesc: "w-[85px]",
    prestamoIess: "w-[90px]",
    totalDesc: "w-[95px]",
    subtotal: "w-[85px]",
    fondoRes: "w-[95px]",
    aportePatronal: "w-[100px]",
    netoRecibir: "w-[95px]"
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-background z-10">
            {/* Encabezados de grupo - centrados sobre sus subcolumnas */}
            <tr className="border-b border-border">
              <th 
                colSpan={colsDatosEmpleado} 
                className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-r border-border"
              >
                Datos del Empleado
              </th>
              <th 
                colSpan={colsIngresos} 
                className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-widest text-foreground bg-muted/20 border-r border-border"
              >
                Ingresos
              </th>
              <th 
                colSpan={colsDescuentos} 
                className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground border-r border-border"
              >
                Descuentos
              </th>
              <th 
                colSpan={colsLiquidacion} 
                className="text-center py-4 px-3 text-xs font-semibold uppercase tracking-widest text-foreground"
              >
                Liquidación
              </th>
            </tr>
            
            {/* Encabezados de columna - Calculadas en negrilla, editables normales */}
            <tr className="border-b border-border bg-muted/30">
              {/* ===== DATOS DEL EMPLEADO (6 columnas) ===== */}
              <th className={`text-left p-3 text-xs font-medium text-muted-foreground ${colWidths.num}`}>No.</th>
              <th className={`text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap ${colWidths.nombre}`}>Nombre Completo</th>
              <th className={`text-left p-3 text-xs font-medium text-muted-foreground whitespace-nowrap ${colWidths.cargo}`}>Cargo</th>
              <th className={`${editableHeaderClass} ${colWidths.sueldoNominal}`}>Sueldo Nominal Mensual</th>
              <th className={`${editableHeaderClass} ${colWidths.diasNoTrab}`}>Días No Trabajados</th>
              <th className={`${editableHeaderClass} ${colWidths.diasPerm} border-r border-border`}>Días Permiso Médico</th>
              
              {/* ===== INGRESOS (8-10 columnas) ===== */}
              {/* 1. Sueldo Ganado (CALCULADO) */}
              <th className={`${calculatedHeaderClass} ${colWidths.sueldoGanado}`}>Sueldo Ganado</th>
              {/* 2. Número de Horas Extras al 50% (EDITABLE) */}
              <th className={`${editableHeaderClass} ${colWidths.horas50}`}>Número Horas Extras 50%</th>
              {/* 3. Valor de Horas Extras al 50% (CALCULADO) */}
              <th className={`${calculatedHeaderClass} ${colWidths.valorH50}`}>Valor Horas Extras 50%</th>
              {/* 4. Número de Horas Extras al 100% (EDITABLE) */}
              <th className={`${editableHeaderClass} ${colWidths.horas100}`}>Número Horas Extras 100%</th>
              {/* 5. Valor de Horas Extras al 100% (CALCULADO) */}
              <th className={`${calculatedHeaderClass} ${colWidths.valorH100}`}>Valor Horas Extras 100%</th>
              {/* 6. Bonificación (EDITABLE) */}
              <th className={`${editableHeaderClass} ${colWidths.bonificacion}`}>Bonificación</th>
              {/* 7. Viáticos (EDITABLE) */}
              <th className={`${editableHeaderClass} ${colWidths.viaticos}`}>Viáticos</th>
              {/* 8-9. Décimos (condicionales, CALCULADOS) */}
              {hayDecimos && (
                <>
                  <th className={`${calculatedHeaderClass} ${colWidths.decimo13}`}>Décimo Tercero Mensualizado</th>
                  <th className={`${calculatedHeaderClass} ${colWidths.decimo14}`}>Décimo Cuarto Mensualizado</th>
                </>
              )}
              {/* 10. Total Ganado (CALCULADO) */}
              <th className={`${calculatedHeaderClass} ${colWidths.totalGanado} border-r border-border`}>Total Ganado</th>
              
              {/* ===== DESCUENTOS (7 columnas) - ORDEN: Préstamo, Anticipo, Aporte 9.45%, Aporte Personal, Otros, Préstamo IESS, Total ===== */}
              <th className={`${editableHeaderClass} ${colWidths.prestamo}`}>Préstamo al Empleado</th>
              <th className={`${editableHeaderClass} ${colWidths.anticipo}`}>Anticipo Sueldo</th>
              <th className={`${calculatedHeaderClass} ${colWidths.aporte945}`}>Aporte 9.45%</th>
              <th className={`${editableHeaderClass} ${colWidths.aportePersonal}`}>Aporte Personal</th>
              <th className={`${editableHeaderClass} ${colWidths.otrosDesc}`}>Otros Descuentos</th>
              <th className={`${editableHeaderClass} ${colWidths.prestamoIess}`}>Préstamo IESS</th>
              <th className={`${calculatedHeaderClass} ${colWidths.totalDesc} border-r border-border`}>Total de Descuentos</th>
              
              {/* ===== LIQUIDACIÓN (4 columnas) ===== */}
              <th className={`${calculatedHeaderClass} ${colWidths.subtotal}`}>Subtotal</th>
              <th className={`${editableHeaderClass} ${colWidths.fondoRes}`}>Fondo de Reserva</th>
              <th className={`${calculatedHeaderClass} ${colWidths.aportePatronal}`}>Aporte Patronal IESS</th>
              <th className={`${calculatedHeaderClass} ${colWidths.netoRecibir}`}>Neto a Recibir</th>
            </tr>
          </thead>
          
          <tbody>
            {empleadosActivos.map((empleado, index) => {
              const row = rolPagos[empleado.id];
              if (!row) return null;
              
              const tieneDerechoFR = tieneDerechoFondoReserva(empleado);
              
              return (
                <tr key={empleado.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                  {/* ===== DATOS DEL EMPLEADO ===== */}
                  <td className={`p-3 text-sm tabular-nums ${colWidths.num}`}>{index + 1}</td>
                  <td className={`p-3 text-sm whitespace-nowrap ${colWidths.nombre}`}>{empleado.nombreCompleto}</td>
                  <td className={`p-3 text-sm text-muted-foreground whitespace-nowrap ${colWidths.cargo}`}>{empleado.cargo}</td>
                  <td className={`p-3 text-left text-sm tabular-nums ${colWidths.sueldoNominal}`}>{formatCurrency(row.sueldoNominal)}</td>
                  <td className={`p-3 ${colWidths.diasNoTrab}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.diasNoTrabajados === 0 ? "" : row.diasNoTrabajados}
                        onChange={e => handleUpdate(empleado.id, "diasNoTrabajados", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        placeholder="0"
                        min="0"
                        max="30"
                      />
                    </div>
                  </td>
                  <td className={`p-3 border-r border-border ${colWidths.diasPerm}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.diasPermisoMedico === 0 ? "" : row.diasPermisoMedico}
                        onChange={e => handleUpdate(empleado.id, "diasPermisoMedico", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* ===== INGRESOS ===== */}
                  {/* 1. Sueldo Ganado (CALCULADO) */}
                  <td className={`${calculatedCellClass} ${colWidths.sueldoGanado}`}>{formatCurrency(row.sueldoGanado)}</td>
                  
                  {/* 2. Número de Horas Extras al 50% (EDITABLE) */}
                  <td className={`p-3 ${colWidths.horas50}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.horas50 === 0 ? "" : row.horas50}
                        onChange={e => handleUpdate(empleado.id, "horas50", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 3. Valor de Horas Extras al 50% (CALCULADO) */}
                  <td className={`${calculatedCellClass} ${colWidths.valorH50}`}>{formatCurrency(row.valorHoras50)}</td>
                  
                  {/* 4. Número de Horas Extras al 100% (EDITABLE) */}
                  <td className={`p-3 ${colWidths.horas100}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.horas100 === 0 ? "" : row.horas100}
                        onChange={e => handleUpdate(empleado.id, "horas100", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        placeholder="0"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 5. Valor de Horas Extras al 100% (CALCULADO) */}
                  <td className={`${calculatedCellClass} ${colWidths.valorH100}`}>{formatCurrency(row.valorHoras100)}</td>
                  
                  {/* 6. Bonificación (EDITABLE) */}
                  <td className={`p-3 ${colWidths.bonificacion}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.bonificacion === 0 ? "" : row.bonificacion}
                        onChange={e => handleUpdate(empleado.id, "bonificacion", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 7. Viáticos (EDITABLE) */}
                  <td className={`p-3 ${colWidths.viaticos}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.viaticos === 0 ? "" : row.viaticos}
                        onChange={e => handleUpdate(empleado.id, "viaticos", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 8-9. Décimos (condicionales, CALCULADOS) */}
                  {hayDecimos && (
                    <>
                      <td className={`${calculatedCellClass} ${colWidths.decimo13}`}>
                        {empleado.mensualizaDecimos ? formatCurrency(row.decimoTerceroMensualizado) : "—"}
                      </td>
                      <td className={`${calculatedCellClass} ${colWidths.decimo14}`}>
                        {empleado.mensualizaDecimos ? formatCurrency(row.decimoCuartoMensualizado) : "—"}
                      </td>
                    </>
                  )}
                  
                  {/* 10. Total Ganado (CALCULADO) */}
                  <td className={`${calculatedCellClass} ${colWidths.totalGanado} border-r border-border`}>{formatCurrency(row.totalGanado)}</td>
                  
                  {/* ===== DESCUENTOS - ORDEN: Préstamo, Anticipo, Aporte 9.45%, Aporte Personal, Otros, Préstamo IESS, Total ===== */}
                  {/* 1. Préstamo al Empleado (EDITABLE) */}
                  <td className={`p-3 ${colWidths.prestamo}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.prestamosEmpleado === 0 ? "" : row.prestamosEmpleado}
                        onChange={e => handleUpdate(empleado.id, "prestamosEmpleado", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 2. Anticipo Sueldo (EDITABLE) */}
                  <td className={`p-3 ${colWidths.anticipo}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.anticipoSueldo === 0 ? "" : row.anticipoSueldo}
                        onChange={e => handleUpdate(empleado.id, "anticipoSueldo", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 3. Aporte 9.45% (CALCULADO) */}
                  <td className={`${calculatedCellClass} ${colWidths.aporte945}`}>{formatCurrency(row.aporte945)}</td>
                  
                  {/* 4. Aporte Personal (EDITABLE - manual, NO entra en Total Descuentos) */}
                  <td className={`p-3 ${colWidths.aportePersonal}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.aportePersonalManual === 0 ? "" : row.aportePersonalManual}
                        onChange={e => handleUpdate(empleado.id, "aportePersonalManual", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 5. Otros Descuentos (EDITABLE) */}
                  <td className={`p-3 ${colWidths.otrosDesc}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.otrosDescuentos === 0 ? "" : row.otrosDescuentos}
                        onChange={e => handleUpdate(empleado.id, "otrosDescuentos", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 6. Préstamo IESS (EDITABLE) */}
                  <td className={`p-3 ${colWidths.prestamoIess}`}>
                    <div className="flex justify-start">
                      <Input
                        type="number"
                        value={row.prestamosIess === 0 ? "" : row.prestamosIess}
                        onChange={e => handleUpdate(empleado.id, "prestamosIess", parseFloat(e.target.value) || 0)}
                        className={inputClass}
                        step="0.01"
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                  </td>
                  
                  {/* 7. Total de Descuentos (CALCULADO) */}
                  <td className={`${calculatedCellClass} border-r border-border ${colWidths.totalDesc}`}>{formatCurrency(row.totalDescuentos)}</td>
                  
                  {/* ===== LIQUIDACIÓN ===== */}
                  {/* 1. Subtotal (CALCULADO) = Total Ganado - Total Descuentos */}
                  <td className={`${calculatedCellClass} ${colWidths.subtotal}`}>{formatCurrency(row.subtotal)}</td>
                  
                  {/* 2. Fondo de Reserva (MANUAL - solo habilitado si antigüedad >= 365 días) */}
                  <td className={`p-3 ${colWidths.fondoRes}`}>
                    {tieneDerechoFR ? (
                      <div className="flex justify-start">
                        <Input
                          type="number"
                          value={row.valorFondoReserva === 0 ? "" : row.valorFondoReserva}
                          onChange={e => handleUpdate(empleado.id, "valorFondoReserva", parseFloat(e.target.value) || 0)}
                          className={inputClass}
                          step="0.01"
                          placeholder="0.00"
                          min="0"
                        />
                      </div>
                    ) : (
                      <span className="text-left text-sm text-muted-foreground tabular-nums">0.00</span>
                    )}
                  </td>
                  
                  {/* 3. Aporte Patronal IESS (CALCULADO - informativo) */}
                  <td className={`${calculatedCellClass} ${colWidths.aportePatronal}`}>{formatCurrency(row.depositoIess)}</td>
                  
                  {/* 4. Neto a Recibir (CALCULADO) */}
                  <td className={`p-3 text-left text-sm font-bold tabular-nums ${colWidths.netoRecibir}`}>{formatCurrency(row.netoRecibir)}</td>
                </tr>
              );
            })}
          </tbody>
          
          {/* Fila de totales */}
          {empleadosActivos.length > 0 && (
            <tfoot className="sticky bottom-0 bg-background border-t-2 border-border">
              <tr>
                {/* Datos del Empleado - vacíos */}
                <td className={`p-3 ${colWidths.num}`}></td>
                <td className={`p-3 ${colWidths.nombre}`}></td>
                <td className={`p-3 ${colWidths.cargo}`}></td>
                <td className={`p-3 ${colWidths.sueldoNominal}`}></td>
                <td className={`p-3 ${colWidths.diasNoTrab}`}></td>
                <td className={`p-3 border-r border-border ${colWidths.diasPerm}`}></td>
                
                {/* Ingresos - vacíos */}
                <td className={`p-3 ${colWidths.sueldoGanado}`}></td>
                <td className={`p-3 ${colWidths.horas50}`}></td>
                <td className={`p-3 ${colWidths.valorH50}`}></td>
                <td className={`p-3 ${colWidths.horas100}`}></td>
                <td className={`p-3 ${colWidths.valorH100}`}></td>
                <td className={`p-3 ${colWidths.bonificacion}`}></td>
                <td className={`p-3 ${colWidths.viaticos}`}></td>
                {hayDecimos && (
                  <>
                    <td className={`p-3 ${colWidths.decimo13}`}></td>
                    <td className={`p-3 ${colWidths.decimo14}`}></td>
                  </>
                )}
                <td className={`p-3 ${colWidths.totalGanado} border-r border-border`}></td>
                
                {/* Descuentos - vacíos */}
                <td className={`p-3 ${colWidths.prestamo}`}></td>
                <td className={`p-3 ${colWidths.anticipo}`}></td>
                <td className={`p-3 ${colWidths.aporte945}`}></td>
                <td className={`p-3 ${colWidths.aportePersonal}`}></td>
                <td className={`p-3 ${colWidths.otrosDesc}`}></td>
                <td className={`p-3 ${colWidths.prestamoIess}`}></td>
                <td className={`p-3 border-r border-border ${colWidths.totalDesc}`}></td>
                
                {/* Liquidación - totales */}
                <td className={`p-3 text-left text-sm font-bold tabular-nums ${colWidths.subtotal}`}>{formatCurrency(totals.subtotal)}</td>
                <td className={`p-3 text-left text-sm font-bold tabular-nums ${colWidths.fondoRes}`}>{formatCurrency(totals.valorFondoReserva)}</td>
                <td className={`p-3 text-left text-sm font-bold tabular-nums ${colWidths.aportePatronal}`}>{formatCurrency(totals.depositoIess)}</td>
                <td className={`p-3 text-left text-sm font-bold tabular-nums bg-muted/30 ${colWidths.netoRecibir}`}>{formatCurrency(totals.netoRecibir)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        
        {empleadosActivos.length === 0 && (
          <div className="p-16 text-center">
            <p className="text-muted-foreground">No hay empleados activos</p>
            <p className="text-sm text-muted-foreground mt-1">Agregue empleados en Nómina y márquelos como activos</p>
          </div>
        )}
      </div>
    </div>
  );
}
