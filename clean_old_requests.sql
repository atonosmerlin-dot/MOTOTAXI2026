-- Limpar corridas antigas (status pending ou accepted muito antigas)
DELETE FROM public.ride_requests 
WHERE status != 'completed' 
AND status != 'cancelled'
AND created_at < NOW() - INTERVAL '1 hour';

-- Verificar o que restou
SELECT id, status, client_name, destination_address, driver_id, created_at 
FROM public.ride_requests 
ORDER BY created_at DESC;
