// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN: DATABASE HEALTH PROBE
// Strictly Read-Only Supabase Connectivity & Schema Validation
// ============================================================

import { GuardianCheckResult } from '../types';
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';

export interface DatabaseHealthReport {
  dbStatus: 'CONNECTED' | 'FALLBACK_LOCAL' | 'DOWN';
  latencyMs: number;
  checks: GuardianCheckResult[];
}

export async function runDatabaseHealthChecks(): Promise<DatabaseHealthReport> {
  const checks: GuardianCheckResult[] = [];
  const start = Date.now();

  const supabase = getSupabaseAdmin() || getSupabase();

  if (!supabase) {
    // Supabase credentials not set or client could not initialize.
    // Falling back gracefully to in-memory/static store.
    const duration = Date.now() - start;
    checks.push({
      checkId: 'chk_db_connection',
      name: 'Database: Supabase Connectivity',
      target: 'SUPABASE_POSTGRES',
      type: 'DATABASE',
      status: 'WARN',
      durationMs: duration,
      error: 'Supabase client unconfigured or credentials missing. Serving from in-memory fallback store.',
      observedAt: new Date().toISOString(),
    });

    return {
      dbStatus: 'FALLBACK_LOCAL',
      latencyMs: duration,
      checks,
    };
  }

  try {
    // 1. Read-Only Ping on site_settings
    const pingStart = Date.now();
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);

    const pingDuration = Date.now() - pingStart;

    if (settingsError) {
      checks.push({
        checkId: 'chk_db_ping',
        name: 'Database: Read Availability',
        target: 'SUPABASE_QUERY',
        type: 'DATABASE',
        status: 'WARN',
        durationMs: pingDuration,
        error: `Supabase query error: ${settingsError.message}`,
        observedAt: new Date().toISOString(),
      });

      return {
        dbStatus: 'FALLBACK_LOCAL',
        latencyMs: pingDuration,
        checks,
      };
    }

    checks.push({
      checkId: 'chk_db_ping',
      name: 'Database: Read Availability',
      target: 'SUPABASE_QUERY',
      type: 'DATABASE',
      status: pingDuration > 2000 ? 'WARN' : 'PASS',
      durationMs: pingDuration,
      details: { recordCount: settingsData?.length ?? 0 },
      observedAt: new Date().toISOString(),
    });

    // 2. Read-Only Schema Probe on core tables
    const tableStart = Date.now();
    const [prodRes, catRes, guideRes] = await Promise.all([
      supabase.from('products').select('id, name').limit(1),
      supabase.from('categories').select('id, name').limit(1),
      supabase.from('product_guides').select('id, slug').limit(1),
    ]);

    const tableDuration = Date.now() - tableStart;
    const hasTableErrors = Boolean(prodRes.error || catRes.error || guideRes.error);

    checks.push({
      checkId: 'chk_db_schema_tables',
      name: 'Database: Core Tables Access (Products/Categories/Guides)',
      target: 'SUPABASE_SCHEMA',
      type: 'DATABASE',
      status: hasTableErrors ? 'WARN' : 'PASS',
      durationMs: tableDuration,
      error: hasTableErrors
        ? `Schema access warning: ${prodRes.error?.message || catRes.error?.message || guideRes.error?.message}`
        : undefined,
      observedAt: new Date().toISOString(),
    });

    return {
      dbStatus: hasTableErrors ? 'FALLBACK_LOCAL' : 'CONNECTED',
      latencyMs: pingDuration,
      checks,
    };
  } catch (err: any) {
    const duration = Date.now() - start;
    checks.push({
      checkId: 'chk_db_exception',
      name: 'Database: Exception Handler',
      target: 'SUPABASE_DRIVER',
      type: 'DATABASE',
      status: 'FAIL',
      durationMs: duration,
      error: err.message || 'Database driver connection exception',
      observedAt: new Date().toISOString(),
    });

    return {
      dbStatus: 'DOWN',
      latencyMs: duration,
      checks,
    };
  }
}

