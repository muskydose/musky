// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN TELEMETRY STORE
// Fail-safe Hybrid: In-Memory Ring Buffer + Durable Supabase State
// ============================================================

import {
  GuardianCheckResult,
  GuardianIncident,
  GuardianSystemSummary,
  GuardianOverallStatus,
  GuardianHeartbeatStatus,
  GuardianHeartbeatRecord,
  LayeredHealthScores,
} from './types';
import { GuardianDb } from './guardian-db';

const MAX_HISTORY_CHECKS = 120;
const MAX_RECENT_INCIDENTS = 50;

export const GUARDIAN_HEARTBEAT_CONFIG = {
  EXPECTED_INTERVAL_MS: 10 * 60 * 1000, // 10 minutes expected continuous monitor cadence
  STALE_THRESHOLD_MS: 25 * 60 * 1000,   // 25 minutes (~2.5 intervals missed)
  DOWN_THRESHOLD_MS: 60 * 60 * 1000,    // 60 minutes (missed cadence representing outage)
};

class GuardianStore {
  private recentChecks: GuardianCheckResult[] = [];
  private incidents: Map<string, GuardianIncident> = new Map();
  private lastRunTimestamp: string = new Date().toISOString();
  private lastRunDurationMs: number = 0;
  private lastPulseTimestamp: string = new Date().toISOString();
  private consecutiveMissedPulses: number = 0;
  private isDurableLoaded: boolean = false;

  public async ensureLoaded() {
    if (this.isDurableLoaded) return;
    try {
      const [heartbeat, dbIncidents] = await Promise.all([
        GuardianDb.loadHeartbeat(),
        GuardianDb.loadIncidents(),
      ]);

      if (heartbeat) {
        this.lastPulseTimestamp = heartbeat.lastSuccessAt || heartbeat.lastStartedAt;
        this.consecutiveMissedPulses = heartbeat.consecutiveMissed || 0;
      }

      if (dbIncidents && dbIncidents.length > 0) {
        for (const inc of dbIncidents) {
          if (!this.incidents.has(inc.target)) {
            this.incidents.set(inc.target, inc);
          }
        }
      }
      this.isDurableLoaded = true;
    } catch {
      this.isDurableLoaded = true; // fallback safely
    }
  }

  public recordCheck(result: GuardianCheckResult) {
    this.recentChecks.unshift(result);
    if (this.recentChecks.length > MAX_HISTORY_CHECKS) {
      this.recentChecks.pop();
    }
  }

  public getRecentChecks(): GuardianCheckResult[] {
    return [...this.recentChecks];
  }

  public getIncident(target: string): GuardianIncident | undefined {
    return this.incidents.get(target);
  }

  public async setIncident(target: string, incident: GuardianIncident) {
    this.incidents.set(target, incident);
    await GuardianDb.upsertIncident(incident).catch(() => {});
  }

  public removeIncident(target: string) {
    this.incidents.delete(target);
  }

  public getAllIncidents(): GuardianIncident[] {
    return Array.from(this.incidents.values());
  }

  public recordRun(durationMs: number) {
    this.lastRunTimestamp = new Date().toISOString();
    this.lastRunDurationMs = durationMs;
  }

  public async recordCronPulse(runId: string, checksTotal: number, checksFailed: number, recoveries: number) {
    const now = new Date().toISOString();
    this.lastPulseTimestamp = now;
    this.consecutiveMissedPulses = 0;

    await GuardianDb.updateHeartbeat({
      runId,
      status: 'GUARDIAN_ALIVE',
      lastCompletedAt: now,
      lastSuccessAt: checksFailed === 0 ? now : undefined,
      durationMs: this.lastRunDurationMs,
      checksTotal,
      checksFailed,
      recoveriesAttempted: recoveries,
      consecutiveMissed: 0,
    }).catch(() => {});
  }

  public computeLayeredHealth(dbStatus: 'CONNECTED' | 'FALLBACK_LOCAL' | 'DOWN'): LayeredHealthScores {
    const checks = this.recentChecks.slice(0, 30);

    // L0 Connectivity (root & sitemap)
    const l0Checks = checks.filter((c) => c.target === '/' || c.target === '/sitemap.xml');
    const l0Connectivity = l0Checks.some((c) => c.status === 'FAIL') ? 'FAIL' : 'PASS';

    // L1 API
    const l1Checks = checks.filter((c) => c.type === 'API');
    const l1Api = l1Checks.some((c) => c.status === 'FAIL')
      ? 'FAIL'
      : l1Checks.some((c) => c.status === 'WARN')
      ? 'WARN'
      : 'PASS';

    // L2 Database
    const l2Database = dbStatus === 'CONNECTED' ? 'PASS' : dbStatus === 'FALLBACK_LOCAL' ? 'WARN' : 'FAIL';

    // L3 Commerce Journey
    const l3Checks = checks.filter((c) => c.type === 'CUSTOMER_JOURNEY');
    const l3Commerce = l3Checks.some((c) => c.status === 'FAIL') ? 'FAIL' : 'PASS';

    // L4 Business Integrity
    const l4Checks = checks.filter((c) => c.type === 'CORE_SYSTEM');
    const l4BusinessIntegrity = l4Checks.some((c) => c.status === 'FAIL') ? 'FAIL' : 'PASS';

    return {
      l0Connectivity,
      l1Api,
      l2Database,
      l3Commerce,
      l4BusinessIntegrity,
    };
  }

