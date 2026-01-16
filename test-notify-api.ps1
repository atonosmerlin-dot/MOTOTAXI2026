$params = @{
    Uri = "https://92d2c5a0.mototaxi2026.pages.dev/_/functions/api/notify-available-drivers"
    Method = "POST"
    Headers = @{"Content-Type" = "application/json"}
    Body = '{"title":"Test","body":"Test notify","url":"/"}'
    UseBasicParsing = $true
}

try {
    Write-Host "Testing notify API..."
    $r = Invoke-WebRequest @params
    Write-Host "✅ SUCCESS! Status: $($r.StatusCode)"
    Write-Host "Response: $($r.Content)"
} catch {
    Write-Host "❌ ERROR: $($_.Exception.Response.StatusCode)"
    Write-Host "Message: $($_.Exception.Message)"
}
