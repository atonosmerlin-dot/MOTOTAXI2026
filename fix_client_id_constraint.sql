-- Remover constraint de foreign key de client_id
-- Executar no Supabase SQL Editor

ALTER TABLE public.ride_requests 
DROP CONSTRAINT ride_requests_client_id_fkey;

-- Agora client_id é apenas um UUID, não precisa estar em auth.users
-- Clientes anônimos podem ter um UUID local armazenado
