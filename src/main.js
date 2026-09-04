import { printMessage } from "./adapters/console/console-message-output.js";
import { sendTelegramMessage } from "./adapters/telegram/send-message.js";
import { getDtcReply } from "./application/get-dtc-reply.js";
import { processTelegramUpdate } from "./application/process-telegram-update.js";
import { loadDtcDatabase } from "./infrastructure/database/load-dtc-database.js";
import { createServer } from "./infrastructure/server/create-server.js";

const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!webhookSecret || !token) {
  console.error("Нужны TELEGRAM_WEBHOOK_SECRET и TELEGRAM_BOT_TOKEN");
  process.exitCode = 1;
} else {
  const dtcCodes = await loadDtcDatabase(new URL("../data/dtc-codes.json", import.meta.url));
  await run({ webhookSecret, token, dtcCodes });
}

async function run({ webhookSecret, token, dtcCodes }) {
  const state = { updateMode: "webhook" };
  const server = createServer({
    state,
    webhookSecret,
    processUpdate: (update) =>
      processTelegramUpdate({
        update,
        writeMessage: printMessage,
        getReply: (text) => getDtcReply({ text, dtcCodes }),
        sendMessage: ({ chatId, text }) => sendTelegramMessage({ token, chatId, text }),
      }),
  });
  const port = Number(process.env.PORT) || 3000;

  const stop = async (signal) => {
    console.log(`Получен ${signal}. Завершаю работу...`);
    await server.close();
  };

  process.once("SIGINT", () => void stop("SIGINT"));
  process.once("SIGTERM", () => void stop("SIGTERM"));

  await server.listen({ port, host: "127.0.0.1" });
  console.log(`Webhook-сервер запущен. Загружено DTC-кодов: ${dtcCodes.size}`);
}
