import crypto from 'crypto';
import { GrowthDataSourceAdapter, SyncResult } from './source-interface';
import { FreshnessStatus, SearchConsoleQuery } from '../types';
import { getSiteSettings } from '@/lib/db/settings';

export type SearchConsoleStatusCode =
  | 'NOT_CONFIGURED'
  | 'AUTH_ERROR'
  | 'PROPERTY_ACCESS_ERROR'
  | 'API_ERROR'
  | 'CONNECTED';

export interface SearchConsoleStatus {
  status: SearchConsoleStatusCode;
  message: string;
  siteUrl?: string;
  lastFetchedAt?: string;
}

export function isSearchConsoleConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL &&
    process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY &&
    process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL
  );
}

export function getSearchConsoleConfig() {
  const siteUrl = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL?.trim();
  const clientEmail = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY?.trim();
  const privateKey = rawPrivateKey ? rawPrivateKey.replace(/\\n/g, '\n') : undefined;

  return {
    siteUrl,
    clientEmail,
    privateKey,
    projectId: process.env.GOOGLE_SEARCH_CONSOLE_PROJECT_ID?.trim(),
  };
}

interface GscCacheEntry {
  timestamp: number;
  queries: SearchConsoleQuery[];
}
const gscMemoryCache = new Map<string, GscCacheEntry>();
const GSC_CACHE_TTL_MS = 30 * 60 * 1000;

function createGoogleServiceAccountJwt(clientEmail: string, privateKey: string, scope: string): string {
  const formattedKey = privateKey.replace(/\\n/g, '\n').trim();

  if (!formattedKey.includes('-----BEGIN') || !formattedKey.includes('KEY-----')) {
    throw new Error(
      'AUTH_ERROR: Invalid private key format. GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY must be the full RSA private key (starting with "-----BEGIN PRIVATE KEY-----") from the Google Cloud Service Account JSON key file, not the 40-character private_key_id hex hash.'
    );
  }

  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj: any) =>
    Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

  const unsignedToken = encodeBase64Url(header) + '.' + encodeBase64Url(payload);

  try {
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(unsignedToken);
    signer.end();

    const signature = signer
      .sign(formattedKey)
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    return unsignedToken + '.' + signature;
  } catch (err: any) {
    throw new Error('AUTH_ERROR: Failed to sign Google Service Account JWT with provided private key: ' + err.message);
  }
}

async function getGoogleAccessToken(clientEmail: string, privateKey: string, scope: string): Promise<string> {
  const jwt = createGoogleServiceAccountJwt(clientEmail, privateKey, scope);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error('Google OAuth2 Token Exchange Failed (' + res.status + '): ' + errBody);
  }

  const data = await res.json();
  return data.access_token;
}

function getDefaultGscDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  end.setDate(end.getDate() - 3);
  const start = new Date(end);
  start.setDate(start.getDate() - 28);

  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

async function fetchLiveSearchConsoleAnalytics(params: {
  siteUrl: string;
  clientEmail: string;
  privateKey: string;
  searchQuery?: string;
}): Promise<SearchConsoleQuery[]> {
  const accessToken = await getGoogleAccessToken(
    params.clientEmail,
    params.privateKey,
    'https://www.googleapis.com/auth/webmasters.readonly'
  );

  const { startDate, endDate } = getDefaultGscDateRange();

  // Try configured property, plus domain property variant if URL prefix fails
  const propertyCandidates = [params.siteUrl];
  if (!params.siteUrl.startsWith('sc-domain:')) {
    try {
      const host = new URL(params.siteUrl).hostname;
      propertyCandidates.push(`sc-domain:${host}`);
    } catch {}
  }

  const requestBody: any = {
    startDate,
    endDate,
    dimensions: ['query', 'page', 'country'],
    rowLimit: 500,
    dataState: 'all',
  };

  if (params.searchQuery && params.searchQuery.trim()) {
    requestBody.dimensionFilterGroups = [
      {
        filters: [
          {
            dimension: 'query',
            operator: 'contains',
            expression: params.searchQuery.trim().toLowerCase(),
          },
        ],
      },
    ];
  }

  let lastError: any = null;
  let rows: any[] = [];

  for (const prop of [...new Set(propertyCandidates)]) {
    const url = 'https://www.googleapis.com/webmasters/v3/sites/' + encodeURIComponent(prop) + '/searchAnalytics/query';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (res.ok) {
      const json = await res.json();
      rows = json.rows || [];
      lastError = null;
      break;
    } else {
      const errorText = await res.text();
      lastError = { status: res.status, message: errorText };
    }
  }

  if (lastError) {
    if (lastError.status === 403 || lastError.status === 401) {
      throw new Error('PROPERTY_ACCESS_ERROR: ' + lastError.message);
    }
    throw new Error('API_ERROR (' + lastError.status + '): ' + lastError.message);
  }

  return rows.map((r: any, idx: number): SearchConsoleQuery => {
    const q = r.keys?.[0] || '';
    const page = r.keys?.[1] || '';
    const country = r.keys?.[2] || 'IND';
    const clicks = Math.round(r.clicks || 0);
    const impressions = Math.round(r.impressions || 0);
    const ctr = typeof r.ctr === 'number' ? r.ctr : (impressions > 0 ? clicks / impressions : 0);
    const position = typeof r.position === 'number' ? Number(r.position.toFixed(1)) : 0;

    return {
      id: 'gsc_' + q.replace(/[^a-z0-9]/gi, '_') + '_' + idx,
      query: q,
      page,
      country,
      clicks,
      impressions,
      ctr,
      position,
      dateRange: startDate + ' to ' + endDate,
      collectedAt: new Date().toISOString(),
      sourceBadge: 'SEARCH CONSOLE',
    };
  });
}

