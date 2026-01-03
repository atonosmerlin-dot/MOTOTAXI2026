-- Add origin zone to ride_requests to record origin zone at request time
ALTER TABLE IF EXISTS public.ride_requests
  ADD COLUMN IF NOT EXISTS origin_zona_id UUID REFERENCES public.zones_destino(id) ON DELETE SET NULL;
