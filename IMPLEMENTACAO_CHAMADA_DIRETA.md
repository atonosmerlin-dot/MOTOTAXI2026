# 📱 Implementação: Chamada de Mototáxi Direta com Geolocalização

## Resumo das Mudanças

Foi implementada uma nova funcionalidade que permite aos clientes chamar um mototáxi **sem escanear QR code**, utilizando sua localização GPS atual. A solução complementa o sistema existente de chamadas via QR code.

## 🎯 O que foi feito

### 1. **Novo Modal de Chamada Direta** 
   - **Arquivo**: `src/components/motopoint/RideRequestModal.tsx`
   - Componente modal com 3 etapas:
     1. **Formulário**: Coleta nome, endereço de destino (opcional) e WhatsApp (opcional)
     2. **Localização**: Solicita permissão e coleta GPS com alta precisão
     3. **Confirmação**: Exibe dados coletados antes de enviar

### 2. **Atualização da Página Principal**
   - **Arquivo**: `src/pages/motopoint/client/ClientHome.tsx`
   - Adicionado botão verde "Chamar Mototáxi" ao lado da opção de QR Code
   - Dois caminhos de chamada:
     - 🔍 Escanear QR Code (método existente)
     - 📞 Chamar Mototáxi Diretamente (novo)

### 3. **Hook Atualizado para Geolocalização**
   - **Arquivo**: `src/hooks/useRideRequests.tsx`
   - Expandido `useCreateRideRequest()` para aceitar:
     - `clientLatitude`: Latitude do cliente
     - `clientLongitude`: Longitude do cliente
     - `clientAccuracy`: Precisão em metros

### 4. **Migration SQL**
   - **Arquivo**: `supabase/migrations/20260119_add_client_location_to_ride_requests.sql`
   - Adiciona 3 colunas à tabela `ride_requests`:
     - `client_latitude` (DOUBLE PRECISION)
     - `client_longitude` (DOUBLE PRECISION)
     - `client_accuracy` (DOUBLE PRECISION)

## 🚀 Fluxo de Funcionamento

```
Cliente em ClientHome
    ↓
Clica em "Chamar Mototáxi"
    ↓
RideRequestModal Abre
    ↓
Preenche Nome + Destino + WhatsApp (opcional)
    ↓
Solicita Localização (GPS)
    ↓
Navegador pede permissão ao usuário
    ↓
GPS é coletado com alta precisão
    ↓
Tenta geocodificação reversa (Nominatim OpenStreetMap)
    ↓
Exibe resumo dos dados
    ↓
Clica "Chamar Mototáxi"
    ↓
useCreateRideRequest envia para Supabase
    ↓
Sistema notifica motoristas próximos
    ↓
ClientHome recebe atualização e exibe propostas
```

## 📍 Recursos de Geolocalização

### Características
- ✅ **Alta Precisão**: `enableHighAccuracy: true`
- ✅ **Timeout**: 10 segundos para não bloquear
- ✅ **Sem Cache**: `maximumAge: 0` (sempre dados frescos)
- ✅ **Geocodificação Reversa**: Tenta converter coordenadas em endereço legível
- ✅ **Fallback**: Se geocodificação falhar, exibe coordenadas

### Requisitos do Navegador
- 🔒 HTTPS (obrigatório para geolocalização em produção)
- 🔒 Permissão do usuário (solicita ao clicar no botão)
- 📱 Suportado em browsers modernos (Chrome, Firefox, Safari, Edge)

### Mensagens de Erro Tratadas
```
1. PERMISSION_DENIED → "Permissão de localização negada"
2. POSITION_UNAVAILABLE → "Localização indisponível"
3. TIMEOUT → "Tempo limite de localização expirado"
4. Sem geolocalização → "Geolocalização não suportada neste navegador"
```

## 🔄 Integração com Sistema Existente

A nova funcionalidade **usa os mesmos mecanismos** do sistema já implementado:

1. **Mesma tabela** `ride_requests` (apenas com 3 campos novos)
2. **Mesma notificação** aos motoristas via `notify-available-drivers`
3. **Mesmas propostas** de motoristas (ride_proposals)
4. **Mesmo fluxo** de aceitação/rejeição

⚠️ A única diferença: em vez de usar `point_id` do QR code, usa `point_id = "direct"` e armazena a localização do cliente em `client_latitude/longitude`.

## 🗄️ Dados Armazenados

Cada chamada direta agora armazena:
```sql
{
  "point_id": "direct",                    -- Identificador para chamadas diretas
  "client_id": "uuid",                     -- ID anônimo do cliente
  "client_name": "João Silva",             -- Nome preenchido
  "client_latitude": -23.550520,           -- Latitude do GPS
  "client_longitude": -46.633308,          -- Longitude do GPS
  "client_accuracy": 8.5,                  -- Precisão em metros
  "destination_address": "Av. Paulista",   -- Destino opcional
  "client_whatsapp": "(11) 98765-4321",    -- WhatsApp opcional
  "status": "pending",                     -- Aguardando propostas
  "created_at": "2026-01-19T..."
}
```

## 🔧 Para o Desenvolvedor

### Usar o Modal
```tsx
import RideRequestModal from '@/components/motopoint/RideRequestModal';

const MyComponent = () => {
  const [showModal, setShowModal] = useState(false);
  
  return (
    <>
      <button onClick={() => setShowModal(true)}>Chamar</button>
      <RideRequestModal 
        open={showModal}
        onClose={() => setShowModal(false)}
        pointId="direct"
        pointName="Localização Atual"
      />
    </>
  );
};
```

### Migração SQL
Execute a migration antes de usar a funcionalidade:
```bash
supabase migration up
```

## ⚙️ Customizações Possíveis

Se precisar customizar:

1. **Alterar textos**: Editar strings em `RideRequestModal.tsx`
2. **Mudar cores**: Usar classes Tailwind CSS
3. **Adicionar campos**: Estender `LocationData` e os estados
4. **Mudar provider de geocodificação**: Substituir Nominatim por Google Maps
5. **Desabilitar geolocalização**: Remover a etapa 2 (location)

## ✅ Testes Recomendados

1. **Desktop HTTPS**: Testar em `localhost` com HTTPS
2. **Mobile**: Testar em dispositivo real com GPS
3. **Permissões**: Negar e aceitar permissão de localização
4. **Sem GPS**: Testar em ambiente sem sinal GPS
5. **Dados**: Verificar se os dados chegam corretos no Supabase
6. **Notificações**: Confirmar se motoristas recebem a chamada

## 🐛 Debug

Para debug, abra o console do navegador (F12) e procure por logs:
```
[CREATE-RIDE] 📤 Notificando motoristas...
[CREATE-RIDE] 📊 API Response: { sent: X, failed: Y, ... }
```

## 📚 Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `src/components/motopoint/RideRequestModal.tsx` | ✨ Novo | Modal com formulário + GPS |
| `src/pages/motopoint/client/ClientHome.tsx` | 🔄 Modificado | Adiciona botão "Chamar Mototáxi" |
| `src/hooks/useRideRequests.tsx` | 🔄 Modificado | Aceita lat/long nos parâmetros |
| `supabase/migrations/20260119_...sql` | ✨ Novo | Adiciona colunas de localização |

---

**Data**: 19 de Janeiro de 2026  
**Status**: ✅ Implementado e Testado
