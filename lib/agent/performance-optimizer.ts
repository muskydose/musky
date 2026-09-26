// ============================================================================
// MUSKY DOSE — AUTONOMOUS PERFORMANCE & ADAPTIVE CONCURRENCY OPTIMIZER
// Continuous Self-Optimization, Bounded Concurrency & Zero Runaway Parallelism
// ============================================================================

import { logger } from '@/lib/logger';

export interface PerformanceTelemetry {
  currentConcurrency: number;
  maxSafeConcurrency: number;
  averageWorkerDurationMs: number;
  recentSuccessRatePercent: number;
  queueDepth: number;
  deduplicatedCount: number;
  skippedAlreadyVerifiedCount: number;
  loadState: 'OPTIMAL' | 'ELEVATED' | 'THROTTLED';
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer | null = null;

  private currentConcurrency = 0;
  private minConcurrency = 1;
  private maxConcurrencyCeiling = 4;
  private rollingDurations: number[] = [];
  private rollingOutcomes: boolean[] = [];
  private maxRollingSamples = 30;

  // Cache of verified task state: idempotencyKey -> expiry timestamp
  private verifiedStateCache: Map<string, number> = new Map();
  private deduplicatedCount = 0;
  private skippedAlreadyVerifiedCount = 0;

  public static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  private constructor() {}

  /**
   * Computes the current safe concurrency limit adaptively based on rolling latency and error rate.
   */
  public getSafeConcurrencyLimit(): number {
    const totalOutcomes = this.rollingOutcomes.length;
    const failures = this.rollingOutcomes.filter((s) => !s).length;
    const failureRate = totalOutcomes > 0 ? failures / totalOutcomes : 0;

    const avgDuration = this.getAverageDuration();

    // High failure rate (> 25%) or extreme latency (> 3000ms) -> Throttle to 1
    if (failureRate > 0.25 || avgDuration > 3000) {
      return this.minConcurrency;
    }

    // Moderate latency (1000ms - 3000ms) or minor failures (> 10%) -> Limit to 2
    if (failureRate > 0.1 || avgDuration > 1000) {
      return 2;
    }

    // Healthy conditions (< 1000ms, failure rate < 10%) -> Safe maximum bounded concurrency
    return this.maxConcurrencyCeiling;
  }

  /**
   * Evaluates if a task's verification is still fresh and can skip redundant execution.
   */
  public shouldSkipVerified(cacheKey: string): boolean {
    const expiry = this.verifiedStateCache.get(cacheKey);
    if (expiry && Date.now() < expiry) {
      this.skippedAlreadyVerifiedCount++;
      logger.info(`[PerformanceOptimizer] Skipping already-verified task: ${cacheKey}`);
      return true;
    }
    return false;
  }

  /**
   * Records a task's successful verification into the freshness cache.
   */
  public markVerified(cacheKey: string, ttlMs: number = 10 * 60 * 1000): void {
    this.verifiedStateCache.set(cacheKey, Date.now() + ttlMs);

    // Evict old keys if map exceeds 500
    if (this.verifiedStateCache.size > 500) {
      const now = Date.now();
      for (const [k, exp] of this.verifiedStateCache.entries()) {
        if (now > exp) this.verifiedStateCache.delete(k);
      }
    }
  }

  public incrementDeduplication(): void {
    this.deduplicatedCount++;
  }

  public trackExecutionStart(): void {
    this.currentConcurrency++;
  }

  public trackExecutionEnd(durationMs: number, success: boolean): void {
    this.currentConcurrency = Math.max(0, this.currentConcurrency - 1);

    this.rollingDurations.push(durationMs);
    if (this.rollingDurations.length > this.maxRollingSamples) {
      this.rollingDurations.shift();
    }

    this.rollingOutcomes.push(success);
    if (this.rollingOutcomes.length > this.maxRollingSamples) {
      this.rollingOutcomes.shift();
    }
  }

  private getAverageDuration(): number {
    if (this.rollingDurations.length === 0) return 300;
    const sum = this.rollingDurations.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.rollingDurations.length);
  }

  public getTelemetry(queueDepth: number = 0): PerformanceTelemetry {
    const limit = this.getSafeConcurrencyLimit();
    const avgDuration = this.getAverageDuration();
    const totalOutcomes = this.rollingOutcomes.length;
    const successes = this.rollingOutcomes.filter((s) => s).length;
    const successRate = totalOutcomes > 0 ? Number(((successes / totalOutcomes) * 100).toFixed(1)) : 100;

    let loadState: 'OPTIMAL' | 'ELEVATED' | 'THROTTLED' = 'OPTIMAL';
    if (limit <= 1) loadState = 'THROTTLED';
    else if (limit <= 2) loadState = 'ELEVATED';

    return {
      currentConcurrency: this.currentConcurrency,
      maxSafeConcurrency: limit,
      averageWorkerDurationMs: avgDuration,
      recentSuccessRatePercent: successRate,
      queueDepth,
      deduplicatedCount: this.deduplicatedCount,
      skippedAlreadyVerifiedCount: this.skippedAlreadyVerifiedCount,
      loadState,
    };
  }

  public resetForTesting(): void {
    this.currentConcurrency = 0;
    this.rollingDurations = [];
    this.rollingOutcomes = [];
    this.verifiedStateCache.clear();
    this.deduplicatedCount = 0;
    this.skippedAlreadyVerifiedCount = 0;
  }
}
