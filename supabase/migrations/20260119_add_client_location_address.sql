-- Add client_location_address field to ride_requests table
ALTER TABLE public.ride_requests
ADD COLUMN client_location_address TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.ride_requests.client_location_address IS 'Endereço reverso obtido da localização do cliente via Nominatim';
