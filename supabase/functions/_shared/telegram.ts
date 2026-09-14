export type TelegramChatId = number | string;

export interface TelegramTextMessage {
  chatId: TelegramChatId;
  text: string;
}

export function getTelegramTextMessage(update: unknown): TelegramTextMessage | null {
  const updateRecord = asRecord(update);
  const message = asRecord(updateRecord?.message);
  const chat = asRecord(message?.chat);

  if (typeof message?.text !== "string") return null;

  const chatId = chat?.id;
  if (typeof chatId !== "number" && typeof chatId !== "string") return null;

  return { chatId, text: message.text };
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
