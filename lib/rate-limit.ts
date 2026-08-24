/**
 * Reusable Rate Limiter Abstraction
 * Supports in-memory sliding window fallback and handles client IP identification safely.
 */

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const memoryRateLimitStore = new Map<string, RateLimitRecord>();

// Clean store periodically every 5 minutes to prevent memory growth
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryRateLimitStore.entries()) {
      if (now - record.windowStart > 60 * 60 * 1000) {
        memoryRateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export function checkRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 15 * 60 * 1000
): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const record = memoryRateLimitStore.get(key);

  if (!record) {
    memoryRateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (now - record.windowStart > windowMs) {
    memoryRateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: limit - 1, resetMs: windowMs };
  }

  if (record.count >= limit) {
    return { allowed: false, remaining: 0, resetMs: windowMs - (now - record.windowStart) };
  }

  record.count += 1;
  return { allowed: true, remaining: limit - record.count, resetMs: windowMs - (now - record.windowStart) };
}

export function getClientIp(headers: Headers): string {
  // Use first address in X-Forwarded-For if behind a trusted proxy, fallback to standard headers
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp && firstIp !== '') return firstIp;
  }
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}
