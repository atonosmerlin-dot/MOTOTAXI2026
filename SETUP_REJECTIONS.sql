-- ==========================================
-- IMPORTANTE: Execute isso no Supabase SQL Editor
-- ==========================================

-- 1. Criar tabela ride_rejections
CREATE TABLE IF NOT EXISTS public.ride_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ride_id, driver_id)
);

-- 2. Habilitar RLS
ALTER TABLE public.ride_rejections ENABLE ROW LEVEL SECURITY;

-- 3. Criar políticas de RLS
CREATE POLICY "drivers_can_view_own_rejections"
  ON public.ride_rejections FOR SELECT
  USING (
    AUTH.UID() = driver_id OR 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = AUTH.UID() AND role = 'admin')
  );

CREATE POLICY "drivers_can_insert_rejections"
  ON public.ride_rejections FOR INSERT
  WITH CHECK (
    AUTH.UID() = driver_id OR 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = AUTH.UID() AND role = 'admin')
  );

-- 4. Criar índices
CREATE INDEX IF NOT EXISTS idx_ride_rejections_ride_id ON public.ride_rejections(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_rejections_driver_id ON public.ride_rejections(driver_id);

-- 5. Criar função para auto-cleanup de corridas com 30+ minutos pendentes
CREATE OR REPLACE FUNCTION public.cleanup_expired_rides()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ride_requests
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- 6. Criar função trigger
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_rides()
RETURNS TRIGGER AS $$
BEGIN
  -- Rodar cleanup quando uma ride é criada ou atualizada
  PERFORM public.cleanup_expired_rides();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Remover trigger anterior se existir
DROP TRIGGER IF EXISTS cleanup_expired_rides_on_ride_change ON public.ride_requests;

-- 8. Criar novo trigger
CREATE TRIGGER cleanup_expired_rides_on_ride_change
  AFTER INSERT OR UPDATE ON public.ride_requests
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_expired_rides();

-- 9. Verificar se tudo foi criado
SELECT 
  'ride_rejections' as table_name,
  COUNT(*) as total_rejections
FROM public.ride_rejections;

-- FIM - TUDO PRONTO!
-- Agora o sistema funcionará assim:
-- 1. Cada motorista vê TODAS as corridas pendentes
-- 2. Quando rejeita, é inserida uma linha em ride_rejections
-- 3. A query do motorista filtra as rejeitadas automaticamente
-- 4. Se passar 30 minutos sem aceitar, a corrida é deletada automaticamente
-- 5. A rejeição é individual - outros motoristas continuam vendo a corrida
