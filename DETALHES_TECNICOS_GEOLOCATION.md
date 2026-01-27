# 🔧 Detalhes Técnicos: Arquitetura da Chamada Direta

## 📐 Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────────┐
│                      CLIENTE (Browser)                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ClientHome.tsx                                           │   │
│  │ ├── Botão 1: Escanear QR Code (rota existente)         │   │
│  │ └── Botão 2: Chamar Mototáxi (NOVO)                    │   │
│  │     └─→ RideRequestModal.tsx                            │   │
│  │         ├── Etapa 1: Formulário (nome, destino, tel)   │   │
│  │         ├── Etapa 2: Geolocalização (GPS)              │   │
│  │         └── Etapa 3: Confirmação + Envio               │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP POST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│               BACKEND (Cloudflare Workers)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ functions/api/notify-available-drivers.js               │   │
│  │ ├── Recebe ride_request_id                             │   │
│  │ ├── Busca drivers online                               │   │
│  │ ├── Valida subscriptions de push                        │   │
│  │ └── Envia notificação para cada motorista              │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ SQL INSERT
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BANCO DE DADOS (Supabase)                      │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ride_requests (tabela)                                   │   │
│  │ ├── id (UUID)                                           │   │
│  │ ├── point_id: "direct" (novo valor)                    │   │
│  │ ├── client_id (UUID anônimo)                           │   │
│  │ ├── client_name (texto)                                │   │
│  │ ├── client_latitude (novo!) ← GPS latitude             │   │
│  │ ├── client_longitude (novo!) ← GPS longitude            │   │
│  │ ├── client_accuracy (novo!) ← precisão em metros        │   │
│  │ ├── destination_address (texto)                         │   │
│  │ ├── client_whatsapp (telefone)                          │   │
│  │ ├── driver_id (NULL até motorista aceitar)            │   │
│  │ ├── status: 'pending'                                  │   │
│  │ ├── created_at (timestamp)                             │   │
│  │ └── updated_at (timestamp)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ ride_proposals (tabela existente)                        │   │
│  │ └── Recebe as propostas dos motoristas                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Fluxo de Dados Detalhado

### 1. Usuario Submete Formulário
```typescript
// src/components/motopoint/RideRequestModal.tsx

const handleSubmitRequest = async () => {
  // Dados coletados:
  const payload = {
    pointId: "direct",                    // Novo: chamada direta
    pointName: "Localização Atual",
    clientId: "uuid-...",                 // Cliente anônimo persistente
    clientName: "João Silva",             // Do formulário
    destinationAddress: "Av. Paulista, 1000",  // Opcional
    clientWhatsapp: "(11) 98765-4321",   // Opcional
    clientLatitude: -23.550520,           // Do GPS
    clientLongitude: -46.633308,         // Do GPS
    clientAccuracy: 8.5                   // Precisão do GPS
  };

  await createRequest.mutateAsync(payload);
};
```

### 2. Hook Cria Ride Request
```typescript
// src/hooks/useRideRequests.tsx

export const useCreateRideRequest = () => {
  return useMutation({
    mutationFn: async (vars) => {
      // 2a. Insere na tabela ride_requests
      const { data, error } = await supabase
        .from('ride_requests')
        .insert({
          point_id: vars.pointId,                 // "direct"
          client_id: vars.clientId,
          client_name: vars.clientName,
          client_latitude: vars.clientLatitude,   // ← NOVO!
          client_longitude: vars.clientLongitude, // ← NOVO!
          client_accuracy: vars.clientAccuracy,   // ← NOVO!
          destination_address: vars.destinationAddress,
          client_whatsapp: vars.clientWhatsapp,
          status: 'pending'
        })
        .select()
        .single();

      // 2b. Notifica motoristas (via API)
      const response = await fetchApi('notify-available-drivers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ride_request_id: data.id,
          point_id: vars.pointId,
          point_name: vars.pointName,
          destination: vars.destinationAddress || 'Destino não informado',
          client_name: vars.clientName
        })
      });

      return data;
    }
  });
};
```

### 3. API Notifica Motoristas
```javascript
// functions/api/notify-available-drivers.js (existente)

// A API recebe o ride_request_id
// Busca dados do banco (incluindo as novas coordenadas)
// Notifica drivers online com push notification
```

### 4. Driver Vê a Chamada e Responde
```
Driver app recebe:
├── Nome do cliente: "João Silva"
├── Localização: -23.550520, -46.633308 (±8m)
├── Destino: "Av. Paulista, 1000"
├── WhatsApp: "(11) 98765-4321"
└── Tempo para chegar: Calculado via distância
```

### 5. Cliente Vê Propostas e Aceita
```
Cliente vê:
├── Propostas dos motoristas
├── Avaliações
├── Preço estimado
└── Clica em "Aceitar"
```

