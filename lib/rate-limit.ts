import { createAdminClient } from "@/lib/supabase";

export async function checkRateLimit(
  identifier: string,
  routeName: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const db = createAdminClient();
  const key = `${routeName}:${identifier}`;
  const now = Date.now();

  const { data: existing } = await db
    .from("api_rate_limits")
    .select("count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (!existing) {
    await db.from("api_rate_limits").insert({ key, count: 1, window_start: new Date().toISOString() });
    return { allowed: true };
  }

  const windowStartMs = new Date(existing.window_start).getTime();
  const windowAgeSeconds = (now - windowStartMs) / 1000;

  if (windowAgeSeconds > windowSeconds) {
    await db.from("api_rate_limits").update({ count: 1, window_start: new Date().toISOString() }).eq("key", key);
    return { allowed: true };
  }

  if (existing.count >= maxRequests) {
    return { allowed: false, retryAfterSeconds: Math.ceil(windowSeconds - windowAgeSeconds) };
  }

  await db.from("api_rate_limits").update({ count: existing.count + 1 }).eq("key", key);
  return { allowed: true };
}

export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
