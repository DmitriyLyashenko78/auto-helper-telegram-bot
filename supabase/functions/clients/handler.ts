import {
  isResponse,
  jsonResponse,
  parsePagination,
  readJsonObject,
  requireApiSecret,
} from "../_shared/http.ts";

export interface ClientInput {
  telegram_chat_id: string;
  chat_type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface ClientsRepository {
  list(options: { limit: number; offset: number }): Promise<unknown[]>;
  upsert(client: ClientInput): Promise<unknown>;
}

export function createClientsHandler({
  apiSecret,
  repository,
  logError = console.error,
}: {
  apiSecret: string;
  repository: ClientsRepository;
  logError?: (message: string, error: unknown) => void;
}): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (request.method === "GET") {
        const pagination = parsePagination(new URL(request.url));
        if (isResponse(pagination)) return pagination;
        return jsonResponse({ clients: await repository.list(pagination) });
      }

      if (request.method === "POST") {
        const unauthorized = requireApiSecret(request, apiSecret);
        if (unauthorized) return unauthorized;
        const body = await readJsonObject(request);
        if (isResponse(body)) return body;
        const client = parseClientInput(body);
        if (!client) return jsonResponse({ status: "invalid_client" }, 400);
        return jsonResponse({ client: await repository.upsert(client) });
      }

      return jsonResponse({ status: "method_not_allowed" }, 405);
    } catch (error) {
      logError("Clients endpoint failed", error);
      return jsonResponse({ status: "database_error" }, 500);
    }
  };
}

function parseClientInput(body: Record<string, unknown>): ClientInput | null {
  const telegramChatId = normalizeTelegramId(body.telegram_chat_id);
  if (!telegramChatId) return null;

  const result: ClientInput = { telegram_chat_id: telegramChatId };
  for (const field of ["chat_type", "title", "username", "first_name", "last_name"] as const) {
    const value = body[field];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string" || value.length > 255) return null;
    result[field] = value;
  }
  return result;
}

function normalizeTelegramId(value: unknown): string | null {
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  if (typeof value === "string" && /^-?\d+$/.test(value)) return value;
  return null;
}
