export function printMessage(message) {
  console.log(`[chat ${message.chatId}] ${message.sender}: ${message.text}`);
}
