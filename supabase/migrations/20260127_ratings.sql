-- Create ratings table
CREATE TABLE IF NOT EXISTS public.ratings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  ride_id uuid REFERENCES public.ride_requests(id) NOT NULL,
  rater_id uuid NOT NULL, -- user_id or client_id (string)
  rated_id uuid NOT NULL, -- driver_id or client_id
  rating integer CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

-- Add average rating to drivers table for fast lookup
ALTER TABLE public.drivers 
ADD COLUMN IF NOT EXISTS rating decimal(3,2) DEFAULT 5.00,
ADD COLUMN IF NOT EXISTS total_ratings integer DEFAULT 0;

-- Function to update driver average rating on new rating
CREATE OR REPLACE FUNCTION update_driver_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if the rated_id matches a driver's ID
  UPDATE public.drivers
  SET 
    rating = (SELECT AVG(rating) FROM public.ratings WHERE rated_id = NEW.rated_id),
    total_ratings = (SELECT COUNT(*) FROM public.ratings WHERE rated_id = NEW.rated_id)
  WHERE id = NEW.rated_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_rating_added
AFTER INSERT ON public.ratings
FOR EACH ROW
EXECUTE FUNCTION update_driver_rating();
