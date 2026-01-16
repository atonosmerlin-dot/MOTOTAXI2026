# 🚀 Deploy do Backend Node.js no Render

## Passo 1: Acessar Render.com

1. Vá para https://render.com
2. Faça login ou crie conta (pode usar GitHub)
3. Clique em "New +" → "Web Service"

## Passo 2: Conectar Repositório GitHub

1. Selecione "Deploy an existing repository"
2. Conecte sua conta GitHub (https://github.com/atonosmerlin-dot/MOTOTAXI2026)
3. Encontre o repositório `MOTOTAXI2026`
4. Clique em "Connect"

## Passo 3: Configurar Deployment

Na página de criação do serviço:

| Campo | Valor |
|-------|-------|
| **Name** | `mototaxi-backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Root Directory** | `server` |
| **Branch** | `main` |

## Passo 4: Adicionar Variáveis de Ambiente

Clique em "Advanced" e adicione as seguintes variáveis:

```
SUPABASE_URL = https://sua-url-supabase.supabase.co
SUPABASE_SERVICE_ROLE_KEY = sua-service-key-aqui
VAPID_PUBLIC_KEY = sua-chave-publica-vapid
VAPID_PRIVATE_KEY = sua-chave-privada-vapid
PORT = 3000
```

**Onde encontrar estas chaves:**
- `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`: Dashboard Supabase → Settings → API
- `VAPID_PUBLIC_KEY` e `VAPID_PRIVATE_KEY`: Seu `.env.vapid` ou `.env` local

## Passo 5: Deploy

1. Clique em "Create Web Service"
2. Aguarde o deploy completar (2-3 minutos)
3. Você receberá uma URL como: `https://mototaxi-backend.onrender.com`

## Passo 6: Verificar se Backend está Online

```bash
curl https://mototaxi-backend.onrender.com/health
```

Deveria retornar `404` (porque o endpoint `/health` não existe, mas isso significa que o server está respondendo).

Ou teste o endpoint `/send-push`:

```bash
curl -X POST https://mototaxi-backend.onrender.com/send-push \
  -H "Content-Type: application/json" \
  -d '{"subscriptions":[],"payload":"{}"}'
```

## Passo 7: Atualizar Cloudflare com a URL do Backend

Agora que você tem a URL do backend (ex: `https://mototaxi-backend.onrender.com`), precisa atualizar o Cloudflare Pages para usar esta URL.

### Opção A: Via wrangler.toml

Edite `wrangler.toml`:

```toml
[env.production]
vars = { BACKEND_URL = "https://mototaxi-backend.onrender.com" }
```

Depois:
```bash
npm run build
wrangler pages deploy dist
```

### Opção B: Via Cloudflare Dashboard

1. Vá para Cloudflare Pages → mototaxi2026 → Settings
2. Procure por variáveis de ambiente
3. Adicione: `BACKEND_URL = https://mototaxi-backend.onrender.com`

## Passo 8: Testar Fluxo Completo

1. Acesse https://motopoint.online
2. Faça login como CLIENT
3. Chamar motorista
4. Verifique os logs do Render (em tempo real):
   - Render Dashboard → mototaxi-backend → Logs
5. Deve aparecer:
   ```
   [SEND-PUSH] 📤 Enviando para X dispositivos...
   [SEND-PUSH] ✅ Enviada com sucesso
   ```

## ⚠️ Troubleshooting

### Backend retorna 503 no frontend
- **Verificar:** Todos os env vars estão configurados no Render?
- **Solução:** Vá em Render → Settings → Environment e verifique

### VAPID keys inválidas
- **Verificar:** As chaves têm o formato correto?
- **Solução:** 
  ```bash
  cd server && node generate-vapid.js
  ```
  Copie as chaves geradas para o Render

### Notificações ainda não funcionam
- **Verificar:** URL do backend está correta no wrangler.toml ou Cloudflare?
- **Teste manual:**
  ```bash
  curl https://mototaxi-backend.onrender.com/send-push
  ```
  Deve retornar erro 400 (subscriptions required), não 503

## 📊 Próximos Passos

1. ✅ Deploy backend no Render
2. ✅ Atualizar BACKEND_URL no Cloudflare
3. ✅ Testar notificações end-to-end
4. ✅ Celebrar! 🎉

---

**Tempo estimado:** 10-15 minutos

**Status:** Pronto para deploy 🚀
