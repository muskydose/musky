import { getSupabaseAdmin } from '@/lib/supabase';
import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';
import { reconcileCanonicalSlot } from '@/lib/growth/media-specs';

export type MediaJobStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'WAITING_PROVIDER'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'BLOCKED';

export type MediaJobStrategy =
  | 'REAL'
  | 'DERIVED'
  | 'TEMPLATE'
  | 'AI'
  | 'TEMPORARY'
  | 'MANUAL_REQUIRED'
  | 'NO_ACTION';

export type MediaJobPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface MediaJobRecord {
  id: string; // Deterministic: media-job::{entityType}::{entityId}::{canonicalSlotKey}
  entityType: MediaEntityType;
  entityId: string;
  slotKey: string;
  role: string;
  status: MediaJobStatus;
  strategy: MediaJobStrategy;
  priority: MediaJobPriority;
  provider?: string;
  blueprintPrompt?: string;
  resultAssetId?: string;
  errorMessage?: string;
  attempts: number;
  lockedAt?: string | null;
  lockedBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Durable In-Memory Fallback Map (for offline/local dev or pending DB migration)
const memoryMediaJobs = new Map<string, MediaJobRecord>();

export function resetMemoryMediaJobs(): void {
  memoryMediaJobs.clear();
}

export function generateDeterministicMediaJobId(
  entityType: MediaEntityType,
  entityId: string,
  slotKey: string
): string {
  const normType = entityType.toUpperCase().trim();
  const cleanId = String(entityId || '').trim();
  const spec = reconcileCanonicalSlot(slotKey, entityType);
  return `media-job::${normType}::${cleanId}::${spec.slotKey}`;
}

/**
 * Enqueues or updates a media requirement job idempotently.
 * Guarantees duplicate active jobs for the same entity + slot are never created.
 */
export async function enqueueMediaJob(options: {
  entityType: MediaEntityType;
  entityId: string;
  slotKey: string;
  strategy: MediaJobStrategy;
  priority?: MediaJobPriority;
  provider?: string;
  blueprintPrompt?: string;
}): Promise<{ job: MediaJobRecord; wasCreated: boolean }> {
  const { entityType, entityId, slotKey, strategy, priority = 'P2', provider, blueprintPrompt } = options;
  const spec = reconcileCanonicalSlot(slotKey, entityType);
  const jobId = generateDeterministicMediaJobId(entityType, entityId, spec.slotKey);
  const now = new Date().toISOString();

  // 1. Check existing job
  const existing = await getMediaJobById(jobId);
  if (existing) {
    // If job is already active or completed, return without re-queueing
    if (existing.status === 'IN_PROGRESS' || existing.status === 'COMPLETED') {
      return { job: existing, wasCreated: false };
    }
    // If pending, preserve
    if (existing.status === 'PENDING' || existing.status === 'WAITING_PROVIDER') {
      return { job: existing, wasCreated: false };
    }
  }

  const newJob: MediaJobRecord = {
    id: jobId,
    entityType,
    entityId,
    slotKey: spec.slotKey,
    role: spec.role,
    status: 'PENDING',
    strategy,
    priority,
    provider,
    blueprintPrompt,
    attempts: existing ? existing.attempts + 1 : 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  // Persist
  await persistMediaJob(newJob);

  return { job: newJob, wasCreated: !existing };
}

/**
 * Fetches a single job by deterministic ID.
 */
export async function getMediaJobById(jobId: string): Promise<MediaJobRecord | null> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('media_jobs')
        .select('*')
        .eq('id', jobId)
        .maybeSingle();

      if (!error && data) {
        return mapRowToJob(data);
      }
    } catch {
      // Fallback to in-memory store
    }
  }

  return memoryMediaJobs.get(jobId) || null;
}

/**
 * Acquires a distributed lock on a job with a 5-minute lease time.
 */
export async function acquireMediaJobLock(jobId: string, workerId: string): Promise<boolean> {
  const now = new Date();
  const leaseExpiryMs = 5 * 60 * 1000;
  const job = await getMediaJobById(jobId);
  if (!job) return false;

  if (job.lockedAt) {
    const lockTime = new Date(job.lockedAt).getTime();
    if (now.getTime() - lockTime < leaseExpiryMs && job.lockedBy !== workerId) {
      // Active lock held by another worker
      return false;
    }
  }

  job.lockedAt = now.toISOString();
  job.lockedBy = workerId;
  job.status = 'IN_PROGRESS';
  job.updatedAt = now.toISOString();

  await persistMediaJob(job);
  return true;
}

/**
 * Releases a lock and marks final job status.
 */
export async function completeMediaJob(options: {
  jobId: string;
  status: MediaJobStatus;
  resultAssetId?: string;
  errorMessage?: string;
}): Promise<MediaJobRecord | null> {
  const { jobId, status, resultAssetId, errorMessage } = options;
  const job = await getMediaJobById(jobId);
  if (!job) return null;

  const now = new Date().toISOString();
  job.status = status;
  job.resultAssetId = resultAssetId || job.resultAssetId;
  job.errorMessage = errorMessage || undefined;
  job.lockedAt = null;
  job.lockedBy = null;
  job.updatedAt = now;

  await persistMediaJob(job);
  return job;
}

/**
 * Gets all pending jobs.
 */
export async function getPendingMediaJobs(limit: number = 20): Promise<MediaJobRecord[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('media_jobs')
        .select('*')
        .in('status', ['PENDING', 'WAITING_PROVIDER'])
        .order('created_at', { ascending: true })
        .limit(limit);

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(mapRowToJob);
      }
    } catch {
      // Fallback
    }
  }

  const memoryList: MediaJobRecord[] = [];
  for (const j of memoryMediaJobs.values()) {
    if (j.status === 'PENDING' || j.status === 'WAITING_PROVIDER') {
      memoryList.push(j);
      if (memoryList.length >= limit) break;
    }
  }
  return memoryList;
}

async function persistMediaJob(job: MediaJobRecord): Promise<void> {
  memoryMediaJobs.set(job.id, job);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const row = {
        id: job.id,
        entity_type: job.entityType,
        entity_id: job.entityId,
        slot_key: job.slotKey,
        role: job.role,
        status: job.status,
        strategy: job.strategy,
        priority: job.priority,
        provider: job.provider || null,
        blueprint_prompt: job.blueprintPrompt || null,
        result_asset_id: job.resultAssetId || null,
        error_message: job.errorMessage || null,
        attempts: job.attempts,
        locked_at: job.lockedAt || null,
        locked_by: job.lockedBy || null,
        created_at: job.createdAt,
        updated_at: job.updatedAt,
      };

      await supabase.from('media_jobs').upsert([row], { onConflict: 'id' });
    } catch {
      // Keep in-memory store synchronized
    }
  }
}

function mapRowToJob(row: any): MediaJobRecord {
  return {
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    slotKey: row.slot_key,
    role: row.role,
    status: row.status,
    strategy: row.strategy,
    priority: row.priority,
    provider: row.provider,
    blueprintPrompt: row.blueprint_prompt,
    resultAssetId: row.result_asset_id,
    errorMessage: row.error_message,
    attempts: row.attempts || 0,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

