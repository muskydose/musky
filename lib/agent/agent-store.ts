// ============================================================================
// MUSKY DOSE — MASTER AGENT STORE (HYBRID PERSISTENCE LAYER)
// Fail-safe Architecture: In-Memory Ring Buffer + Durable Supabase Synchronization
// ============================================================================

import {
  MasterAgentState,
  AgentTask,
  AgentObjective,
  AgentMemoryRecord,
  AgentAuditEntry,
  AgentTaskStatus,
  AgentHealthScores,
  AgentExecutionStats,
  getNextDaily2AmIstTimestamp,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

const LOCK_TIMEOUT_MS = 60 * 1000; // 60s concurrency lock guard
const MAX_TASKS_MEMORY = 300;
const MAX_AUDIT_MEMORY = 200;

export class AgentStore {
  private static instance: AgentStore | null = null;

  // In-memory persistent caches
  private state: MasterAgentState = {
    id: 'singleton',
    isAutonomous: true,
    isPaused: false,
    currentObjective: null,
    currentTaskId: null,
    nextTaskId: null,
    lastRunAt: null,
    currentRunStartedAt: null,
    nextScheduledRunAt: getNextDaily2AmIstTimestamp(),
    concurrencyLockUntil: null,
    healthScores: {
      seo: 92,
      keyword: 88,
      content: 90,
      media: 86,
      ux: 95,
      performance: 94,
      accessibility: 96,
      production: 98,
    },
    stats: {
      totalCycles: 0,
      running: 0,
      queued: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      retrying: 0,
    },
    updatedAt: new Date().toISOString(),
  };

  private tasks: Map<string, AgentTask> = new Map();
  private memoryRecords: Map<string, AgentMemoryRecord> = new Map();
  private auditLogs: AgentAuditEntry[] = [];
  private isDurableLoaded = false;
  private activeLockId: string | null = null;

  public static getInstance(): AgentStore {
    if (!AgentStore.instance) {
      AgentStore.instance = new AgentStore();
    }
    return AgentStore.instance;
  }

  private constructor() {
    this.seedDefaultMemory();
  }

  /**
   * Seeds foundational verified operational lessons into memory.
   */
  private seedDefaultMemory() {
    const foundationalLessons: AgentMemoryRecord[] = [
      {
        id: 'mem-canonical-media-v1',
        category: 'PLAYBOOK',
        topic: 'MEDIA_PURITY',
        lesson: 'Never assign external URLs, mock assets, or fallback.svg to catalog media slots. Only use canonical approved media assets from /admin/media-requirements.',
        confidence: 0.999,
        sampleSize: 120,
        isCanonical: true,
        verificationData: { rule: 'Universal Visual Language v1', verified: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem-commercial-safety-gate',
        category: 'VERIFIED_LESSON',
        topic: 'COMMERCE_PROTECTION',
        lesson: 'Direct changes to pricing, payment gateways, WhatsApp ordering, or wholesale discount tiers must be BLOCKED for explicit owner approval.',
        confidence: 1.000,
        sampleSize: 85,
        isCanonical: true,
        verificationData: { safetyTier: 'CRITICAL', blocked: true },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem-zero-one-off-styling',
        category: 'HEURISTIC',
        topic: 'DESIGN_SYSTEM',
        lesson: 'Visual presentation must strictly use design system tokens and universal primitives. Do not inject entity-specific visual CSS or slug-based styling.',
        confidence: 0.995,
        sampleSize: 79,
        isCanonical: true,
        verificationData: { standard: 'Universal Design System v1' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const mem of foundationalLessons) {
      this.memoryRecords.set(mem.id, mem);
    }
  }

  /**
   * Ensures durable state is loaded from Supabase if reachable.
   */
  public async ensureLoaded(forceRefresh: boolean = false): Promise<void> {
    if (this.isDurableLoaded && !forceRefresh) return;

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      this.isDurableLoaded = true;
      return;
    }

    try {
      const [stateRes, pendingTasksRes, recentTasksRes, memRes] = await Promise.all([
        supabase.from('master_agent_state').select('*').eq('id', 'singleton').maybeSingle(),
        supabase.from('master_agent_tasks').select('*').in('status', ['QUEUED', 'RUNNING', 'RETRYING', 'BLOCKED']),
        supabase.from('master_agent_tasks').select('*').order('created_at', { ascending: false }).limit(60),
        supabase.from('master_agent_memory').select('*'),
      ]);

      if (stateRes.data) {
        const row = stateRes.data;
        this.state = {
          id: 'singleton',
          isAutonomous: row.is_autonomous ?? true,
          isPaused: row.is_paused ?? false,
          currentObjective: row.current_objective || null,
          currentTaskId: row.current_task_id || null,
          nextTaskId: row.next_task_id || null,
          lastRunAt: row.last_run_at || null,
          currentRunStartedAt: row.current_run_started_at || null,
          nextScheduledRunAt: row.next_scheduled_run_at || null,
          concurrencyLockUntil: row.concurrency_lock_until || null,
          healthScores: row.health_scores || this.state.healthScores,
          stats: row.stats || this.state.stats,
          updatedAt: row.updated_at || new Date().toISOString(),
        };
      }

      // Combine pending tasks and recent tasks without duplicates
      const allFetchedTasks = [...(pendingTasksRes.data || []), ...(recentTasksRes.data || [])];
      const seenIds = new Set<string>();

      for (const t of allFetchedTasks) {
        if (seenIds.has(t.id)) continue;
        seenIds.add(t.id);

        this.tasks.set(t.id, {
          id: t.id,
          objectiveId: t.objective_id,
          title: t.title,
          worker: t.worker,
          status: t.status as AgentTaskStatus,
          priority: t.priority ?? 50,
          dependencyIds: t.dependency_ids ?? [],
          idempotencyKey: t.idempotency_key ?? t.id,
          narrative: {
            whyThisTask: t.why_this_task ?? '',
            whatDetected: t.what_detected ?? '',
            whatChanged: t.what_changed ?? '',
            whatVerified: t.what_verified ?? '',
            whatLearned: t.what_learned ?? '',
          },
          payload: t.payload ?? {},
          result: t.result ?? {},
          errorMessage: t.error_message,
          retryCount: t.retry_count ?? 0,
          maxRetries: t.max_retries ?? 3,
          startedAt: t.started_at,
          completedAt: t.completed_at,
          createdAt: t.created_at,
        });
      }

      if (memRes.data && memRes.data.length > 0) {
        for (const m of memRes.data) {
          this.memoryRecords.set(m.id, {
            id: m.id,
            category: m.category,
            topic: m.topic,
            lesson: m.lesson,
            confidence: Number(m.confidence) || 0.85,
            sampleSize: m.sample_size ?? 1,
            isCanonical: m.is_canonical ?? true,
            verificationData: m.verification_data,
            createdAt: m.created_at,
            updatedAt: m.updated_at,
          });
        }
      }

      this.recalculateStats();
      this.isDurableLoaded = true;
    } catch (err) {
      logger.warn('[AgentStore] Supabase durable load failed, continuing in memory:', { error: String(err) });
      this.isDurableLoaded = true;
    }
  }

  // --------------------------------------------------------------------------
  // CONCURRENCY & LOCKS
  // --------------------------------------------------------------------------

  public async acquireLock(lockId: string): Promise<boolean> {
    const now = Date.now();

    // Check in-memory lock
    if (this.state.concurrencyLockUntil) {
      const lockExpiry = new Date(this.state.concurrencyLockUntil).getTime();
      if (now < lockExpiry && this.activeLockId !== lockId) {
        return false; // Still locked by another process
      }
    }

    const newLockExpiry = new Date(now + LOCK_TIMEOUT_MS).toISOString();
    this.activeLockId = lockId;
    this.state.concurrencyLockUntil = newLockExpiry;

    // Persist to Supabase if available
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('master_agent_state')
          .update({
            concurrency_lock_until: newLockExpiry,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 'singleton');
      } catch {
        // Fallback safely to in-memory lock
      }
    }

    return true;
  }

  public async releaseLock(lockId: string): Promise<void> {
    if (this.activeLockId === lockId || !this.activeLockId) {
      this.activeLockId = null;
      this.state.concurrencyLockUntil = null;

      const supabase = getSupabaseAdmin();
      if (supabase) {
        try {
          await supabase
            .from('master_agent_state')
            .update({
              concurrency_lock_until: null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', 'singleton');
        } catch {
          // Ignore error
        }
      }
    }
  }

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  public getState(): MasterAgentState {
    this.recalculateStats();
    return { ...this.state };
  }

  public async updateState(patch: Partial<MasterAgentState>): Promise<MasterAgentState> {
    this.state = {
      ...this.state,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.recalculateStats();

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('master_agent_state')
          .upsert({
            id: 'singleton',
            is_autonomous: this.state.isAutonomous,
            is_paused: this.state.isPaused,
            current_objective: this.state.currentObjective,
            current_task_id: this.state.currentTaskId,
            next_task_id: this.state.nextTaskId,
            last_run_at: this.state.lastRunAt,
            current_run_started_at: this.state.currentRunStartedAt,
            next_scheduled_run_at: this.state.nextScheduledRunAt,
            concurrency_lock_until: this.state.concurrencyLockUntil,
            health_scores: this.state.healthScores,
            stats: this.state.stats,
            updated_at: this.state.updatedAt,
          });
      } catch (err) {
        logger.warn('[AgentStore] Failed to persist state to Supabase:', { error: String(err) });
      }
    }

    return { ...this.state };
  }

  public async setAutonomous(isAutonomous: boolean): Promise<MasterAgentState> {
    return this.updateState({ isAutonomous });
  }

  public async setPaused(isPaused: boolean): Promise<MasterAgentState> {
    return this.updateState({ isPaused });
  }

  public async setHealthScores(healthScores: Partial<AgentHealthScores>): Promise<void> {
    const updated = {
      ...this.state.healthScores,
      ...healthScores,
    };
    await this.updateState({ healthScores: updated });
  }

  // --------------------------------------------------------------------------
  // TASK MANAGEMENT
  // --------------------------------------------------------------------------

  public getTask(taskId: string): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  public getTaskByIdempotencyKey(key: string): AgentTask | undefined {
    for (const task of this.tasks.values()) {
      if (task.idempotencyKey === key) return task;
    }
    return undefined;
  }

  public getAllTasks(): AgentTask[] {
    return Array.from(this.tasks.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getTasksByStatus(status: AgentTaskStatus): AgentTask[] {
    return this.getAllTasks().filter((t) => t.status === status);
  }

  public getNextReadyTask(lane?: import('./types').ExecutionLane): AgentTask | undefined {
    const queuedTasks = this.getAllTasks()
      .filter((t) => (t.status === 'QUEUED' || t.status === 'RETRYING') && (!lane || t.lane === lane))
      .sort((a, b) => b.priority - a.priority);

    for (const task of queuedTasks) {
      // Check if all dependencies are completed
      const allDepsDone = (task.dependencies || task.dependencyIds || []).every((depId) => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'COMPLETED';
      });

      if (allDepsDone) {
        return task;
      }
    }

    return undefined;
  }

  /**
   * Reclaims tasks stuck in RUNNING state for longer than threshold (worker/serverless crash recovery).
   */
  public async reclaimStuckTasks(stuckThresholdMs: number = 5 * 60 * 1000): Promise<AgentTask[]> {
    const now = Date.now();
    const reclaimed: AgentTask[] = [];

    for (const task of this.tasks.values()) {
      if (task.status === 'RUNNING') {
        const startedTime = task.startedAt ? new Date(task.startedAt).getTime() : 0;
        if (now - startedTime > stuckThresholdMs) {
          const canRetry = task.retryCount < task.maxRetries;
          const nextStatus: AgentTaskStatus = canRetry ? 'RETRYING' : 'FAILED';
          const nextRetry = canRetry ? task.retryCount + 1 : task.retryCount;
          const updated = await this.updateTask(task.id, {
            status: nextStatus,
            retryCount: nextRetry,
            errorMessage: canRetry
              ? `Reclaimed stuck task after ${Math.round(stuckThresholdMs / 1000)}s timeout. Retrying (attempt ${nextRetry}/${task.maxRetries}).`
              : `Task exceeded maximum retries after timing out.`,
          });
          if (updated) {
            reclaimed.push(updated);
            await this.recordAudit({
              taskId: task.id,
              objectiveId: task.objectiveId,
              worker: task.worker,
              action: `Autonomous Recovery: Reclaimed Stuck Task [${task.title}]`,
              filesAffected: [],
              dataAffected: { previousStatus: 'RUNNING', newStatus: updated.status, retryCount: updated.retryCount },
              result: updated.status,
              testOutcome: 'Stuck task reclaimed by Autonomous Safety Engine',
            });
          }
        }
      }
    }

    return reclaimed;
  }

  public async addTask(task: AgentTask): Promise<AgentTask> {
    // Check idempotency
    if (task.idempotencyKey) {
      const existing = this.getTaskByIdempotencyKey(task.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    this.tasks.set(task.id, task);

    // Limit in-memory size
    if (this.tasks.size > MAX_TASKS_MEMORY) {
      const sortedKeys = Array.from(this.tasks.entries())
        .filter(([, t]) => t.status === 'COMPLETED' || t.status === 'FAILED')
        .sort(
          ([, a], [, b]) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      if (sortedKeys.length > 0) {
        this.tasks.delete(sortedKeys[0][0]);
      }
    }

    this.recalculateStats();

    // Persist to Supabase
    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('master_agent_tasks').upsert({
          id: task.id,
          objective_id: task.objectiveId,
          title: task.title,
          worker: task.worker,
          status: task.status,
          priority: task.priority,
          dependency_ids: task.dependencyIds,
          idempotency_key: task.idempotencyKey,
          why_this_task: task.narrative.whyThisTask,
          what_detected: task.narrative.whatDetected,
          what_changed: task.narrative.whatChanged,
          what_verified: task.narrative.whatVerified,
          what_learned: task.narrative.whatLearned,
          payload: task.payload,
          result: task.result,
          error_message: task.errorMessage,
          retry_count: task.retryCount,
          max_retries: task.maxRetries,
          started_at: task.startedAt,
          completed_at: task.completedAt,
          created_at: task.createdAt,
        });
      } catch (err) {
        logger.warn(`[AgentStore] Failed to persist task ${task.id} to Supabase:`, { error: String(err) });
      }
    }

    return task;
  }

  public async updateTask(
    taskId: string,
    updates: Partial<AgentTask>
  ): Promise<AgentTask | undefined> {
    const existing = this.tasks.get(taskId);
    if (!existing) return undefined;

    const merged: AgentTask = {
      ...existing,
      ...updates,
      narrative: {
        ...existing.narrative,
        ...(updates.narrative || {}),
      },
    };

    this.tasks.set(taskId, merged);
    this.recalculateStats();

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase
          .from('master_agent_tasks')
          .update({
            status: merged.status,
            why_this_task: merged.narrative.whyThisTask,
            what_detected: merged.narrative.whatDetected,
            what_changed: merged.narrative.whatChanged,
            what_verified: merged.narrative.whatVerified,
            what_learned: merged.narrative.whatLearned,
            payload: merged.payload,
            result: merged.result,
            error_message: merged.errorMessage,
            retry_count: merged.retryCount,
            started_at: merged.startedAt,
            completed_at: merged.completedAt,
          })
          .eq('id', taskId);
      } catch (err) {
        logger.warn(`[AgentStore] Failed to update task ${taskId} in Supabase:`, { error: String(err) });
      }
    }

    return merged;
  }

  // --------------------------------------------------------------------------
  // OBJECTIVE MANAGEMENT
  // --------------------------------------------------------------------------

  public async setObjective(objective: AgentObjective): Promise<void> {
    await this.updateState({
      currentObjective: objective,
    });
  }

  public async completeObjective(objectiveId: string): Promise<void> {
    if (this.state.currentObjective && this.state.currentObjective.id === objectiveId) {
      const completed: AgentObjective = {
        ...this.state.currentObjective,
        status: 'COMPLETED',
        completedAt: new Date().toISOString(),
      };
      await this.updateState({
        currentObjective: completed,
      });
    }
  }

  // --------------------------------------------------------------------------
  // MEMORY & SELF-LEARNING
  // --------------------------------------------------------------------------

  public getMemoryRecords(): AgentMemoryRecord[] {
    return Array.from(this.memoryRecords.values()).sort(
      (a, b) => b.confidence - a.confidence
    );
  }

  public getMemoryByTopic(topic: string): AgentMemoryRecord | undefined {
    return this.memoryRecords.get(topic);
  }

  public async recordLesson(
    record: Omit<AgentMemoryRecord, 'createdAt' | 'updatedAt'>
  ): Promise<AgentMemoryRecord> {
    const existing = this.memoryRecords.get(record.id);
    const now = new Date().toISOString();

    const fullRecord: AgentMemoryRecord = existing
      ? {
          ...existing,
          ...record,
          confidence: Math.min(1.0, existing.confidence + 0.02),
          sampleSize: existing.sampleSize + 1,
          updatedAt: now,
        }
      : {
          ...record,
          createdAt: now,
          updatedAt: now,
        };

    this.memoryRecords.set(fullRecord.id, fullRecord);

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('master_agent_memory').upsert({
          id: fullRecord.id,
          category: fullRecord.category,
          topic: fullRecord.topic,
          lesson: fullRecord.lesson,
          confidence: fullRecord.confidence,
          sample_size: fullRecord.sampleSize,
          is_canonical: fullRecord.isCanonical,
          verification_data: fullRecord.verificationData,
          updated_at: fullRecord.updatedAt,
        });
      } catch (err) {
        logger.warn(`[AgentStore] Failed to save memory ${fullRecord.id}:`, { error: String(err) });
      }
    }

    return fullRecord;
  }

  // --------------------------------------------------------------------------
  // AUDIT TIMELINE
  // --------------------------------------------------------------------------

  public getAuditLogs(limit: number = 50): AgentAuditEntry[] {
    return this.auditLogs.slice(0, limit);
  }

  public async recordAudit(entry: Omit<AgentAuditEntry, 'id' | 'createdAt'>): Promise<AgentAuditEntry> {
    const fullEntry: AgentAuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
    };

    this.auditLogs.unshift(fullEntry);
    if (this.auditLogs.length > MAX_AUDIT_MEMORY) {
      this.auditLogs.pop();
    }

    const supabase = getSupabaseAdmin();
    if (supabase) {
      try {
        await supabase.from('master_agent_audit_log').insert({
          id: fullEntry.id,
          task_id: fullEntry.taskId,
          objective_id: fullEntry.objectiveId,
          worker: fullEntry.worker,
          action: fullEntry.action,
          files_affected: fullEntry.filesAffected,
          data_affected: fullEntry.dataAffected,
          result: fullEntry.result,
          test_outcome: fullEntry.testOutcome,
          deployment_outcome: fullEntry.deploymentOutcome,
          next_action: fullEntry.nextAction,
          created_at: fullEntry.createdAt,
        });
      } catch {
        // Fallback safely to memory
      }
    }

    return fullEntry;
  }

  // --------------------------------------------------------------------------
  // INTERNAL STATS HELPER
  // --------------------------------------------------------------------------

  private recalculateStats() {
    const tasks = Array.from(this.tasks.values());
    const stats: AgentExecutionStats = {
      totalCycles: this.state.stats.totalCycles,
      running: 0,
      queued: 0,
      completed: 0,
      failed: 0,
      blocked: 0,
      retrying: 0,
    };

    for (const t of tasks) {
      switch (t.status) {
        case 'RUNNING':
          stats.running++;
          break;
        case 'QUEUED':
          stats.queued++;
          break;
        case 'COMPLETED':
          stats.completed++;
          break;
        case 'FAILED':
          stats.failed++;
          break;
        case 'BLOCKED':
        case 'APPROVAL_REQUIRED':
          stats.blocked++;
          break;
        case 'RETRYING':
        case 'WAITING':
          stats.retrying++;
          break;
      }
    }

    this.state.stats = stats;
  }

  /**
   * Clears state for testing isolation.
   */
  public resetForTesting(): void {
    this.tasks.clear();
    this.auditLogs = [];
    this.activeLockId = null;
    this.state.currentObjective = null;
    this.state.currentTaskId = null;
    this.state.nextTaskId = null;
    this.state.concurrencyLockUntil = null;
    this.state.isAutonomous = true;
    this.state.isPaused = false;
    this.recalculateStats();
  }
}
