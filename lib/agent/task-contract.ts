// ============================================================================
// MUSKY DOSE — CANONICAL TASK CONTRACT & DOMAIN ADAPTER
// Single Unified Contract for Autonomous System Execution
// ============================================================================

import {
  AgentTask,
  AgentTaskStatus,
  AgentWorkerType,
  CanonicalTaskDomain,
  ExecutionLane,
  TaskNarrative,
} from './types';

export interface CreateCanonicalTaskInput {
  id?: string;
  objectiveId?: string;
  title?: string;
  domain: CanonicalTaskDomain;
  action: string;
  entityType?: string;
  entityId?: string;
  worker?: AgentWorkerType;
  priority?: number;
  lane?: ExecutionLane;
  dependencies?: string[];
  idempotencyKey?: string;
  narrative?: Partial<TaskNarrative>;
  input?: Record<string, unknown>;
  maxRetries?: number;
  requiresApproval?: boolean;
  approvalReason?: string;
  rollbackAction?: string;
  rollbackSnapshot?: Record<string, unknown>;
}

/**
 * Maps a canonical task domain to its primary specialist worker.
 */
export function mapDomainToWorker(domain: CanonicalTaskDomain, action?: string): AgentWorkerType {
  const act = (action || '').toLowerCase();
  switch (domain) {
    case 'CATALOG':
      if (act.includes('schema')) return 'schema';
      return 'content_engine';
    case 'COMMERCE':
      return 'commerce_guardian';
    case 'MEDIA':
      return 'media_visual';
    case 'SEO':
      if (act.includes('sitemap') || act.includes('index')) return 'sitemap';
      if (act.includes('schema')) return 'schema';
      return 'seo_guardian';
    case 'KEYWORDS':
      return 'keyword_intelligence';
    case 'CONTENT':
      return 'content_engine';
    case 'GROWTH':
      if (act.includes('link')) return 'internal_linking';
      if (act.includes('feed')) return 'merchant_feed';
      return 'analytics';
    case 'ANALYTICS':
      return 'analytics';
    case 'GUARDIAN':
      return 'website_guardian';
    case 'INDEXING':
      return 'sitemap';
    case 'QA':
      return 'verification';
    default:
      return 'verification';
  }
}

/**
 * Maps an existing worker type to its canonical domain.
 */
export function mapWorkerToDomain(worker: AgentWorkerType | string): CanonicalTaskDomain {
  const w = String(worker || '').toLowerCase();
  if (w.includes('seo')) return 'SEO';
  if (w.includes('keyword')) return 'KEYWORDS';
  if (w.includes('media') || w.includes('visual')) return 'MEDIA';
  if (w.includes('commerce') || w.includes('price') || w.includes('inventory')) return 'COMMERCE';
  if (w.includes('content') || w.includes('catalog')) return 'CONTENT';
  if (w.includes('sitemap') || w.includes('index')) return 'INDEXING';
  if (w.includes('link') || w.includes('growth') || w.includes('merchant')) return 'GROWTH';
  if (w.includes('analytic') || w.includes('learning') || w.includes('memory')) return 'ANALYTICS';
  if (w.includes('guardian') || w.includes('security') || w.includes('deployment') || w.includes('monitoring')) return 'GUARDIAN';
  return 'QA';
}

/**
 * Infers appropriate execution lane based on domain and action.
 */
export function inferExecutionLane(domain: CanonicalTaskDomain, action?: string): ExecutionLane {
  const act = (action || '').toLowerCase();

  // Fast lane: quick validation, lifecycle calculation, cache revalidation
  if (
    act.includes('validate') ||
    act.includes('lifecycle') ||
    act.includes('revalidate') ||
    act.includes('purge') ||
    act.includes('fast')
  ) {
    return 'FAST';
  }

  // Maintenance lane: system sweeps, recovery, health checks, background audits
  if (
    act.includes('sweep') ||
    act.includes('audit') ||
    act.includes('recover') ||
    act.includes('maintenance') ||
    act.includes('integrity')
  ) {
    return 'MAINTENANCE';
  }

  // Background lane: media generation, content draft, deep SEO analysis, growth jobs
  return 'BACKGROUND';
}

/**
 * Creates a fully validated, normalized canonical AgentTask.
 */
export function createCanonicalTask(input: CreateCanonicalTaskInput): AgentTask {
  const now = new Date().toISOString();
  const id = input.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const objectiveId = input.objectiveId || 'system-orchestrator';
  const worker = input.worker || mapDomainToWorker(input.domain, input.action);
  const lane = input.lane || inferExecutionLane(input.domain, input.action);
  const dependencies = input.dependencies || [];
  const idempotencyKey =
    input.idempotencyKey || `idem-${input.domain}-${input.action}-${input.entityId || 'none'}-${Date.now().toString(36)}`;

  const narrative: TaskNarrative = {
    whyThisTask: input.narrative?.whyThisTask || `Execute autonomous action [${input.action}] in domain [${input.domain}].`,
    whatDetected: input.narrative?.whatDetected || `Detected event/request for entity [${input.entityType || 'SYSTEM'}:${input.entityId || 'GLOBAL'}].`,
    whatChanged: input.narrative?.whatChanged || 'Pending execution by specialist worker.',
    whatVerified: input.narrative?.whatVerified || 'Pending post-execution verification.',
    whatLearned: input.narrative?.whatLearned || '',
  };

  const payload = input.input || {};
  const priority = typeof input.priority === 'number' ? Math.max(1, Math.min(100, input.priority)) : 50;
  const maxRetries = typeof input.maxRetries === 'number' ? input.maxRetries : 3;

  const requiresApproval = Boolean(input.requiresApproval);
  const initialStatus: AgentTaskStatus = requiresApproval ? 'APPROVAL_REQUIRED' : 'QUEUED';

  return {
    id,
    objectiveId,
    title: input.title || `${input.domain}: ${input.action}`,
    domain: input.domain,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    worker,
    status: initialStatus,
    priority,
    lane,
    dependencyIds: dependencies,
    dependencies,
    idempotencyKey,
    narrative,
    payload,
    input: payload,
    retryCount: 0,
    attempts: 0,
    maxRetries,
    requiresApproval,
    approvalReason: input.approvalReason,
    approvalState: {
      required: requiresApproval,
      reason: input.approvalReason,
    },
    rollbackInformation: input.rollbackAction
      ? {
          rollbackAction: input.rollbackAction,
          snapshot: input.rollbackSnapshot,
        }
      : undefined,
    createdAt: now,
  };
}

/**
 * Normalizes any task object (e.g. read from cache or legacy callers) into canonical shape.
 */
export function normalizeTask(task: AgentTask): AgentTask {
  const domain = task.domain || mapWorkerToDomain(task.worker);
  const dependencies = task.dependencies || task.dependencyIds || [];
  const payload = task.input || task.payload || {};
  const lane = task.lane || inferExecutionLane(domain, task.action);

  // Status mapping
  let status: AgentTaskStatus = task.status;
  if (task.requiresApproval && !payload.approvedByOwner && status !== 'COMPLETED' && status !== 'CANCELLED') {
    status = 'APPROVAL_REQUIRED';
  }

  return {
    ...task,
    domain,
    action: task.action || task.title,
    lane,
    dependencyIds: dependencies,
    dependencies,
    payload,
    input: payload,
    error: task.error || task.errorMessage,
    errorMessage: task.error || task.errorMessage,
    attempts: task.attempts !== undefined ? task.attempts : task.retryCount,
    retryCount: task.retryCount !== undefined ? task.retryCount : (task.attempts || 0),
    status,
  };
}
