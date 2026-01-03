-- Adicionar campos para informações do cliente na ride_requests
ALTER TABLE public.ride_requests 
ADD COLUMN client_name TEXT,
ADD COLUMN destination_address TEXT,
ADD COLUMN client_whatsapp TEXT;
