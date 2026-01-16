Write-Host "Testing /api/ route on new deployment..."
$uri = "https://b2bd274d.mototaxi2026.pages.dev/api/notify-available-drivers"
try {
    $r = Invoke-WebRequest -Uri $uri -Method POST -Headers @{"Content-Type" = "application/json"} -Body '{"title":"Test"}' -UseBasicParsing
    Write-Host "✅ /api/ works! Status: $($r.StatusCode)"
    Write-Host "Response: $($r.Content)"
} catch {
    Write-Host "❌ /api/ failed: $($_.Exception.Response.StatusCode)"
}

Write-Host ""
Write-Host "Testing /_/functions/api/ route..."
$uri2 = "https://b2bd274d.mototaxi2026.pages.dev/_/functions/api/notify-available-drivers"
try {
    $r = Invoke-WebRequest -Uri $uri2 -Method POST -Headers @{"Content-Type" = "application/json"} -Body '{"title":"Test"}' -UseBasicParsing
    Write-Host "✅ /_/functions/api/ works! Status: $($r.StatusCode)"
} catch {
    Write-Host "❌ /_/functions/api/ failed: $($_.Exception.Response.StatusCode)"
}
