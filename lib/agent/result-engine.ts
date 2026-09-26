// ============================================================================
// MUSKY DOSE — CENTRAL RESULT & OUTCOME ENGINE
// Empirical Truth: BASELINE -> ACTION -> VERIFICATION -> MEASUREMENT -> DELTA
// ============================================================================

import { CanonicalTaskDomain } from './types';
import { logger } from '@/lib/logger';

export type ResultOutcomeStatus =
  | 'VERIFIED_IMMEDIATE'
  | 'MEASUREMENT_PENDING'
  | 'MEASURED'
  | 'FAILED';

export interface ResultRecord {
  id: string;
  taskId: string;
  domain: CanonicalTaskDomain;
  action: string;
  entityType?: string;
  entityId?: string;
  status: ResultOutcomeStatus;
  baseline: Record<string, unknown>;
  actionExecuted: string;
  verification: {
    verified: boolean;
    probeOutcome: string;
    verifiedAt: string;
  };
  measurementWindowMs?: number;
  matureAt?: string;
  measured?: Record<string, unknown>;
  delta?: Record<string, number | string | boolean>;
  evidence?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RecordResultInput {
  taskId: string;
  domain: CanonicalTaskDomain;
  action: string;
  entityType?: string;
  entityId?: string;
  baseline?: Record<string, unknown>;
  actionExecuted: string;
  verification: {
    verified: boolean;
    probeOutcome: string;
  };
  measurementWindowMs?: number;
  measured?: Record<string, unknown>;
  delta?: Record<string, number | string | boolean>;
  evidence?: Record<string, unknown>;
}

export class ResultEngine {
  private static instance: ResultEngine | null = null;
  private records: Map<string, ResultRecord> = new Map();
  private maxRecords = 500;

  public static getInstance(): ResultEngine {
    if (!ResultEngine.instance) {
      ResultEngine.instance = new ResultEngine();
    }
    return ResultEngine.instance;
  }

  private constructor() {}

  /**
   * Records a task outcome with strict empirical discipline.
   */
  public recordResult(input: RecordResultInput): ResultRecord {
    const now = new Date();
    const id = `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const hasPendingWindow = (input.measurementWindowMs || 0) > 0;
    const isVerified = input.verification.verified;

    let status: ResultOutcomeStatus = 'FAILED';
    if (isVerified) {
      status = hasPendingWindow ? 'MEASUREMENT_PENDING' : 'VERIFIED_IMMEDIATE';
      if (input.measured && input.delta) {
        status = 'MEASURED';
      }
    }

    const matureAt = hasPendingWindow
      ? new Date(now.getTime() + input.measurementWindowMs!).toISOString()
      : undefined;

    const record: ResultRecord = {
      id,
      taskId: input.taskId,
      domain: input.domain,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      status,
      baseline: input.baseline || {},
      actionExecuted: input.actionExecuted,
      verification: {
        verified: isVerified,
        probeOutcome: input.verification.probeOutcome,
        verifiedAt: now.toISOString(),
      },
      measurementWindowMs: input.measurementWindowMs,
      matureAt,
      measured: input.measured,
      delta: input.delta,
      evidence: input.evidence,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    this.records.set(id, record);

    // Evict oldest if exceeding capacity
    if (this.records.size > this.maxRecords) {
      const oldestKey = this.records.keys().next().value;
      if (oldestKey) this.records.delete(oldestKey);
    }

    logger.info(`[ResultEngine] Recorded result for task ${input.taskId} (${input.domain}:${input.action}): ${status}`);
    return record;
  }

  /**
   * Finalizes an ongoing measurement window when post-action metrics are captured.
   */
  public finalizeMeasurement(
    resultId: string,
    measured: Record<string, unknown>,
    delta: Record<string, number | string | boolean>
  ): ResultRecord | undefined {
    const record = this.records.get(resultId);
    if (!record) return undefined;

    record.measured = measured;
    record.delta = delta;
    record.status = 'MEASURED';
    record.updatedAt = new Date().toISOString();

    return record;
  }

  /**
   * Returns all results optionally filtered by domain and status.
   */
  public getResults(filter?: { domain?: CanonicalTaskDomain; status?: ResultOutcomeStatus }): ResultRecord[] {
    let list = Array.from(this.records.values());
    if (filter?.domain) {
      list = list.filter((r) => r.domain === filter.domain);
    }
    if (filter?.status) {
      list = list.filter((r) => r.status === filter.status);
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Aggregates empirical summaries across all domains.
   */
  public getSummary() {
    const all = Array.from(this.records.values());
    return {
      totalTracked: all.length,
      verifiedImmediate: all.filter((r) => r.status === 'VERIFIED_IMMEDIATE').length,
      measurementPending: all.filter((r) => r.status === 'MEASUREMENT_PENDING').length,
      measured: all.filter((r) => r.status === 'MEASURED').length,
      failed: all.filter((r) => r.status === 'FAILED').length,
      recentMaturations: all.filter((r) => r.status === 'MEASURED').slice(0, 10),
      recentPending: all.filter((r) => r.status === 'MEASUREMENT_PENDING').slice(0, 10),
    };
  }

  /**
   * Resets for testing isolation.
   */
  public resetForTesting(): void {
    this.records.clear();
  }
}