export class SearchConsoleDataSourceAdapter implements GrowthDataSourceAdapter {
  providerKey = 'google_search_console';
  name = 'Google Search Console (Musky Dose Performance)';
  type: 'Google' = 'Google';

  async checkConnection(): Promise<{ connected: boolean; status: SearchConsoleStatusCode; message: string }> {
    if (!isSearchConsoleConfigured()) {
      return {
        connected: false,
        status: 'NOT_CONFIGURED',
        message: 'Google Search Console not connected. Add GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL, GOOGLE_SEARCH_CONSOLE_PRIVATE_KEY, and GOOGLE_SEARCH_CONSOLE_SITE_URL to fetch live organic search analytics.',
      };
    }

    const config = getSearchConsoleConfig();
    try {
      if (!config.clientEmail || !config.privateKey || !config.siteUrl) {
        return {
          connected: false,
          status: 'NOT_CONFIGURED',
          message: 'Missing required Search Console credentials.',
        };
      }

      await getGoogleAccessToken(
        config.clientEmail,
        config.privateKey,
        'https://www.googleapis.com/auth/webmasters.readonly'
      );

      return {
        connected: true,
        status: 'CONNECTED',
        message: 'Connected to Google Search Console API for property: ' + config.siteUrl,
      };
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('OAuth2 Token Exchange Failed')) {
        return {
          connected: false,
          status: 'AUTH_ERROR',
          message: 'Google Search Console Service Account authentication failed. Verify PRIVATE_KEY and CLIENT_EMAIL.',
        };
      }
      if (msg.includes('PROPERTY_ACCESS_ERROR')) {
        return {
          connected: false,
          status: 'PROPERTY_ACCESS_ERROR',
          message: 'Permission denied for property "' + config.siteUrl + '". Grant "Full" or "Restricted" read permissions to "' + config.clientEmail + '" in Google Search Console.',
        };
      }
      return {
        connected: false,
        status: 'API_ERROR',
        message: 'Google Search Console API check failed: ' + msg,
      };
    }
  }

  async connect(): Promise<{ connected: boolean; message?: string }> {
    const res = await this.checkConnection();
    return { connected: res.connected, message: res.message };
  }

  async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    const res = await this.checkConnection();
    return { valid: res.connected, errors: res.connected ? undefined : [res.message] };
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    try {
      const res = await getSearchConsoleQueries();
      return {
        success: true,
        recordsImported: res.queries.length,
        recordsUpdated: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        recordsImported: 0,
        recordsUpdated: 0,
        errorMessage: err?.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async getStatus(): Promise<{ status: FreshnessStatus; lastSyncedAt?: string; recordsCount: number }> {
    const conn = await this.checkConnection();
    return {
      status: conn.connected ? 'Fresh' : 'Unavailable',
      recordsCount: 0,
    };
  }
}

export async function getSearchConsoleQueries(searchQuery?: string): Promise<{
  queries: SearchConsoleQuery[];
  status: SearchConsoleStatusCode;
  message: string;
}> {
  const normQuery = (searchQuery || '').trim().toLowerCase();

  if (!isSearchConsoleConfigured()) {
    try {
      const settings = await getSiteSettings();
      const gscCache: SearchConsoleQuery[] = (settings as any)?.searchConsoleCache || [];
      if (Array.isArray(gscCache) && gscCache.length > 0) {
        const filtered = normQuery
          ? gscCache.filter(item => (item.query || '').toLowerCase().includes(normQuery))
          : gscCache;
        return {
          queries: filtered,
          status: 'CONNECTED',
          message: 'Displaying saved Search Console performance dataset.',
        };
      }
    } catch {
      // Fall through
    }

    return {
      queries: [],
      status: 'NOT_CONFIGURED',
      message: 'Google Search Console not connected.',
    };
  }

  const cacheKey = 'gsc_' + (normQuery || '__all__');
  const cached = gscMemoryCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < GSC_CACHE_TTL_MS) {
    return {
      queries: cached.queries,
      status: 'CONNECTED',
      message: 'Search Console queries served from fresh server cache.',
    };
  }

  const config = getSearchConsoleConfig();
  if (!config.clientEmail || !config.privateKey || !config.siteUrl) {
    return {
      queries: [],
      status: 'NOT_CONFIGURED',
      message: 'Google Search Console not connected.',
    };
  }

  try {
    const liveQueries = await fetchLiveSearchConsoleAnalytics({
      siteUrl: config.siteUrl,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
      searchQuery: normQuery,
    });

    gscMemoryCache.set(cacheKey, {
      timestamp: Date.now(),
      queries: liveQueries,
    });

    return {
      queries: liveQueries,
      status: 'CONNECTED',
      message: 'Successfully fetched ' + liveQueries.length + ' verified Search Console queries.',
    };
  } catch (err: any) {
    const msg = err?.message || '';
    let status: SearchConsoleStatusCode = 'API_ERROR';
    if (msg.includes('OAuth2 Token Exchange Failed')) {
      status = 'AUTH_ERROR';
    } else if (msg.includes('PROPERTY_ACCESS_ERROR')) {
      status = 'PROPERTY_ACCESS_ERROR';
    }

    return {
      queries: [],
      status,
      message: msg,
    };
  }
}
