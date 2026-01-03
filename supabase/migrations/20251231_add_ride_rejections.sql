-- Create ride_rejections table to track which drivers rejected which rides
CREATE TABLE IF NOT EXISTS public.ride_rejections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES public.ride_requests(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ride_id, driver_id)
);

-- Add RLS policy for ride_rejections
ALTER TABLE public.ride_rejections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "riders_can_view_rejections_on_own_rides"
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

-- Create index for performance
CREATE INDEX idx_ride_rejections_ride_id ON public.ride_rejections(ride_id);
CREATE INDEX idx_ride_rejections_driver_id ON public.ride_rejections(driver_id);

-- Function to auto-delete ride requests older than 30 minutes that haven't been accepted
CREATE OR REPLACE FUNCTION public.cleanup_expired_rides()
RETURNS void AS $$
BEGIN
  DELETE FROM public.ride_requests
  WHERE status = 'pending' 
  AND created_at < NOW() - INTERVAL '30 minutes';
END;
$$ LANGUAGE plpgsql;

-- Trigger to run cleanup every time a new ride is created or a ride is accepted/completed
CREATE OR REPLACE FUNCTION public.trigger_cleanup_expired_rides()
RETURNS TRIGGER AS $$
BEGIN
  -- Run cleanup when ride status changes or new ride is created
  PERFORM public.cleanup_expired_rides();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists (to avoid conflicts)
DROP TRIGGER IF EXISTS cleanup_expired_rides_on_ride_change ON public.ride_requests;

-- Create trigger that fires on INSERT or UPDATE on ride_requests
CREATE TRIGGER cleanup_expired_rides_on_ride_change
  AFTER INSERT OR UPDATE ON public.ride_requests
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trigger_cleanup_expired_rides();

-- Verify the cleanup function works
SELECT 'Migration complete: Added ride_rejections table with auto-cleanup' as status;
