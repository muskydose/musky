import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';

const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days
const SESSION_MAX_AGE_MS = SESSION_MAX_AGE_SEC * 1000;

/**
 * Pure TypeScript SHA-256 implementation (Edge and Node.js runtime compatible).
 */
function sha256(input: Uint8Array<ArrayBufferLike>): Uint8Array {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const len = input.length;
  const bitLen = len * 8;

  const padLen = (len % 64 < 56) ? (56 - len % 64) : (120 - len % 64);
  const totalLen = len + padLen + 8;
  const padded = new Uint8Array(totalLen);
  padded.set(input, 0);
  padded[len] = 0x80;

  const highBits = Math.floor(bitLen / 0x100000000);
  const lowBits = bitLen >>> 0;

  padded[totalLen - 8] = (highBits >>> 24) & 0xff;
  padded[totalLen - 7] = (highBits >>> 16) & 0xff;
  padded[totalLen - 6] = (highBits >>> 8) & 0xff;
  padded[totalLen - 5] = highBits & 0xff;
  padded[totalLen - 4] = (lowBits >>> 24) & 0xff;
  padded[totalLen - 3] = (lowBits >>> 16) & 0xff;
  padded[totalLen - 2] = (lowBits >>> 8) & 0xff;
  padded[totalLen - 1] = lowBits & 0xff;

  const W = new Int32Array(64);

  for (let offset = 0; offset < totalLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const p = offset + i * 4;
      W[i] = (padded[p] << 24) | (padded[p + 1] << 16) | (padded[p + 2] << 8) | padded[p + 3];
    }

    for (let i = 16; i < 64; i++) {
      const w15 = W[i - 15];
      const s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
      const w2 = W[i - 2];
      const s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
      W[i] = (W[i - 16] + s0 + W[i - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[i] + W[i]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const out = new Uint8Array(32);
  const hashes = [h0, h1, h2, h3, h4, h5, h6, h7];
  for (let i = 0; i < 8; i++) {
    out[i * 4] = (hashes[i] >>> 24) & 0xff;
    out[i * 4 + 1] = (hashes[i] >>> 16) & 0xff;
    out[i * 4 + 2] = (hashes[i] >>> 8) & 0xff;
    out[i * 4 + 3] = hashes[i] & 0xff;
  }

  return out;
}

/**
 * Pure TypeScript HMAC-SHA256 signature generator.
 */
function hmacSha256(keyStr: string, dataStr: string): string {
  const enc = new TextEncoder();
  let key: Uint8Array<ArrayBufferLike> = enc.encode(keyStr);
  const data = enc.encode(dataStr);

  if (key.length > 64) {
    key = sha256(key);
  }
  if (key.length < 64) {
    const tmp = new Uint8Array(64);
    tmp.set(key);
    key = tmp;
  }

  const oPad = new Uint8Array(64);
  const iPad = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    oPad[i] = key[i] ^ 0x5c;
    iPad[i] = key[i] ^ 0x36;
  }

  const inner = new Uint8Array(64 + data.length);
  inner.set(iPad, 0);
  inner.set(data, 64);
  const innerHash = sha256(inner);

  const outer = new Uint8Array(64 + 32);
  outer.set(oPad, 0);
  outer.set(innerHash, 64);
  const outerHash = sha256(outer);

  return Array.from(outerHash, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates cryptographically secure random hex bytes without Node crypto module.
 */
function getRandomHex(byteCount: number = 16): string {
  const bytes = new Uint8Array(byteCount);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Fallback in-memory instance key for signature verification if process.env.ADMIN_SESSION_SECRET is unset
const SERVER_INSTANCE_SECRET = getRandomHex(32);

function getAuthSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('ADMIN_SESSION_SECRET environment variable is missing or empty.');
  }
  return secret;
}

/**
 * Login rate limiter: max 5 login attempts per 15 minutes per IP.
 */
const loginRateLimiter = new Map<string, { count: number; windowStart: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; remaining: number; resetMs: number } {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxAttempts = 5;

  const record = loginRateLimiter.get(ip);
  if (!record) {
    loginRateLimiter.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxAttempts - 1, resetMs: windowMs };
  }

  if (now - record.windowStart > windowMs) {
    loginRateLimiter.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: maxAttempts - 1, resetMs: windowMs };
  }

  if (record.count >= maxAttempts) {
    return { allowed: false, remaining: 0, resetMs: windowMs - (now - record.windowStart) };
  }

  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count, resetMs: windowMs - (now - record.windowStart) };
}

