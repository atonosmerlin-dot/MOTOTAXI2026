-- Criar enum para roles
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'client');

-- Criar enum para status de corrida
CREATE TYPE public.ride_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled');

-- Criar enum para status do motorista
CREATE TYPE public.driver_status AS ENUM ('idle', 'busy');

-- Tabela de perfis de usuários
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de roles (segurança)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Tabela de motoristas
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  is_online BOOLEAN DEFAULT FALSE NOT NULL,
  status driver_status DEFAULT 'idle' NOT NULL,
  current_point_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Tabela de pontos fixos
CREATE TABLE public.fixed_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Adicionar foreign key do driver para fixed_points
ALTER TABLE public.drivers 
ADD CONSTRAINT fk_drivers_current_point 
FOREIGN KEY (current_point_id) REFERENCES public.fixed_points(id) ON DELETE SET NULL;

-- Tabela de solicitações de corrida
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID REFERENCES public.fixed_points(id) ON DELETE CASCADE NOT NULL,
  client_id UUID,
  client_name TEXT,
  destination_address TEXT,
  client_whatsapp TEXT,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  status ride_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS em todas as tabelas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fixed_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ride_requests ENABLE ROW LEVEL SECURITY;

-- Função de verificação de role (security definer para evitar recursão)
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

-- Função para verificar se é motorista
CREATE OR REPLACE FUNCTION public.is_driver(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.drivers
    WHERE user_id = _user_id
  )
$$;

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at
  BEFORE UPDATE ON public.drivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_fixed_points_updated_at
  BEFORE UPDATE ON public.fixed_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ride_requests_updated_at
  BEFORE UPDATE ON public.ride_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies para profiles
CREATE POLICY "Profiles são públicos para leitura"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Usuários podem atualizar próprio perfil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Usuários podem criar próprio perfil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies para user_roles
CREATE POLICY "Usuários podem ver próprias roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Apenas admins podem gerenciar roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para drivers
-- Qualquer um (autenticado ou não) pode ver motoristas
CREATE POLICY "Drivers - SELECT para todos"
  ON public.drivers FOR SELECT
  USING (true);

-- Drivers podem atualizar seus próprios registros
CREATE POLICY "Drivers - UPDATE próprio"
  ON public.drivers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins podem fazer tudo com drivers
CREATE POLICY "Drivers - ADMIN full access"
  ON public.drivers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Drivers podem se registrar (INSERT)
CREATE POLICY "Drivers - INSERT autenticados"
  ON public.drivers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies para fixed_points
-- Qualquer um pode ver pontos fixos
CREATE POLICY "Fixed Points - SELECT para todos"
  ON public.fixed_points FOR SELECT
  USING (true);

-- Apenas admins podem gerenciar pontos
CREATE POLICY "Fixed Points - ADMIN gerencia"
  ON public.fixed_points FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies para ride_requests
-- Qualquer um pode ver ride requests
CREATE POLICY "Ride Requests - SELECT para todos"
  ON public.ride_requests FOR SELECT
  USING (true);

-- Qualquer um pode criar ride requests
CREATE POLICY "Ride Requests - INSERT para todos"
  ON public.ride_requests FOR INSERT
  WITH CHECK (true);

-- Drivers e admins podem atualizar
CREATE POLICY "Ride Requests - UPDATE drivers/admin"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.drivers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ride_requests;

-- Função para criar perfil automático no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'name', 'Usuário'));
  RETURN NEW;
END;
$$;

-- Trigger para criar perfil no signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();