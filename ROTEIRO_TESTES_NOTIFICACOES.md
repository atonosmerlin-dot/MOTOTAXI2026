# 🧪 Roteiro de Testes - Notificações Chrome/PWA

## 📱 Ambiente de Teste

- **URL:** https://60cce5e4.mototaxi2026.pages.dev
- **Navegadores:** Firefox + Chrome + Chrome PWA
- **Dispositivo:** Celular Android

---

## ✅ Teste 1: Firefox (Baseline - já está funcionando)

### Passos:
1. Abra no **Firefox Mobile**
2. Va para o driver dashboard
3. Clique **"Ativar Notificações"** (permissão)
4. Clique no **botão Teste** (deve notificar localmente)
5. **Peça para alguém chamar** uma corrida
6. Verifique se recebe notificação push

### Resultado esperado:
- ✅ Notificação de teste aparece
- ✅ Notificação real da chamada aparece
- ✅ Vibração acontece

---

## ✅ Teste 2: Chrome Desktop (DevTools aberto)

### Passos:

#### Parte A: Preparar
1. Abra no **Chrome Desktop**
2. **Abra DevTools** (F12 ou Ctrl+Shift+I)
3. Va para a aba **Console**
4. Va para o driver dashboard
5. Limpe o console (icon 🚫)

#### Parte B: Ativar Notificações
1. Clique em **"Ativar Notificações"**
2. **Copie TODOS os logs** que aparecerem
3. Procure por:
   - `✅ SUBSCRIBE COMPLETO` = SUCESSO ✅
   - `❌ SUBSCRIBE FALHOU` = PROBLEMA ❌

**Logs a procurar:**
```
[PUSH] ============ SUBSCRIBE INICIADO ============
[PUSH] Step 1️⃣: Requesting notification permission...
[PUSH] Permission result: granted
[PUSH] Subscription endpoint: https://fcm.googleapis.com/fcm/send/...
[PUSH-MESSAGE] Received from SW: { type: "PUSH_SHOWN" ... }
[PUSH] ============ ✅ SUBSCRIBE COMPLETO ============
```

#### Parte C: Testar Notificação Local
1. Clique em **"Teste de Notificação"**
2. Verifique se:
   - Aparece notificação no canto
   - Console mostra `[PUSH-MESSAGE]`

#### Parte D: Testar Chamada Real
1. **Mantenha DevTools aberto**
2. Peça para alguém chamar
3. Veja nos logs:
   - Se `[SW-PUSH]` aparece = push chegou ✅
   - Se `[PUSH-MESSAGE]` aparece = notificação mostrada ✅
   - Se nada aparece = problema identificado ❌

**Salve os logs completos!**

---

## ✅ Teste 3: Chrome PWA (Instalado)

### Passos:

#### Parte A: Instalar PWA
1. Abra no **Chrome Mobile**
2. Clique no **menu (⋮)** → **"Instalar app"**
3. Espere aparecer na tela inicial
4. **Abra a PWA instalada** (icon na tela inicial)

#### Parte B: Ativar Notificações
1. Vá para driver dashboard
2. Clique **"Ativar Notificações"**
3. Permita permissão
4. Verifique se aparece mensagem de sucesso

#### Parte C: Testar
1. Clique em **"Teste de Notificação"** → deve notificar
2. Peça para alguém chamar → verifique se notifica

#### Parte D: Ver Logs (Android Debug Bridge)
Se tiver adb instalado:

```bash
adb shell pm grant com.google.android.gms android.permission.POST_NOTIFICATIONS
adb logcat | grep "mototaxi\|SW-PUSH\|PUSH"
```

---

## 🔍 Teste 4: Verificar Subscription no Supabase

1. Abra Supabase Dashboard
2. Va para **SQL Editor**
3. Execute:

```sql
SELECT 
  id,
  driver_id,
  enabled,
  created_at,
  LENGTH(subscription::text) as payload_size,
  CASE 
    WHEN subscription::text LIKE '%endpoint%' THEN 'OK'
    ELSE 'INVÁLIDA'
  END as status
FROM push_subscriptions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;
```

**Resultado esperado:**
- `enabled = true`
- `payload_size > 500` (deve ter dados de subscription)
- `status = OK`

---

## 📋 Checklist de Coleta de Dados

Se algo não funcionar, coleta:

- [ ] **Versão do Chrome:** (Menu → Sobre → check version)
- [ ] **Versão do Firefox:** (Menu → Help → About)
- [ ] **Sistema:** Android XX.X ou iOS XX.X
- [ ] **Tipo de WiFi:** 2.4GHz / 5GHz / Cellular
- [ ] **Logs do console Chrome** (print de tela ou texto)
- [ ] **Verificar se PWA está instalada** (check no gerenciador de apps)
- [ ] **Verificar se notificações estão permitidas** no Android
- [ ] **Resultado da query SQL** do Supabase

---

## 🆘 Possíveis Problemas

### ❌ "Permissão negada"
- Verifique **Configurações do navegador** → **Notificações**
- Mototaxi2026 deve estar em **Permitido**

### ❌ Teste local funciona, mas chamada real não
- Problema está no **Push API** (VAPID keys)
- Verifique logs `[SW-PUSH]` - devem aparecer

### ❌ "Service Worker não registrado"
- Limpe cache: DevTools → **Storage** → **Clear site data**
- Recarregue a página

### ❌ PWA não recebe notificações
- Verifique se PWA tem permissão: **Settings** → **Notifications**
- Desinstale e reinstale a PWA

---

## 📊 Resultado Esperado (Sucesso)

Após mudanças:

1. ✅ **Firefox:** Continua funcionando (não muda)
2. ✅ **Chrome Desktop:** Agora recebe notificações push COM logs
3. ✅ **Chrome PWA:** Agora recebe notificações (mesmo sem estar focado)
4. ✅ **Todos recebem:** Vibração + Som + Badge

---

## 📝 Notas Finais

- **Realtime Fallback:** Mesmo se push falhar, você recebe notificação via Realtime (em 0-2 segundos)
- **Compatibilidade:** Funciona com ou sem PWA instalada
- **Logs:** São essenciais para debug - sempre copie quando algo não funcionar

**Boa sorte! 🚀**
