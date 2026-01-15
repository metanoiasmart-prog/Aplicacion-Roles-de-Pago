-- Create empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
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

-- Enable RLS on empresas
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;

-- RLS policies for empresas
CREATE POLICY "Users can view their own empresas"
  ON public.empresas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own empresas"
  ON public.empresas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own empresas"
  ON public.empresas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own empresas"
  ON public.empresas FOR DELETE
  USING (auth.uid() = user_id);

-- Create empleados table
CREATE TABLE public.empleados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  nombre_completo TEXT NOT NULL,
  cedula TEXT,
  cargo TEXT,
  sueldo_nominal DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_ingreso DATE NOT NULL,
  fecha_salida DATE,
  activo BOOLEAN NOT NULL DEFAULT true,
  mensualiza_decimos BOOLEAN NOT NULL DEFAULT false,
  gana_fondo_reserva BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on empleados
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;

-- RLS policies for empleados
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

-- Create periodos_nomina table
CREATE TABLE public.periodos_nomina (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
  anio INTEGER NOT NULL,
  fecha_corte DATE,
  dias_mes INTEGER NOT NULL DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, mes, anio)
);

-- Enable RLS on periodos_nomina
ALTER TABLE public.periodos_nomina ENABLE ROW LEVEL SECURITY;

-- RLS policies for periodos_nomina
CREATE POLICY "Users can view their own periodos"
  ON public.periodos_nomina FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own periodos"
  ON public.periodos_nomina FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own periodos"
  ON public.periodos_nomina FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own periodos"
  ON public.periodos_nomina FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_periodos_nomina_updated_at
  BEFORE UPDATE ON public.periodos_nomina
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true);

-- Storage policies for logos
CREATE POLICY "Logo images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

CREATE POLICY "Users can upload their own logos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own logos"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own logos"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND auth.uid()::text = (storage.foldername(name))[1]);