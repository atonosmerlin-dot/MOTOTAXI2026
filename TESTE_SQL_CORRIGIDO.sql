-- ============================================================
-- TESTE 1: VERIFICAR RLS POLICIES (CORRIGIDO)
-- ============================================================

-- Copie e execute TUDO no Supabase SQL Editor
-- https://supabase.com/dashboard → [seu-projeto] → SQL Editor

-- ✅ PASSO 1: Ver status de RLS
SELECT 
  tablename,
  rowsecurity as "RLS Habilitado?"
FROM pg_tables 
WHERE tablename = 'push_subscriptions';

-- ✅ PASSO 2: Listar policies (se houver)
SELECT 
  policyname,
  permissive,
  cmd as "Operation"
FROM pg_policies 
WHERE tablename = 'push_subscriptions';

-- ✅ PASSO 3: Contar motoristas online
SELECT COUNT(*) as "Total Motoristas Online" 
FROM drivers 
WHERE is_online = true;

-- ✅ PASSO 4: Contar subscriptions ativas
SELECT COUNT(*) as "Total Subscriptions Ativas" 
FROM push_subscriptions 
WHERE enabled = true;

-- ✅ PASSO 5: Verificar detalhes - Motoristas ONLINE com SUBSCRIPTIONS
SELECT 
  d.id,
  COUNT(ps.id) as subscriptions_count,
  d.is_online
FROM drivers d
LEFT JOIN push_subscriptions ps ON d.id = ps.driver_id AND ps.enabled = true
WHERE d.is_online = true
GROUP BY d.id, d.is_online
LIMIT 10;

-- ✅ PASSO 6: Ver todas as corridas pendentes
SELECT 
  id,
  point_id,
  client_name,
  status,
  created_at
FROM ride_requests
WHERE status = 'pending'
ORDER BY created_at DESC
LIMIT 5;

-- ✅ PASSO 7: Validar que subscriptions têm endpoint válido
SELECT 
  id,
  driver_id,
  enabled,
  (subscription->>'endpoint' LIKE 'https://%') as endpoint_válido
FROM push_subscriptions 
WHERE enabled = true
LIMIT 5;
