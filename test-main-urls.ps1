Write-Host "Testando URLs principais..."

$urls = @(
    "https://mototaxi2026.pages.dev",
    "https://motopoint.online"
)

foreach ($url in $urls) {
    try {
        $r = Invoke-WebRequest -Uri $url -UseBasicParsing -ErrorAction Stop
        Write-Host "✅ $url : Status $($r.StatusCode)"
    } catch {
        Write-Host "❌ $url : $($_.Exception.Response.StatusCode)"
    }
}

Write-Host ""
Write-Host "Testando endpoint de notificação nas URLs principais..."

foreach ($url in $urls) {
    $apiUrl = "$url/api/notify-available-drivers"
    try {
        $r = Invoke-WebRequest -Uri $apiUrl -Method POST -Headers @{"Content-Type" = "application/json"} -Body '{"title":"Test"}' -UseBasicParsing
        Write-Host "✅ $apiUrl : Status $($r.StatusCode)"
    } catch {
        Write-Host "❌ $apiUrl : $($_.Exception.Response.StatusCode)"
    }
}
