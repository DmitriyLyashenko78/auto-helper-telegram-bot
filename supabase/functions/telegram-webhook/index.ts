import { sendTelegramMessage } from "../_shared/telegram.ts";
import type { TelegramTextMessage } from "../_shared/telegram.ts";
import {
  createSupabaseRestClient,
  getRequiredEnvironmentVariable,
  getSupabaseSecretKey,
  readRestJson,
} from "../_shared/supabase-rest.ts";
import { createTelegramWebhookHandler } from "./handler.ts";

const telegramToken = getRequiredEnvironmentVariable("TELEGRAM_BOT_TOKEN");
const webhookSecret = getRequiredEnvironmentVariable("TELEGRAM_WEBHOOK_SECRET");
const supabaseUrl = getRequiredEnvironmentVariable("SUPABASE_URL");
const supabaseSecretKey = getSupabaseSecretKey();
const rest = createSupabaseRestClient({ supabaseUrl, secretKey: supabaseSecretKey });

const handler = createTelegramWebhookHandler({
  webhookSecret,
  findDescription: findDtcDescription,
  saveIncomingMessage,
  saveOutgoingMessage,
  sendMessage: ({ chatId, text }) =>
    sendTelegramMessage({
      token: telegramToken,
      chatId,
      text,
    }),
});

Deno.serve(handler);

async function findDtcDescription(code: string): Promise<string | null> {
  const queryUrl = new URL("/rest/v1/dtc_codes", supabaseUrl);
  queryUrl.searchParams.set("select", "description");
  queryUrl.searchParams.set("code", `eq.${code}`);
  queryUrl.searchParams.set("limit", "1");

  const response = await fetch(queryUrl, {
    headers: {
      accept: "application/json",
      apikey: supabaseSecretKey,
    },
  });

  if (!response.ok) {
    const details = (await response.text()).slice(0, 300);
    throw new Error(
      `Supabase rejected DTC lookup with status ${response.status}: ${details}`,
    );
  }

  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) {
    throw new TypeError("Supabase returned an invalid DTC response");
  }

  if (rows.length === 0) return null;

  const firstRow = asRecord(rows[0]);
  if (typeof firstRow?.description !== "string") {
    throw new TypeError("Supabase returned a DTC row without description");
  }

  return firstRow.description;
}

async function saveIncomingMessage(message: TelegramTextMessage): Promise<string> {
  const clientRows = asArray(
    await readRestJson(
      await rest.request(
        "/rest/v1/clients?on_conflict=telegram_chat_id",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify({
            telegram_chat_id: String(message.chatId),
            chat_type: message.chatType,
            title: message.title,
            username: message.username,
            first_name: message.firstName,
            last_name: message.lastName,
            updated_at: new Date().toISOString(),
          }),
        },
      ),
    ),
  );
  const clientId = asRecord(clientRows[0])?.id;
  if (typeof clientId !== "string") throw new TypeError("Client upsert returned no id");

  const response = await rest.request(
    "/rest/v1/messages?on_conflict=client_id,telegram_message_id,direction",
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=ignore-duplicates,return=minimal",
      },
      body: JSON.stringify({
        client_id: clientId,
        telegram_message_id: message.messageId,
        direction: "incoming",
        text: message.text,
      }),
    },
  );
  await readRestJson(response);
  return clientId;
}

async function saveOutgoingMessage({ clientId, text }: { clientId: string; text: string }) {
  const response = await rest.request("/rest/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ client_id: clientId, direction: "outgoing", text }),
  });
  await readRestJson(response);

  const params = new URLSearchParams({ id: `eq.${clientId}` });
  await readRestJson(
    await rest.request(`/rest/v1/clients?${params}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", prefer: "return=minimal" },
      body: JSON.stringify({ updated_at: new Date().toISOString() }),
    }),
  );
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError("Supabase returned an invalid array response");
  return value;
}
