// ============================================================================
// MUSKY DOSE — CENTRAL AUTONOMOUS EXECUTION QUEUE & THREE-LANE ORCHESTRATOR
// 1. FAST LANE (Instant synchronous mutations & cache revalidations)
// 2. BACKGROUND LANE (Asynchronous bounded parallel execution for heavy tasks)
// 3. MAINTENANCE LANE (Comprehensive system health, sweeps & recovery)
// ============================================================================

import {
  AgentTask,
  AgentWorkerType,
  ExecutionLane,
  TickExecutionSummary,
  SchedulerHealthStatus,
  ReadyCountPerLane,
} from './types';
import { AgentStore } from './agent-store';
import { WORKER_REGISTRY, WorkerHandler } from './workers';
import { createCanonicalTask, CreateCanonicalTaskInput, normalizeTask } from './task-contract';
import { ResultEngine } from './result-engine';
import { LearningEngine } from './learning-engine';
import { PerformanceOptimizer } from './performance-optimizer';
import { logger } from '@/lib/logger';

export interface CentralQueueStatus {
  totalTasks: number;
  fastLaneReady: number;
  backgroundLaneReady: number;
  maintenanceLaneReady: number;
  running: number;
  blocked: number;
  completed: number;
  failed: number;
  retrying: number;
  activeLeases: number;
  backlogDepth: number;
  oldestQueuedTaskAgeMs: number;
  oldestQueuedTaskAgeMinutes: number;
  lastDrainAt: string | null;
  lastDrainSuccess: boolean;
  lastReclaimedCount: number;
  nextExpectedHeartbeat: string | null;
  schedulerStatus: SchedulerHealthStatus;
  claimTelemetryMode: 'DURABLE' | 'NON_DURABLE_FALLBACK';
  readyCountPerLane: ReadyCountPerLane;
  optimizerTelemetry: ReturnType<PerformanceOptimizer['getTelemetry']>;
}

export class CentralExecutionQueue {
  private static instance: CentralExecutionQueue | null = null;
  private store: AgentStore;
  private resultEngine: ResultEngine;
  private learningEngine: LearningEngine;
  private optimizer: PerformanceOptimizer;

  // Drain and scheduler telemetry
  private lastDrainAt: string | null = null;
  private lastDrainSuccess: boolean = false;
  private lastDrainError: string | null = null;
  private lastReclaimedCount: number = 0;

  public static getInstance(): CentralExecutionQueue {
    if (!CentralExecutionQueue.instance) {
      CentralExecutionQueue.instance = new CentralExecutionQueue();
    }
    return CentralExecutionQueue.instance;
  }

  private constructor() {
    this.store = AgentStore.getInstance();
    this.resultEngine = ResultEngine.getInstance();
    this.learningEngine = LearningEngine.getInstance();
    this.optimizer = PerformanceOptimizer.getInstance();
  }

  /**
   * Records a queue drain event (e.g. from /api/cron/drain-queue or continuous scheduler).
   */
  public recordDrainEvent(success: boolean, reclaimedCount: number = 0, error?: string): void {
    this.lastDrainAt = new Date().toISOString();
    this.lastDrainSuccess = success;
    this.lastDrainError = error || null;
    this.lastReclaimedCount = reclaimedCount;
  }

  /**
   * Test/internal helper to simulate drain telemetry states.
   */
  public setDrainTelemetryForTesting(patch: {
    lastDrainAt?: string | null;
    lastDrainSuccess?: boolean;
    lastDrainError?: string | null;
    lastReclaimedCount?: number;
  }): void {
    if (patch.lastDrainAt !== undefined) this.lastDrainAt = patch.lastDrainAt;
    if (patch.lastDrainSuccess !== undefined) this.lastDrainSuccess = patch.lastDrainSuccess;
    if (patch.lastDrainError !== undefined) this.lastDrainError = patch.lastDrainError;
    if (patch.lastReclaimedCount !== undefined) this.lastReclaimedCount = patch.lastReclaimedCount;
  }

  /**
   * Enqueues a canonical task into the durable store with idempotency & deduplication checks.
   */
  public async enqueue(input: CreateCanonicalTaskInput): Promise<AgentTask> {
    await this.store.ensureLoaded();
    const task = createCanonicalTask(input);

    // Deduplication check
    if (task.idempotencyKey) {
      const existing = this.store.getTaskByIdempotencyKey(task.idempotencyKey);
      if (existing) {
        this.optimizer.incrementDeduplication();
        logger.info(`[CentralQueue] Task deduplicated: ${task.idempotencyKey}`);
        return existing;
      }
    }

    return this.store.addTask(task);
  }

