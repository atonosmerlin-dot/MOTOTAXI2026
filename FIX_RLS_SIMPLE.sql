-- Executar tudo de uma vez no Supabase SQL Editor

-- 1. Remover TODAS as policies antigas
DROP POLICY IF EXISTS "Drivers são públicos para leitura" ON public.drivers;
DROP POLICY IF EXISTS "Drivers podem atualizar próprio registro" ON public.drivers;
DROP POLICY IF EXISTS "Admins podem gerenciar todos drivers" ON public.drivers;
DROP POLICY IF EXISTS "Usuários autenticados podem se registrar como driver" ON public.drivers;
DROP POLICY IF EXISTS "Drivers - SELECT para todos" ON public.drivers;
DROP POLICY IF EXISTS "Drivers - UPDATE próprio" ON public.drivers;
DROP POLICY IF EXISTS "Drivers - ADMIN full access" ON public.drivers;
DROP POLICY IF EXISTS "Drivers - INSERT autenticados" ON public.drivers;

DROP POLICY IF EXISTS "Pontos são públicos para leitura" ON public.fixed_points;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar pontos" ON public.fixed_points;
DROP POLICY IF EXISTS "Fixed Points - SELECT para todos" ON public.fixed_points;
DROP POLICY IF EXISTS "Fixed Points - ADMIN gerencia" ON public.fixed_points;

DROP POLICY IF EXISTS "Ride requests são públicos para leitura" ON public.ride_requests;
DROP POLICY IF EXISTS "Qualquer um pode criar ride request" ON public.ride_requests;
DROP POLICY IF EXISTS "Drivers podem atualizar requests atribuídos" ON public.ride_requests;
DROP POLICY IF EXISTS "Ride Requests - SELECT para todos" ON public.ride_requests;
DROP POLICY IF EXISTS "Ride Requests - INSERT para todos" ON public.ride_requests;
DROP POLICY IF EXISTS "Ride Requests - UPDATE drivers/admin" ON public.ride_requests;

-- 2. Criar policies SIMPLES que funcionam
-- DRIVERS - Todos podem ver
CREATE POLICY "drivers_select_all" ON public.drivers FOR SELECT USING (true);

-- DRIVERS - Drivers podem atualizar seu próprio
CREATE POLICY "drivers_update_self" ON public.drivers FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- DRIVERS - Admins podem fazer tudo
CREATE POLICY "drivers_admin_all" ON public.drivers FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- DRIVERS - Drivers podem se inserir
CREATE POLICY "drivers_insert_auth" ON public.drivers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- FIXED POINTS - Todos podem ver
CREATE POLICY "points_select_all" ON public.fixed_points FOR SELECT USING (true);

-- FIXED POINTS - Admins podem fazer tudo
CREATE POLICY "points_admin_all" ON public.fixed_points FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RIDE REQUESTS - Todos podem ver
CREATE POLICY "requests_select_all" ON public.ride_requests FOR SELECT USING (true);

-- RIDE REQUESTS - Todos podem inserir
CREATE POLICY "requests_insert_all" ON public.ride_requests FOR INSERT WITH CHECK (true);

-- RIDE REQUESTS - Drivers e admins podem atualizar
CREATE POLICY "requests_update_drivers" ON public.ride_requests FOR UPDATE TO authenticated USING (
  driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin')
);