  public computeHeartbeatStatus(): GuardianHeartbeatStatus {
    const lastPulseMs = Date.now() - new Date(this.lastPulseTimestamp).getTime();

    if (lastPulseMs > GUARDIAN_HEARTBEAT_CONFIG.DOWN_THRESHOLD_MS || this.consecutiveMissedPulses >= 3) {
      return 'GUARDIAN_DOWN';
    } else if (lastPulseMs > GUARDIAN_HEARTBEAT_CONFIG.STALE_THRESHOLD_MS) {
      return 'GUARDIAN_STALE';
    }
    return 'GUARDIAN_ALIVE';
  }

  public buildSummary(dbStatus: 'CONNECTED' | 'FALLBACK_LOCAL' | 'DOWN'): GuardianSystemSummary {
    const all = this.recentChecks.slice(0, 30);
    const passed = all.filter((c) => c.status === 'PASS').length;
    const warned = all.filter((c) => c.status === 'WARN').length;
    const failed = all.filter((c) => c.status === 'FAIL').length;

    const totalLatency = all.reduce((sum, c) => sum + c.durationMs, 0);
    const avgLatency = all.length > 0 ? Math.round(totalLatency / all.length) : 0;

    const allIncidents = Array.from(this.incidents.values());
    const activeIncidents = allIncidents.filter((i) => i.status === 'OPEN' || i.status === 'RECOVERING');
    const recentIncidents = allIncidents
      .sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime())
      .slice(0, MAX_RECENT_INCIDENTS);

    const layeredHealth = this.computeLayeredHealth(dbStatus);
    const heartbeatStatus = this.computeHeartbeatStatus();
    const isDurableActive = GuardianDb.isDurableActive();

    // Deterministic Overall Status
    let overallStatus: GuardianOverallStatus = 'HEALTHY';
    if (
      layeredHealth.l0Connectivity === 'FAIL' ||
      layeredHealth.l3Commerce === 'FAIL' ||
      layeredHealth.l2Database === 'FAIL' ||
      heartbeatStatus === 'GUARDIAN_DOWN' ||
      activeIncidents.some((i) => i.severity === 'P0_CRITICAL')
    ) {
      overallStatus = 'DOWN';
    } else if (
      layeredHealth.l1Api === 'FAIL' ||
      layeredHealth.l1Api === 'WARN' ||
      layeredHealth.l2Database === 'WARN' ||
      layeredHealth.l4BusinessIntegrity === 'FAIL' ||
      activeIncidents.some((i) => i.severity === 'P1_HIGH' || i.severity === 'P2_MEDIUM') ||
      heartbeatStatus === 'GUARDIAN_STALE'
    ) {
      overallStatus = 'DEGRADED';
    }

    const uptime = all.length > 0 ? Number(((passed / all.length) * 100).toFixed(1)) : 100;
    const totalRecovered = allIncidents.filter((i) => i.status === 'RECOVERED').length;

    const heartbeatRecord: GuardianHeartbeatRecord = {
      runId: `run_${this.lastRunTimestamp}`,
      status: heartbeatStatus,
      lastStartedAt: this.lastRunTimestamp,
      lastCompletedAt: this.lastRunTimestamp,
      lastSuccessAt: failed === 0 ? this.lastRunTimestamp : this.lastPulseTimestamp,
      durationMs: this.lastRunDurationMs,
      checksTotal: all.length,
      checksFailed: failed,
      recoveriesAttempted: allIncidents.reduce((sum, i) => sum + i.recoveryAttemptsCount, 0),
      consecutiveMissed: this.consecutiveMissedPulses,
    };

    return {
      overallStatus,
      heartbeatStatus,
      layeredHealth,
      lastRunAt: this.lastRunTimestamp,
      lastDurationMs: this.lastRunDurationMs,
      checksTotal: all.length,
      checksPassed: passed,
      checksWarned: warned,
      checksFailed: failed,
      averageLatencyMs: avgLatency,
      databaseStatus: dbStatus,
      durableStorageStatus: isDurableActive ? 'DURABLE_STORAGE_ACTIVE' : 'DURABLE_STORAGE_NOT_ACTIVATED',
      activeIncidents,
      recentIncidents,
      heartbeat: heartbeatRecord,
      metrics: {
        uptimePercent24h: uptime,
        totalChecks24h: all.length,
        totalRecoveries24h: totalRecovered,
      },
    };
  }

  public resetForTesting() {
    this.recentChecks = [];
    this.incidents.clear();
    this.lastRunTimestamp = new Date().toISOString();
    this.lastRunDurationMs = 0;
    this.lastPulseTimestamp = new Date().toISOString();
    this.consecutiveMissedPulses = 0;
    this.isDurableLoaded = false;
  }
}

export const guardianStore = new GuardianStore();
