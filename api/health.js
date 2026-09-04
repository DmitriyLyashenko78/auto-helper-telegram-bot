export default {
  fetch() {
    return Response.json({
      status: "ok",
      updateMode: "webhook",
      environment: "vercel",
    });
  },
};
