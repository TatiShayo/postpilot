const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 30;
const MAX_MAP_ENTRIES = 10_000;

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  max?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
}

/**
 * Sweeps expired entries when map approaches capacity to prevent memory leaks (DoS mitigation)
 */
function cleanupExpiredEntries(now: number): void {
  if (rateLimitMap.size < MAX_MAP_ENTRIES) return;
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key);
    }
  }
  // If still at capacity, delete oldest 20% of entries to prevent unbounded memory growth
  if (rateLimitMap.size >= MAX_MAP_ENTRIES) {
    let count = 0;
    const toDelete = Math.floor(MAX_MAP_ENTRIES * 0.2);
    for (const key of rateLimitMap.keys()) {
      rateLimitMap.delete(key);
      count++;
      if (count >= toDelete) break;
    }
  }
}

export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): { allowed: boolean; remaining: number } {
  if (!identifier || typeof identifier !== "string") {
    return { allowed: true, remaining: DEFAULT_MAX_REQUESTS };
  }

  const rawMax = Number.isFinite(options.max) ? options.max! : DEFAULT_MAX_REQUESTS;
  const max = Math.max(1, Math.floor(rawMax));
  
  const rawWindow = Number.isFinite(options.windowMs) ? options.windowMs! : DEFAULT_WINDOW_MS;
  const windowMs = Math.max(100, Math.floor(rawWindow));

  const now = Date.now();
  cleanupExpiredEntries(now);

  const entry = rateLimitMap.get(identifier);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}

/**
 * Resets the in-memory rate limit store (useful for testing)
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}
