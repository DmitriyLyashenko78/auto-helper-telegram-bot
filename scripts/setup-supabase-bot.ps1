$ErrorActionPreference = "Stop"

$expectedUsername = "OBDII_Codes_Supabase_bot"
$projectRef = "rwojhuleacexnrduwgdu"
$webhookUrl = "https://$projectRef.supabase.co/functions/v1/telegram-webhook"
$projectPath = Resolve-Path (Join-Path $PSScriptRoot "..")
$envPath = Join-Path $projectPath "supabase\functions\.env.local"

if (!(Test-Path -LiteralPath $envPath -PathType Leaf)) {
  throw "Ne nayden fail: supabase\functions\.env.local"
}

$values = @{}
Get-Content -LiteralPath $envPath | ForEach-Object {
  if ($_ -match "^([^#=]+)=(.*)$") {
    $values[$matches[1].Trim()] = $matches[2].Trim()
  }
}

$token = $values["TELEGRAM_BOT_TOKEN"]
$secret = $values["TELEGRAM_WEBHOOK_SECRET"]

if ([string]::IsNullOrWhiteSpace($token) -or [string]::IsNullOrWhiteSpace($secret)) {
  throw "V .env.local nuzhny TELEGRAM_BOT_TOKEN i TELEGRAM_WEBHOOK_SECRET"
}

if ($token -notmatch "^\d+:[A-Za-z0-9_-]+$") {
  throw "TELEGRAM_BOT_TOKEN imeet neverny format"
}

if ($secret -notmatch "^[A-Za-z0-9_-]{1,256}$") {
  throw "TELEGRAM_WEBHOOK_SECRET imeet neverny format"
}

$apiBase = "https://api.telegram.org/bot$token"

try {
  $bot = Invoke-RestMethod -Method Get -Uri "$apiBase/getMe"
} catch {
  throw "Telegram ne prinial token. Proverte token v .env.local"
}

if (!$bot.ok -or [string]::IsNullOrWhiteSpace($bot.result.username)) {
  throw "Telegram ne vernul username bota"
}

$actualUsername = [string]$bot.result.username
Write-Host "Naiden bot: @$actualUsername"

if ($actualUsername -ine $expectedUsername) {
  throw "Ostanovka: ozhidalsya @$expectedUsername. Webhook ne izmenen."
}

Write-Host "Webhook: $webhookUrl"
$confirmation = Read-Host "Ustanovit webhook dlya etogo bota? Vvedite YES"
if ($confirmation -cne "YES") {
  Write-Host "Otmeneno. Webhook ne izmenen."
  exit 0
}

$setWebhookBody = @{
  url = $webhookUrl
  secret_token = $secret
  allowed_updates = @("message")
} | ConvertTo-Json -Compress

try {
  $setResult = Invoke-RestMethod -Method Post `
    -Uri "$apiBase/setWebhook" `
    -ContentType "application/json" `
    -Body $setWebhookBody
} catch {
  throw "Telegram ne smog ustanovit webhook"
}

if (!$setResult.ok) {
  throw "Telegram ne podtverdil ustanovku webhook"
}

try {
  $info = Invoke-RestMethod -Method Get -Uri "$apiBase/getWebhookInfo"
} catch {
  throw "Webhook ustanovlen, no ego proverka ne udalas"
}

if (!$info.ok -or $info.result.url -ne $webhookUrl) {
  throw "Proverka ne podtverdila ozhidaemy adres webhook"
}

Write-Host "Gotovo: webhook vtorogo bota ustanovlen i proveren."
Write-Host "Tekushchiy adres: $($info.result.url)"

Remove-Variable token, secret -ErrorAction SilentlyContinue
