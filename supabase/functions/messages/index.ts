import {
  createSupabaseRestClient,
  getRequiredEnvironmentVariable,
  getSupabaseSecretKey,
  readRestJson,
} from "../_shared/supabase-rest.ts";
import { createMessagesHandler, type MessageInput, type MessagesRepository } from "./handler.ts";

const rest = createSupabaseRestClient({
  supabaseUrl: getRequiredEnvironmentVariable("SUPABASE_URL"),
  secretKey: getSupabaseSecretKey(),
});

const repository: MessagesRepository = {
  async list({ clientId, limit, offset }) {
    const params = new URLSearchParams({
      select: "id,client_id,telegram_message_id,direction,text,created_at",
      order: "created_at.desc",
      limit: String(limit),
      offset: String(offset),
    });
    if (clientId) params.set("client_id", `eq.${clientId}`);
    return asArray(await readRestJson(await rest.request(`/rest/v1/messages?${params}`)));
  },

  async create(message: MessageInput) {
    const response = await rest.request("/rest/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "return=representation",
      },
      body: JSON.stringify(message),
    });
    const rows = asArray(await readRestJson(response));
    if (rows.length !== 1) throw new Error("Supabase did not return the created message");
    await touchClient(message.client_id);
    return rows[0];
  },
};

Deno.serve(createMessagesHandler({
  apiSecret: getRequiredEnvironmentVariable("CLIENT_DATA_API_SECRET"),
  repository,
}));

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError("Supabase returned an invalid array response");
  return value;
}

async function touchClient(clientId: string): Promise<void> {
  const params = new URLSearchParams({ id: `eq.${clientId}` });
  const response = await rest.request(`/rest/v1/clients?${params}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", prefer: "return=minimal" },
    body: JSON.stringify({ updated_at: new Date().toISOString() }),
  });
  await readRestJson(response);
}
