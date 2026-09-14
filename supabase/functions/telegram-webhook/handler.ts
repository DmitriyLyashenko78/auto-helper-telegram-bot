import { type FindDtcDescription, getDtcReply } from "../_shared/dtc.ts";
import { getTelegramTextMessage, type TelegramChatId } from "../_shared/telegram.ts";

interface TelegramWebhookDependencies {
  webhookSecret: string;
  findDescription: FindDtcDescription;
  sendMessage: (message: {
    chatId: TelegramChatId;
    text: string;
  }) => Promise<void>;
  logError?: (message: string, error: unknown) => void;
}

export function createTelegramWebhookHandler({
  webhookSecret,
  findDescription,
  sendMessage,
  logError = console.error,
}: TelegramWebhookDependencies): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") {
      return Response.json({ status: "method_not_allowed" }, { status: 405 });
    }

    const suppliedSecret = request.headers.get("x-telegram-bot-api-secret-token");
    if (suppliedSecret !== webhookSecret) {
      return Response.json({ status: "unauthorized" }, { status: 401 });
    }

    let update: unknown;
    try {
      update = await request.json();
    } catch {
      return Response.json({ status: "invalid_json" }, { status: 400 });
    }

    const message = getTelegramTextMessage(update);
    if (!message) {
      return Response.json({ ok: true, processed: false });
    }

    try {
      const reply = await getDtcReply({
        text: message.text,
        findDescription,
      });

      await sendMessage({ chatId: message.chatId, text: reply });
      return Response.json({ ok: true, processed: true });
    } catch (error) {
      logError("Не удалось обработать Telegram Update", error);
      return Response.json({ status: "processing_error" }, { status: 500 });
    }
  };
}
