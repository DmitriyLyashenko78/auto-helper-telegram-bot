import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
  new URL("../../../scripts/send-telegram-message.ps1", import.meta.url),
);

export function sendTelegramMessage({ token, chatId, text }) {
  if (!token || !chatId || !text) {
    throw new TypeError("Для Telegram-сообщения нужны token, chatId и text");
  }

  return new Promise((resolve, reject) => {
    const process = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      { stdio: ["pipe", "ignore", "pipe"] },
    );
    let errorOutput = "";

    process.stderr.on("data", (chunk) => {
      errorOutput += chunk;
    });
    process.on("error", reject);
    process.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(errorOutput.trim() || "Не удалось отправить сообщение в Telegram"));
    });

    const payload = JSON.stringify({ token, chatId, text });
    process.stdin.end(Buffer.from(payload, "utf8").toString("base64"));
  });
}