/**
 * Creates a signed admin session token.
 * Format: v1.<timestamp>.<nonce>.<emailHex>.<signature>
 */
export function createAdminSessionToken(email: string): string {
  const timestamp = Date.now();
  const nonce = getRandomHex(16);
  const emailHex = Array.from(new TextEncoder().encode(email.toLowerCase()), (b) => b.toString(16).padStart(2, '0')).join('');
  const payload = `v1.${timestamp}.${nonce}.${emailHex}`;
  const signature = hmacSha256(getAuthSecret(), payload);
  return `${payload}.${signature}`;
}

// In-memory password override and timestamp tracking for runtime password resets
let memoryPasswordOverride: string | null = null;
let lastPasswordChangedAt: number = 0;

export function updateAdminPasswordInStore(newPassword: string): void {
  memoryPasswordOverride = newPassword;
  lastPasswordChangedAt = Date.now();
}

/**
 * Gets persistent session revocation timestamp from DB or memory.
 */
let cachedPersistentRevocationMs: number = 0;
let lastRevocationFetchMs: number = 0;

export async function getPersistentSessionRevocationTime(): Promise<number> {
  const now = Date.now();
  if (now - lastRevocationFetchMs < 10000) {
    return Math.max(lastPasswordChangedAt, cachedPersistentRevocationMs);
  }

  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      const { data } = await supabase.from('admin_users').select('updated_at').eq('id', 'admin-primary').maybeSingle();
      if (data?.updated_at) {
        cachedPersistentRevocationMs = new Date(data.updated_at).getTime();
      }
    }
  } catch {
    // Keep cached value on error
  }

  lastRevocationFetchMs = now;
  return Math.max(lastPasswordChangedAt, cachedPersistentRevocationMs);
}

/**
 * Verifies an admin session token signature and checks timestamp freshness.
 */
export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 5) return false;

  const [version, timestampStr, nonce, emailHex, signature] = parts;
  if (version !== 'v1') return false;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return false;

  const now = Date.now();
  if (now - timestamp > SESSION_MAX_AGE_MS || timestamp > now + 60000) {
    return false;
  }

  // Revoke session if issued prior to the most recent password reset
  const minValidTimestamp = Math.max(lastPasswordChangedAt, cachedPersistentRevocationMs);
  if (minValidTimestamp > 0 && timestamp < minValidTimestamp) {
    return false;
  }

  const payload = `${version}.${timestampStr}.${nonce}.${emailHex}`;
  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return false;
  }
  const expectedSignature = hmacSha256(secret, payload);

  return timingSafeEqualHex(signature, expectedSignature);
}

/**
 * Computes scrypt KDF password hash with per-password salt for secure storage.
 */
