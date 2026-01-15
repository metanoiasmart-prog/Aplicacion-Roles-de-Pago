export interface DatosConfig {
  id: string;
  empresa: string;
  ruc: string;
  mes: string;
  anio: number;
  fechaCorte: string;
  diasMes: number;
  logoUrl?: string | null;
}

export interface HistoricoSueldo {
  fecha: string;
  sueldoAnterior: number;
  sueldoNuevo: number;
  motivo?: string;
}

export interface HistoricoLaboral {
  fechaIngreso: string;
  fechaSalida?: string;
}

export interface Empleado {
  id: string;
  nombreCompleto: string;
  cargo: string;
  fechaIngreso: string;
  sueldoNominal: number;
  fechaSalida?: string;
  cedula: string;
  activo: boolean;
  mensualizaDecimos: boolean;
  ganaFondoReserva: boolean;
  historicoSueldos: HistoricoSueldo[];
  historicoLaboral: HistoricoLaboral[];
}

export interface RolPagosRow {
  empleadoId: string;
  diasMes: number;
  sueldoNominal: number;
  salarioBasicoUnificado: number;
  
  // ===== DATOS DEL EMPLEADO (entrada) =====
  diasNoTrabajados: number;
  diasPermisoMedico: number;
  
  // ===== INGRESOS - Campos editables (entrada) =====
  horas50: number;
  horas100: number;
  bonificacion: number;
  viaticos: number;
  
  // ===== INGRESOS - Campos calculados =====
  valorDia: number;
  descuentoDiasNoTrabajados: number;
  descuentoPermisoMedico: number;
  diasTrabajados: number;
  sueldoGanado: number;
  valorHoraOrdinaria: number;
  valorHoras50: number;
  valorHoras100: number;
  decimoTerceroMensualizado: number;
  decimoCuartoMensualizado: number;
  totalIngresos: number;
  totalGanado: number;
  
  // ===== DESCUENTOS - Campos editables (entrada) =====
  prestamosEmpleado: number;
  anticipoSueldo: number;
  aportePersonalManual: number; // Aporte Personal - campo manual (reemplaza Retención Renta)
  otrosDescuentos: number;
  prestamosIess: number;
  
  // ===== DESCUENTOS - Campos calculados =====
  aporte945: number; // Aporte 9.45% = Sueldo Ganado × 0.0945
  totalDescuentos: number;
  
  // ===== LIQUIDACIÓN =====
  subtotal: number;
  valorFondoReserva: number; // Campo MANUAL - solo habilitado si antigüedad >= 365 días
  depositoIess: number;
  netoRecibir: number;
}
