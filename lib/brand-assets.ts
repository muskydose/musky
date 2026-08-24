// Centralized Brand Asset Helper
// Manages single-source-of-truth brand logo, favicon, Apple touch icons, and PWA icon URLs.
// Preserves PNG as first-class primary asset format.

import { SiteSettings } from './types';

export const DEFAULT_LOGO_URL = '/logo.png';
export const DEFAULT_FAVICON_URL = '/favicon.png';
export const DEFAULT_APPLE_ICON_URL = '/apple-touch-icon.png';
export const DEFAULT_PWA_ICON_192 = '/icon-192.png';
export const DEFAULT_PWA_ICON_512 = '/icon-512.png';

/**
 * 1. Main Logo Selection & Default Fallback
 * Returns active brand logo URL (Supabase Storage URL, custom uploaded PNG, or fallback /logo.png).
 */
export function getSiteLogo(settings?: Partial<SiteSettings> | null): string {
  if (!settings) return DEFAULT_LOGO_URL;
  const url = settings.logoUrl?.trim();
  if (
    url &&
    url !== '' &&
    !url.includes('fallback.svg') &&
    !url.endsWith('.svg') &&
    !url.includes('logo.svg')
  ) {
    return url;
  }
  return DEFAULT_LOGO_URL;
}

/**
 * 2. Favicon Selection & Cache Busting
 * Returns active brand favicon URL with cache-busting version parameter for instant browser updates.
 */
export function getSiteFavicon(settings?: Partial<SiteSettings> | null): string {
  if (!settings) return DEFAULT_FAVICON_URL;
  const url = settings.faviconUrl?.trim();
  const rawUrl = (url && url !== '' && !url.includes('fallback.svg')) ? url : DEFAULT_FAVICON_URL;
  
  // Attach cache-busting version parameter if timestamp exists or default version
  const version = (settings as any)?.updatedAt || settings.layoutControls?.lastUpdated || 'v1';
  if (rawUrl.includes('?')) {
    return `${rawUrl}&v=${encodeURIComponent(version)}`;
  }
  return `${rawUrl}?v=${encodeURIComponent(version)}`;
}

/**
 * 3. Apple Touch Icon Selection
 * Returns active Apple Touch Icon URL.
 */
export function getSiteAppleIcon(settings?: Partial<SiteSettings> | null): string {
  if (!settings) return DEFAULT_APPLE_ICON_URL;
  const url = settings.faviconUrl?.trim();
  if (url && url !== '' && !url.includes('fallback.svg')) {
    return url;
  }
  return DEFAULT_APPLE_ICON_URL;
}

/**
 * 4. PWA 192x192 & 512x512 Icon Configurations
 * Returns the PWA icon list for Next.js manifest.ts.
 */
export function getSitePwaIcons(settings?: Partial<SiteSettings> | null) {
  const favicon = settings?.faviconUrl?.trim();
  const pwa192 = (favicon && favicon !== '' && !favicon.includes('fallback.svg')) ? favicon : DEFAULT_PWA_ICON_192;
  const pwa512 = (favicon && favicon !== '' && !favicon.includes('fallback.svg')) ? favicon : DEFAULT_PWA_ICON_512;

  return [
    {
      src: pwa192,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any' as const,
    },
    {
      src: pwa192,
      sizes: '192x192',
      type: 'image/png',
      purpose: 'maskable' as const,
    },
    {
      src: pwa512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any' as const,
    },
    {
      src: pwa512,
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable' as const,
    },
  ];
}
