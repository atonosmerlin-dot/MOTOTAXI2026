#!/usr/bin/env pwsh

# ============================================================
# TESTE 3: Chamar API de notificações
# ============================================================

Write-Host "🧪 INICIANDO TESTE DA API DE NOTIFICAÇÕES" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Configurações
$apiUrl = "http://localhost:8787/api/notify-available-drivers"  # URL local do Cloudflare (wrangler dev)
# OU se está em produção:
# $apiUrl = "https://api.motopoint.online/api/notify-available-drivers"

$payload = @{
    ride_request_id = "test-$(Get-Random)"
    point_id = "ponto-teste"
    point_name = "Terminal Central"
    destination = "Avenida Brasil"
    client_name = "João Tester"
} | ConvertTo-Json

Write-Host "📤 Enviando requisição para: $apiUrl" -ForegroundColor Yellow
Write-Host "📋 Payload:" -ForegroundColor Yellow
Write-Host $payload -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "⏳ Aguardando resposta..." -ForegroundColor Cyan
    
    $response = Invoke-WebRequest `
        -Uri $apiUrl `
        -Method POST `
        -Headers @{"Content-Type" = "application/json"} `
        -Body $payload `
        -ErrorAction Stop
    
    $responseBody = $response.Content | ConvertFrom-Json
    
    Write-Host ""
    Write-Host "✅ RESPOSTA RECEBIDA COM SUCESSO!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📊 Detalhes da Resposta:" -ForegroundColor Cyan
    Write-Host "  ok: $($responseBody.ok)" 
    Write-Host "  sent: $($responseBody.sent)"
    Write-Host "  failed: $($responseBody.failed)"
    Write-Host "  total: $($responseBody.total)"
    Write-Host "  message: $($responseBody.message)"
    Write-Host ""
    
    if ($responseBody.ok -eq $true -and $responseBody.sent -gt 0) {
        Write-Host "🎉 API FUNCIONANDO! Notificações foram enviadas!" -ForegroundColor Green
    } elseif ($responseBody.ok -eq $true -and $responseBody.sent -eq 0) {
        Write-Host "⚠️  AVISO: API respondeu OK mas nenhuma notificação foi enviada!" -ForegroundColor Yellow
        Write-Host "Possíveis causas:" -ForegroundColor Yellow
        Write-Host "  - Nenhum motorista online (drivers_online: $($responseBody.drivers_online))"
        Write-Host "  - Nenhuma subscription ativa (subscriptions_found: $($responseBody.subscriptions_found))"
    } else {
        Write-Host "❌ ERRO: API retornou erro" -ForegroundColor Red
        Write-Host "Erro: $($responseBody.error)" -ForegroundColor Red
    }
    
} catch {
    Write-Host ""
    Write-Host "❌ ERRO NA CHAMADA" -ForegroundColor Red
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Dicas:" -ForegroundColor Yellow
    Write-Host "  1. Verifique se o servidor está rodando (npm run dev)"
    Write-Host "  2. Verifique se a URL está correta"
    Write-Host "  3. Verifique CORS headers"
    Write-Host "  4. Abra DevTools (F12) e veja a requisição no Network tab"
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
