$payloadBase64 = [Console]::In.ReadToEnd()
$payloadText = [System.Text.Encoding]::UTF8.GetString(
  [System.Convert]::FromBase64String($payloadBase64)
)
$payload = $payloadText | ConvertFrom-Json

if ($null -eq $payload -or [string]::IsNullOrWhiteSpace($payload.token) -or $null -eq $payload.chatId -or [string]::IsNullOrWhiteSpace($payload.text)) {
  throw "Missing token, chatId, or text"
}

$body = @{
  chat_id = $payload.chatId
  text = $payload.text
} | ConvertTo-Json -Compress

$result = Invoke-RestMethod -Method Post `
  -Uri ("https://api.telegram.org/bot{0}/sendMessage" -f $payload.token) `
  -ContentType "application/json; charset=utf-8" `
  -Body $body

if (!$result.ok) {
  throw "Telegram sendMessage failed"
}
