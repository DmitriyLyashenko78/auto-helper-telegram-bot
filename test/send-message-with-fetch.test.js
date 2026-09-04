import assert from "node:assert/strict";
import test from "node:test";

import { sendTelegramMessageWithFetch } from "../src/adapters/telegram/send-message-with-fetch.js";

test("отправляет сообщение через Telegram Bot API", async () => {
  let request;
  const fetchImplementation = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  await sendTelegramMessageWithFetch({
    token: "test-token",
    chatId: 123,
    text: "Привет",
    fetchImplementation,
  });

  assert.equal(request.url, "https://api.telegram.org/bottest-token/sendMessage");
  assert.equal(request.options.method, "POST");
  assert.deepEqual(JSON.parse(request.options.body), { chat_id: 123, text: "Привет" });
});

test("сообщает об ошибке Telegram API", async () => {
  const fetchImplementation = async () =>
    new Response(JSON.stringify({ ok: false }), { status: 400 });

  await assert.rejects(
    sendTelegramMessageWithFetch({
      token: "test-token",
      chatId: 123,
      text: "Привет",
      fetchImplementation,
    }),
    /Telegram не отправил сообщение/,
  );
});
