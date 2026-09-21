export interface SupabaseRestClient {
  request(path: string, init?: RequestInit): Promise<Response>;
}

export function createSupabaseRestClient({
  supabaseUrl,
  secretKey,
  fetchImplementation = fetch,
}: {
  supabaseUrl: string;
  secretKey: string;
  fetchImplementation?: typeof fetch;
}): SupabaseRestClient {
  return {
    request(path, init = {}) {
      const headers = new Headers(init.headers);
      headers.set("accept", "application/json");
      headers.set("apikey", secretKey);
      headers.set("authorization", `Bearer ${secretKey}`);

      return fetchImplementation(new URL(path, supabaseUrl), { ...init, headers });
    },
  };
}

export async function readRestJson(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!response.ok) {
    throw new SupabaseRestError(response.status, body.slice(0, 500));
  }
  return body ? JSON.parse(body) : null;
}

export class SupabaseRestError extends Error {
  constructor(public readonly status: number, details: string) {
    super(`Supabase request failed with status ${status}: ${details}`);
  }
}

export function getRequiredEnvironmentVariable(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Не задана переменная окружения ${name}`);
  return value;
}

export function getSupabaseSecretKey(): string {
  const value = Deno.env.get("SUPABASE_SECRET_KEY") ??
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!value) throw new Error("Нужна SUPABASE_SECRET_KEY или SUPABASE_SERVICE_ROLE_KEY");
  return value;
}
