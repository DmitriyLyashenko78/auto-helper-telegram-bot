import { createTelegramWebhookHandler } from "./handler.ts";

Deno.test("rejects requests with an invalid webhook secret", async () => {
  const handler = createHandler();
  const response = await handler(new Request("http://localhost", { method: "POST" }));

  assertEquals(response.status, 401);
  assertEquals(await response.json(), { status: "unauthorized" });
});

Deno.test("rejects invalid JSON", async () => {
  const handler = createHandler();
  const response = await handler(telegramRequest("not-json"));

  assertEquals(response.status, 400);
  assertEquals(await response.json(), { status: "invalid_json" });
});

Deno.test("ignores Telegram updates without a text message", async () => {
  const handler = createHandler();
  const response = await handler(telegramRequest(JSON.stringify({ update_id: 1 })));

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { ok: true, processed: false });
});

Deno.test("looks up a code and sends the reply", async () => {
  const sentMessages: Array<{ chatId: number | string; text: string }> = [];
  const handler = createHandler({
    findDescription: (code) => {
      assertEquals(code, "P0420");
      return Promise.resolve("Catalyst System Efficiency Below Threshold");
    },
    sendMessage: (message) => {
      sentMessages.push(message);
      return Promise.resolve();
    },
  });

  const response = await handler(
    telegramRequest(
      JSON.stringify({
        update_id: 1,
        message: { text: "P0420", chat: { id: 123 } },
      }),
    ),
  );

  assertEquals(response.status, 200);
  assertEquals(await response.json(), { ok: true, processed: true });
  assertEquals(sentMessages.length, 1);
  assertEquals(sentMessages[0].chatId, 123);
  assertIncludes(sentMessages[0].text, "Catalyst System Efficiency");
});

Deno.test("stores incoming and outgoing messages", async () => {
  const stored: unknown[] = [];
  const handler = createHandler({
    saveIncomingMessage: (message) => {
      stored.push({ direction: "incoming", message });
      return Promise.resolve("client-1");
    },
    saveOutgoingMessage: (message) => {
      stored.push({ direction: "outgoing", message });
      return Promise.resolve();
    },
  });

  const response = await handler(telegramRequest(JSON.stringify({
    message: {
      message_id: 7,
      text: "P0420",
      chat: { id: 123, type: "private", username: "driver" },
    },
  })));

  assertEquals(response.status, 200);
  assertEquals(stored.length, 2);
  assertEquals(stored[0], {
    direction: "incoming",
    message: {
      chatId: 123,
      text: "P0420",
      messageId: 7,
      chatType: "private",
      username: "driver",
    },
  });
  assertEquals((stored[1] as { direction: string }).direction, "outgoing");
});

Deno.test("continues replying when conversation storage fails", async () => {
  const loggedErrors: unknown[] = [];
  let sent = false;
  const handler = createHandler({
    saveIncomingMessage: () => Promise.reject(new Error("storage unavailable")),
    sendMessage: () => {
      sent = true;
      return Promise.resolve();
    },
    logError: (_message, error) => loggedErrors.push(error),
  });

  const response = await handler(telegramRequest(JSON.stringify({
    message: { message_id: 7, text: "P0420", chat: { id: 123 } },
  })));

  assertEquals(response.status, 200);
  assertEquals(sent, true);
  assertEquals(loggedErrors.length, 1);
});

Deno.test("returns processing_error when a dependency fails", async () => {
  const loggedErrors: unknown[] = [];
  const handler = createHandler({
    findDescription: () => Promise.reject(new Error("database unavailable")),
    logError: (_message, error) => {
      loggedErrors.push(error);
    },
  });

  const response = await handler(
    telegramRequest(
      JSON.stringify({
        update_id: 1,
        message: { text: "P0420", chat: { id: 123 } },
      }),
    ),
  );

  assertEquals(response.status, 500);
  assertEquals(await response.json(), { status: "processing_error" });
  assertEquals(loggedErrors.length, 1);
});

interface HandlerOverrides {
  findDescription?: (code: string) => Promise<string | null>;
  sendMessage?: (message: {
    chatId: number | string;
    text: string;
  }) => Promise<void>;
  saveIncomingMessage?: (message: {
    chatId: number | string;
    text: string;
  }) => Promise<string>;
  saveOutgoingMessage?: (message: {
    clientId: string;
    text: string;
  }) => Promise<void>;
  logError?: (message: string, error: unknown) => void;
}

function createHandler(overrides: HandlerOverrides = {}) {
  return createTelegramWebhookHandler({
    webhookSecret: "test-secret",
    findDescription: overrides.findDescription ?? (() => Promise.resolve(null)),
    sendMessage: overrides.sendMessage ?? (() => Promise.resolve()),
    saveIncomingMessage: overrides.saveIncomingMessage,
    saveOutgoingMessage: overrides.saveOutgoingMessage,
    logError: overrides.logError ?? (() => undefined),
  });
}

function telegramRequest(body: string): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": "test-secret",
    },
    body,
  });
}

function assertEquals(actual: unknown, expected: unknown): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`,
    );
  }
}

function assertIncludes(actual: string, expected: string): void {
  if (!actual.includes(expected)) {
    throw new Error(`Expected text to include: ${expected}`);
  }
}