export function hashPassword(password: string): string {
  const nodeCrypto = require('crypto');
  const salt = nodeCrypto.randomBytes(16).toString('hex');
  const derivedKey = nodeCrypto.scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$16384$8$1$${salt}$${derivedKey.toString('hex')}`;
}

/**
 * Verifies password against scrypt or legacy HMAC/plaintext hash formats.
 */
export function verifyPasswordHash(
  password: string,
  storedHash: string,
  authSecret: string
): { matches: boolean; needsRehash: boolean } {
  if (!storedHash) return { matches: false, needsRehash: false };

  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length === 6) {
      const N = parseInt(parts[1], 10);
      const r = parseInt(parts[2], 10);
      const p = parseInt(parts[3], 10);
      const salt = parts[4];
      const hashHex = parts[5];
      const nodeCrypto = require('crypto');
      const derivedKey = nodeCrypto.scryptSync(password, salt, 64, { N, r, p });
      const matches = timingSafeEqualHex(derivedKey.toString('hex'), hashHex);
      return { matches, needsRehash: false };
    }
  }

  // Legacy HMAC-SHA256 hash or legacy plaintext check
  const legacyHmac = hmacSha256(authSecret, password);
  if (timingSafeEqualHex(legacyHmac, storedHash) || timingSafeEqualHex(password, storedHash)) {
    return { matches: true, needsRehash: true };
  }

  return { matches: false, needsRehash: false };
}

/**
 * Validates admin login credentials against Supabase admin_users, server environment configuration, or active password override.
 * FAIL CLOSED if ADMIN_PASSWORD or ADMIN_SESSION_SECRET is missing or set to insecure defaults.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  // Require ADMIN_SESSION_SECRET
  let authSecret: string;
  try {
    authSecret = getAuthSecret();
  } catch {
    return {
      success: false,
      error: 'ADMIN_SESSION_SECRET environment variable is missing or empty in server environment.',
    };
  }

  // Reject hardcoded legacy passwords
  if (password === 'muskydoseadmin' || password === 'admin123') {
    return { success: false, error: 'Invalid email or password credentials.' };
  }

  const normalizedEmail = email.trim().toLowerCase();

  // First check Supabase admin_users table for persistent password
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle();

      if (error) {
        const isTableMissing =
          error.code === 'PGRST205' ||
          error.code === 'PGRST125' ||
          error.code === '42P01' ||
          error.code === 'PGRST200' ||
          error.code === 'PGRST116' ||
          error.message?.includes('schema') ||
          error.message?.includes('does not exist') ||
          error.message?.includes('Invalid path');

        if (!isTableMissing && process.env.NODE_ENV === 'production') {
          console.error('[Auth] Production database admin authentication error:', error);
          return { success: false, error: 'Database authentication unavailable.' };
        }
      }

      if (!error && data && data.password_hash) {
        const check = verifyPasswordHash(password, data.password_hash, authSecret);
        if (check.matches) {
          // Transparently migrate legacy hash format to scrypt
          if (check.needsRehash) {
            try {
              const newScryptHash = hashPassword(password);
              await supabase
                .from('admin_users')
                .update({ password_hash: newScryptHash })
                .eq('email', normalizedEmail);
            } catch (rehashErr) {
              console.warn('[Auth] Transparent password rehash warning:', rehashErr);
            }
          }
          return { success: true };
        } else {
          return { success: false, error: 'Invalid email or password credentials.' };
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Auth] Production database admin authentication exception:', err);
        return { success: false, error: 'Database authentication unavailable.' };
      }
    }
  }

  const configuredPassword = memoryPasswordOverride || process.env.ADMIN_PASSWORD;

  // FAIL CLOSED if ADMIN_PASSWORD environment variable is not configured or uses insecure default
  if (!configuredPassword || configuredPassword === 'muskydoseadmin' || configuredPassword === 'admin123') {
    return {
      success: false,
      error: 'Admin authentication is not configured in server environment variables.',
    };
  }

  const envEmail = (process.env.ADMIN_EMAIL || 'admin@muskydose.in').toLowerCase();

  if (normalizedEmail !== envEmail) {
    return { success: false, error: 'Invalid email or password credentials.' };
  }

  // Timing safe password comparison
  return timingSafeEqualHex(password, configuredPassword)
    ? { success: true }
    : { success: false, error: 'Invalid email or password credentials.' };
}

// ============================================================================
// ADMIN MOBILE OTP PASSWORD RESET ENGINE
// ============================================================================

// Cryptographically secure 6-digit OTP generator
export function generate6DigitOTP(): string {
  const bytes = new Uint8Array(4);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    const rand = Math.floor(Date.now() * 1000 + Math.random() * 1000000);
    const buf = new TextEncoder().encode(rand.toString());
    const hash = sha256(buf);
    bytes[0] = hash[0];
    bytes[1] = hash[1];
    bytes[2] = hash[2];
    bytes[3] = hash[3];
  }
  const num = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  const otpNum = 100000 + (num % 900000);
  return otpNum.toString();
}

// Compute SHA-256 hash of mobile + OTP
function hashOTP(mobile: string, otp: string): string {
  const data = new TextEncoder().encode(`${mobile.trim()}:${otp.trim()}`);
  const hash = sha256(data);
  return Array.from(hash, (b) => b.toString(16).padStart(2, '0')).join('');
}

// Fallback memory OTP store for environments where Supabase is unconfigured (development only)
interface OTPRecord {
  hashed_otp: string;
  expires_at: string;
  attempts: number;
  resend_allowed_at: string;
  request_count: number;
  rate_window_start: string;
  consumed: boolean;
  reset_token_hash: string | null;
  reset_token_consumed: boolean;
}

const memoryOtpStore = new Map<string, OTPRecord>();
const consumedResetTokens = new Set<string>();

// Configured admin recovery mobile numbers
export function getRegisteredAdminMobileNumbers(): string[] {
  const envMobile = process.env.ADMIN_RECOVERY_MOBILE;
  if (!envMobile || !envMobile.trim()) {
    return [];
  }
  const clean = normalizeIndianMobile(envMobile.trim());
  return clean ? [clean] : [];
}

// Sanitize mobile input
export function sanitizeMobileNumber(input: string): string {
  if (!input) return '';
  return input.replace(/[^0-9]/g, '');
}

/**
 * Normalizes Indian mobile numbers safely to 91XXXXXXXXXX format.
 */
export function normalizeIndianMobile(input: string): string {
  const clean = sanitizeMobileNumber(input);
  if (clean.length === 10) {
    return `91${clean}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    return clean;
  }
  return clean;
}

