import { getSupabaseAdmin } from '@/lib/supabase';
import {
  MediaEntityType,
  MediaAssetRole,
  getMediaForEntity,
  isRealOwnerPhotoProtected,
} from '@/lib/db/media';
import { reconcileCanonicalSlot, SlotSpecification } from '@/lib/growth/media-specs';
import { LocalSelfHostedProvider } from '@/lib/ai/visual-engine';
import { getAllKnowledgeEntitiesRaw } from '@/lib/db/knowledge';

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

export type MediaJobEligibilityDecision = 'PROCESS' | 'BLOCKED' | 'WAITING_PROVIDER';

export type MediaJobEligibilityStatusCode =
  | 'ELIGIBLE'
  | 'TEST_ENTITY_REJECTED'
  | 'INVALID_ENTITY'
  | 'INVALID_SLOT'
  | 'PROTECTED_REAL_OWNER'
  | 'NO_ACTION'
  | 'MANUAL_REQUIRED'
  | 'WAITING_PROVIDER';

export interface MediaJobEligibilityResult {
  decision: MediaJobEligibilityDecision;
  reason: string;
  statusCode: MediaJobEligibilityStatusCode;
  canonicalSpec?: SlotSpecification;
}

export interface CanProcessMediaJobInput {
  entityType: MediaEntityType;
  entityId: string;
  slotKey: string;
  role?: string;
  strategy?: MediaJobStrategy;
  provider?: string;
}

export const KNOWN_TEST_OR_DEMO_ENTITY_IDS = new Set<string>([
  'prod-media-test-1789780736768',
  'prod-broken-1',
  'prod-test-queue',
  'prod-1',
  'prod-2',
  'prod-3',
  'prod-4',
  'prod-5',
  'prod-temp-test',
  'prod-henna-pure',
]);

export function isTestOrDemoEntity(entityId: string): boolean {
  if (!entityId || typeof entityId !== 'string') return true;
  const clean = entityId.trim().toLowerCase();
  if (KNOWN_TEST_OR_DEMO_ENTITY_IDS.has(clean)) return true;
  if (/^(prod-|cat-|guide-|knowledge-|brand-|marketing-)?(test|temp-test|broken|demo|sample|mock|fixture)/i.test(clean)) return true;
  if (clean.includes('-test') || clean.includes('test-') || clean.endsWith('-test')) return true;
  if (clean.includes('-demo') || clean.includes('demo-') || clean.endsWith('-demo')) return true;
  if (clean.includes('-mock') || clean.includes('mock-') || clean.endsWith('-mock')) return true;
  if (clean.includes('-sample') || clean.includes('sample-') || clean.endsWith('-sample')) return true;
  return false;
}

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
 * Validates that an entity exists in the authoritative production source-of-truth table.
 * PRODUCT: live products table.
 * CATEGORY: live categories table.
 * GUIDE: live product_guides table.
 * KNOWLEDGE: live knowledge database / registry.
 * BRAND/MARKETING: canonical brand/marketing rules.
 */
export async function validateEntityExists(
  entityType: MediaEntityType,
  entityId: string
): Promise<boolean> {
  if (!entityId || typeof entityId !== 'string') return false;
  const cleanId = entityId.trim();
  if (!cleanId) return false;

  // Defensive string guard against test / synthetic entities
  if (isTestOrDemoEntity(cleanId)) return false;

  const supabase = getSupabaseAdmin();

  switch (entityType) {
    case 'PRODUCT': {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('products')
            .select('id')
            .eq('id', cleanId)
            .maybeSingle();
          if (data) return true;

          const { data: bySlug } = await supabase
            .from('products')
            .select('id')
            .eq('slug', cleanId)
            .maybeSingle();
          if (bySlug) return true;
        } catch {
          // Fallback
        }
      }
      return false;
    }

    case 'CATEGORY': {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('categories')
            .select('id')
            .eq('id', cleanId)
            .maybeSingle();
          if (data) return true;

          const { data: bySlug } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', cleanId)
            .maybeSingle();
          if (bySlug) return true;
        } catch {
          // Fallback
        }
      }
      return false;
    }

    case 'GUIDE': {
      if (supabase) {
        try {
          const { data } = await supabase
            .from('product_guides')
            .select('id')
            .eq('id', cleanId)
            .maybeSingle();
          if (data) return true;

          const { data: bySlug } = await supabase
            .from('product_guides')
            .select('id')
            .eq('slug', cleanId)
            .maybeSingle();
          if (bySlug) return true;
        } catch {
          // Fallback
        }
      }
      return false;
    }

    case 'KNOWLEDGE': {
      try {
        const { entities } = await getAllKnowledgeEntitiesRaw();
        const match = entities.find(
          (e) => e.id === cleanId || e.slug === cleanId || e.entityKey === cleanId
        );
        return Boolean(match);
      } catch {
        return false;
      }
    }

    case 'BRAND':
    case 'MARKETING': {
      const lower = cleanId.toLowerCase();
      return (
        lower.startsWith('brand') ||
        lower.startsWith('marketing') ||
        lower === 'musky-dose' ||
        lower === 'muskydose' ||
        lower === 'site' ||
        lower === 'global'
      );
    }

    default:
      return false;
  }
}

