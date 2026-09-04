import assert from "node:assert/strict";
import test from "node:test";

import { getDtcReply } from "../src/application/get-dtc-reply.js";

const dtcCodes = new Map([
  ["P0420", "Catalyst System Efficiency Below Threshold Bank 1"],
  ["U0100", "Lost Communication With ECM/PCM"],
]);

test("возвращает расшифровку существующего кода", () => {
  const reply = getDtcReply({ text: " p 0420 ", dtcCodes });

  assert.match(reply, /Код P0420/);
  assert.match(reply, /Catalyst System Efficiency/);
});

test("понимает код с русской буквой в начале", () => {
  const reply = getDtcReply({ text: "Р0420", dtcCodes });

  assert.match(reply, /Код P0420/);
});

test("понимает код, введённый клавишей U в русской раскладке", () => {
  const reply = getDtcReply({ text: "Г0100", dtcCodes });

  assert.match(reply, /Код U0100/);
});

test("возвращает инструкцию для команды start", () => {
  const reply = getDtcReply({ text: "/start", dtcCodes });

  assert.match(reply, /P0420/);
  assert.match(reply, /4 цифры/);
});

test("объясняет неправильный формат", () => {
  const reply = getDtcReply({ text: "привет", dtcCodes });

  assert.match(reply, /Не удалось распознать код/);
});

test("объясняет отсутствие корректного кода в базе", () => {
  const reply = getDtcReply({ text: "P1234", dtcCodes });

  assert.match(reply, /P1234 не найден/);
  assert.match(reply, /код производителя/);
  assert.match(reply, /только универсальные коды/);
});