/**
 * Checks if SMS provider API credentials exist in server environment.
 * SMS credentials are strictly OPTIONAL. If absent or empty, OTP requests safely return PROVIDER_REQUIRED.
 */
export function isSmsGatewayConfigured(): boolean {
  const key = process.env.SMS_GATEWAY_API_KEY;
  if (!key) return false;
  const trimmed = key.trim();
  return Boolean(
    trimmed !== '' &&
      trimmed !== 'optional_for_sms_otp' &&
      trimmed !== 'your-sms-gateway-api-key'
  );
}

/**
 * Requests a mobile OTP for admin password recovery.
 * Uses persistent storage in Supabase admin_otps table for cross-instance support.
 */
export async function requestMobileOTP(
  mobileInput: string,
  ip: string
): Promise<{
  success: boolean;
  error?: string;
  deliveryStatus: 'SENT' | 'PROVIDER_REQUIRED' | 'RATE_LIMITED' | 'GENERIC_RESPONSE';
  resendCooldownSec?: number;
}> {
  const cleanMobile = normalizeIndianMobile(mobileInput);
  if (!cleanMobile) {
    return {
      success: false,
      deliveryStatus: 'GENERIC_RESPONSE',
      error: 'Valid mobile number is required.',
    };
  }

  const allowedMobiles = getRegisteredAdminMobileNumbers();
  const isRegistered = allowedMobiles.some((m) => m === cleanMobile || m.endsWith(cleanMobile) || cleanMobile.endsWith(m));

  if (!isRegistered) {
    return {
      success: false,
      deliveryStatus: 'GENERIC_RESPONSE',
      error: 'This mobile number is not registered for admin account recovery.',
    };
  }

  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  const supabase = getSupabaseAdmin();

  if (!supabase && process.env.NODE_ENV === 'production') {
    return {
      success: false,
      deliveryStatus: 'PROVIDER_REQUIRED',
      error: 'Database connection is required for production OTP authentication.',
    };
  }

  let existingRecord: any = null;
  if (supabase) {
    const { data } = await supabase.from('admin_otps').select('*').eq('mobile', cleanMobile).maybeSingle();
    existingRecord = data;
  } else {
    existingRecord = memoryOtpStore.get(cleanMobile);
  }

  let requestCount = 1;
  let rateWindowStartMs = now;

  if (existingRecord) {
    const recordWindowStartMs = existingRecord.rate_window_start
      ? new Date(existingRecord.rate_window_start).getTime()
      : now;

    if (now - recordWindowStartMs <= 15 * 60 * 1000) {
      rateWindowStartMs = recordWindowStartMs;
      const currentCount = Number(existingRecord.request_count ?? existingRecord.requestCount ?? 0);
      requestCount = currentCount + 1;
      if (currentCount >= 3) {
        const cooldownRemainingMs = 15 * 60 * 1000 - (now - recordWindowStartMs);
        return {
          success: false,
          deliveryStatus: 'RATE_LIMITED',
          resendCooldownSec: Math.ceil(cooldownRemainingMs / 1000),
          error: 'Too many OTP requests for this mobile number. Please try again in 15 minutes.',
        };
      }
    }

    const resendAllowedAtVal = existingRecord.resend_allowed_at || existingRecord.resendAllowedAt;
    if (resendAllowedAtVal) {
      const resendAllowedAtMs = new Date(resendAllowedAtVal).getTime();
      if (now < resendAllowedAtMs) {
        const waitSec = Math.ceil((resendAllowedAtMs - now) / 1000);
        return {
          success: false,
          deliveryStatus: 'RATE_LIMITED',
          resendCooldownSec: waitSec,
          error: `Please wait ${waitSec} seconds before requesting another OTP.`,
        };
      }
    }
  }

  // Generate 6-digit OTP code & SHA-256 hash
  const otpCode = generate6DigitOTP();
  const hashedOtp = hashOTP(cleanMobile, otpCode);

  const expiresAtIso = new Date(now + 10 * 60 * 1000).toISOString();
  const resendAllowedAtIso = new Date(now + 60 * 1000).toISOString();
  const rateWindowStartIso = new Date(rateWindowStartMs).toISOString();

  if (supabase) {
    const { error: upsertErr } = await supabase.from('admin_otps').upsert([
      {
        mobile: cleanMobile,
        hashed_otp: hashedOtp,
        expires_at: expiresAtIso,
        attempts: 0,
        resend_allowed_at: resendAllowedAtIso,
        request_count: requestCount,
        rate_window_start: rateWindowStartIso,
        consumed: false,
        reset_token_hash: null,
        reset_token_consumed: false,
        updated_at: nowIso,
      },
    ]);
    if (upsertErr) {
      console.error('Failed to save OTP record in Supabase admin_otps:', upsertErr);
    }
  } else {
    memoryOtpStore.set(cleanMobile, {
      hashed_otp: hashedOtp,
      expires_at: expiresAtIso,
      attempts: 0,
      resend_allowed_at: resendAllowedAtIso,
      request_count: requestCount,
      rate_window_start: rateWindowStartIso,
      consumed: false,
      reset_token_hash: null,
      reset_token_consumed: false,
    });
  }

  // Check SMS Gateway configuration
  if (!isSmsGatewayConfigured()) {
    return {
      success: false,
      deliveryStatus: 'PROVIDER_REQUIRED',
      resendCooldownSec: 60,
      error: 'PROVIDER NOT CONFIGURED — SMS Gateway credentials (SMS_GATEWAY_API_KEY) are not set in server environment variables.',
    };
  }

  // Send real SMS if provider is configured
  try {
    const apiKey = process.env.SMS_GATEWAY_API_KEY!;
    const senderId = process.env.SMS_SENDER_ID || 'MSKDOS';
    const templateId = process.env.SMS_TEMPLATE_ID || '';

    const res = await fetch('https://api.smsgateway.me/v1/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiKey,
      },
      body: JSON.stringify({
        sender: senderId,
        template_id: templateId,
        route: 'otp',
        numbers: cleanMobile,
        message: `Your Musky Dose Admin OTP code is ${otpCode}. Valid for 10 minutes.`,
      }),
    });

    if (!res.ok) {
      throw new Error(`SMS Provider HTTP error: ${res.status}`);
    }

    return {
      success: true,
      deliveryStatus: 'SENT',
      resendCooldownSec: 60,
    };
  } catch (err: any) {
    return {
      success: false,
      deliveryStatus: 'PROVIDER_REQUIRED',
      error: `SMS Gateway delivery failed: ${err.message || 'Network error'}`,
    };
  }
}

