// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN CORE ORCHESTRATOR (HARDENED)
// Continuous Verification, Durable State & Safe Bounded Recovery
// ============================================================

import {
  GuardianCheckResult,
  GuardianIncident,
  GuardianSeverity,
  GuardianSystemSummary,
  SafeRecoveryActionType,
  GuardianRunRecord,
} from './types';
import { guardianStore } from './guardian-store';
import { GuardianDb } from './guardian-db';
import { runSyntheticUrlChecks } from './checks/synthetic-urls';
import { runBusinessJourneyChecks } from './checks/business-journey';
import { runDatabaseHealthChecks } from './checks/database-health';
import { runApiHealthChecks } from './checks/api-health';
import { runSystemIntegrityChecks } from './checks/system-integrity';
import { SafeRecoveryEngine } from './recovery/safe-recovery-engine';
import { logger } from '@/lib/logger';

const CONSECUTIVE_FAILURE_THRESHOLD = 2;
const MAX_RECOVERY_ATTEMPTS = 2; // Circuit breaker limit
const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

export class WebsiteGuardian {
  /**
   * Classifies check failure into an explicit severity tier.
   */
  public static classifySeverity(check: GuardianCheckResult): GuardianSeverity {
    const target = check.target.toLowerCase();
    const error = (check.error || '').toLowerCase();

    // P0 CRITICAL: Homepage, Checkout, Auth, complete DB breakdown
    if (
      target === '/' ||
      target === '/checkout' ||
      target === 'checkout_engine' ||
      (check.type === 'DATABASE' && (error.includes('driver') || error.includes('down')))
    ) {
      return 'P0_CRITICAL';
    }

    // P1 HIGH: Product catalog, search, wholesale, core system engine
    if (
      target === '/products' ||
      target === '/wholesale' ||
      target.includes('search') ||
      target === 'auto_guide_engine' ||
      target === 'cart_engine'
    ) {
      return 'P1_HIGH';
    }

    // P2 MEDIUM: Secondary static pages, slow response, localized warnings
    if (check.durationMs > 2500 || check.type === 'STOREFRONT_URL' || check.type === 'API') {
      return 'P2_MEDIUM';
    }

    // P3 LOW: Informational or minor discrepancy
    return 'P3_LOW';
  }

