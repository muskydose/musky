import { GrowthDataSourceAdapter, SyncResult } from './source-interface';
import { FreshnessStatus, GoogleTrendsQuery } from '../types';

export class GoogleTrendsDataSourceAdapter implements GrowthDataSourceAdapter {
  providerKey = 'google_trends';
  name = 'Google Trends (Relative Search Interest)';
  type: 'OpenData' = 'OpenData';

  async checkConnection(): Promise<{ connected: boolean; message: string }> {
    return {
      connected: false,
      message: 'Google Trends live source not configured.',
    };
  }

  async connect(): Promise<{ connected: boolean; message?: string }> {
    return { connected: false, message: 'Google Trends live source not configured.' };
  }

  async validate(): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  async sync(): Promise<SyncResult> {
    const startTime = Date.now();
    return {
      success: true,
      recordsImported: 0,
      recordsUpdated: 0,
      durationMs: Date.now() - startTime,
    };
  }

  async getStatus(): Promise<{ status: FreshnessStatus; lastSyncedAt?: string; recordsCount: number }> {
    return {
      status: 'Unavailable',
      recordsCount: 0,
    };
  }
}

/**
 * Fetch verified Google Trends relative interest data for botanical queries
 * Returns empty array when live connector is unconfigured.
 */
export async function getGoogleTrendsData(searchQuery?: string): Promise<GoogleTrendsQuery[]> {
  // Return empty array when live Trends connector is not active
  return [];
}
