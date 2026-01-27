-- Add Pix fields to drivers table
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS pix_key TEXT,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT CHECK (pix_key_type IN ('cpf', 'email', 'phone', 'random'));

-- RLS should already allow drivers to update their own rows, but good to verify.
-- Assuming existing policy "Drivers can update own profile" exists.