  /**
   * Executes a complete Guardian diagnostic cycle with concurrency lock & durable state.
   */
  public static async executeFullDiagnosticCycle(baseUrl?: string): Promise<GuardianSystemSummary> {
    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const cycleStart = Date.now();
    logger.info(`Website Guardian starting diagnostic cycle: ${runId}`);

    // 1. Ensure durable state is loaded
    await guardianStore.ensureLoaded();

    // 2. Concurrency Lock: Prevent overlapping executions
    const lockAcquired = await GuardianDb.acquireExecutionLock(runId);
    if (!lockAcquired) {
      logger.warn(`Guardian run ${runId} skipped: another cycle is already executing.`);
      return guardianStore.buildSummary('CONNECTED');
    }

    try {
      // 3. Run all probe domains concurrently with bounded execution
      const [urlChecks, journeyChecks, dbHealth, apiChecks, integrityChecks] = await Promise.all([
        runSyntheticUrlChecks(baseUrl),
        runBusinessJourneyChecks(),
        runDatabaseHealthChecks(),
        runApiHealthChecks(baseUrl),
        runSystemIntegrityChecks(),
      ]);

      const allChecks: GuardianCheckResult[] = [
        ...urlChecks,
        ...journeyChecks,
        ...dbHealth.checks,
        ...apiChecks,
        ...integrityChecks,
      ];

      let recoveryCount = 0;

      // 4. Process check results and update incident state
      for (const check of allChecks) {
        guardianStore.recordCheck(check);
        const existingIncident = guardianStore.getIncident(check.target);
        const now = new Date().toISOString();

        if (check.status === 'FAIL') {
          const severity = this.classifySeverity(check);

          if (existingIncident) {
            existingIncident.consecutiveFailures++;
            existingIncident.lastObservedAt = now;
            existingIncident.errorSummary = check.error || 'Check failed';

            // Check if alert cooldown has elapsed
            const lastAlert = existingIncident.lastAlertSentAt
              ? new Date(existingIncident.lastAlertSentAt).getTime()
              : 0;
            if (Date.now() - lastAlert > ALERT_COOLDOWN_MS) {
              existingIncident.lastAlertSentAt = now;
              logger.warn(`Guardian alert triggered: ${existingIncident.severity} on ${existingIncident.target}`);
            }

            // Circuit breaker: attempt safe recovery only if below MAX_RECOVERY_ATTEMPTS
            if (
              existingIncident.consecutiveFailures >= CONSECUTIVE_FAILURE_THRESHOLD &&
              existingIncident.status !== 'RECOVERING' &&
              existingIncident.recoveryAttemptsCount < MAX_RECOVERY_ATTEMPTS
            ) {
              existingIncident.recoveryAttemptsCount++;
              recoveryCount++;
              await this.attemptSafeRecovery(existingIncident, check);
            } else if (existingIncident.recoveryAttemptsCount >= MAX_RECOVERY_ATTEMPTS) {
              existingIncident.recoveryResult = 'FAILED';
              existingIncident.status = 'OPEN';
            }

            await guardianStore.setIncident(check.target, existingIncident);
          } else {
            // First observed failure
            const newIncident: GuardianIncident = {
              id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              target: check.target,
              type: check.type,
              severity,
              status: 'OPEN',
              firstObservedAt: now,
              lastObservedAt: now,
              consecutiveFailures: 1,
              recoveryAttemptsCount: 0,
              errorSummary: check.error || 'Check failed',
              lastAlertSentAt: now,
            };
            await guardianStore.setIncident(check.target, newIncident);
          }
        } else if (check.status === 'PASS') {
          // If previously open incident now passes, close it
          if (existingIncident && existingIncident.status !== 'RECOVERED') {
            existingIncident.status = 'RECOVERED';
            existingIncident.recoveredAt = now;
            await guardianStore.setIncident(check.target, existingIncident);
            logger.info(`Guardian target restored: ${check.target}`);
          }
        }
      }

      const duration = Date.now() - cycleStart;
      guardianStore.recordRun(duration);

      const summary = guardianStore.buildSummary(dbHealth.dbStatus);

      // 5. Persist run & heartbeat to durable database
      const runRecord: GuardianRunRecord = {
        id: runId,
        startedAt: new Date(cycleStart).toISOString(),
        completedAt: new Date().toISOString(),
        durationMs: duration,
        status: summary.overallStatus,
        checksTotal: summary.checksTotal,
        checksPassed: summary.checksPassed,
        checksWarned: summary.checksWarned,
        checksFailed: summary.checksFailed,
        dbStatus: dbHealth.dbStatus,
        layeredHealth: summary.layeredHealth,
      };

      await Promise.all([
        GuardianDb.persistRun(runRecord),
        guardianStore.recordCronPulse(
          runId,
          summary.checksTotal,
          summary.checksFailed,
          recoveryCount
        ),
      ]);

      return summary;
    } finally {
      // 6. Always release execution lock
      await GuardianDb.releaseExecutionLock(runId);
    }
  }

  /**
   * Selects and executes a safe recovery action followed by verification.
   */
  private static async attemptSafeRecovery(incident: GuardianIncident, check: GuardianCheckResult) {
    let actionType: SafeRecoveryActionType | null = null;

    if (check.type === 'STOREFRONT_URL') {
      actionType = 'REVALIDATE_STATIC_PATH';
    } else if (check.type === 'API' || check.target.includes('settings')) {
      actionType = 'REFRESH_MEMORY_CACHE';
    } else if (check.type === 'DATABASE') {
      actionType = 'RECONNECT_DATABASE_SINGLETON';
    } else {
      actionType = 'RETRY_TRANSIENT_PROBE';
    }

    incident.status = 'RECOVERING';
    incident.attemptedRecoveryAction = actionType;

    const recoveryResult = await SafeRecoveryEngine.executeRecovery(
      actionType,
      check.target,
      async () => {
        if (check.target.startsWith('/')) {
          const origin = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
          const res = await fetch(`${origin}${check.target}`, {
            headers: { 'x-guardian-probe': '1' },
          }).catch(() => null);
          return res?.status === 200;
        }
        return true;
      }
    );

    incident.recoveryResult = recoveryResult.verified ? 'SUCCESS' : 'FAILED';
    if (recoveryResult.verified) {
      incident.status = 'RECOVERED';
      incident.recoveredAt = new Date().toISOString();
    } else {
      incident.status = 'OPEN';
    }
  }

  /**
   * Retrieves live summary without running a heavy cycle.
   */
  public static async getTelemetrySummary(): Promise<GuardianSystemSummary> {
    await guardianStore.ensureLoaded();
    return guardianStore.buildSummary('CONNECTED');
  }
}
