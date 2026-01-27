# 🔧 Diagnóstico e Correção - Notificações Chrome/PWA

## 🚨 Problema Identificado

- ✅ **Firefox**: Notificações funcionam perfeito
- ❌ **Chrome**: Notificações de chamadas reais NÃO funcionam
- ❌ **PWA**: Notificações de chamadas reais NÃO funcionam
- ✅ **Botão Teste**: Funciona em ambos (usa `showNotification()` local)

## 🔍 Análise da Causa

O problema está na diferença entre:

### ✅ Teste Local (funciona)
```typescript
// PushDebugPanel.tsx - usa showNotification() diretamente
await registration.showNotification('Test', { ... })
```

### ❌ Push Real (Chrome/PWA não funciona)
```
Usuario chama → ride_requests INSERT → 
notify-available-drivers API → 
sendPush() via Web Push Protocol → 
Service Worker recebe push event
```

**Causas Prováveis:**
1. **Chrome está bloqueando silenciosamente** o push (não há log de erro)
2. **VAPID keys podem estar incorretas** apenas para Chrome/PWA
3. **Subscription não está sendo salva corretamente** para PWA
4. **Payload vazio** (silent push) não dispara notificação no Chrome

## ✅ Soluções Implementadas

### 1️⃣ Melhor Diagnóstico no Service Worker
- Adicionado postMessage do SW para client
- Logs mais detalhados de sucesso/erro
- Timestamps únicos para forçar renotify em Chrome

**Arquivo:** `public/sw.js`

### 2️⃣ Logs Detalhados no Hook
- Verificação de cada step do subscribe
- Logs do VAPID key, endpoint, auth keys
- Mensagens do SW capturadas

**Arquivo:** `src/hooks/usePushNotifications.ts`

### 3️⃣ Cleanup do wrangler.toml
- Removido `project` e `account_id` vazios (warnings)

**Arquivo:** `wrangler.toml`

## 🎯 O que você precisa fazer

### Step 1: Testar no Chrome com Console Aberto

1. Abra o DriverDashboard no Chrome
2. **Abra DevTools** (F12)
3. Vá até a aba **Console**
4. Fique de olho nos logs `[PUSH]` enquanto:
   - Clica em "Ativar Notificações"
   - Depois clica no botão Teste de Notificação
   - Pede alguém para chamar

**Logs esperados:**

```
[PUSH] ============ SUBSCRIBE INICIADO ============
[PUSH] Step 1️⃣: Requesting notification permission...
[PUSH] Permission result: granted
[PUSH] Step 2️⃣: Registering service worker...
[PUSH] ✅ Service worker registered
[PUSH] Step 3️⃣: Creating push subscription...
[PUSH] ✅ Push subscription created
[PUSH] Subscription endpoint: https://fcm.googleapis.com/...
[PUSH-MESSAGE] Received from SW: { type: "PUSH_SHOWN", ... }  ← Isso significa que o push chegou!
```

### Step 2: Verificar Service Worker

1. No DevTools, vá para **Application** → **Service Workers**
2. Verifique se `/sw.js` está registrado e **active**
3. Clique em **Inspect** para ver se há erros

### Step 3: Verificar Subscription no Supabase

Abra o SQL Editor do Supabase e rode:

```sql
SELECT 
  driver_id,
  enabled,
  created_at,
  updated_at,
  subscription::text as endpoint_preview
FROM push_subscriptions
WHERE driver_id = 'SEU_DRIVER_ID'  -- Substitua seu ID
ORDER BY created_at DESC
LIMIT 1;
```

Procure por:
- `enabled = true`
- `subscription` contém um `endpoint` válido
- Deve ter `p256dh` e `auth` keys

### Step 4: Ativar Service Worker Worker Logs

No DevTools → **Application** → **Service Workers**, marque:
- ☑️ "Show all"
- Clique em "Inspect" para ver console do SW

Quando chegar uma chamada, veja os logs:

```
[SW-PUSH] 🔔 Push notification received!
[SW-PUSH] ✅ Notification displayed successfully
```

Se ver `❌ Display error`, anote o erro.

## 🔄 Fallback: Realtime Listening

Boas notícias! **Você já tem um fallback ativo:**

No `DriverDashboard.tsx` (linhas 147-180), há um listener Supabase Realtime que:
- ✅ **Funciona em todos os navegadores** (Firefox, Chrome, PWA)
- ✅ Já mostra notificação via `toast.success()`
- ✅ Dispara vibração
- ✅ Faz refetch da lista

```typescript
const channel = supabase
  .channel('ride_requests_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    table: 'ride_requests',
    filter: `status=eq.pending`
  }, (payload) => {
    // Isso já funciona em TODOS os navegadores!
    toast.success(`🎯 Nova corrida disponível!`);
    new Notification('🚨 Nova Corrida!', { ... });
  })
  .subscribe();
```

**Então por que o Realtime está funcionando mas o Push não?**

Realtime = conexão WebSocket contínua (sempre conectado)
Push = precisa da conexão Push do navegador

Se o PWA/Chrome não está recebendo push, continue usando o Realtime como fallback (já está funcionando!).

## 🐛 Se ainda não funcionar

### Verificar permissões do Chrome PWA

1. Na PWA instalada: **Settings** → **Notifications**
2. Encontre "mototaxi2026" e certifique-se que está **Allowed**

### Verificar se é um problema do seu servidor Node.js local

Se está usando `npm run dev` localmente:

```bash
# Veja os logs de notificação no terminal
# Procure por [NOTIFY-API] ou [SW-PUSH]
```

Se vir `❌ VAPID não configurado`, rode:

```bash
node server/generate-vapid.js
```

E copie as keys para `.env`:

```
VITE_VAPID_PUBLIC_KEY=...
```

### Resetar Service Worker e Subscription

Se nada funcionar, limpe e recomece:

1. **No DevTools → Application → Service Workers**
   - Clique "Unregister" em /sw.js

2. **No DevTools → Storage → Clear site data**
   - Apague tudo

3. **No Supabase**, delete a subscription:
```sql
DELETE FROM push_subscriptions 
WHERE driver_id = 'SEU_DRIVER_ID';
```

4. **Recarregue a página** e ative as notificações novamente

## 📊 Próximas Etapas

Depois que identificar o problema via logs, entre em contato com:
- ✅ **Logs do console** (Print de tela)
- ✅ **Se vê SW-PUSH** (push chegou ao SW)
- ✅ **Resultado do SQL** do Supabase
- ✅ **Versão do Chrome/Firefox**

Isso vai ajudar a debugar melhor!

---

## ℹ️ Nota Técnica

O Chrome/PWA usa **FCM (Firebase Cloud Messaging)** enquanto Firefox usa **Mozilla Push Service**. Ambas precisam de VAPID correto.

Se o push nunca chegar ao SW (`[SW-PUSH]` nunca aparecer), o problema é:
- VAPID keys incorretas
- Subscription inválida
- Servidor não enviando corretamente

Se chegar ao SW mas não mostrar notificação, o problema é:
- Permissão revogada enquanto navegava
- SW crashou
- Bug no showNotification()

---

**Deploy realizado em:** 2026-01-19
**Status:** ✅ Code updated, aguardando teste do usuário
