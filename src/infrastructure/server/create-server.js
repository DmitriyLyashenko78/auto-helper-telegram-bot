import Fastify from "fastify";

export function createServer({ state, webhookSecret, processUpdate }) {
  if (!webhookSecret) throw new Error("Не задан TELEGRAM_WEBHOOK_SECRET");
  if (typeof processUpdate !== "function") {
    throw new TypeError("processUpdate должен быть функцией");
  }

  const server = Fastify({ logger: true });

  server.get("/health", async () => ({
    status: "ok",
    updateMode: state.updateMode,
  }));

  server.post("/telegram/webhook", async (request, reply) => {
    const secret = request.headers["x-telegram-bot-api-secret-token"];
    if (secret !== webhookSecret) {
      return reply.code(401).send({ status: "unauthorized" });
    }

    const processed = await processUpdate(request.body);
    return { ok: true, processed };
  });

  return server;
}