---

## 🗄️ Schema da Tabela (SQL)

### Antes (Versão Antiga)
```sql
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID REFERENCES public.fixed_points(id),
  client_id UUID,
  client_name TEXT,
  destination_address TEXT,
  client_whatsapp TEXT,
  driver_id UUID REFERENCES public.drivers(id),
  status ride_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Depois (Com Geolocalização)
```sql
CREATE TABLE public.ride_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  point_id UUID REFERENCES public.fixed_points(id),
  client_id UUID,
  client_name TEXT,
  client_latitude DOUBLE PRECISION,          -- ← NOVO!
  client_longitude DOUBLE PRECISION,         -- ← NOVO!
  client_accuracy DOUBLE PRECISION,          -- ← NOVO!
  destination_address TEXT,
  client_whatsapp TEXT,
  driver_id UUID REFERENCES public.drivers(id),
  status ride_status DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes Recomendados (Para Otimizar Queries)
```sql
-- Buscar chamadas recentes por cliente
CREATE INDEX idx_ride_requests_client_id_created 
ON ride_requests(client_id, created_at DESC);

-- Buscar chamadas ativas (pending/accepted)
CREATE INDEX idx_ride_requests_status 
ON ride_requests(status, created_at DESC);

-- Buscar por localização (futuro: buscar motoristas próximos)
CREATE INDEX idx_ride_requests_location 
ON ride_requests USING GIST(
  ll_to_earth(client_latitude, client_longitude)
) WHERE client_latitude IS NOT NULL;
```

---

## 🌍 Geolocalização: Detalhes Técnicos

### API Usada
```javascript
// Geolocation API (padrão W3C)
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude, accuracy } = position.coords;
    // latitude: número entre -90 e 90
    // longitude: número entre -180 e 180
    // accuracy: precisão em metros (ex: 8.5)
  },
  (error) => {
    // Tratamento de erros
  },
  {
    enableHighAccuracy: true,    // Melhor precisão (consome mais bateria)
    timeout: 10000,              // Aguarda máximo 10 segundos
    maximumAge: 0                // Não usa cache (dados sempre frescos)
  }
);
```

### Geocodificação Reversa (Conversão de Coordenadas em Endereço)
```javascript
// Usando Nominatim (OpenStreetMap - Gratuito)
const response = await fetch(
  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
);

const data = await response.json();
// data.address contém:
// {
//   "road": "Rua das Flores",
//   "building": "45",
//   "city": "São Paulo",
//   "state": "SP",
//   "country": "Brazil"
// }

// Se falhar, usa fallback com coordenadas:
// "-23.550520, -46.633308"
```

### Precisão do GPS
```
Valor de accuracy em metros:

±1-5m   = GPS muito bom (ao ar livre, sem obstáculos)
±5-10m  = GPS bom (usual em cidades)
±10-30m = GPS aceitável (próximo a prédios)
±30-50m = GPS fraco (muitos prédios bloqueando)
±50+m   = GPS muito fraco (usar com cautela)
```

---

## 📊 Exemplo de Dados Armazenados

```sql
-- Registro após o usuário chamar mototáxi
SELECT * FROM ride_requests WHERE id = '550e8400-e29b-41d4-a716-446655440000';

┌──────────────────────────────────────────────────────────────────┐
│ id                                   │ 550e8400-e29b-41d4-a716... │
│ point_id                             │ direct                     │
│ client_id                            │ 850c8400-e29b-41d4-a716... │
│ client_name                          │ João Silva                 │
│ client_latitude                      │ -23.550520                 │
│ client_longitude                     │ -46.633308                 │
│ client_accuracy                      │ 8.5                        │
│ destination_address                  │ Av. Paulista, 1000         │
│ client_whatsapp                      │ (11) 98765-4321            │
│ driver_id                            │ NULL (aguardando propostas)│
│ status                               │ pending                    │
│ created_at                           │ 2026-01-19 14:30:45 UTC    │
│ updated_at                           │ 2026-01-19 14:30:45 UTC    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Relação com Tabelas Existentes

### ride_requests vs ride_proposals
```
ride_requests (1) ←→ (N) ride_proposals
  ↓
  Quando status = 'pending', há múltiplas ride_proposals
  Quando cliente aceita, ride_request.status = 'accepted'
  e ride_proposals recebe updated_at
```

### ride_requests vs drivers
```
ride_requests.driver_id (NULL) ←→ drivers.id
  ↓
  Quando nenhum motorista aceitou: driver_id = NULL
  Quando motorista aceita: driver_id preenchido
```

### ride_requests vs fixed_points
```
ride_requests.point_id ←→ fixed_points.id
  ↓
  Via QR code: aponta para um fixed_point
  Via chamada direta: point_id = "direct" (não referencia)
  ↓
  IMPORTANTE: Para chamada direta, você precisa consultar
  client_latitude/longitude em vez de point.latitude/longitude
