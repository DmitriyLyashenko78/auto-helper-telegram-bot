export default function health() {
  return Response.json({
    status: "ok",
    updateMode: "webhook",
    environment: "vercel",
  });
}
