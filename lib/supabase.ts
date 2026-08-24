import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;
let supabaseAdminClient: SupabaseClient | null = null;

function sanitizeSupabaseUrl(url?: string): string | null {
  if (!url) return null;
  let cleaned = url.trim();
  if (!cleaned || cleaned === 'https://your-supabase-project.supabase.co') return null;
  // Strip trailing slashes and any appended /rest/v1 path from env var
  cleaned = cleaned.replace(/\/+$/, '');
  cleaned = cleaned.replace(/\/rest\/v1\/?$/i, '');
  cleaned = cleaned.replace(/\/+$/, '');
  return cleaned;
}

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const url = sanitizeSupabaseUrl(rawUrl);

  if (url && anonKey) {
    try {
      supabaseClient = createClient(url, anonKey);
      return supabaseClient;
    } catch (e) {
      console.warn('Failed to initialize Supabase client:', e);
      return null;
    }
  }

  return null;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = sanitizeSupabaseUrl(rawUrl);

  if (url && serviceKey) {
    try {
      supabaseAdminClient = createClient(url, serviceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      return supabaseAdminClient;
    } catch (e) {
      console.warn('Failed to initialize Supabase Admin client:', e);
      return null;
    }
  }

  return null;
}

