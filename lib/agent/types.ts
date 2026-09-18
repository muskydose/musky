// ============================================================================
// MUSKY DOSE — MASTER AGENT: TYPE DEFINITIONS
// Canonical Architecture: Top-Level Website Operating System
// ============================================================================

export type AgentTaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'BLOCKED'
  | 'RETRYING';

export type AgentWorkerType =
  | 'website_guardian'
  | 'seo_guardian'
  | 'keyword_intelligence'
  | 'content_engine'
  | 'media_visual'
  | 'internal_linking'
  | 'schema'
  | 'sitemap'
  | 'merchant_feed'
  | 'analytics'
  | 'ux'
  | 'accessibility'
  | 'performance'
  | 'commerce_guardian'
  | 'verification'
  | 'deployment'
  | 'monitoring'
  | 'learning_memory';

export type AgentMemoryCategory =
  | 'PLAYBOOK'
  | 'VERIFIED_LESSON'
  | 'DEPENDENCY_PATTERN'
  | 'ROOT_CAUSE'
  | 'PREFERENCE'
  | 'HEURISTIC';

export interface TaskNarrative {
  whyThisTask: string;
  whatDetected: string;
  whatChanged: string;
  whatVerified: string;
  whatLearned: string;
}

export interface AgentHealthScores {
  seo: number;
  keyword: number;
  content: number;
  media: number;
  ux: number;
  performance: number;
  accessibility: number;
  production: number;
}

export interface AgentExecutionStats {
  totalCycles: number;
  running: number;
  queued: number;
  completed: number;
  failed: number;
  blocked: number;
  retrying: number;
}

export interface AgentObjective {
  id: string;
  title: string;
  source: 'AUTONOMOUS' | 'OWNER_INSTRUCTION';
  prompt?: string;
  createdAt: string;
  completedAt?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  totalTasks: number;
  completedTasks: number;
}

export interface AgentTask {
  id: string;
  objectiveId: string;
  title: string;
  worker: AgentWorkerType;
  status: AgentTaskStatus;
  priority: number; // 1-100, 100 being highest
  dependencyIds: string[];
  idempotencyKey: string;
  narrative: TaskNarrative;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
  requiresApproval?: boolean;
  approvalReason?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface AgentMemoryRecord {
  id: string;
  category: AgentMemoryCategory;
  topic: string;
  lesson: string;
  confidence: number; // 0.000 - 1.000
  sampleSize: number;
  isCanonical: boolean;
  verificationData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentAuditEntry {
  id: string;
  taskId?: string;
  objectiveId?: string;
  worker: AgentWorkerType;
  action: string;
  filesAffected: string[];
  dataAffected: Record<string, unknown>;
  result: string;
  testOutcome?: string;
  deploymentOutcome?: string;
  nextAction?: string;
  createdAt: string;
}

export interface MasterAgentState {
  id: 'singleton';
  isAutonomous: boolean;
  isPaused: boolean;
  currentObjective: AgentObjective | null;
  currentTaskId: string | null;
  nextTaskId: string | null;
  lastRunAt: string | null;
  currentRunStartedAt: string | null;
  nextScheduledRunAt: string | null;
  concurrencyLockUntil: string | null;
  healthScores: AgentHealthScores;
  stats: AgentExecutionStats;
  updatedAt: string;
}

export interface AgentSystemContext {
  timestamp: string;
  productsCount: number;
  categoriesCount: number;
  guidesCount: number;
  knowledgeCount: number;
  mediaRequirementsPending: number;
  mediaApprovedCount: number;
  seoCoveragePercent: number;
  brokenLinksDetected: number;
  guardianStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  unmetDependencies: string[];
  recentLearnings: string[];
}

export interface DailySweepSummary {
  timestamp: string;
  schedule: {
    cronUtc: string;
    istExecutionTime: string;
    timezone: string;
  };
  scannedWorkIdentified: number;
  totalExecuted: number;
  unfinishedTasksCount: number;
  nextScheduledRunAt: string;
  tasksExecuted: any[];
  status: 'COMPLETED' | 'PARTIAL' | 'IDLE';
}

/**
 * Calculates the exact ISO timestamp of the next daily 2:00 AM IST (20:30 UTC previous day) execution.
 * IST is UTC+05:30. 2:00 AM IST corresponds to 20:30 UTC of the prior calendar day.
 */
export function getNextDaily2AmIstTimestamp(now: Date = new Date()): string {
  const target = new Date(now.getTime());
  target.setUTCHours(20, 30, 0, 0);
  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.toISOString();
}

