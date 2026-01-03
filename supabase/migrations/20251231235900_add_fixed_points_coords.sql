-- Add latitude, longitude, and is_active to fixed_points
ALTER TABLE public.fixed_points
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL;

-- Ensure updated_at trigger already exists; no further action required.
