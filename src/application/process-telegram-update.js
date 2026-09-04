import { createMessage } from "../domain/message.js";

export async function processTelegramUpdate({
  update,
  writeMessage,
  getReply,
  sendMessage,
}) {
  const telegramMessage = update?.message;
  if (!telegramMessage || typeof telegramMessage.text !== "string") {
    return false;
  }

  const message = createMessage({
    chatId: telegramMessage.chat.id,
    text: telegramMessage.text,
    sender: getSenderName(telegramMessage.from),
  });

  writeMessage(message);
  await sendMessage({
    chatId: message.chatId,
    text: getReply(message.text),
  });
  return true;
}

function getSenderName(sender = {}) {
  if (sender.username) return `@${sender.username}`;

  const fullName = [sender.first_name, sender.last_name].filter(Boolean).join(" ");
  return fullName || String(sender.id || "unknown");
}
