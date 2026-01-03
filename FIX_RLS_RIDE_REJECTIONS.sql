-- FIX: Ajusta policies de RLS para `ride_rejections`
-- Execute no Supabase SQL Editor

-- 1) Remover policies antigas (se existirem)
DROP POLICY IF EXISTS "drivers_can_view_own_rejections" ON public.ride_rejections;
DROP POLICY IF EXISTS "drivers_can_insert_rejections" ON public.ride_rejections;

-- 2) Criar policy de SELECT: permitir que o motorista veja apenas suas rejeições
CREATE POLICY "drivers_can_view_own_rejections"
  ON public.ride_rejections FOR SELECT
  USING (
    -- permite se o motorista logado for o user_id associado ao driver (via drivers.user_id)
    EXISTS(
      SELECT 1 FROM public.drivers d WHERE d.id = public.ride_rejections.driver_id AND d.user_id = auth.uid()
    )
    OR
    -- ou se for admin
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- 3) Criar policy de INSERT: permitir inserir apenas quando o driver autenticado corresponder
CREATE POLICY "drivers_can_insert_rejections"
  ON public.ride_rejections FOR INSERT
  WITH CHECK (
    EXISTS(
      SELECT 1 FROM public.drivers d WHERE d.id = public.ride_rejections.driver_id AND d.user_id = auth.uid()
    )
    OR
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- 4) (Opcional) Policy para DELETE se quiser permitir que motorista remova sua própria rejeição
DROP POLICY IF EXISTS "drivers_can_delete_own_rejections" ON public.ride_rejections;
CREATE POLICY "drivers_can_delete_own_rejections"
  ON public.ride_rejections FOR DELETE
  USING (
    EXISTS(
      SELECT 1 FROM public.drivers d WHERE d.id = public.ride_rejections.driver_id AND d.user_id = auth.uid()
    )
    OR
    EXISTS(SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- 5) Verificação simples: retornar 0 se não houver nada (apenas para conferir execução)
SELECT 'FIX_APPLIED' as status, COUNT(*) as total_rejections FROM public.ride_rejections;
