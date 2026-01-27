-- Add estimation columns to ride_requests
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS estimated_price decimal(10,2),
ADD COLUMN IF NOT EXISTS estimated_distance decimal(10,2),
ADD COLUMN IF NOT EXISTS estimated_duration integer; -- minutes

-- Add location tracking to drivers
ALTER TABLE public.drivers
ADD COLUMN IF NOT EXISTS current_latitude decimal(10,8),
ADD COLUMN IF NOT EXISTS current_longitude decimal(10,8),
ADD COLUMN IF NOT EXISTS heading decimal(5,2); -- for rotation/bearing

-- Add function to update driver location (for security if needed, or just RLS)
-- ensuring RLS allows drivers to update their own location is crucial.
