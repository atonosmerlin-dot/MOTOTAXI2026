-- Add origin zone reference to fixed_points
ALTER TABLE IF EXISTS public.fixed_points
  ADD COLUMN IF NOT EXISTS zone_id UUID REFERENCES public.zones_destino(id) ON DELETE SET NULL;
