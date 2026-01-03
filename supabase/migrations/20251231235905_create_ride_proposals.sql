-- Create ride_proposals table to store driver price proposals
CREATE TABLE IF NOT EXISTS public.ride_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID REFERENCES public.ride_requests(id) ON DELETE CASCADE NOT NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE CASCADE NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'proposed' NOT NULL, -- proposed | accepted | rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column_ride_proposals()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_ride_proposals_updated_at'
  ) THEN
    CREATE TRIGGER update_ride_proposals_updated_at
      BEFORE UPDATE ON public.ride_proposals
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column_ride_proposals();
  END IF;
END$$;

GRANT SELECT ON public.ride_proposals TO PUBLIC;
