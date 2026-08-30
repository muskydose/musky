/**
 * Reusable rate limiter abstraction.
 *
 * Primary path: Supabase/Postgres atomic limiter (safe across serverless instances).
 * Fallback: per-instance in-memory limiter when Supabase is unavailable.
 */

import { getSupabaseAdmin } from './supabase';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

interface RateLimitRecord {
  count: number;
  windowStart: number;
}

const memoryRateLimitStore = new Map<string, RateLimitRecord>();

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

function checkMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const record = memoryRateLimitStore.get(key);

  if (!record || now - record.windowStart >= windowMs) {
    memoryRateLimitStore.set(key, { count: 1, windowStart: now });
    return { allowed: true, remaining: Math.max(limit - 1, 0), resetMs: windowMs };
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: Math.max(windowMs - (now - record.windowStart), 0),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: Math.max(limit - record.count, 0),
    resetMs: Math.max(windowMs - (now - record.windowStart), 0),
  };
}

/**
 * Synchronous compatibility API used by existing routes.
 * For serverless-safe distributed enforcement, use checkRateLimitAsync().
 */
export function checkRateLimit(
  key: string,
  limit: number = 20,
  windowMs: number = 15 * 60 * 1000
): RateLimitResult {
  return checkMemoryRateLimit(key, limit, windowMs);
}

/**
 * Distributed rate limit backed by Supabase RPC, with a safe local fallback.
 * The DB function performs the increment atomically under row lock.
 */
export async function checkRateLimitAsync(
  key: string,
  limit: number = 20,
  windowMs: number = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const normalizedKey = key.trim();
  if (!normalizedKey) {
    return { allowed: false, remaining: 0, resetMs: windowMs };
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return checkMemoryRateLimit(normalizedKey, limit, windowMs);
  }

  try {
    const { data, error } = await admin.rpc('consume_rate_limit', {
      p_key: normalizedKey,
      p_limit: limit,
      p_window_ms: windowMs,
    });

    if (error || !data || typeof data !== 'object') {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[rate-limit] Supabase limiter unavailable; using memory fallback', error?.message);
      }
      return checkMemoryRateLimit(normalizedKey, limit, windowMs);
    }

    return {
      allowed: Boolean((data as any).allowed),
      remaining: Number((data as any).remaining ?? 0),
      resetMs: Number((data as any).reset_ms ?? windowMs),
    };
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[rate-limit] Supabase limiter failed; using memory fallback', error);
    }
    return checkMemoryRateLimit(normalizedKey, limit, windowMs);
  }
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  return '127.0.0.1';
}
