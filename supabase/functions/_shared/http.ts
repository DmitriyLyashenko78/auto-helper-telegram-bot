export function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
    },
  });
}

export function requireApiSecret(request: Request, expectedSecret: string): Response | null {
  const suppliedSecret = request.headers.get("x-api-key");
  if (!suppliedSecret || suppliedSecret !== expectedSecret) {
    return jsonResponse({ status: "unauthorized" }, 401);
  }

  return null;
}

export async function readJsonObject(
  request: Request,
): Promise<Record<string, unknown> | Response> {
  try {
    const value: unknown = await request.json();
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      return jsonResponse({ status: "invalid_json" }, 400);
    }
    return value as Record<string, unknown>;
  } catch {
    return jsonResponse({ status: "invalid_json" }, 400);
  }
}

export function parsePagination(url: URL): { limit: number; offset: number } | Response {
  const limit = parseInteger(url.searchParams.get("limit"), 50);
  const offset = parseInteger(url.searchParams.get("offset"), 0);

  if (limit === null || limit < 1 || limit > 200 || offset === null || offset < 0) {
    return jsonResponse({ status: "invalid_pagination" }, 400);
  }

  return { limit, offset };
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

function parseInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}
