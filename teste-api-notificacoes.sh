#!/bin/bash

# ============================================================
# TESTE 3: Chamar API de notificações (versão bash/curl)
# ============================================================

echo "🧪 INICIANDO TESTE DA API DE NOTIFICAÇÕES"
echo "============================================"
echo ""

# Configurações
API_URL="http://localhost:8787/api/notify-available-drivers"
# OU se está em produção:
# API_URL="https://api.motopoint.online/api/notify-available-drivers"

# Gerar ID aleatório para teste
TEST_ID=$(date +%s)
PAYLOAD="{
  \"ride_request_id\": \"test-$TEST_ID\",
  \"point_id\": \"ponto-teste\",
  \"point_name\": \"Terminal Central\",
  \"destination\": \"Avenida Brasil\",
  \"client_name\": \"João Tester\"
}"

echo "📤 Enviando requisição para: $API_URL"
echo "📋 Payload:"
echo "$PAYLOAD" | jq '.' 2>/dev/null || echo "$PAYLOAD"
echo ""

echo "⏳ Aguardando resposta..."
echo ""

RESPONSE=$(curl -s -X POST \
  "$API_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD")

echo "✅ RESPOSTA RECEBIDA:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
echo ""

# Parse resposta
OK=$(echo "$RESPONSE" | jq -r '.ok // false' 2>/dev/null)
SENT=$(echo "$RESPONSE" | jq -r '.sent // 0' 2>/dev/null)
TOTAL=$(echo "$RESPONSE" | jq -r '.total // 0' 2>/dev/null)
MESSAGE=$(echo "$RESPONSE" | jq -r '.message // ""' 2>/dev/null)

if [ "$OK" = "true" ] && [ "$SENT" -gt 0 ]; then
  echo "🎉 API FUNCIONANDO! Notificações foram enviadas!"
  echo "  Enviadas: $SENT / $TOTAL"
  echo "  Mensagem: $MESSAGE"
elif [ "$OK" = "true" ] && [ "$SENT" -eq 0 ]; then
  echo "⚠️  AVISO: API respondeu OK mas nenhuma notificação foi enviada!"
  echo "  Total: $TOTAL"
  echo "  Mensagem: $MESSAGE"
else
  echo "❌ ERRO: API retornou erro"
  echo "  Resposta: $RESPONSE"
fi

echo ""
echo "============================================"
