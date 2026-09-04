import assert from "node:assert/strict";
import test from "node:test";

import { createServer } from "../src/infrastructure/server/create-server.js";

test("health endpoint показывает режим webhook", async (context) => {
  const state = { updateMode: "webhook" };
  const server = createServer({
    state,
    webhookSecret: "test-secret",
    processUpdate: async () => false,
  });
  context.after(() => server.close());

  const response = await server.inject({ method: "GET", url: "/health" });

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { status: "ok", updateMode: "webhook" });
});

test("webhook передаёт Update обработчику только с корректным секретом", async (context) => {
  const received = [];
  const server = createServer({
    state: { updateMode: "webhook" },
    webhookSecret: "test-secret",
    processUpdate: async (update) => {
      received.push(update);
      return true;
    },
  });
  context.after(() => server.close());

  const rejected = await server.inject({
    method: "POST",
    url: "/telegram/webhook",
    payload: { update_id: 1 },
  });
  const accepted = await server.inject({
    method: "POST",
    url: "/telegram/webhook",
    headers: { "x-telegram-bot-api-secret-token": "test-secret" },
    payload: { update_id: 2 },
  });

  assert.equal(rejected.statusCode, 401);
  assert.equal(accepted.statusCode, 200);
  assert.deepEqual(accepted.json(), { ok: true, processed: true });
  assert.deepEqual(received, [{ update_id: 2 }]);
});
