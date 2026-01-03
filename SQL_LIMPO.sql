-- SQL CORRIGIDO - Execute isso!

-- 1. Deletar tabela antiga (se existir) para começar do zero
DROP TABLE IF EXISTS public.ride_rejections CASCADE;

-- 2. Criar tabela nova
CREATE TABLE public.ride_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ride_id, driver_id)
);

-- 3. Habilitar RLS
ALTER TABLE public.ride_rejections ENABLE ROW LEVEL SECURITY;

-- 4. Criar policy para SELECT
CREATE POLICY "drivers_can_view_own_rejections"
  ON public.ride_rejections FOR SELECT
  USING (
    AUTH.UID() = driver_id OR 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = AUTH.UID() AND role = 'admin')
  );

-- 5. Criar policy para INSERT
CREATE POLICY "drivers_can_insert_rejections"
  ON public.ride_rejections FOR INSERT
  WITH CHECK (
    AUTH.UID() = driver_id OR 
    EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = AUTH.UID() AND role = 'admin')
  );

-- 6. Criar índices
CREATE INDEX idx_ride_rejections_ride_id ON public.ride_rejections(ride_id);
CREATE INDEX idx_ride_rejections_driver_id ON public.ride_rejections(driver_id);

-- 7. Função de auto-cleanup
CREATE OR REPLACE FUNCTION public.cleanup_expired_rides()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ride_requests
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- 8. Função trigger
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_rides()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.cleanup_expired_rides();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Deletar trigger antiga
DROP TRIGGER IF EXISTS cleanup_expired_rides_on_ride_change ON public.ride_requests;

-- 10. Criar trigger novo
CREATE TRIGGER cleanup_expired_rides_on_ride_change
  AFTER INSERT OR UPDATE ON public.ride_requests
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_expired_rides();

-- 11. Verificação
SELECT 'SETUP COMPLETO ✅' as resultado, COUNT(*) as total_rejections FROM public.ride_rejections;
