export function createMessage({ chatId, text, sender }) {
  if (chatId === undefined || chatId === null) {
    throw new TypeError("У сообщения должен быть chatId");
  }

  if (typeof text !== "string") {
    throw new TypeError("Текст сообщения должен быть строкой");
  }

  return Object.freeze({
    chatId,
    text,
    sender: sender || "unknown",
  });
}
