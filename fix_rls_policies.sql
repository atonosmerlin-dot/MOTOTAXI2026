-- Correção: Remover policies antigas e criar novas que permitam acesso de usuários não autenticados

-- Remover policies antigas de drivers
DROP POLICY IF EXISTS "Drivers são públicos para leitura" ON public.drivers;
DROP POLICY IF EXISTS "Drivers podem atualizar próprio registro" ON public.drivers;
DROP POLICY IF EXISTS "Admins podem gerenciar todos drivers" ON public.drivers;
DROP POLICY IF EXISTS "Usuários autenticados podem se registrar como driver" ON public.drivers;

-- Remover policies antigas de fixed_points
DROP POLICY IF EXISTS "Pontos são públicos para leitura" ON public.fixed_points;
DROP POLICY IF EXISTS "Apenas admins podem gerenciar pontos" ON public.fixed_points;

-- Remover policies antigas de ride_requests
DROP POLICY IF EXISTS "Ride requests são públicos para leitura" ON public.ride_requests;
DROP POLICY IF EXISTS "Qualquer um pode criar ride request" ON public.ride_requests;
DROP POLICY IF EXISTS "Drivers podem atualizar requests atribuídos" ON public.ride_requests;

-- ============ DRIVERS ============
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

-- ============ FIXED POINTS ============
-- Qualquer um pode ver pontos fixos
CREATE POLICY "Fixed Points - SELECT para todos"
  ON public.fixed_points FOR SELECT
  USING (true);

-- Apenas admins podem gerenciar pontos
CREATE POLICY "Fixed Points - ADMIN gerencia"
  ON public.fixed_points FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============ RIDE REQUESTS ============
-- Qualquer um pode ver ride requests
CREATE POLICY "Ride Requests - SELECT para todos"
  ON public.ride_requests FOR SELECT
  USING (true);

-- Qualquer um pode criar ride requests
CREATE POLICY "Ride Requests - INSERT para todos"
  ON public.ride_requests FOR INSERT
  USING (true);

-- Drivers e admins podem atualizar
CREATE POLICY "Ride Requests - UPDATE drivers/admin"
  ON public.ride_requests FOR UPDATE
  TO authenticated
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
