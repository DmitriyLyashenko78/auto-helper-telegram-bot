import { sendTelegramMessage } from "../_shared/telegram.ts";
import { createTelegramWebhookHandler } from "./handler.ts";

const telegramToken = getRequiredEnvironmentVariable("TELEGRAM_BOT_TOKEN");
const webhookSecret = getRequiredEnvironmentVariable("TELEGRAM_WEBHOOK_SECRET");
const supabaseUrl = getRequiredEnvironmentVariable("SUPABASE_URL");
const supabaseSecretKey = getSupabaseSecretKey();

const handler = createTelegramWebhookHandler({
  webhookSecret,
  findDescription: findDtcDescription,
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

function getRequiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Не задана переменная окружения ${name}`);
  }
  return value;
}

function getSupabaseSecretKey(): string {
  const value = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!value) {
    throw new Error(
      "Нужна SUPABASE_SECRET_KEY или SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return value;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" ? value as Record<string, unknown> : null;
}
