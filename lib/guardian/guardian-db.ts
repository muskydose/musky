// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN: DURABLE PERSISTENCE LAYER
// Supabase-backed Storage with In-Memory Safe Fallback
// ============================================================

import {
  GuardianIncident,
  GuardianHeartbeatRecord,
  GuardianRunRecord,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export class GuardianDb {
  private static durableAvailable: boolean | null = null;

  /**
   * Probes whether Guardian tables exist and are accessible in Supabase.
   */
  public static async checkDurableAvailability(): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      this.durableAvailable = false;
      return false;
    }

    try {
      const { error } = await supabase
        .from('guardian_heartbeats')
        .select('id')
        .limit(1);

      this.durableAvailable = !error;
      return this.durableAvailable;
    } catch {
      this.durableAvailable = false;
      return false;
    }
  }

  public static isDurableActive(): boolean {
    return this.durableAvailable === true;
  }

  /**
   * Tries to acquire a mutual-exclusion execution lock to prevent overlapping runs.
   * Lock auto-expires after 60 seconds if a process crashed.
   */
  public static async acquireExecutionLock(runId: string): Promise<boolean> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return true; // fallback: allow local single-process execution

    try {
      const now = new Date();
      const staleThreshold = new Date(now.getTime() - 60 * 1000).toISOString();

      // Check current lock state
      const { data } = await supabase
        .from('guardian_heartbeats')
        .select('is_locked, locked_at')
        .eq('id', 'primary')
        .single();

      if (data && data.is_locked && data.locked_at && data.locked_at > staleThreshold) {
        logger.warn('Guardian run skipped: existing execution lock active');
        return false;
      }

      // Claim lock
      await supabase
        .from('guardian_heartbeats')
        .update({
          is_locked: true,
          locked_at: now.toISOString(),
          run_id: runId,
          last_started_at: now.toISOString(),
        })
        .eq('id', 'primary');

      return true;
    } catch {
      return true; // fail-safe fallback
    }
  }

  /**
   * Releases execution lock upon run completion.
   */
  public static async releaseExecutionLock(runId: string): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      await supabase
        .from('guardian_heartbeats')
        .update({
          is_locked: false,
          locked_at: null,
          last_completed_at: new Date().toISOString(),
        })
        .eq('id', 'primary');
    } catch {
      // ignore transient DB errors during unlock
    }
  }

  /**
   * Persists a completed Guardian run record.
   */
  public static async persistRun(run: GuardianRunRecord): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      await supabase.from('guardian_runs').insert({
        id: run.id,
        started_at: run.startedAt,
        completed_at: run.completedAt,
        duration_ms: run.durationMs,
        status: run.status,
        checks_total: run.checksTotal,
        checks_passed: run.checksPassed,
        checks_warned: run.checksWarned,
        checks_failed: run.checksFailed,
        db_status: run.dbStatus,
        layered_health: run.layeredHealth,
      });
    } catch (err: any) {
      logger.warn(`Guardian run persistence warning: ${err.message}`);
    }
  }

  /**
   * Loads the durable heartbeat record.
   */
  public static async loadHeartbeat(): Promise<GuardianHeartbeatRecord | null> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('guardian_heartbeats')
        .select('*')
        .eq('id', 'primary')
        .single();

      if (error || !data) return null;

      return {
        runId: data.run_id || '',
        status: data.status || 'GUARDIAN_ALIVE',
        lastStartedAt: data.last_started_at || new Date().toISOString(),
        lastCompletedAt: data.last_completed_at || new Date().toISOString(),
        lastSuccessAt: data.last_success_at || new Date().toISOString(),
        durationMs: data.duration_ms || 0,
        checksTotal: data.checks_total || 0,
        checksFailed: data.checks_failed || 0,
        recoveriesAttempted: data.recoveries_attempted || 0,
        consecutiveMissed: data.consecutive_missed || 0,
      };
    } catch {
      return null;
    }
  }

  /**
   * Updates durable heartbeat pulse.
   */
  public static async updateHeartbeat(heartbeat: Partial<GuardianHeartbeatRecord>): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (heartbeat.runId !== undefined) payload.run_id = heartbeat.runId;
      if (heartbeat.status !== undefined) payload.status = heartbeat.status;
      if (heartbeat.lastStartedAt !== undefined) payload.last_started_at = heartbeat.lastStartedAt;
      if (heartbeat.lastCompletedAt !== undefined) payload.last_completed_at = heartbeat.lastCompletedAt;
      if (heartbeat.lastSuccessAt !== undefined) payload.last_success_at = heartbeat.lastSuccessAt;
      if (heartbeat.durationMs !== undefined) payload.duration_ms = heartbeat.durationMs;
      if (heartbeat.checksTotal !== undefined) payload.checks_total = heartbeat.checksTotal;
      if (heartbeat.checksFailed !== undefined) payload.checks_failed = heartbeat.checksFailed;
      if (heartbeat.recoveriesAttempted !== undefined) payload.recoveries_attempted = heartbeat.recoveriesAttempted;
      if (heartbeat.consecutiveMissed !== undefined) payload.consecutive_missed = heartbeat.consecutiveMissed;

      await supabase
        .from('guardian_heartbeats')
        .update(payload)
        .eq('id', 'primary');
    } catch (err: any) {
      logger.warn(`Guardian heartbeat update warning: ${err.message}`);
    }
  }

  /**
   * Loads all durable incidents from database.
   */
  public static async loadIncidents(): Promise<GuardianIncident[]> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return [];

    try {
      const { data, error } = await supabase
        .from('guardian_incidents')
        .select('*')
        .order('last_observed_at', { ascending: false })
        .limit(50);

      if (error || !data) return [];

      return data.map((row: any) => ({
        id: row.id,
        target: row.target,
        type: row.check_type,
        severity: row.severity,
        status: row.status,
        consecutiveFailures: row.consecutive_failures || 1,
        recoveryAttemptsCount: row.recovery_attempts_count || 0,
        errorSummary: row.error_summary || '',
        attemptedRecoveryAction: row.attempted_recovery_action,
        recoveryResult: row.recovery_result,
        firstObservedAt: row.first_observed_at,
        lastObservedAt: row.last_observed_at,
        recoveredAt: row.recovered_at,
        lastAlertSentAt: row.last_alert_sent_at,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Upserts a durable incident.
   */
  public static async upsertIncident(incident: GuardianIncident): Promise<void> {
    const supabase = getSupabaseAdmin();
    if (!supabase) return;

    try {
      await supabase.from('guardian_incidents').upsert({
        id: incident.id,
        target: incident.target,
        check_type: incident.type,
        severity: incident.severity,
        status: incident.status,
        consecutive_failures: incident.consecutiveFailures,
        recovery_attempts_count: incident.recoveryAttemptsCount,
        error_summary: incident.errorSummary,
        attempted_recovery_action: incident.attemptedRecoveryAction,
        recovery_result: incident.recoveryResult,
        first_observed_at: incident.firstObservedAt,
        last_observed_at: incident.lastObservedAt,
        recovered_at: incident.recoveredAt,
        last_alert_sent_at: incident.lastAlertSentAt,
      });
    } catch (err: any) {
      logger.warn(`Guardian incident upsert warning: ${err.message}`);
    }
  }
}

