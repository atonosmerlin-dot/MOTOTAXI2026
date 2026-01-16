Write-Host "Testando API de notificacoes com VAPID keys..."
Write-Host ""

try {
    $uri = "https://mototaxi2026.pages.dev/api/notify-available-drivers"
    $headers = @{"Content-Type" = "application/json"}
    $body = @{
        title = "Teste de Notificacao"
        body = "Notificacoes com VAPID keys agora funcionam!"
        url = "/driver"
    } | ConvertTo-Json
    
    Write-Host "Enviando requisicao para: $uri"
    $response = Invoke-WebRequest -Uri $uri -Method POST -Headers $headers -Body $body -UseBasicParsing
    
    if ($response.StatusCode -eq 200) {
        Write-Host "Status: 200 OK" -ForegroundColor Green
        Write-Host ""
        Write-Host "Resposta:" -ForegroundColor Green
        $result = $response.Content | ConvertFrom-Json
        Write-Host ($result | ConvertTo-Json -Depth 5)
        
        Write-Host ""
        Write-Host "API esta respondendo corretamente!" -ForegroundColor Green
        
        if ($result.sent -gt 0) {
            Write-Host "$($result.sent) notificacoes foram ENVIADAS!" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "Erro: $($_.Exception.Message)" -ForegroundColor Red
}
