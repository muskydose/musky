import { GrowthDataSource, FreshnessStatus } from '../types';

export interface SyncResult {
  success: boolean;
  recordsImported: number;
  recordsUpdated: number;
  errorMessage?: string;
  durationMs: number;
}

export interface GrowthDataSourceAdapter {
  providerKey: string;
  name: string;
  type: 'FirstParty' | 'Google' | 'Meta' | 'Import' | 'OpenData' | 'Custom';
  
  connect(): Promise<{ connected: boolean; message?: string }>;
  validate(): Promise<{ valid: boolean; errors?: string[] }>;
  sync(): Promise<SyncResult>;
  getStatus(): Promise<{ status: FreshnessStatus; lastSyncedAt?: string; recordsCount: number }>;
}
