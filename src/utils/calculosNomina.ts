import { Empleado, RolPagosRow } from "@/types/nomina";

/**
 * LÓGICA DE CÁLCULO DE NÓMINA - VERSIÓN REEFINADA
 * 
 * ORDEN DE CÁLCULO (crítico - NO ALTERAR):
 * 1. Sueldo Ganado
 * 2. Valor de Horas Extras al 50%
 * 3. Valor de Horas Extras al 100%
 * 4. Pago de Horas Extras al 50%
 * 5. Pago de Horas Extras al 100%
 * 6. Décimo Tercero
 * 7. Décimo Cuarto
 * 8. Total Ganado
 * 9. Aporte 9.45%
 * 10. Total de Descuentos
 * 11. Subtotal = Total Ganado - Total de Descuentos
 * 12. Fondo de Reserva (MANUAL - solo si antigüedad >= 365 días)
 * 13. Neto a Recibir
 * 
 * FÓRMULAS OBLIGATORIAS:
 * 
 * 1. Sueldo Ganado = Sueldo Nominal − (Sueldo Nominal ÷ 30 × Días No Trabajados) + ((Sueldo Nominal ÷ 30) × Días de Permiso Médico × 0,75)
 * 2. Valor de Horas Extras al 50% = (Sueldo Nominal ÷ 240) × 1,5
 * 3. Valor de Horas Extras al 100% = (Sueldo Nominal ÷ 240) × 2
 * 4. Pago de Horas Extras al 50% = Número de Horas Extras al 50% × Valor de Horas Extras al 50%
 * 5. Pago de Horas Extras al 100% = Número de Horas Extras al 100% × Valor de Horas Extras al 100%
 * 6. Décimo Tercero = (Sueldo Ganado + Pago Horas 50% + Pago Horas 100% + Bonificación) ÷ 12
 * 7. Décimo Cuarto = ((470/12)/30) × días trabajados
 * 8. Total Ganado = Sueldo Ganado + Pago Horas 50% + Pago Horas 100% + Bonificación + Viáticos + Décimo Tercero + Décimo Cuarto
 * 9. Aporte 9.45% = (Sueldo Ganado + Pago Horas 50% + Pago Horas 100% + Bonificación) × 0.0945
 * 10. Total de Descuentos = Préstamo al Empleado + Anticipo Sueldo + Aporte 9.45% + Otros Descuentos + Préstamo IESS
 *     (NO incluye Aporte Personal Manual)
 * 11. Subtotal = Total Ganado − Total de Descuentos
 * 12. Fondo de Reserva = Campo MANUAL (solo habilitado si antigüedad >= 365 días)
 * 13. Neto a Recibir = Subtotal + Fondo de Reserva
 */

/**
 * Calcula la antigüedad en días de un empleado
 */
export const calcularAntiguedadDias = (fechaIngreso: string, fechaSalida?: string): number => {
  const inicio = new Date(fechaIngreso);
  const fin = fechaSalida ? new Date(fechaSalida) : new Date();
  const diffTime = fin.getTime() - inicio.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
};

/**
 * Verifica si el empleado tiene derecho a fondo de reserva (antigüedad >= 365 días)
 */
export const tieneDerechoFondoReserva = (empleado: Empleado): boolean => {
  const antiguedadDias = calcularAntiguedadDias(empleado.fechaIngreso, empleado.fechaSalida);
  return antiguedadDias >= 365;
};

