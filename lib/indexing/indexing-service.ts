/**
 * MUSKY DOSE — SEARCH ENGINE INDEXING NOTIFICATION SERVICE
 *
 * Governed Post-Mutation Indexing Abstraction.
 * - Non-blocking: Never halts or fails administrative or catalog mutations.
 * - Deduplication: In-memory TTL cache (5 minutes) prevents spamming search engines.
 * - Provider Abstraction: Isolates IndexNow (Bing/Yandex/etc.) and Sitemap/GSC endpoints.
 * - Claim & Privacy Safe: Zero secret leakage, reads credentials strictly from process.env.
 */

export interface IndexingNotificationResult {
  provider: string;
  success: boolean;
  message: string;
  urlsCount: number;
}

export interface IndexingProvider {
  readonly name: string;
  isEnabled(): boolean;
  notify(urls: string[]): Promise<IndexingNotificationResult>;
}

// In-memory deduplication cache: URL -> timestamp (ms)
const notifiedUrlsCooldownMap = new Map<string, number>();
const COOLDOWN_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function filterDeduplicatedUrls(urls: string[], now: number = Date.now()): string[] {
  const toNotify: string[] = [];

  for (const rawUrl of urls) {
    if (!rawUrl || typeof rawUrl !== 'string') continue;
    const url = rawUrl.trim();
    if (!url) continue;

    const lastNotified = notifiedUrlsCooldownMap.get(url);
    if (!lastNotified || now - lastNotified > COOLDOWN_DURATION_MS) {
      notifiedUrlsCooldownMap.set(url, now);
      toNotify.push(url);
    }
  }

  // Prune expired entries to prevent memory leaks
  if (notifiedUrlsCooldownMap.size > 1000) {
    for (const [key, timestamp] of notifiedUrlsCooldownMap.entries()) {
      if (now - timestamp > COOLDOWN_DURATION_MS) {
        notifiedUrlsCooldownMap.delete(key);
      }
    }
  }

  return toNotify;
}

/**
 * Provider: IndexNow
 * Supported by Bing, Yandex, Seznam, Naver
 */
export class IndexNowProvider implements IndexingProvider {
  readonly name = 'IndexNow';

  isEnabled(): boolean {
    const key = process.env.INDEXNOW_KEY || process.env.INDEXNOW_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  async notify(urls: string[]): Promise<IndexingNotificationResult> {
    if (!this.isEnabled()) {
      return {
        provider: this.name,
        success: true,
        message: 'IndexNow key not configured in environment. Skipped cleanly.',
        urlsCount: 0,
      };
    }

    const key = (process.env.INDEXNOW_KEY || process.env.INDEXNOW_API_KEY)!.trim();
    const host = process.env.NEXT_PUBLIC_SITE_URL
      ? new URL(process.env.NEXT_PUBLIC_SITE_URL).host
      : 'muskydose.in';

    try {
      const payload = {
        host,
        key,
        keyLocation: `https://${host}/${key}.txt`,
        urlList: urls,
      };

      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000), // 5-second timeout
      });

      const isOk = res.ok || res.status === 200 || res.status === 202;
      return {
        provider: this.name,
        success: isOk,
        message: isOk ? `Submitted ${urls.length} URLs to IndexNow` : `IndexNow response status: ${res.status}`,
        urlsCount: urls.length,
      };
    } catch (err: any) {
      return {
        provider: this.name,
        success: false,
        message: `IndexNow ping notice: ${err?.message}`,
        urlsCount: urls.length,
      };
    }
  }
}

/**
 * Provider: Sitemap Ping Provider (Google & Bing)
 */
export class SitemapPingProvider implements IndexingProvider {
  readonly name = 'SitemapPing';

  isEnabled(): boolean {
    // Enabled by default when running in production
    return process.env.NODE_ENV === 'production';
  }

  async notify(urls: string[]): Promise<IndexingNotificationResult> {
    const sitemapUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in'}/sitemap.xml`;

    try {
      // Fire non-blocking GET pings
      const pingEndpoints = [
        `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
        `https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`,
      ];

      await Promise.allSettled(
        pingEndpoints.map((endpoint) =>
          fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(4000),
          }).catch(() => {})
        )
      );

      return {
        provider: this.name,
        success: true,
        message: `Pinged Google & Bing sitemaps for ${urls.length} mutated URLs`,
        urlsCount: urls.length,
      };
    } catch (err: any) {
      return {
        provider: this.name,
        success: false,
        message: `Sitemap ping notice: ${err?.message}`,
        urlsCount: urls.length,
      };
    }
  }
}

// Active provider registry
const activeProviders: IndexingProvider[] = [
  new IndexNowProvider(),
  new SitemapPingProvider(),
];

/**
 * Authoritative non-blocking search engine notification function.
 * Called immediately after catalog/entity revalidation.
 */
export function notifySearchEngines(
  candidateUrls: string[],
  context?: { entityType?: string; action?: string }
): void {
  // Fire and forget in the background; NEVER block the caller
  Promise.resolve().then(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
      const fullUrls = candidateUrls
        .map((u) => (u.startsWith('http') ? u : `${baseUrl.replace(/\/$/, '')}/${u.replace(/^\//, '')}`))
        .filter((u) => u.startsWith('http'));

      const urlsToNotify = filterDeduplicatedUrls(fullUrls);
      if (urlsToNotify.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        activeProviders.map((p) => p.notify(urlsToNotify))
      );

      for (const res of results) {
        if (res.status === 'fulfilled') {
          if (process.env.NODE_ENV !== 'test') {
            console.log(`[IndexingService] [${res.value.provider}] ${res.value.message}`);
          }
        } else {
          console.warn('[IndexingService] Provider failure notice:', res.reason?.message);
        }
      }
    } catch (unexpectedErr: any) {
      console.warn('[IndexingService] Non-fatal notification error:', unexpectedErr?.message);
    }
  });
}

/**
 * Test helper to reset cooldown map
 */
export function _resetIndexingCooldown(): void {
  notifiedUrlsCooldownMap.clear();
}

