import { type ClientInput, type ClientsRepository, createClientsHandler } from "./handler.ts";

Deno.test("clients endpoint allows public reads", async () => {
  const response = await createHandler()(new Request("http://localhost/clients"));
  assertEquals(response.status, 200);
});

Deno.test("clients endpoint protects writes with the API secret", async () => {
  const response = await createHandler()(
    new Request("http://localhost/clients", {
      method: "POST",
      body: JSON.stringify({ telegram_chat_id: "123" }),
    }),
  );
  assertEquals(response.status, 401);
});

Deno.test("clients endpoint lists clients with pagination", async () => {
  let received: unknown;
  const handler = createHandler({
    list(options) {
      received = options;
      return Promise.resolve([{ id: "client-1" }]);
    },
  });
  const response = await handler(apiRequest("http://localhost/clients?limit=10&offset=5"));
  assertEquals(response.status, 200);
  assertEquals(received, { limit: 10, offset: 5 });
  assertEquals(await response.json(), { clients: [{ id: "client-1" }] });
});

Deno.test("clients endpoint normalizes and upserts a Telegram chat", async () => {
  let received: ClientInput | undefined;
  const handler = createHandler({
    upsert(client) {
      received = client;
      return Promise.resolve({ id: "client-1", ...client });
    },
  });
  const response = await handler(apiRequest("http://localhost/clients", {
    method: "POST",
    body: JSON.stringify({ telegram_chat_id: 123, username: "driver" }),
  }));
  assertEquals(response.status, 200);
  assertEquals(received, { telegram_chat_id: "123", username: "driver" });
});

function createHandler(overrides: Partial<ClientsRepository> = {}) {
  return createClientsHandler({
    apiSecret: "api-secret",
    repository: {
      list: overrides.list ?? (() => Promise.resolve([])),
      upsert: overrides.upsert ?? ((client) => Promise.resolve(client)),
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
