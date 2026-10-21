import "server-only";

// Minimal in-memory protections for routes that spend third-party quota.
// In a multi-instance deployment replace with a shared store (e.g. Redis/Upstash).

const buckets = new Map<string, { tokens: number; updated: number }>();

export function clientKey(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "local").trim();
}

/** Token bucket: `capacity` requests, refilled linearly over `windowMs`. */
export function rateLimit(key: string, capacity = 30, windowMs = 10 * 60_000): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: capacity, updated: now };
  const refill = ((now - b.updated) / windowMs) * capacity;
  b.tokens = Math.min(capacity, b.tokens + refill);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false, retryAfter: Math.ceil(((1 - b.tokens) / capacity) * windowMs / 1000) };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true, retryAfter: 0 };
}

const cache = new Map<string, { value: unknown; expires: number }>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<{ value: T; hit: boolean }> {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return { value: hit.value as T, hit: true };
  const value = await fn();
  cache.set(key, { value, expires: Date.now() + ttlMs });
  if (cache.size > 500) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].expires - b[1].expires).slice(0, 100);
    oldest.forEach(([k]) => cache.delete(k));
  }
  return { value, hit: false };
}

export function json(data: unknown, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { "Cache-Control": "no-store", ...(init.headers ?? {}) } });
}