```

---

## 💾 Operações SQL Úteis

### 1. Buscar Todas as Chamadas Diretas (Não via QR)
```sql
SELECT 
  id, 
  client_name, 
  client_latitude,
  client_longitude,
  client_accuracy,
  destination_address,
  status,
  created_at
FROM ride_requests
WHERE point_id = 'direct'
ORDER BY created_at DESC;
```

### 2. Buscar Chamadas do Último Dia
```sql
SELECT 
  COUNT(*) as total_chamadas,
  SUM(CASE WHEN point_id = 'direct' THEN 1 ELSE 0 END) as diretas,
  SUM(CASE WHEN point_id != 'direct' THEN 1 ELSE 0 END) as via_qr
FROM ride_requests
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

### 3. Buscar Motoristas Próximos (Exemplo - Requer Extensão PostGIS)
```sql
-- Requer instalação do PostGIS
SELECT 
  d.id,
  p.name,
  ST_Distance(
    ST_Point(rr.client_longitude, rr.client_latitude)::geography,
    ST_Point(d.current_longitude, d.current_latitude)::geography
  ) as distancia_metros
FROM ride_requests rr
JOIN drivers d ON true
WHERE rr.id = 'ride-id-123'
AND rr.client_latitude IS NOT NULL
AND d.is_online = true
ORDER BY distancia_metros ASC
LIMIT 10;
```

### 4. Atualizar Localização de um Motorista (Para Rastreamento)
```sql
UPDATE drivers
SET current_latitude = -23.550520,
    current_longitude = -46.633308,
    updated_at = NOW()
WHERE id = 'driver-uuid';
```

---

## 🚨 Considerações de Segurança

### 1. Privacy
- [ ] Localização só é armazenada durante a corrida
- [ ] Limpar dados antigos (>7 dias) via job
- [ ] Aplicar RLS (Row Level Security) no Supabase

### 2. Validação
```typescript
// Validar coordenadas antes de inserir
if (latitude < -90 || latitude > 90) throw new Error("Latitude inválida");
if (longitude < -180 || longitude > 180) throw new Error("Longitude inválida");
if (accuracy < 0) throw new Error("Accuracy inválida");
```

### 3. Rate Limiting
- Limitar a 1 chamada por cliente a cada 10 segundos
- Previne spam/abuso de API

### 4. HTTPS Obrigatório
- Geolocalização do W3C requer HTTPS em produção
- Certificado SSL/TLS é essencial

---

## 🔧 Troubleshooting Técnico

### Problema: "client_latitude is undefined"
**Causa**: Tipo não atualizado no hook  
**Solução**: Verificar se `useRideRequests.tsx` foi atualizado com os novos campos

### Problema: "RideRequestModal não importa"
**Causa**: Componente não criado ou caminho errado  
**Solução**: Verificar se arquivo existe em `src/components/motopoint/RideRequestModal.tsx`

### Problema: "Permissão de localização não aparece"
**Causa**: 1) Não HTTPS, 2) Localhost/127.0.0.1 pode funcionar sem HTTPS  
**Solução**: Usar HTTPS em produção, localhost permite dev

### Problema: "Coordenadas vêm como NULL"
**Causa**: Usuário negou permissão ou GPS não disponível  
**Solução**: Adicionar validação e mensagem de erro clara

### Problema: "Geocodificação reversa muito lenta"
**Causa**: Nominatim tem rate limit  
**Solução**: Fazer fallback para coordenadas se timeout > 2s

---

## 📈 Métricas para Monitorar

```typescript
// No futuro, pode-se adicionar tracking:
{
  total_chamadas_diretas: 150,           // Por dia
  taxa_sucesso: 92.3,                    // %
  tempo_resposta_motorista: 45,          // segundos
  precisao_gps_media: 12.5,              // metros
  cancelamentos: 5.2,                    // %
  telefones_validos: 88.5,               // %
}
```

---

## 🔮 Futuras Melhorias

1. **Rastreamento em Tempo Real**
   - Armazenar localização do motorista continuamente
   - Mostrar distância até o cliente

2. **Otimização de Motoristas**
   - Usar PostGIS para buscar motoristas por distância
   - Algoritmo inteligente de matching

3. **Histórico de Rotas**
   - Armazenar rota completa do motorista
   - Analytics de padrões de tráfego

4. **Mapa Integrado**
   - Mostrar mapa da localização do cliente
   - Rotas sugeridas

5. **Compartilhamento de Localização em Tempo Real**
   - Cliente compartilha localização contínua
   - Motorista vê movimento do cliente em tempo real

---

**Documentação Técnica v1.0**  
Data: 19 de Janeiro de 2026  
Última atualização: 19/01/2026
