-- Add motorcycle details columns to drivers table
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS moto_brand TEXT DEFAULT NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS moto_model TEXT DEFAULT NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS moto_color TEXT DEFAULT NULL;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS moto_plate TEXT DEFAULT NULL;

-- Add photo_url column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_url TEXT DEFAULT NULL;
