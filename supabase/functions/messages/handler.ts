import {
  isResponse,
  jsonResponse,
  parsePagination,
  readJsonObject,
  requireApiSecret,
} from "../_shared/http.ts";

export interface MessageInput {
  client_id: string;
  telegram_message_id?: number;
  direction: "incoming" | "outgoing";
  text: string;
}

export interface MessagesRepository {
  list(options: { clientId?: string; limit: number; offset: number }): Promise<unknown[]>;
  create(message: MessageInput): Promise<unknown>;
}

export function createMessagesHandler({
  apiSecret,
  repository,
  logError = console.error,
}: {
  apiSecret: string;
  repository: MessagesRepository;
  logError?: (message: string, error: unknown) => void;
}): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      if (request.method === "GET") {
        const url = new URL(request.url);
        const clientId = url.searchParams.get("client_id");
        if (clientId && !isUuid(clientId)) {
          return jsonResponse({ status: "invalid_client_id" }, 400);
        }
        const pagination = parsePagination(url);
        if (isResponse(pagination)) return pagination;
        return jsonResponse({
          messages: await repository.list({ clientId: clientId ?? undefined, ...pagination }),
        });
      }

      if (request.method === "POST") {
        const unauthorized = requireApiSecret(request, apiSecret);
        if (unauthorized) return unauthorized;
        const body = await readJsonObject(request);
        if (isResponse(body)) return body;
        const message = parseMessageInput(body);
        if (!message) return jsonResponse({ status: "invalid_message" }, 400);
        return jsonResponse({ message: await repository.create(message) }, 201);
      }

      return jsonResponse({ status: "method_not_allowed" }, 405);
    } catch (error) {
      logError("Messages endpoint failed", error);
      return jsonResponse({ status: "database_error" }, 500);
    }
  };
}

function parseMessageInput(body: Record<string, unknown>): MessageInput | null {
  if (typeof body.client_id !== "string" || !isUuid(body.client_id)) return null;
  if (body.direction !== "incoming" && body.direction !== "outgoing") return null;
  if (typeof body.text !== "string" || !body.text.trim() || body.text.length > 10000) return null;

  const result: MessageInput = {
    client_id: body.client_id,
    direction: body.direction,
    text: body.text,
  };
  if (body.telegram_message_id !== undefined && body.telegram_message_id !== null) {
    if (
      typeof body.telegram_message_id !== "number" ||
      !Number.isSafeInteger(body.telegram_message_id)
    ) {
      return null;
    }
    result.telegram_message_id = body.telegram_message_id;
  }
  return result;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