/**
 * Verifies mobile OTP code and generates a short-lived single-use Reset Authorization Token.
 * Queries persistent admin_otps table in Supabase for cross-instance consistency.
 */
export async function verifyMobileOTP(
  mobileInput: string,
  otpInput: string,
  ip: string
): Promise<{ success: boolean; error?: string; resetToken?: string }> {
  const cleanMobile = normalizeIndianMobile(mobileInput);
  const cleanOtp = (otpInput || '').trim();

  if (!cleanMobile || !cleanOtp) {
    return { success: false, error: 'Mobile number and OTP code are required.' };
  }

  const supabase = getSupabaseAdmin();
  let record: any = null;

  if (supabase) {
    const { data } = await supabase.from('admin_otps').select('*').eq('mobile', cleanMobile).maybeSingle();
    record = data;
  } else {
    record = memoryOtpStore.get(cleanMobile);
  }

  if (!record || record.consumed) {
    return { success: false, error: 'No active OTP request found for this mobile number. Please request a new OTP.' };
  }

  const now = Date.now();
  const expiresAtVal = record.expires_at || record.expiresAt;
  const expiresAtMs = new Date(expiresAtVal).getTime();

  if (now > expiresAtMs) {
    if (supabase) {
      await supabase.from('admin_otps').update({ consumed: true, updated_at: new Date().toISOString() }).eq('mobile', cleanMobile);
    } else {
      record.consumed = true;
    }
    return { success: false, error: 'OTP has expired (10-minute limit). Please request a new OTP.' };
  }

  const currentAttempts = Number(record.attempts || 0);
  if (currentAttempts >= 3) {
    if (supabase) {
      await supabase.from('admin_otps').update({ consumed: true, updated_at: new Date().toISOString() }).eq('mobile', cleanMobile);
    } else {
      record.consumed = true;
    }
    return { success: false, error: 'Maximum verification attempts (3) exceeded. Please request a new OTP.' };
  }

  const updatedAttempts = currentAttempts + 1;
  const hashedOtpVal = record.hashed_otp || record.hashedOtp;
  const inputHash = hashOTP(cleanMobile, cleanOtp);
  const isValid = timingSafeEqualHex(inputHash, hashedOtpVal);

  if (!isValid) {
    if (supabase) {
      await supabase.from('admin_otps').update({
        attempts: updatedAttempts,
        consumed: updatedAttempts >= 3 ? true : false,
        updated_at: new Date().toISOString()
      }).eq('mobile', cleanMobile);
    } else {
      record.attempts = updatedAttempts;
      if (updatedAttempts >= 3) record.consumed = true;
    }
    const remaining = 3 - updatedAttempts;
    if (remaining <= 0) {
      return { success: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }
    return { success: false, error: `Invalid OTP code. ${remaining} attempt(s) remaining.` };
  }

  // Generate short-lived single-use Reset Authorization Token
  const resetToken = createResetAuthorizationToken(cleanMobile);
  const hashedResetToken = hashOTP(cleanMobile, resetToken);

  if (supabase) {
    await supabase.from('admin_otps').update({
      consumed: true,
      reset_token_hash: hashedResetToken,
      reset_token_consumed: false,
      updated_at: new Date().toISOString(),
    }).eq('mobile', cleanMobile);
  } else {
    record.consumed = true;
    record.reset_token_hash = hashedResetToken;
    record.reset_token_consumed = false;
  }

  return { success: true, resetToken };
}

/**
 * Creates a cryptographically signed Reset Authorization Token:
 * Format: reset.v1.<timestamp>.<nonce>.<mobileHex>.<signature>
 */
export function createResetAuthorizationToken(mobile: string): string {
  const timestamp = Date.now();
  const nonce = getRandomHex(16);
  const mobileHex = Array.from(new TextEncoder().encode(mobile), (b) => b.toString(16).padStart(2, '0')).join('');
  const payload = `reset.v1.${timestamp}.${nonce}.${mobileHex}`;
  const signature = hmacSha256(getAuthSecret(), payload);
  return `${payload}.${signature}`;
}

/**
 * Validates a Reset Authorization Token.
 */
export function verifyResetAuthorizationToken(token: string | undefined | null): { valid: boolean; mobile?: string; error?: string } {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Reset authorization token is missing or invalid.' };
  }

  if (consumedResetTokens.has(token)) {
    return { valid: false, error: 'This reset authorization token has already been used.' };
  }

  const parts = token.split('.');
  if (parts.length !== 6) {
    return { valid: false, error: 'Malformed reset authorization token.' };
  }

  const [prefix, version, timestampStr, nonce, mobileHex, signature] = parts;
  if (prefix !== 'reset' || version !== 'v1') {
    return { valid: false, error: 'Invalid reset authorization token format.' };
  }

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return { valid: false, error: 'Invalid token timestamp.' };
  }

  const now = Date.now();
  // Valid for 10 minutes max
  if (now - timestamp > 10 * 60 * 1000 || timestamp > now + 60000) {
    return { valid: false, error: 'Reset authorization token has expired.' };
  }

  const payload = `${prefix}.${version}.${timestampStr}.${nonce}.${mobileHex}`;
  let secret: string;
  try {
    secret = getAuthSecret();
  } catch {
    return { valid: false, error: 'ADMIN_SESSION_SECRET environment variable is missing in server environment.' };
  }
  const expectedSignature = hmacSha256(secret, payload);

  if (!timingSafeEqualHex(signature, expectedSignature)) {
    return { valid: false, error: 'Tampered or invalid reset authorization signature.' };
  }

  // Decode mobile
  const bytes = new Uint8Array(mobileHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []);
  const mobile = new TextDecoder().decode(bytes);

  return { valid: true, mobile };
}

