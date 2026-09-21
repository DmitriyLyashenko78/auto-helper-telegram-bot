# Telegram Console Bot

Учебный Telegram-бот: получает сообщения через webhook, ищет универсальные OBD-II коды в локальной
базе и отвечает пользователю.

## Запуск

Требуется Node.js 20 или новее.

1. Установить зависимости:

   ```powershell
   npm install
   ```

2. Открыть локальный файл `.env` и вставить токен после `TELEGRAM_BOT_TOKEN=`. Этот файл не попадёт
   в Git.

3. Запустить приложение:

   ```powershell
   npm start
   ```

4. Запустить Cloudflare Quick Tunnel для `http://localhost:3000` и скопировать выданный HTTPS-адрес
   в `TELEGRAM_WEBHOOK_URL`, добавив путь `/telegram/webhook`.

5. Зарегистрировать webhook:

   ```powershell
   npm run webhook:register
   ```

6. Написать боту `/start` или код вида `P0420`. Бот ответит в Telegram и выведет входящее сообщение
   в терминал.

Проверка состояния сервиса: `http://localhost:3000/health`.

## Supabase: клиенты и сообщения

Supabase-бот сохраняет Telegram-чаты в таблице `clients`, а входящие и исходящие сообщения — в
таблице `messages`. Чтение списков через `GET` доступно публично. Запись через `POST` защищена
заголовком `x-api-key`, значение которого задаётся секретом `CLIENT_DATA_API_SECRET`.

Доступные запросы:

```text
GET  /functions/v1/clients?limit=50&offset=0
POST /functions/v1/clients
GET  /functions/v1/messages?limit=50&offset=0
GET  /functions/v1/messages?client_id=<uuid>&limit=50&offset=0
POST /functions/v1/messages
```

Пример создания или обновления клиента:

```json
{
  "telegram_chat_id": "123456789",
  "username": "driver"
}
```

Пример сохранения сообщения:

```json
{
  "client_id": "550e8400-e29b-41d4-a716-446655440000",
  "telegram_message_id": 42,
  "direction": "incoming",
  "text": "P0420"
}
```

## Развёртывание на Vercel

Для Vercel используются функции `api/health.js` и `api/telegram/webhook.js`. После импорта
репозитория в Vercel нужно добавить переменные окружения `TELEGRAM_BOT_TOKEN` и
`TELEGRAM_WEBHOOK_SECRET`, затем зарегистрировать в Telegram адрес
`https://<имя-проекта>.vercel.app/api/telegram/webhook`.

Локальный запуск через `npm start` остаётся отдельным режимом: он использует Fastify и Cloudflare
Quick Tunnel.

## Формат кода

Поддерживается буква `P`, `B`, `C` или `U` и четыре цифры: `P0420`, `P0300`, `B0020`, `C0035`,
`U0100`.

База содержит только универсальные OBD-II коды. Расшифровка носит справочный характер и не заменяет
диагностику автомобиля.
