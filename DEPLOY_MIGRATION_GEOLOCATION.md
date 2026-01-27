# 🗄️ Deploy da Migration - Geolocalização na Chamada de Mototáxi

## Instruções de Deployment

Após clonar/atualizar o código, você **DEVE** executar a migration SQL para adicionar os campos de localização à tabela `ride_requests`.

### Opção 1: Via Supabase CLI (Recomendado)

```bash
# Navegar para a pasta do projeto
cd c:\Users\USER\Desktop\moto-ponto

# Fazer push das migrations para o Supabase
supabase db push
```

### Opção 2: Diretamente no Editor SQL do Supabase

1. Acesse https://app.supabase.com
2. Navegue até seu projeto
3. Vá para **SQL Editor**
4. Copie e cole o conteúdo de:
   ```
   supabase/migrations/20260119_add_client_location_to_ride_requests.sql
   ```
5. Execute o script

### Opção 3: Via pgAdmin ou Cliente PostgreSQL

```bash
# Conectar ao banco Supabase
psql "postgresql://postgres:[password]@[host]:5432/postgres"

# Executar o script
\i supabase/migrations/20260119_add_client_location_to_ride_requests.sql
```

## Verificação Pós-Deploy

Após executar a migration, verifique se os campos foram criados:

```sql
-- No SQL Editor do Supabase
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'ride_requests'
ORDER BY ordinal_position;
```

Você deve ver:
- ✅ `client_latitude` (numeric)
- ✅ `client_longitude` (numeric)
- ✅ `client_accuracy` (numeric)

## Reversão (Se Necessário)

Se precisar reverter a migration:

```sql
ALTER TABLE public.ride_requests
DROP COLUMN IF EXISTS client_latitude,
DROP COLUMN IF EXISTS client_longitude,
DROP COLUMN IF EXISTS client_accuracy;
```

## ⚠️ Importante

- A migration **NÃO** afeta os dados existentes
- Os novos campos são **OPCIONAIS** (podem ser NULL)
- Chamadas antigas via QR code continuam funcionando normalmente
- Apenas chamadas diretas (new feature) preencherão esses campos

## 🔄 Próximos Passos

Após o deploy:

1. ✅ Migration aplicada
2. ✅ Campos adicionados ao banco
3. 🚀 Fazer deploy da aplicação frontend
4. 🧪 Testar a funcionalidade em ambiente real

---

**Data de Criação**: 19 de Janeiro de 2026  
**Arquivo relacionado**: `supabase/migrations/20260119_add_client_location_to_ride_requests.sql`