/**
 * Validates Reset Authorization Token in database for cross-instance single-use enforcement.
 */
export async function verifyResetAuthorizationTokenInDb(
  token: string | undefined | null
): Promise<{ valid: boolean; mobile?: string; error?: string }> {
  const check = verifyResetAuthorizationToken(token);
  if (!check.valid || !check.mobile) {
    return check;
  }

  const hashedResetToken = hashOTP(check.mobile, token!);
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('admin_otps')
      .select('*')
      .eq('mobile', check.mobile)
      .eq('reset_token_hash', hashedResetToken)
      .maybeSingle();

    if (!data) {
      return { valid: false, error: 'Reset authorization token is not associated with an active recovery session.' };
    }

    if (data.reset_token_consumed) {
      return { valid: false, error: 'This reset authorization token has already been used.' };
    }
  } else {
    const memRecord = memoryOtpStore.get(check.mobile);
    if (!memRecord || memRecord.reset_token_hash !== hashedResetToken) {
      return { valid: false, error: 'Reset authorization token is not associated with an active recovery session.' };
    }
    if (memRecord.reset_token_consumed) {
      return { valid: false, error: 'This reset authorization token has already been used.' };
    }
  }

  return check;
}

/**
 * Validates Reset Authorization Token, enforces password rules, and updates password in memory & Supabase.
 */
