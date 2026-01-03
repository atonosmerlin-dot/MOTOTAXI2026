-- Verificar status de todos os motoristas
SELECT id, user_id, is_online, status, created_at FROM public.drivers;

-- Verifica motorista específico "wagner"
-- Procuramos pela profile name 'wagner'
SELECT d.id, d.user_id, d.is_online, d.status, p.name
FROM public.drivers d
JOIN public.profiles p ON p.id = d.user_id
WHERE p.name = 'wagner';

-- Se o motorista existe mas está offline, ativar ele
-- Primeiro, encontre o user_id correto
-- Depois, execute:
-- UPDATE public.drivers 
-- SET is_online = true, status = 'idle'
-- WHERE user_id = '<user_id_do_wagner>';
