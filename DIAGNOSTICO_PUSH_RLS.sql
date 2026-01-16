-- ============================================================
-- DIAGNÓSTICO E FIX - PUSH NOTIFICATIONS RLS
-- ============================================================

-- PASSO 1: Verificar se push_subscriptions tem RLS habilitado
SELECT 
  tablename,
  rowsecurity as "RLS Habilitado?"
FROM pg_tables 
WHERE tablename = 'push_subscriptions';

-- PASSO 2: Listar todas as RLS policies da tabela
SELECT 
  policyname,
  permissive,
  cmd as "Operation"
FROM pg_policies 
WHERE tablename = 'push_subscriptions';

-- PASSO 3: Verificar quantas subscriptions existem
SELECT COUNT(*) as "Total Subscriptions" FROM push_subscriptions;
SELECT COUNT(*) as "Active Subscriptions" FROM push_subscriptions WHERE enabled = true;

-- PASSO 4: Verificar quantos motoristas estão online
SELECT COUNT(*) as "Online Drivers" FROM drivers WHERE is_online = true;

-- PASSO 5: Ver se há mismatch entre drivers online e subscriptions
SELECT 
  d.id as driver_id,
  d.is_online,
  ps.id as subscription_id,
  ps.enabled
FROM drivers d
LEFT JOIN push_subscriptions ps ON d.id = ps.driver_id
WHERE d.is_online = true
LIMIT 10;

-- ============================================================
-- FIX: Se push_subscriptions tiver RLS restritivo, remover
-- ============================================================

-- Verificar o estado atual de RLS
DO $$ 
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT rowsecurity INTO rls_enabled
  FROM pg_tables
  WHERE tablename = 'push_subscriptions';
  
  IF rls_enabled THEN
    RAISE NOTICE 'RLS está HABILITADO em push_subscriptions. Desabilitando...';
    ALTER TABLE push_subscriptions DISABLE ROW LEVEL SECURITY;
    RAISE NOTICE '✅ RLS desabilitado. Push subscriptions agora é acessível por todas as funções.';
  ELSE
    RAISE NOTICE '✅ RLS já está desabilitado em push_subscriptions';
  END IF;
END $$;

-- ============================================================
-- GARANTIR QUE NÃO HÁ POLICIES RESTRITIVAS
-- ============================================================

-- Listar policies (se existirem):
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname FROM pg_policies WHERE tablename = 'push_subscriptions'
  LOOP
    EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.push_subscriptions CASCADE';
    RAISE NOTICE 'Removida policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- ============================================================
-- VERIFICAÇÃO FINAL
-- ============================================================

-- Verificar se está funcionando agora
SELECT 
  COUNT(*) as "Total Subscriptions",
  COUNT(CASE WHEN enabled = true THEN 1 END) as "Enabled",
  COUNT(DISTINCT driver_id) as "Unique Drivers"
FROM push_subscriptions;

-- Mostrar subscriptions de drivers online
SELECT 
  d.id,
  d.name,
  ps.driver_id,
  ps.enabled,
  ps.created_at
FROM drivers d
INNER JOIN push_subscriptions ps ON d.id = ps.driver_id
WHERE d.is_online = true AND ps.enabled = true
LIMIT 20;