export async function executePasswordReset(
  resetToken: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!newPassword || !confirmPassword) {
    return { success: false, error: 'New password and confirmation password are required.' };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Password confirmation does not match.' };
  }

  if (newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters in length.' };
  }

  // Check complexity
  if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return { success: false, error: 'Password must contain both letters and numbers.' };
  }

  // Verify Reset Authorization Token in database (replay protection)
  const tokenCheck = await verifyResetAuthorizationTokenInDb(resetToken);
  if (!tokenCheck.valid || !tokenCheck.mobile) {
    return { success: false, error: tokenCheck.error || 'Invalid reset authorization token.' };
  }

  const supabase = getSupabaseAdmin();
  const email = (process.env.ADMIN_EMAIL || 'admin@muskydose.in').toLowerCase();
  const passwordHash = hashPassword(newPassword);

  // Persist password update to Supabase admin_users table FIRST
  if (supabase) {
    try {
      const { error } = await supabase.from('admin_users').upsert(
        [
          {
            id: 'admin-primary',
            email: email,
            password_hash: passwordHash,
            name: 'Musky Dose Admin',
            role: 'superadmin',
          },
        ],
        { onConflict: 'email' }
      );

      if (error) {
        console.error('Failed to update admin_users table in Supabase:', error);
        return { success: false, error: `Failed to persist new password to database: ${error.message}` };
      }

      // Mark reset token as consumed in Supabase
      await supabase.from('admin_otps').update({
        reset_token_consumed: true,
        updated_at: new Date().toISOString(),
      }).eq('mobile', tokenCheck.mobile);
    } catch (err: any) {
      console.error('Supabase exception during password reset persistence:', err);
      return { success: false, error: `Database persistence error: ${err.message}` };
    }
  } else {
    const memRecord = memoryOtpStore.get(tokenCheck.mobile);
    if (memRecord) {
      memRecord.reset_token_consumed = true;
    }
  }

  // Mark token as consumed in local memory
  consumedResetTokens.add(resetToken);

  // ONLY AFTER successful DB persistence (or fallback memory run), update in-memory password override
  updateAdminPasswordInStore(newPassword);

  return { success: true };
}