  /**
   * 1. FAST LANE: Executes small deterministic tasks immediately and synchronously.
   * Universal execution contract: delegates to executeSingleTask.
   */
  public async processFastLane(tasks: AgentTask[]): Promise<AgentTask[]> {
    const executed: AgentTask[] = [];

    for (const rawTask of tasks) {
      const task = normalizeTask(rawTask);
      task.lane = 'FAST';
      await this.executeSingleTask(task);
      const updated = this.store.getTask(task.id) || task;
      executed.push(updated);
    }

    return executed;
  }

  /**
   * 2. BACKGROUND LANE: Executes heavy asynchronous tasks with bounded concurrency and strict lane isolation.
   */
  public async processBackgroundLane(options: {
    timeLimitMs?: number;
    maxBatch?: number;
  } = {}): Promise<TickExecutionSummary[]> {
    await this.store.ensureLoaded();
    const timeLimitMs = options.timeLimitMs || 50000;
    const maxBatch = options.maxBatch || 10;
    const startTime = Date.now();
    const executedSummaries: TickExecutionSummary[] = [];

    while (Date.now() - startTime < timeLimitMs && executedSummaries.length < maxBatch) {
      // Determine safe concurrency bound adaptively
      const concurrencyLimit = this.optimizer.getSafeConcurrencyLimit();

      // Gather ready tasks strictly for background lane with atomic worker lease
      const readyBatch: AgentTask[] = [];
      const excludeIds = new Set<string>();
      for (let i = 0; i < concurrencyLimit && (executedSummaries.length + readyBatch.length) < maxBatch; i++) {
        const candidate = await this.store.leaseNextReadyTask('BACKGROUND', 'central-queue-background', excludeIds);
        if (candidate) {
          excludeIds.add(candidate.id);
          readyBatch.push(candidate);
        } else {
          break;
        }
      }

      if (readyBatch.length === 0) {
        break; // No further background lane tasks ready
      }

      // Execute ready batch in parallel with bounded concurrency
      const batchPromises = readyBatch.map((task) => this.executeSingleTask(task));
      const settled = await Promise.allSettled(batchPromises);

      for (const res of settled) {
        if (res.status === 'fulfilled') {
          executedSummaries.push(res.value);
        } else {
          executedSummaries.push({
            idle: false,
            reason: `Execution rejected: ${res.reason?.message || String(res.reason)}`,
          });
        }
      }

      // Check if time limit exceeded
      if (Date.now() - startTime >= timeLimitMs) {
        break;
      }
    }

    return executedSummaries;
  }

  /**
   * 3. MAINTENANCE LANE: Comprehensive system sweep, failure reclaim, and integrity audit.
   * Strictly processes MAINTENANCE lane tasks with atomic leasing.
   */
  public async processMaintenanceLane(options: {
    timeLimitMs?: number;
    maxBatch?: number;
  } = {}): Promise<TickExecutionSummary[]> {
    await this.store.ensureLoaded();
    const startTime = Date.now();
    const timeLimitMs = options.timeLimitMs || 45000;
    const maxBatch = options.maxBatch || 10;
    const results: TickExecutionSummary[] = [];

    // 1. Reclaim stuck tasks from crashes/serverless timeouts
    await this.store.reclaimStuckTasks();

    // 2. Process maintenance lane tasks with strict lane isolation
    while (Date.now() - startTime < timeLimitMs && results.length < maxBatch) {
      const task = await this.store.leaseNextReadyTask('MAINTENANCE', 'central-queue-maintenance');
      if (!task) break;

      const summary = await this.executeSingleTask(task);
      results.push(summary);

      if (summary.idle || summary.status === 'BLOCKED') break;
    }

    return results;
  }

