import { SiteSettings } from './types';

let cachedSiteSettings: SiteSettings | null = null;
let settingsFetchPromise: Promise<SiteSettings | null> | null = null;
let lastSettingsFetchTime = 0;
const SETTINGS_CACHE_TTL_MS = 30000; // 30s client cache to prevent request flooding & rate limits

/**
 * Safely fetches site settings on the client side with caching,
 * request deduplication, and graceful error handling for 429 rate limits,
 * non-JSON responses, or network drops.
 */
export async function getClientSiteSettings(): Promise<SiteSettings | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  const now = Date.now();
  if (cachedSiteSettings && now - lastSettingsFetchTime < SETTINGS_CACHE_TTL_MS) {
    return cachedSiteSettings;
  }

  if (settingsFetchPromise) {
    return settingsFetchPromise;
  }

  settingsFetchPromise = (async () => {
    try {
      const res = await fetch('/api/settings', { cache: 'no-store' });

      // Check if response status is OK (handles 429, 500, 502 gracefully)
      if (!res.ok) {
        return cachedSiteSettings;
      }

      // Verify JSON content type before parsing
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        return cachedSiteSettings;
      }

      const data = await res.json();
      if (data && data.success && data.siteSettings) {
        cachedSiteSettings = data.siteSettings;
        lastSettingsFetchTime = Date.now();
        return data.siteSettings;
      }
    } catch {
      // Gracefully catch syntax or network errors without raising browser warnings
    }
    return cachedSiteSettings;
  })().finally(() => {
    settingsFetchPromise = null;
  });

  return settingsFetchPromise;
}
