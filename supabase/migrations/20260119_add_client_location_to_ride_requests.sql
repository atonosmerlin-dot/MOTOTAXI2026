-- Add client location fields to ride_requests table
ALTER TABLE public.ride_requests
ADD COLUMN client_latitude DOUBLE PRECISION,
ADD COLUMN client_longitude DOUBLE PRECISION,
ADD COLUMN client_accuracy DOUBLE PRECISION;

-- Add comment for clarity
COMMENT ON COLUMN public.ride_requests.client_latitude IS 'Latitude da localização do cliente quando solicitou a corrida';
COMMENT ON COLUMN public.ride_requests.client_longitude IS 'Longitude da localização do cliente quando solicitou a corrida';
COMMENT ON COLUMN public.ride_requests.client_accuracy IS 'Precisão da localização em metros';