  /**
   * Universal Single-Task Execution Engine.
   * Handles:
   * - Verification caching
   * - Commercial/Security Safety Gates
   * - Strategy recommendation from Learning Engine
   * - Worker dispatch
   * - Result measurement & Delta recording
   * - Learning feedback recording
   * - Audit logging
   */
  public async executeSingleTask(rawTask: AgentTask): Promise<TickExecutionSummary> {
    const task = normalizeTask(rawTask);

    // 1. Check if verified within freshness window
    if (task.idempotencyKey && this.optimizer.shouldSkipVerified(task.idempotencyKey)) {
      await this.store.updateTask(task.id, {
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      });
      return {
        executedTaskId: task.id,
        status: 'COMPLETED',
        worker: task.worker,
        narrativeSummary: 'Skipped redundant execution: task state already verified fresh.',
      };
    }

    // 2. Safety Gate: Enforce owner approval for sensitive tasks
    if (task.requiresApproval && !task.payload?.approvedByOwner) {
      const reason = task.approvalReason || 'Sensitive operation requires explicit owner authorization.';
      await this.store.updateTask(task.id, {
        status: 'APPROVAL_REQUIRED',
        errorMessage: reason,
      });
      return {
        executedTaskId: task.id,
        status: 'BLOCKED',
        worker: task.worker,
        narrativeSummary: `Halted at Master Safety Gate: ${reason}`,
      };
    }

    const workerHandler: WorkerHandler = WORKER_REGISTRY[task.worker];
    if (!workerHandler) {
      await this.store.updateTask(task.id, {
        status: 'FAILED',
        errorMessage: `Unknown worker: ${task.worker}`,
      });
      return { executedTaskId: task.id, status: 'FAILED' };
    }

    // 3. Learning Engine: Strategy selection
    const strategyRecommendation = this.learningEngine.getRecommendedStrategy(
      task.domain || 'CATALOG',
      task.worker,
      task.action || task.title,
      ['DEFAULT_STRATEGY', 'OPTIMIZED_STRATEGY']
    );

    task.payload = {
      ...task.payload,
      selectedStrategy: strategyRecommendation.strategy,
      strategyConfidence: strategyRecommendation.confidence,
    };

    // 4. Mark RUNNING
    const startTime = Date.now();
    this.optimizer.trackExecutionStart();

    await this.store.updateTask(task.id, {
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
    });

    try {
      // 5. Execute worker
      const execution = await workerHandler(task);
      const durationMs = Date.now() - startTime;
      const isSuccess = execution.status === 'COMPLETED';

      this.optimizer.trackExecutionEnd(durationMs, isSuccess);

      const completedAt = new Date().toISOString();

      // 6. Update task in store
      await this.store.updateTask(task.id, {
        status: execution.status,
        narrative: execution.narrative,
        result: execution.result,
        errorMessage: execution.errorMessage,
        completedAt,
      });

      // 7. Record in Result Engine (Baseline -> Action -> Verification -> Measurement)
      this.resultEngine.recordResult({
        taskId: task.id,
        domain: task.domain || 'CATALOG',
        action: task.action || task.title,
        entityType: task.entityType,
        entityId: task.entityId,
        actionExecuted: task.title,
        verification: {
          verified: isSuccess,
          probeOutcome: execution.narrative.whatVerified,
        },
        measured: execution.result,
      });

      // 8. Record in Learning Engine
      await this.learningEngine.recordExperience({
        domain: task.domain || 'CATALOG',
        worker: task.worker,
        taskType: task.action || task.title,
        strategy: strategyRecommendation.strategy,
        success: isSuccess,
        durationMs,
        failureReason: execution.errorMessage,
        lessonSynthesized: execution.narrative.whatLearned,
      });

      // 9. Record in Audit Timeline
      await this.store.recordAudit({
        taskId: task.id,
        objectiveId: task.objectiveId,
        worker: task.worker,
        action: task.title,
        filesAffected: execution.filesAffected || [],
        dataAffected: execution.dataAffected || {},
        result: execution.status,
        testOutcome: execution.narrative.whatVerified,
        nextAction: isSuccess ? 'Proceeding to dependent tasks' : 'Flagged for inspection',
      });

      // 10. Record verified lesson into durable memory
      if (isSuccess && execution.narrative.whatLearned) {
        await this.store.recordLesson({
          id: `mem-${task.worker}-${Date.now().toString(36)}`,
          category: 'VERIFIED_LESSON',
          topic: task.worker.toUpperCase(),
          lesson: execution.narrative.whatLearned,
          confidence: 0.95,
          sampleSize: 1,
          isCanonical: true,
          verificationData: { taskId: task.id, verified: true },
        });
      }

      // 11. Update SEO Opportunity status if task was spawned from an SEO opportunity
      if (isSuccess && task.payload?.opportunityId) {
        try {
          const { SeoIntelligenceStore } = await import('./seo-intelligence/seo-store');
          await SeoIntelligenceStore.getInstance().updateOpportunityStatus(
            task.payload.opportunityId as string,
            'COMPLETED'
          );
        } catch {
          // non-blocking
        }
      }

      if (isSuccess && task.idempotencyKey) {
        this.optimizer.markVerified(task.idempotencyKey, 10 * 60 * 1000);
      }

      return {
        executedTaskId: task.id,
        status: execution.status,
        worker: task.worker,
        narrativeSummary: execution.narrative.whatChanged,
      };
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      this.optimizer.trackExecutionEnd(durationMs, false);

      const errMsg = err?.message || 'Worker execution error';
      logger.error(`[CentralQueue] Error executing task ${task.id}:`, err);

      await this.store.updateTask(task.id, {
        status: 'FAILED',
        errorMessage: errMsg,
      });

      await this.learningEngine.recordExperience({
        domain: task.domain || 'CATALOG',
        worker: task.worker,
        taskType: task.action || task.title,
        strategy: strategyRecommendation.strategy,
        success: false,
        durationMs,
        failureReason: errMsg,
      });

      return {
        executedTaskId: task.id,
        status: 'FAILED',
        worker: task.worker,
        narrativeSummary: `Failed with error: ${errMsg}`,
      };
    }
  }

