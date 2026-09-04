import { printMessage } from "../../src/adapters/console/console-message-output.js";
import { sendTelegramMessageWithFetch } from "../../src/adapters/telegram/send-message-with-fetch.js";
import { getDtcReply } from "../../src/application/get-dtc-reply.js";
import { processTelegramUpdate } from "../../src/application/process-telegram-update.js";
import { loadDtcDatabase } from "../../src/infrastructure/database/load-dtc-database.js";

const dtcCodesPromise = loadDtcDatabase(
  new URL("../../data/dtc-codes.json", import.meta.url),
);

export default async function telegramWebhook(request) {
  if (request.method !== "POST") {
    return Response.json({ status: "method_not_allowed" }, { status: 405 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!token || !webhookSecret) {
    console.error("Нужны TELEGRAM_BOT_TOKEN и TELEGRAM_WEBHOOK_SECRET");
    return Response.json({ status: "configuration_error" }, { status: 500 });
  }

  const secret = request.headers.get("x-telegram-bot-api-secret-token");
  if (secret !== webhookSecret) {
    return Response.json({ status: "unauthorized" }, { status: 401 });
  }

  let update;
  try {
    update = await request.json();
  } catch {
    return Response.json({ status: "invalid_json" }, { status: 400 });
  }

  try {
    const dtcCodes = await dtcCodesPromise;
    const processed = await processTelegramUpdate({
      update,
      writeMessage: printMessage,
      getReply: (text) => getDtcReply({ text, dtcCodes }),
      sendMessage: ({ chatId, text }) =>
        sendTelegramMessageWithFetch({ token, chatId, text }),
    });
    return Response.json({ ok: true, processed });
  } catch (error) {
    console.error("Не удалось обработать Telegram Update", error);
    return Response.json({ status: "processing_error" }, { status: 500 });
  }
}