export const calcularRolPagos = (empleado: Empleado, row: RolPagosRow): RolPagosRow => {
  const sueldoNominal = row.sueldoNominal;
  
  // ===== 1. SUELDO GANADO =====
  // Fórmula: Sueldo Nominal − (Sueldo Nominal ÷ 30 × Días No Trabajados) + ((Sueldo Nominal ÷ 30) × Días de Permiso Médico × 0,75)
  const valorDia = sueldoNominal / 30;
  const descuentoDiasNoTrabajados = valorDia * row.diasNoTrabajados;
  const descuentoPermisoMedico = valorDia * row.diasPermisoMedico; // Solo para mostrar desglose
  const reconocimientoPermisoMedico = valorDia * row.diasPermisoMedico * 0.75;
  
  const sueldoGanado = Math.max(0, 
    sueldoNominal 
    - descuentoDiasNoTrabajados 
    + reconocimientoPermisoMedico
  );
  
  // Días trabajados para referencia visual
  const diasTrabajados = Math.max(0, 30 - row.diasNoTrabajados - row.diasPermisoMedico);
  
  // ===== 2. VALOR DE HORAS EXTRAS AL 50% =====
  // Fórmula: (Sueldo Nominal ÷ 240) × 1,5
  const valorHoraOrdinaria = sueldoNominal / 240;
  const valorHoraExtra50 = valorHoraOrdinaria * 1.5;
  
  // ===== 3. VALOR DE HORAS EXTRAS AL 100% =====
  // Fórmula: (Sueldo Nominal ÷ 240) × 2
  const valorHoraExtra100 = valorHoraOrdinaria * 2;
  
  // ===== 4. PAGO DE HORAS EXTRAS AL 50% =====
  // Fórmula: Número de Horas Extras al 50% × Valor de Horas Extras al 50%
  const pagoHoras50 = row.horas50 * valorHoraExtra50;
  
  // ===== 5. PAGO DE HORAS EXTRAS AL 100% =====
  // Fórmula: Número de Horas Extras al 100% × Valor de Horas Extras al 100%
  const pagoHoras100 = row.horas100 * valorHoraExtra100;
  
  // ===== 6. DÉCIMO TERCERO =====
  // Fórmula: (Sueldo Ganado + Valor Horas Extras 50% + Valor Horas Extras 100% + Bonificación) ÷ 12
  const decimoTerceroMensualizado = (sueldoGanado + pagoHoras50 + pagoHoras100 + row.bonificacion) / 12;
  
  // ===== 7. DÉCIMO CUARTO =====
  // Fórmula: ((470/12)/30) × días trabajados
  // 470 = Salario Básico Unificado
  const SBU = 470;
  const diasTrabajadosDecimoCuarto = Math.max(0, 30 - row.diasNoTrabajados);
  const decimoCuartoMensualizado = ((SBU / 12) / 30) * diasTrabajadosDecimoCuarto;
  
  // ===== TOTAL INGRESOS (base sin décimos) =====
  const totalIngresos = sueldoGanado + pagoHoras50 + pagoHoras100;
  
  // ===== 8. TOTAL GANADO =====
  // Fórmula: Sueldo Ganado + Pago Horas 50% + Pago Horas 100% + Bonificación + Viáticos + Décimo Tercero + Décimo Cuarto
  const subtotalBase = sueldoGanado + pagoHoras50 + pagoHoras100 + row.bonificacion + row.viaticos;
  const totalGanado = subtotalBase + 
    (empleado.mensualizaDecimos ? decimoTerceroMensualizado + decimoCuartoMensualizado : 0);
  
  // ===== 9. APORTE 9.45% =====
  // Fórmula: (Sueldo Ganado + Pago Horas 50% + Pago Horas 100% + Bonificación) × 0.0945
  // NO incluye: Viáticos, Décimo Tercero, Décimo Cuarto, Fondo de Reserva
  const baseAporte945 = sueldoGanado + pagoHoras50 + pagoHoras100 + row.bonificacion;
  const aporte945 = baseAporte945 * 0.0945;
  
  // ===== 10. TOTAL DE DESCUENTOS =====
  // Fórmula: Préstamo al Empleado + Anticipo Sueldo + Aporte 9.45% + Otros Descuentos + Préstamo IESS
  // NOTA: NO incluye Aporte Personal Manual (es campo informativo fuera del flujo principal)
  const totalDescuentos = 
    row.prestamosEmpleado + 
    row.anticipoSueldo + 
    aporte945 + 
    row.otrosDescuentos + 
    row.prestamosIess;
  
  // ===== 11. SUBTOTAL =====
  // Fórmula: Total Ganado − Total de Descuentos
  const subtotal = totalGanado - totalDescuentos;
  
  // ===== 12. FONDO DE RESERVA =====
  // Campo MANUAL - Solo habilitado si antigüedad >= 365 días
  // Si no tiene derecho, forzar a 0
  const tieneDerechoFR = tieneDerechoFondoReserva(empleado);
  const valorFondoReserva = tieneDerechoFR ? row.valorFondoReserva : 0;
  
  // ===== APORTE PATRONAL IESS (informativo, no afecta neto) =====
  const depositoIess = sueldoGanado * 0.1115;
  
  // ===== 13. NETO A RECIBIR =====
  // Fórmula: Subtotal + Fondo de Reserva
  const netoRecibir = Math.max(0, subtotal + valorFondoReserva);
  
  return {
    ...row,
    // Calculados
    valorDia,
    descuentoDiasNoTrabajados,
    descuentoPermisoMedico,
    diasTrabajados,
    sueldoGanado,
    valorHoraOrdinaria,
    valorHoras50: pagoHoras50, // El campo almacena el PAGO, no solo el valor unitario
    valorHoras100: pagoHoras100, // El campo almacena el PAGO, no solo el valor unitario
    decimoTerceroMensualizado,
    decimoCuartoMensualizado,
    totalIngresos,
    totalGanado,
    aporte945,
    totalDescuentos,
    subtotal,
    valorFondoReserva,
    depositoIess,
    netoRecibir
  };
};

