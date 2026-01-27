-- Ensure price column exists in ride_requests
ALTER TABLE public.ride_requests 
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2);

-- Re-create the cleanup function to be robust
CREATE OR REPLACE FUNCTION public.cleanup_ride_messages()
RETURNS TRIGGER AS $$
BEGIN
    -- Delete messages if the ride is finished/cancelled
    IF NEW.status IN ('completed', 'cancelled') THEN
        DELETE FROM public.ride_messages WHERE ride_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_cleanup_ride_messages ON public.ride_requests;

CREATE TRIGGER trigger_cleanup_ride_messages
AFTER UPDATE ON public.ride_requests
FOR EACH ROW
WHEN (NEW.status IN ('completed', 'cancelled'))
EXECUTE FUNCTION public.cleanup_ride_messages();
