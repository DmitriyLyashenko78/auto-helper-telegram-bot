export async function sendTelegramMessageWithFetch({
  token,
  chatId,
  text,
  fetchImplementation = globalThis.fetch,
}) {
  if (!token || !chatId || !text) {
    throw new TypeError("Для Telegram-сообщения нужны token, chatId и text");
  }
  if (typeof fetchImplementation !== "function") {
    throw new Error("В текущей среде недоступен fetch");
  }

  let response;
  try {
    response = await fetchImplementation(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "content-type": "application/json; charset=utf-8" },
        body: JSON.stringify({ chat_id: chatId, text }),
      },
    );
  } catch {
    throw new Error("Не удалось подключиться к Telegram API");
  }

  const body = await response.json();
  if (!response.ok || !body.ok) {
    throw new Error("Telegram не отправил сообщение");
  }
}
