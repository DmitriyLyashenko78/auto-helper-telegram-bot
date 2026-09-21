export type TelegramChatId = number | string;

export interface TelegramTextMessage {
  chatId: TelegramChatId;
  messageId?: number;
  text: string;
  chatType?: string;
  title?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export function getTelegramTextMessage(update: unknown): TelegramTextMessage | null {
  const updateRecord = asRecord(update);
  const message = asRecord(updateRecord?.message);
  const chat = asRecord(message?.chat);

  if (typeof message?.text !== "string") return null;
  if (!chat) return null;

  const chatId = chat.id;
  if (typeof chatId !== "number" && typeof chatId !== "string") return null;

  const result: TelegramTextMessage = { chatId, text: message.text };
  if (typeof message.message_id === "number" && Number.isSafeInteger(message.message_id)) {
    result.messageId = message.message_id;
  }
  copyString(chat, "type", result, "chatType");
  copyString(chat, "title", result, "title");
  copyString(chat, "username", result, "username");
  copyString(chat, "first_name", result, "firstName");
  copyString(chat, "last_name", result, "lastName");

  return result;
}

export async function sendTelegramMessage({
  token,
  chatId,
  text,
  fetchImplementation = fetch,
}: {
  token: string;
  chatId: TelegramChatId;
  text: string;
  fetchImplementation?: typeof fetch;
}): Promise<void> {
  const response = await fetchImplementation(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ chat_id: chatId, text }),
    },
  );

  const body = await readJson(response);
  if (!response.ok || !isTelegramSuccess(body)) {
    throw new Error(`Telegram API rejected sendMessage with status ${response.status}`);
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function copyString(
  source: Record<string, unknown>,
  sourceKey: string,
  target: TelegramTextMessage,
  targetKey: "chatType" | "title" | "username" | "firstName" | "lastName",
): void {
  const value = source[sourceKey];
  if (typeof value === "string" && value) target[targetKey] = value;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function isTelegramSuccess(value: unknown): boolean {
  return asRecord(value)?.ok === true;
}