/**
 * Extracts and verifies admin authentication from NextRequest cookies or Authorization header.
 */
export function isRequestAdminAuthenticated(req: NextRequest): boolean {
  const authCookie = req.cookies.get('md_admin_auth')?.value;
  if (verifyAdminSessionToken(authCookie)) {
    return true;
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7).trim();
    if (verifyAdminSessionToken(bearerToken)) {
      return true;
    }
  }

  return false;
}

/**
 * Validates Origin/Referer headers on state-changing admin requests for CSRF protection.
 */
export function verifyAdminCsrfAndOrigin(req: NextRequest): boolean {
  const method = req.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;

  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const host = req.headers.get('host');

  if (origin && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost === host) return true;
      // Allow canonical site URL origin if set
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (siteUrl && new URL(siteUrl).host === originHost) return true;
      console.warn(`[CSRF Warning] Origin host mismatch: ${originHost} !== ${host}`);
      return false;
    } catch {
      return false;
    }
  }

  if (referer && host) {
    try {
      const refererHost = new URL(referer).host;
      if (refererHost === host) return true;
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (siteUrl && new URL(siteUrl).host === refererHost) return true;
      console.warn(`[CSRF Warning] Referer host mismatch: ${refererHost} !== ${host}`);
      return false;
    } catch {
      return false;
    }
  }

  // Strict check in production: state-changing POST/PUT/DELETE requests MUST present origin or referer
  if (process.env.NODE_ENV === 'production') {
    console.warn(`[CSRF Warning] Missing Origin and Referer on state-changing ${method} request`);
    return false;
  }

  return true;
}

/**
 * Common reusable guard for authenticated admin routes with CSRF validation on mutations.
 */
export function requireAdminAuthAndCsrf(req: NextRequest): { authenticated: boolean; errorResponse?: NextResponse } {
  if (!isRequestAdminAuthenticated(req)) {
    return {
      authenticated: false,
      errorResponse: NextResponse.json(
        { success: false, error: 'Unauthorized administrative access required.' },
        { status: 401 }
      ),
    };
  }

  const method = req.method.toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    if (!verifyAdminCsrfAndOrigin(req)) {
      return {
        authenticated: false,
        errorResponse: NextResponse.json(
          { success: false, error: 'CSRF validation failed: Invalid or untrusted request origin.' },
          { status: 403 }
        ),
      };
    }
  }

  return { authenticated: true };
}

/**
 * Records an audit log entry in Supabase audit_logs table for administrative traceability.
 */
export async function recordAuditLog(params: {
  action: string;
  userEmail?: string;
  resource?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase.from('audit_logs').insert([
        {
          id: `log_${Date.now()}_${getRandomHex(8)}`,
          action: params.action,
          user_email: params.userEmail || 'admin@muskydose.in',
          resource: params.resource || 'system',
          details: params.details || {},
          ip_address: params.ipAddress || 'unknown',
          created_at: new Date().toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.warn('[AuditLog] Failed to record audit log entry:', err);
  }
}

/**
 * Sets secure HttpOnly cookie on response object.
 */
export function setAdminAuthCookie(response: NextResponse, token: string) {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set('md_admin_auth', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: SESSION_MAX_AGE_SEC,
    path: '/',
  });
}

/**
 * Clears auth cookie on response object.
 */
export function clearAdminAuthCookie(response: NextResponse) {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set('md_admin_auth', '', {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}