/**
 * Deterministic queue eligibility guard.
 * Validates entity existence, canonical slot, real-owner photo protection, strategy, and provider requirement.
 * Returns: 'PROCESS' | 'BLOCKED' | 'WAITING_PROVIDER'
 */
export async function canProcessMediaJob(
  input: CanProcessMediaJobInput | MediaJobRecord
): Promise<MediaJobEligibilityResult> {
  const { entityType, entityId, slotKey, role, strategy = 'AI' } = input;
  const cleanId = String(entityId || '').trim();

  // 1. Test / Demo Isolation
  if (isTestOrDemoEntity(cleanId)) {
    return {
      decision: 'BLOCKED',
      statusCode: 'TEST_ENTITY_REJECTED',
      reason: 'Non-production/test entity rejected by Media OS production worker.',
    };
  }

  // 2. Real Entity Validation in Live Database
  const entityExists = await validateEntityExists(entityType, cleanId);
  if (!entityExists) {
    return {
      decision: 'BLOCKED',
      statusCode: 'INVALID_ENTITY',
      reason: `${entityType} entity "${cleanId}" does not exist in the live catalog.`,
    };
  }

  // 3. Canonical Slot Validation
  const spec = reconcileCanonicalSlot(slotKey || role || '', entityType);
  if (!spec || !spec.slotKey) {
    return {
      decision: 'BLOCKED',
      statusCode: 'INVALID_SLOT',
      reason: `Invalid or unrecognized canonical slot "${slotKey}".`,
    };
  }

  // 4. Real-Owner Photo Protection Guard
  const existingAssets = await getMediaForEntity({
    entityType,
    entityId: cleanId,
    includeDrafts: true,
  });

  const protectedAsset = existingAssets.find(
    (a) =>
      (a.role === spec.role || a.slotKey === spec.slotKey) &&
      isRealOwnerPhotoProtected(a) &&
      a.status === 'approved'
  );

  if (protectedAsset) {
    return {
      decision: 'BLOCKED',
      statusCode: 'PROTECTED_REAL_OWNER',
      reason: `Slot [${spec.slotKey}] is occupied by an approved protected asset (${protectedAsset.id}). Automated overwrite is permanently refused.`,
      canonicalSpec: spec,
    };
  }

  // 5. Strategy Validation
  if (strategy === 'NO_ACTION') {
    return {
      decision: 'BLOCKED',
      statusCode: 'NO_ACTION',
      reason: 'Job strategy is NO_ACTION.',
      canonicalSpec: spec,
    };
  }

  if (strategy === 'MANUAL_REQUIRED') {
    return {
      decision: 'BLOCKED',
      statusCode: 'MANUAL_REQUIRED',
      reason: 'Slot requires manual photographer/owner upload.',
      canonicalSpec: spec,
    };
  }

  // 6. Provider Requirement Check
  if (strategy === 'AI') {
    const localProvider = new LocalSelfHostedProvider();
    const isAvailable = await localProvider.isAvailable();
    if (!isAvailable) {
      return {
        decision: 'WAITING_PROVIDER',
        statusCode: 'WAITING_PROVIDER',
        reason: 'Local AI provider (ComfyUI) is currently offline.',
        canonicalSpec: spec,
      };
    }
  }

  // 7. Fully Eligible
  return {
    decision: 'PROCESS',
    statusCode: 'ELIGIBLE',
    reason: 'Job is fully eligible for production processing.',
    canonicalSpec: spec,
  };
}

/**
 * Acquires a distributed lock on a job with a 5-minute lease time.
 * Automatically halts and transitions ineligible/test entities to BLOCKED.
 */