  /**
   * Reclaims tasks stuck in RUNNING state across all lanes.
   */
  public async reclaimStuckTasks(stuckThresholdMs?: number): Promise<AgentTask[]> {
    await this.store.ensureLoaded();
    return this.store.reclaimStuckTasks(stuckThresholdMs);
  }

  /**
   * Returns current telemetry and status for Admin Control Center.
   */
  public getStatus(): CentralQueueStatus {
    const state = this.store.getState();
    const all = this.store.getAllTasks();
    const queued = all.filter((t) => t.status === 'QUEUED' || t.status === 'RETRYING');

    const now = Date.now();
    let oldestQueuedTaskAgeMs = 0;
    if (queued.length > 0) {
      const oldestCreatedTime = Math.min(...queued.map((t) => new Date(t.createdAt).getTime()));
      oldestQueuedTaskAgeMs = Math.max(0, now - oldestCreatedTime);
    }
    const oldestQueuedTaskAgeMinutes = Math.floor(oldestQueuedTaskAgeMs / 60000);

    const fastLaneReady = queued.filter((t) => t.lane === 'FAST').length;
    const backgroundLaneReady = queued.filter((t) => t.lane === 'BACKGROUND' || !t.lane).length;
    const maintenanceLaneReady = queued.filter((t) => t.lane === 'MAINTENANCE').length;
    const running = all.filter((t) => t.status === 'RUNNING').length;
    const blocked = all.filter((t) => t.status === 'BLOCKED' || t.status === 'APPROVAL_REQUIRED').length;
    const completed = all.filter((t) => t.status === 'COMPLETED').length;
    const failed = all.filter((t) => t.status === 'FAILED').length;
    const retrying = all.filter((t) => t.status === 'RETRYING').length;

    let schedulerStatus: SchedulerHealthStatus = 'NOT_CONFIGURED';
    let nextExpectedHeartbeat: string | null = null;

    if (state.isPaused) {
      schedulerStatus = 'PAUSED';
    } else if (!this.lastDrainAt) {
      schedulerStatus = 'NOT_CONFIGURED';
    } else {
      const elapsedSinceDrainMs = now - new Date(this.lastDrainAt).getTime();
      nextExpectedHeartbeat = new Date(new Date(this.lastDrainAt).getTime() + 5 * 60 * 1000).toISOString();
      if (!this.lastDrainSuccess || elapsedSinceDrainMs > 15 * 60 * 1000 || oldestQueuedTaskAgeMs > 30 * 60 * 1000) {
        schedulerStatus = 'DEGRADED';
      } else {
        schedulerStatus = 'ACTIVE';
      }
    }

    return {
      totalTasks: all.length,
      fastLaneReady,
      backgroundLaneReady,
      maintenanceLaneReady,
      running,
      blocked,
      completed,
      failed,
      retrying,
      activeLeases: running,
      backlogDepth: queued.length,
      oldestQueuedTaskAgeMs,
      oldestQueuedTaskAgeMinutes,
      lastDrainAt: this.lastDrainAt,
      lastDrainSuccess: this.lastDrainSuccess,
      lastReclaimedCount: this.lastReclaimedCount,
      nextExpectedHeartbeat,
      schedulerStatus,
      claimTelemetryMode: this.store.getClaimTelemetryMode(),
      readyCountPerLane: {
        FAST: fastLaneReady,
        BACKGROUND: backgroundLaneReady,
        MAINTENANCE: maintenanceLaneReady,
      },
      optimizerTelemetry: this.optimizer.getTelemetry(queued.length),
    };
  }
}
