$projectPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $projectPath ".env"
$values = @{}

Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match "^([^#=]+)=(.*)$") {
    $values[$matches[1]] = $matches[2]
  }
}

$token = $values["TELEGRAM_BOT_TOKEN"]
$webhookUrl = $values["TELEGRAM_WEBHOOK_URL"]
$secret = $values["TELEGRAM_WEBHOOK_SECRET"]

if (!$token -or !$webhookUrl -or !$secret) {
  throw "Нужны TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_URL и TELEGRAM_WEBHOOK_SECRET в .env"
}

$uri = [Uri]$webhookUrl
if ($uri.Scheme -ne "https") {
  throw "TELEGRAM_WEBHOOK_URL должен начинаться с https://"
}

$body = @{
  url = $webhookUrl
  secret_token = $secret
  allowed_updates = @("message")
} | ConvertTo-Json -Compress

$result = Invoke-RestMethod -Method Post `
  -Uri ("https://api.telegram.org/bot{0}/setWebhook" -f $token) `
  -ContentType "application/json" `
  -Body $body

if (!$result.ok) {
  throw "Telegram не зарегистрировал webhook"
}

Write-Output "Webhook registered successfully"
