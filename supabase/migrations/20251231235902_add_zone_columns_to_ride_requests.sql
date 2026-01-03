-- Add zone reference and fixed_price to ride_requests
ALTER TABLE IF EXISTS public.ride_requests
  ADD COLUMN IF NOT EXISTS zona_id UUID REFERENCES public.zones_destino(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fixed_price NUMERIC(10,2);