export async function acquireMediaJobLock(
  jobId: string,
  workerId: string,
  options?: { enforceEligibility?: boolean }
): Promise<boolean> {
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

  // Terminal-state guard: completed jobs with a real result are immutable/idempotent.
  if (job.status === 'COMPLETED' && job.resultAssetId) {
    return false;
  }
  if (job.status === 'BLOCKED' || job.status === 'CANCELLED') {
    return false;
  }

  // Pre-acquisition eligibility check
  if (options?.enforceEligibility !== false) {
    const eligibility = await canProcessMediaJob(job);
    if (eligibility.decision === 'BLOCKED') {
      job.status = 'BLOCKED';
      job.errorMessage = eligibility.reason;
      job.lockedAt = null;
      job.lockedBy = null;
      job.updatedAt = now.toISOString();
      await persistMediaJob(job);
      return false;
    }
  }

  job.lockedAt = now.toISOString();
  job.lockedBy = workerId;
  job.status = 'IN_PROGRESS';
  job.attempts = Math.max(0, Number(job.attempts || 0)) + 1;
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
 * Safely audits the active media jobs queue:
 * 1. Identifies stale IN_PROGRESS leases (> 5 minutes) and reclaims them.
 * 2. Evaluates eligibility for all pending/reclaimed jobs.
 * 3. Transitions invalid or test/demo entities safely to BLOCKED with clear audit reasoning.
 * 4. Preserves all job rows for auditability (zero deletions).
 * 5. Leaves real catalog entities untouched and eligible for production execution.
 */
export async function auditAndHardenMediaJobsQueue(): Promise<{
  scanned: number;
  blocked: number;
  reclaimedStale: number;
  preservedEligible: number;
  details: Array<{ id: string; entityId: string; status: MediaJobStatus; reason: string }>;
}> {
  const supabase = getSupabaseAdmin();
  let dbJobs: MediaJobRecord[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('media_jobs')
        .select('*')
        .in('status', ['PENDING', 'IN_PROGRESS', 'WAITING_PROVIDER']);
      if (!error && Array.isArray(data)) {
        dbJobs = data.map(mapRowToJob);
      }
    } catch {
      // Fallback
    }
  }

  const jobMap = new Map<string, MediaJobRecord>();
  for (const j of memoryMediaJobs.values()) {
    if (j.status === 'PENDING' || j.status === 'IN_PROGRESS' || j.status === 'WAITING_PROVIDER') {
      jobMap.set(j.id, j);
    }
  }
  for (const j of dbJobs) {
    jobMap.set(j.id, j);
  }

  const scannedJobs = Array.from(jobMap.values());
  let blockedCount = 0;
  let reclaimedStaleCount = 0;
  let preservedCount = 0;
  const details: Array<{ id: string; entityId: string; status: MediaJobStatus; reason: string }> = [];

  const now = Date.now();
  const leaseExpiryMs = 5 * 60 * 1000;

  for (const job of scannedJobs) {
    let isStale = false;
    if (job.status === 'IN_PROGRESS') {
      const lockTime = job.lockedAt ? new Date(job.lockedAt).getTime() : 0;
      if (now - lockTime >= leaseExpiryMs) {
        isStale = true;
      } else {
        // Active lease under 5 minutes; preserve running worker
        preservedCount++;
        continue;
      }
    }

    const eligibility = await canProcessMediaJob(job);
    if (eligibility.decision === 'BLOCKED') {
      if (isStale) reclaimedStaleCount++;
      blockedCount++;
      job.status = 'BLOCKED';
      job.errorMessage = eligibility.reason;
      job.lockedAt = null;
      job.lockedBy = null;
      job.updatedAt = new Date().toISOString();
      await persistMediaJob(job);
      details.push({
        id: job.id,
        entityId: job.entityId,
        status: 'BLOCKED',
        reason: eligibility.reason,
      });
    } else {
      preservedCount++;
    }
  }

  return {
    scanned: scannedJobs.length,
    blocked: blockedCount,
    reclaimedStale: reclaimedStaleCount,
    preservedEligible: preservedCount,
    details,
  };
}

/**
 * Gets all pending jobs, filtering out ineligible test entities.
 */
export async function getPendingMediaJobs(
  limit: number = 20,
  options?: { filterEligible?: boolean }
): Promise<MediaJobRecord[]> {
  const supabase = getSupabaseAdmin();
  let rawList: MediaJobRecord[] = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('media_jobs')
        .select('*')
        .in('status', ['PENDING', 'WAITING_PROVIDER'])
        .order('created_at', { ascending: true })
        .limit(limit * 2);

      if (!error && Array.isArray(data) && data.length > 0) {
        rawList = data.map(mapRowToJob);
      }
    } catch {
      // Fallback
    }
  }

  if (rawList.length === 0) {
    for (const j of memoryMediaJobs.values()) {
      if (j.status === 'PENDING' || j.status === 'WAITING_PROVIDER') {
        rawList.push(j);
        if (rawList.length >= limit * 2) break;
      }
    }
  }

  if (options?.filterEligible === false) {
    return rawList.slice(0, limit);
  }

  const eligibleList: MediaJobRecord[] = [];
  for (const job of rawList) {
    const eligibility = await canProcessMediaJob(job);

    if (eligibility.decision === 'BLOCKED') {
      job.status = 'BLOCKED';
      job.errorMessage = eligibility.reason;
      job.lockedAt = null;
      job.lockedBy = null;
      job.updatedAt = new Date().toISOString();
      await persistMediaJob(job);
      continue;
    }

    // WAITING_PROVIDER is intentionally retained for retry once the free local
    // provider comes online; it is not silently discarded from the queue.
    eligibleList.push(job);
    if (eligibleList.length >= limit) break;
  }

  return eligibleList;
}

export async function persistMediaJob(job: MediaJobRecord): Promise<void> {
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

