
-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  UNIQUE (user_id, role)
);

-- Create empresas table
CREATE TABLE public.empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  ruc TEXT NOT NULL,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create empleados table
CREATE TABLE public.empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cedula TEXT NOT NULL,
  nombre_completo TEXT NOT NULL,
  cargo TEXT,
  fecha_ingreso DATE NOT NULL,
  sueldo_nominal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tipo_contrato TEXT,
  estado TEXT DEFAULT 'activo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create roles_pago table
CREATE TABLE public.roles_pago (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  mes TEXT NOT NULL,
  anio INTEGER NOT NULL,
  dias_trabajados INTEGER NOT NULL DEFAULT 30,
  sueldo_nominal DECIMAL(10,2) NOT NULL DEFAULT 0,
  horas_extra DECIMAL(10,2) DEFAULT 0,
  valor_horas_extra DECIMAL(10,2) DEFAULT 0,
  comisiones DECIMAL(10,2) DEFAULT 0,
  bonificaciones DECIMAL(10,2) DEFAULT 0,
  fondos_reserva DECIMAL(10,2) DEFAULT 0,
  decimo_tercero DECIMAL(10,2) DEFAULT 0,
  decimo_cuarto DECIMAL(10,2) DEFAULT 0,
  otros_ingresos DECIMAL(10,2) DEFAULT 0,
  aporte_iess DECIMAL(10,2) DEFAULT 0,
  prestamos DECIMAL(10,2) DEFAULT 0,
  anticipos DECIMAL(10,2) DEFAULT 0,
  otros_descuentos DECIMAL(10,2) DEFAULT 0,
  total_ingresos DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_descuentos DECIMAL(10,2) NOT NULL DEFAULT 0,
  neto_recibir DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles_pago ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empleados_updated_at
  BEFORE UPDATE ON public.empleados
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_roles_pago_updated_at
  BEFORE UPDATE ON public.roles_pago
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for user_roles (read-only for users)
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policies for empresas
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

-- RLS Policies for empleados
CREATE POLICY "Users can view empleados of their empresas"
  ON public.empleados FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = empleados.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create empleados in their empresas"
  ON public.empleados FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = empleados.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update empleados of their empresas"
  ON public.empleados FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = empleados.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete empleados of their empresas"
  ON public.empleados FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = empleados.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

-- RLS Policies for roles_pago
CREATE POLICY "Users can view roles_pago of their empresas"
  ON public.roles_pago FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = roles_pago.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create roles_pago in their empresas"
  ON public.roles_pago FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = roles_pago.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update roles_pago of their empresas"
  ON public.roles_pago FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = roles_pago.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete roles_pago of their empresas"
  ON public.roles_pago FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.empresas
      WHERE empresas.id = roles_pago.empresa_id
      AND empresas.user_id = auth.uid()
    )
  );
