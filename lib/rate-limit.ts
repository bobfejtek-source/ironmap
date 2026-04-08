/**
 * Simple in-memory sliding-window rate limiter.
 * Fine for a single-process deployment; swap for Upstash Redis on multi-instance.
 */

interface Window {
  count: number;
  resetAt: number; // epoch ms
}

const store = new Map<string, Window>();

/** Returns true if the request is allowed, false if rate-limited. */
export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) return false;

  entry.count++;
  return true;
}

// Prune expired keys every 10 minutes to avoid unbounded memory growth
setInterval(() => {
  const now = Date.now();
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (now > entry.resetAt) store.delete(key);
  });
}, 10 * 60 * 1000);
