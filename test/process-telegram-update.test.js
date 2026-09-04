import assert from "node:assert/strict";
import test from "node:test";

import { processTelegramUpdate } from "../src/application/process-telegram-update.js";

test("передаёт текстовое сообщение на вывод и отправляет ответ", async () => {
  const written = [];
  const sent = [];

  const processed = await processTelegramUpdate({
    update: {
      message: {
        chat: { id: 123 },
        from: { username: "student" },
        text: "Вопрос",
      },
    },
    writeMessage: (message) => written.push(message),
    getReply: () => "Тестовый ответ",
    sendMessage: (message) => sent.push(message),
  });

  assert.equal(processed, true);
  assert.deepEqual(written, [
    { chatId: 123, sender: "@student", text: "Вопрос" },
  ]);
  assert.deepEqual(sent, [{ chatId: 123, text: "Тестовый ответ" }]);
});

test("игнорирует webhook без текстового сообщения", async () => {
  const processed = await processTelegramUpdate({
    update: { message: { sticker: {} } },
    writeMessage: () => assert.fail("Сообщение не должно быть выведено"),
    getReply: () => assert.fail("Ответ не должен формироваться"),
    sendMessage: () => assert.fail("Ответ не должен отправляться"),
  });

  assert.equal(processed, false);
});
