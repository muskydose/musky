import { GrowthDataSourceAdapter, SyncResult } from './source-interface';
import { FreshnessStatus, GrowthKeyword } from '../types';
import { saveGrowthKeywords } from '../growth-db';

export type GoogleAdsConnectionCode =
  | 'NOT_CONFIGURED'
  | 'AUTH_ERROR'
  | 'INVALID_CUSTOMER'
  | 'QUOTA_ERROR'
  | 'API_ERROR'
  | 'CONNECTED';

export function isGoogleAdsEnabled(): boolean {
  return (
    process.env.GOOGLE_ADS_ENABLED === 'true' &&
    Boolean(process.env.GOOGLE_ADS_CLIENT_ID) &&
    Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN) &&
    Boolean(process.env.GOOGLE_ADS_CLIENT_SECRET) &&
    Boolean(process.env.GOOGLE_ADS_REFRESH_TOKEN) &&
    Boolean(process.env.GOOGLE_ADS_CUSTOMER_ID)
  );
}

export class GoogleAdsDataSourceAdapter implements GrowthDataSourceAdapter {
  providerKey = 'google_ads_keywords';
  name = 'Google Keyword Planner / Ads Integration';
  type: 'Google' = 'Google';

  async checkConnectionDetails(): Promise<{ connected: boolean; code: GoogleAdsConnectionCode; message: string }> {
    if (!isGoogleAdsEnabled()) {
      return {
        connected: false,
        code: 'NOT_CONFIGURED',
        message: 'Google Ads integration is currently disabled or missing configuration.',
      };
    }

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID;

    if (!clientId || !developerToken) {
      return {
        connected: false,
        code: 'NOT_CONFIGURED',
        message: 'Google Ads API credentials not configured in environment (GOOGLE_ADS_CLIENT_ID & GOOGLE_ADS_DEVELOPER_TOKEN required).',
      };
    }

    if (!refreshToken || !clientSecret) {
      return {
        connected: false,
        code: 'AUTH_ERROR',
        message: 'Missing GOOGLE_ADS_REFRESH_TOKEN or GOOGLE_ADS_CLIENT_SECRET for OAuth token refresh.',
      };
    }

    if (!customerId) {
      return {
        connected: false,
        code: 'INVALID_CUSTOMER',
        message: 'GOOGLE_ADS_CUSTOMER_ID is missing.',
      };
    }

    try {
      // Test OAuth refresh token exchange
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenRes.ok) {
        const errorData = await tokenRes.json().catch(() => ({}));
        return {
          connected: false,
          code: 'AUTH_ERROR',
          message: `Google OAuth refresh failed (${tokenRes.status}): ${errorData.error_description || errorData.error || 'Invalid credentials'}`,
        };
      }

      const tokenData = await tokenRes.json();
      const accessToken = tokenData.access_token;

      // Test Google Ads API Customer accessibility
      const cleanCustomerId = customerId.replace(/-/g, '');
      const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '');

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      };
      if (loginCustomerId) {
        headers['login-customer-id'] = loginCustomerId;
      }

      const apiRes = await fetch(`https://googleads.googleapis.com/v16/customers/${cleanCustomerId}:generateKeywordIdeas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: 'resourceNames/languages/1000', // English
          geoTargetConstants: ['resourceNames/geoTargetConstants/2356'], // India
          keywordPlanNetwork: 'GOOGLE_SEARCH',
          keywords: ['sojat henna powder', 'herbal mehndi', 'natural indigo powder'],
        }),
      });

      if (apiRes.status === 403 || apiRes.status === 401) {
        return {
          connected: false,
          code: 'AUTH_ERROR',
          message: 'Google Ads API authorization error or developer token invalid.',
        };
      }

      if (apiRes.status === 429) {
        return {
          connected: false,
          code: 'QUOTA_ERROR',
          message: 'Google Ads API rate limit / quota exceeded.',
        };
      }

      if (apiRes.status === 400) {
        const errJson = await apiRes.json().catch(() => ({}));
        const errDetail = errJson.error?.message || 'Invalid request parameters';
        return {
          connected: false,
          code: 'API_ERROR',
          message: `Google Ads API invalid request (400): ${errDetail}`,
        };
      }

      if (!apiRes.ok) {
        return {
          connected: false,
          code: 'API_ERROR',
          message: `Google Ads API request failed with status ${apiRes.status}`,
        };
      }

      return {
        connected: true,
        code: 'CONNECTED',
        message: 'Google Ads Keyword Planner API connected successfully.',
      };
    } catch (err: any) {
      return {
        connected: false,
        code: 'API_ERROR',
        message: `Network or API connection error: ${err.message || String(err)}`,
      };
    }
  }

  async connect(): Promise<{ connected: boolean; message?: string }> {
    const res = await this.checkConnectionDetails();
    return { connected: res.connected, message: res.message };
  }

  async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    const conn = await this.checkConnectionDetails();
    if (!conn.connected) {
      return { valid: false, errors: [conn.message] };
    }
    return { valid: true };
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    const conn = await this.checkConnectionDetails();
    if (!conn.connected) {
      return {
        success: false,
        recordsImported: 0,
        recordsUpdated: 0,
        errorMessage: conn.message,
        durationMs: Date.now() - startTime,
      };
    }

    try {
      // Fetch or sync keywords for Musky Dose product categories
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID!;
      const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET!;
      const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN!;
      const refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN!;
      const customerId = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, '');
      const loginCustomerId = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID?.replace(/-/g, '');

      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!tokenRes.ok) {
        return {
          success: false,
          recordsImported: 0,
          recordsUpdated: 0,
          errorMessage: 'OAuth token refresh failed during keyword sync.',
          durationMs: Date.now() - startTime,
        };
      }

      const { access_token } = await tokenRes.json();

      const seedKeywords = [
        'sojat henna powder', 'pure Rajasthani mehndi', 'natural hair dye',
        'herbal indigo powder', 'natural amla powder', 'organic reetha shikakai',
        'herbal face pack', 'multani mitti powder', 'rose water organic'
      ];

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${access_token}`,
        'developer-token': developerToken,
        'Content-Type': 'application/json',
      };
      if (loginCustomerId) {
        headers['login-customer-id'] = loginCustomerId;
      }

      const apiRes = await fetch(`https://googleads.googleapis.com/v16/customers/${customerId}:generateKeywordIdeas`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          language: 'resourceNames/languages/1000',
          geoTargetConstants: ['resourceNames/geoTargetConstants/2356'],
          keywordPlanNetwork: 'GOOGLE_SEARCH',
          keywords: seedKeywords,
        }),
      });

      let keywordsToSave: GrowthKeyword[] = [];
      const nowStr = new Date().toISOString();

      if (apiRes.ok) {
        const data = await apiRes.json();
        const results = data.results || [];
        keywordsToSave = results.map((item: any, idx: number) => {
          const metrics = item.keywordIdeaMetrics || {};
          const compMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> = {
            LOW: 'LOW',
            MEDIUM: 'MEDIUM',
            HIGH: 'HIGH',
          };
          const cpcMicros = metrics.highTopOfPageBidMicros || metrics.lowTopOfPageBidMicros;
          return {
            id: `g_kw_${Date.now()}_${idx}`,
            keyword: item.text || seedKeywords[idx % seedKeywords.length],
            language: 'en',
            country: 'India',
            category: 'Henna & Herbal',
            searchVolume: metrics.avgMonthlySearches ? Number(metrics.avgMonthlySearches) : null,
            competition: compMap[metrics.competition] || 'MEDIUM',
            cpc: cpcMicros ? Number((cpcMicros / 1000000).toFixed(2)) : null,
            trend: 'STABLE',
            sourceTier: 'VERIFIED',
            sourceName: 'Google Ads Keyword Planner',
            collectedAt: nowStr,
            updatedAt: nowStr,
          };
        });
      }

      if (keywordsToSave.length > 0) {
        await saveGrowthKeywords(keywordsToSave);
      }

      return {
        success: true,
        recordsImported: keywordsToSave.length,
        recordsUpdated: 0,
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        recordsImported: 0,
        recordsUpdated: 0,
        errorMessage: `Sync execution error: ${err.message || String(err)}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  async getStatus(): Promise<{ status: FreshnessStatus; lastSyncedAt?: string; recordsCount: number }> {
    const conn = await this.checkConnectionDetails();
    return {
      status: conn.connected ? 'Recent' : 'Unavailable',
      recordsCount: 0,
    };
  }
}

