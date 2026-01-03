# Script para criar usuario de teste no Supabase via API

$SUPABASE_URL = "https://lmsoaxrlcjsubgozppen.supabase.co"
$SUPABASE_SECRET_KEY = "sb_secret_3qMcZtDNt9XKRJmX6VPsLQ_OIqerpeA"

$testEmail = "admin@mototaxi.com"
$testPassword = "Senha@123"

Write-Host "Criando usuario de teste no Supabase..." -ForegroundColor Yellow
Write-Host "URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "Email: $testEmail" -ForegroundColor Green
Write-Host ""

$body = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $SUPABASE_SECRET_KEY"
    "Content-Type" = "application/json"
    "apikey" = "sb_publishable_7cAYG2sMMPqJYTdQjtE6iQ_yt_rxmEE"
}

try {
    Write-Host "Enviando requisicao..." -ForegroundColor Cyan
    
    $response = Invoke-WebRequest -Uri "$SUPABASE_URL/auth/v1/admin/users" `
        -Method POST `
        -Headers $headers `
        -Body $body `
        -ErrorAction SilentlyContinue
    
    if ($response.StatusCode -eq 201) {
        Write-Host "Usuario criado com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Detalhes:" -ForegroundColor Cyan
        
        $userData = $response.Content | ConvertFrom-Json
        Write-Host "User ID: $($userData.id)" -ForegroundColor Green
        Write-Host "Email: $($userData.email)" -ForegroundColor Green
        
        Write-Host ""
        Write-Host "Agora faca login em: http://localhost:8080/admin/login" -ForegroundColor Yellow
        Write-Host "Email: $testEmail" -ForegroundColor Cyan
        Write-Host "Senha: $testPassword" -ForegroundColor Cyan
    } else {
        Write-Host "Erro: $($response.StatusCode)" -ForegroundColor Red
        Write-Host "Detalhes: $($response.Content)" -ForegroundColor Red
    }
} 
catch {
    Write-Host "Erro ao conectar: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativa: Va para https://supabase.com/dashboard" -ForegroundColor Yellow
    Write-Host "1. Selecione o projeto MOTOTAXI" -ForegroundColor Yellow
    Write-Host "2. Va para Authentication Users" -ForegroundColor Yellow
    Write-Host "3. Clique em Add user" -ForegroundColor Yellow
    Write-Host "4. Use o email: $testEmail" -ForegroundColor Cyan
    Write-Host "5. Use a senha: $testPassword" -ForegroundColor Cyan
    Write-Host "6. Marque Auto confirmed" -ForegroundColor Yellow
}
