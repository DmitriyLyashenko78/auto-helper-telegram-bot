import { createMessagesHandler, type MessageInput, type MessagesRepository } from "./handler.ts";

const clientId = "550e8400-e29b-41d4-a716-446655440000";

Deno.test("messages endpoint lists all messages by default", async () => {
  let received: unknown;
  const response = await createHandler({
    list(options) {
      received = options;
      return Promise.resolve([]);
    },
  })(apiRequest("http://localhost/messages"));
  assertEquals(response.status, 200);
  assertEquals(received, { clientId: undefined, limit: 50, offset: 0 });
});

Deno.test("messages endpoint lists one client's messages", async () => {
  let received: unknown;
  const handler = createHandler({
    list(options) {
      received = options;
      return Promise.resolve([{ text: "P0420" }]);
    },
  });
  const response = await handler(apiRequest(
    `http://localhost/messages?client_id=${clientId}&limit=25`,
  ));
  assertEquals(response.status, 200);
  assertEquals(received, { clientId, limit: 25, offset: 0 });
});

Deno.test("messages endpoint validates and creates a message", async () => {
  let received: MessageInput | undefined;
  const handler = createHandler({
    create(message) {
      received = message;
      return Promise.resolve({ id: "message-1", ...message });
    },
  });
  const response = await handler(apiRequest("http://localhost/messages", {
    method: "POST",
    body: JSON.stringify({
      client_id: clientId,
      telegram_message_id: 42,
      direction: "incoming",
      text: "P0420",
    }),
  }));
  assertEquals(response.status, 201);
  assertEquals(received, {
    client_id: clientId,
    direction: "incoming",
    text: "P0420",
    telegram_message_id: 42,
  });
});

function createHandler(overrides: Partial<MessagesRepository> = {}) {
  return createMessagesHandler({
    apiSecret: "api-secret",
    repository: {
      list: overrides.list ?? (() => Promise.resolve([])),
      create: overrides.create ?? ((message) => Promise.resolve(message)),
    },
    logError: () => undefined,
  });
}

function apiRequest(url: string, init: RequestInit = {}): Request {
  const headers = new Headers(init.headers);
  headers.set("x-api-key", "api-secret");
  headers.set("content-type", "application/json");
  return new Request(url, { ...init, headers });
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}
