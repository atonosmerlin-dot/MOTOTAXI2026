-- Function to cleanup messages
CREATE OR REPLACE FUNCTION public.cleanup_ride_messages()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to completed or cancelled
    IF (NEW.status IN ('completed', 'cancelled') AND OLD.status NOT IN ('completed', 'cancelled')) THEN
        DELETE FROM public.ride_messages WHERE ride_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trigger_cleanup_ride_messages ON public.ride_requests;

CREATE TRIGGER trigger_cleanup_ride_messages
AFTER UPDATE ON public.ride_requests
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_ride_messages();
