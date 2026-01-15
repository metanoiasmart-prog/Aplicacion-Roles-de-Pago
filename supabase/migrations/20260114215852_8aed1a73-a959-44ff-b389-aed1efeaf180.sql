-- =====================================================
-- SISTEMA DE NÓMINA - MIGRACIÓN COMPLETA
-- =====================================================

-- 1. Tabla de empresas (vinculada a usuarios)
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ruc TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, ruc)
);

-- 2. Tabla de empleados (vinculada a empresa)
CREATE TABLE public.empleados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL DEFAULT '',
  cedula TEXT DEFAULT '',
  cargo TEXT DEFAULT '',
  fecha_ingreso DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_salida DATE,
  sueldo_nominal NUMERIC(10,2) NOT NULL DEFAULT 470,
  activo BOOLEAN NOT NULL DEFAULT true,
  mensualiza_decimos BOOLEAN NOT NULL DEFAULT false,
  gana_fondo_reserva BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Tabla de períodos de nómina
CREATE TABLE public.periodos_nomina (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL CHECK (anio >= 2000),
  fecha_corte DATE,
  dias_mes INTEGER NOT NULL DEFAULT 30,
  cerrado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, mes, anio)
);

-- 4. Tabla de roles de pago (detalle por empleado y período)
CREATE TABLE public.roles_pago (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  periodo_id UUID NOT NULL REFERENCES public.periodos_nomina(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Datos base
  dias_mes INTEGER NOT NULL DEFAULT 30,
  sueldo_nominal NUMERIC(10,2) NOT NULL DEFAULT 0,
  salario_basico_unificado NUMERIC(10,2) NOT NULL DEFAULT 470,
  
  -- Días y permisos
  dias_no_trabajados INTEGER NOT NULL DEFAULT 0,
  dias_permiso_medico INTEGER NOT NULL DEFAULT 0,
  dias_trabajados INTEGER NOT NULL DEFAULT 30,
  
  -- Horas extras
  horas_50 NUMERIC(10,2) NOT NULL DEFAULT 0,
  horas_100 NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_horas_50 NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_horas_100 NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Bonos
  dias_cierre INTEGER NOT NULL DEFAULT 0,
  bono_diario_cierre NUMERIC(10,2) NOT NULL DEFAULT 0,
  bono_cierre NUMERIC(10,2) NOT NULL DEFAULT 0,
  bonificacion NUMERIC(10,2) NOT NULL DEFAULT 0,
  viaticos NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Cálculos intermedios
  valor_dia NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento_dias_no_trabajados NUMERIC(10,2) NOT NULL DEFAULT 0,
  descuento_permiso_medico NUMERIC(10,2) NOT NULL DEFAULT 0,
  sueldo_ganado NUMERIC(10,2) NOT NULL DEFAULT 0,
  valor_hora_ordinaria NUMERIC(10,4) NOT NULL DEFAULT 0,
  
  -- Décimos
  decimo_tercero_sueldo NUMERIC(10,2) NOT NULL DEFAULT 0,
  decimo_tercero_horas_50 NUMERIC(10,2) NOT NULL DEFAULT 0,
  decimo_tercero_horas_100 NUMERIC(10,2) NOT NULL DEFAULT 0,
  decimo_tercero_mensualizado NUMERIC(10,2) NOT NULL DEFAULT 0,
  decimo_cuarto_mensualizado NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Fondo de reserva
  valor_fondo_reserva NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Totales ingresos
  total_ingresos NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_ganado NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Descuentos
  aporte_personal NUMERIC(10,2) NOT NULL DEFAULT 0,
  prestamos_iess NUMERIC(10,2) NOT NULL DEFAULT 0,
  prestamos_empleado NUMERIC(10,2) NOT NULL DEFAULT 0,
  anticipo_sueldo NUMERIC(10,2) NOT NULL DEFAULT 0,
  retencion_renta NUMERIC(10,2) NOT NULL DEFAULT 0,
  otros_descuentos NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposito_iess NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_descuentos NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Neto
  neto_recibir NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(periodo_id, empleado_id)
);

-- 5. Tabla de histórico de sueldos
CREATE TABLE public.historico_sueldos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  sueldo_anterior NUMERIC(10,2) NOT NULL,
  sueldo_nuevo NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Tabla de histórico laboral
CREATE TABLE public.historico_laboral (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY EN TODAS LAS TABLAS
-- =====================================================

ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.periodos_nomina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_pago ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_sueldos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_laboral ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS - AISLAMIENTO TOTAL POR USUARIO
-- =====================================================

-- Políticas para EMPRESAS
CREATE POLICY "Users can view their own empresas" 
ON public.empresas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own empresas" 
ON public.empresas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own empresas" 
ON public.empresas FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas para EMPLEADOS
CREATE POLICY "Users can view their own empleados" 
ON public.empleados FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own empleados" 
ON public.empleados FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own empleados" 
ON public.empleados FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own empleados" 
ON public.empleados FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para PERIODOS_NOMINA
CREATE POLICY "Users can view their own periodos" 
ON public.periodos_nomina FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own periodos" 
ON public.periodos_nomina FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own periodos" 
ON public.periodos_nomina FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas para ROLES_PAGO
CREATE POLICY "Users can view their own roles_pago" 
ON public.roles_pago FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own roles_pago" 
ON public.roles_pago FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roles_pago" 
ON public.roles_pago FOR UPDATE 
USING (auth.uid() = user_id);

-- Políticas para HISTORICO_SUELDOS
CREATE POLICY "Users can view their own historico_sueldos" 
ON public.historico_sueldos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own historico_sueldos" 
ON public.historico_sueldos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Políticas para HISTORICO_LABORAL
CREATE POLICY "Users can view their own historico_laboral" 
ON public.historico_laboral FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own historico_laboral" 
ON public.historico_laboral FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_periodos_nomina_updated_at
  BEFORE UPDATE ON public.periodos_nomina
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_pago_updated_at
  BEFORE UPDATE ON public.roles_pago
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STORAGE BUCKET PARA LOGOS DE EMPRESAS
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos', 
  'logos', 
  true, 
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png']
);

-- Políticas de storage para logos
CREATE POLICY "Users can view logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

CREATE POLICY "Users can upload their own logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'logos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_empresas_user_id ON public.empresas(user_id);
CREATE INDEX idx_empleados_empresa_id ON public.empleados(empresa_id);
CREATE INDEX idx_empleados_user_id ON public.empleados(user_id);
CREATE INDEX idx_periodos_empresa_id ON public.periodos_nomina(empresa_id);
CREATE INDEX idx_roles_pago_periodo_id ON public.roles_pago(periodo_id);
CREATE INDEX idx_roles_pago_empleado_id ON public.roles_pago(empleado_id);