/**
 * Calcula el rol de pagos con opción de incluir o excluir décimos mensualizados.
 */
export const calcularRolPagosConDecimos = (empleado: Empleado, row: RolPagosRow, incluirDecimos: boolean): RolPagosRow => {
  const resultado = calcularRolPagos(empleado, row);
  
  if (!incluirDecimos) {
    // Recalcular sin décimos según fórmula obligatoria
    // Total Ganado = Sueldo Ganado + Pago Horas 50% + Pago Horas 100% + Bonificación + Viáticos
    const totalGanado = resultado.sueldoGanado + resultado.valorHoras50 + 
      resultado.valorHoras100 + resultado.bonificacion + resultado.viaticos;
    
    // Subtotal = Total Ganado - Total Descuentos
    const subtotal = totalGanado - resultado.totalDescuentos;
    
    // Neto a recibir = Subtotal + Fondo de Reserva (si aplica)
    const netoRecibir = Math.max(0, subtotal + resultado.valorFondoReserva);
    
    return {
      ...resultado,
      decimoTerceroMensualizado: 0,
      decimoCuartoMensualizado: 0,
      totalGanado,
      subtotal,
      netoRecibir
    };
  }
  
  return resultado;
};

/**
 * Crea un registro inicial de rol de pagos para un empleado
 */
export const crearRolPagosInicial = (empleado: Empleado, diasMes: number, salarioBasicoUnificado: number = 460): RolPagosRow => {
  const rowInicial: RolPagosRow = {
    empleadoId: empleado.id,
    diasMes,
    sueldoNominal: empleado.sueldoNominal,
    salarioBasicoUnificado,
    
    // Datos del empleado (entrada)
    diasNoTrabajados: 0,
    diasPermisoMedico: 0,
    
    // Ingresos editables (entrada)
    horas50: 0,
    horas100: 0,
    bonificacion: 0,
    viaticos: 0,
    
    // Ingresos calculados (se llenarán con calcularRolPagos)
    valorDia: 0,
    descuentoDiasNoTrabajados: 0,
    descuentoPermisoMedico: 0,
    diasTrabajados: 0,
    sueldoGanado: 0,
    valorHoraOrdinaria: 0,
    valorHoras50: 0,
    valorHoras100: 0,
    decimoTerceroMensualizado: 0,
    decimoCuartoMensualizado: 0,
    totalIngresos: 0,
    totalGanado: 0,
    
    // Descuentos editables (entrada)
    prestamosEmpleado: 0,
    anticipoSueldo: 0,
    aportePersonalManual: 0, // Campo manual (reemplaza Retención Renta)
    otrosDescuentos: 0,
    prestamosIess: 0,
    
    // Descuentos calculados
    aporte945: 0,
    totalDescuentos: 0,
    
    // Liquidación
    subtotal: 0,
    valorFondoReserva: 0, // Campo MANUAL
    depositoIess: 0,
    netoRecibir: 0
  };
  
  // Calcular valores iniciales
  return calcularRolPagosConDecimos(empleado, rowInicial, empleado.mensualizaDecimos);
};
