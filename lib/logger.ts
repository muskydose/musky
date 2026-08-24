// Structured Logger for Musky Dose
// Ensures no sensitive fields (passwords, OTPs, tokens, API keys, service role keys) are ever logged.

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'passwordhash',
  'newpassword',
  'confirmpassword',
  'otp',
  'hashed_otp',
  'hashedotp',
  'token',
  'secret',
  'resettoken',
  'reset_token',
  'authorization',
  'cookie',
  'service_role_key',
  'supabase_service_role_key',
  'admin_session_secret',
  'api_key',
  'apikey',
]);

function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 5 || !obj) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, depth + 1));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey) || lowerKey.includes('secret') || lowerKey.includes('password')) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, depth + 1);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    if (context) {
      console.log(`[INFO] [${timestamp}] ${message}`, JSON.stringify(sanitizeObject(context)));
    } else {
      console.log(`[INFO] [${timestamp}] ${message}`);
    }
  },

  warn: (message: string, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    if (context) {
      console.warn(`[WARN] [${timestamp}] ${message}`, JSON.stringify(sanitizeObject(context)));
    } else {
      console.warn(`[WARN] [${timestamp}] ${message}`);
    }
  },

  error: (message: string, error?: any, context?: Record<string, any>) => {
    const timestamp = new Date().toISOString();
    const errDetails = error
      ? { message: error.message || String(error), code: error.code }
      : undefined;
    const ctx = { ...context, error: errDetails };
    console.error(`[ERROR] [${timestamp}] ${message}`, JSON.stringify(sanitizeObject(ctx)));
  },
};
