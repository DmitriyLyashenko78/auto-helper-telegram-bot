import {
  createSupabaseRestClient,
  getRequiredEnvironmentVariable,
  getSupabaseSecretKey,
  readRestJson,
} from "../_shared/supabase-rest.ts";
import { type ClientInput, type ClientsRepository, createClientsHandler } from "./handler.ts";

const rest = createSupabaseRestClient({
  supabaseUrl: getRequiredEnvironmentVariable("SUPABASE_URL"),
  secretKey: getSupabaseSecretKey(),
});

const repository: ClientsRepository = {
  async list({ limit, offset }) {
    const params = new URLSearchParams({
      select:
        "id,telegram_chat_id,chat_type,title,username,first_name,last_name,created_at,updated_at",
      order: "updated_at.desc",
      limit: String(limit),
      offset: String(offset),
    });
    return asArray(await readRestJson(await rest.request(`/rest/v1/clients?${params}`)));
  },

  async upsert(client: ClientInput) {
    const params = new URLSearchParams({ on_conflict: "telegram_chat_id" });
    const response = await rest.request(`/rest/v1/clients?${params}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify({ ...client, updated_at: new Date().toISOString() }),
    });
    const rows = asArray(await readRestJson(response));
    if (rows.length !== 1) throw new Error("Supabase did not return the upserted client");
    return rows[0];
  },
};

Deno.serve(createClientsHandler({
  apiSecret: getRequiredEnvironmentVariable("CLIENT_DATA_API_SECRET"),
  repository,
}));

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new TypeError("Supabase returned an invalid array response");
  return value;
}
