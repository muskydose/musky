// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN V1 TYPES & DATA CONTRACTS
// Non-Stop Reliability, Layered Health & Safe Recovery
// ============================================================

export type GuardianOverallStatus = 'HEALTHY' | 'DEGRADED' | 'DOWN';

export type GuardianHeartbeatStatus = 'GUARDIAN_ALIVE' | 'GUARDIAN_STALE' | 'GUARDIAN_DOWN';

export type GuardianSeverity = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type CheckTargetType =
  | 'STOREFRONT_URL'
  | 'CUSTOMER_JOURNEY'
  | 'DATABASE'
  | 'API'
  | 'CORE_SYSTEM';

export type IncidentStatus = 'OPEN' | 'RECOVERING' | 'RECOVERED' | 'ACKNOWLEDGED';

export interface LayeredHealthScores {
  l0Connectivity: 'PASS' | 'FAIL';
  l1Api: 'PASS' | 'WARN' | 'FAIL';
  l2Database: 'PASS' | 'WARN' | 'FAIL';
  l3Commerce: 'PASS' | 'FAIL';
  l4BusinessIntegrity: 'PASS' | 'FAIL';
}

export interface GuardianCheckResult {
  checkId: string;
  name: string;
  target: string;
  type: CheckTargetType;
  status: 'PASS' | 'WARN' | 'FAIL';
  statusCode?: number;
  durationMs: number;
  error?: string;
  details?: Record<string, any>;
  observedAt: string;
}

export interface GuardianIncident {
  id: string;
  target: string;
  type: CheckTargetType;
  severity: GuardianSeverity;
  status: IncidentStatus;
  firstObservedAt: string;
  lastObservedAt: string;
  consecutiveFailures: number;
  recoveryAttemptsCount: number;
  errorSummary: string;
  attemptedRecoveryAction?: string;
  recoveryResult?: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  recoveredAt?: string;
  lastAlertSentAt?: string;
}

export interface GuardianHeartbeatRecord {
  runId: string;
  status: GuardianHeartbeatStatus;
  lastStartedAt: string;
  lastCompletedAt: string;
  lastSuccessAt: string;
  durationMs: number;
  checksTotal: number;
  checksFailed: number;
  recoveriesAttempted: number;
  consecutiveMissed: number;
}

export interface GuardianRunRecord {
  id: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
  status: GuardianOverallStatus;
  checksTotal: number;
  checksPassed: number;
  checksWarned: number;
  checksFailed: number;
  dbStatus: 'CONNECTED' | 'FALLBACK_LOCAL' | 'DOWN';
  layeredHealth: LayeredHealthScores;
}

export interface GuardianSystemSummary {
  overallStatus: GuardianOverallStatus;
  heartbeatStatus: GuardianHeartbeatStatus;
  layeredHealth: LayeredHealthScores;
  lastRunAt: string;
  lastDurationMs: number;
  checksTotal: number;
  checksPassed: number;
  checksWarned: number;
  checksFailed: number;
  averageLatencyMs: number;
  databaseStatus: 'CONNECTED' | 'FALLBACK_LOCAL' | 'DOWN';
  durableStorageStatus: 'DURABLE_STORAGE_ACTIVE' | 'DURABLE_STORAGE_NOT_ACTIVATED';
  activeIncidents: GuardianIncident[];
  recentIncidents: GuardianIncident[];
  heartbeat: GuardianHeartbeatRecord;
  metrics: {
    uptimePercent24h: number;
    totalChecks24h: number;
    totalRecoveries24h: number;
  };
}

export type SafeRecoveryActionType =
  | 'REVALIDATE_STATIC_PATH'
  | 'REFRESH_MEMORY_CACHE'
  | 'RECONNECT_DATABASE_SINGLETON'
  | 'RETRY_TRANSIENT_PROBE';

export interface SafeRecoveryPlan {
  actionType: SafeRecoveryActionType;
  target: string;
  reason: string;
  isPermitted: boolean;
}

export interface RecoveryExecutionResult {
  actionType: SafeRecoveryActionType;
  target: string;
  success: boolean;
  durationMs: number;
  verified: boolean;
  recheckStatus: 'PASS' | 'FAIL';
  message: string;
}
