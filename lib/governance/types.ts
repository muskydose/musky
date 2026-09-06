/**
 * ============================================================================
 * MUSKY DOSE — UNIVERSAL PLATFORM GOVERNANCE: TYPES & INTERFACES (V1.0)
 *
 * CORE CONTRACT:
 * 1. ONE canonical rule hierarchy across all platform entities.
 * 2. Authority: ADMIN_EXPLICIT > DATABASE > AUTO_POLICY > AI_SUGGESTION > DERIVED > SEED.
 * 3. Fail-closed: Missing/empty database states yield [] or 404, never resurrect stale fixtures.
 * 4. Zero unverified claims: Attributes require explicit verification source.
 * ============================================================================
 */

export type UniversalEntityType =
  | 'PRODUCT'
  | 'CATEGORY'
  | 'COLLECTION'
  | 'GUIDE'
  | 'PAGE'
  | 'BUSINESS_DOCUMENT'
  | 'FAQ'
  | 'OFFER'
  | 'COUPON'
  | 'CUSTOMER'
  | 'LEAD'
  | 'ORDER'
  | 'PAYMENT'
  | 'MEDIA'
  | 'SETTING'
  | 'NAVIGATION_ITEM'
  | 'CAMPAIGN'
  | 'AUTOMATION'
  | 'ANALYTICS_ENTITY'
  | 'CUSTOM';

export type GovernanceState =
  | 'AUTO'          // Generated deterministically by platform policies
  | 'MANUAL'        // Explicitly set/overridden by an authenticated administrator
  | 'LOCKED'        // Administrator hard-lock; AI/automation cannot modify
  | 'NEEDS_REVIEW'   // Suggested by AI or imported; pending administrative sign-off
  | 'PUBLISHED'     // Publicly visible and indexable
  | 'UNPUBLISHED'   // Retained in database but suppressed from public storefront & sitemaps
  | 'ARCHIVED'      // Superseded historical record; preserved for audit & order reference
  | 'DELETED'       // Terminal lifecycle state; references cascade-pruned across platform
  | 'REJECTED';     // AI suggestion or invalid submission explicitly rejected by admin

export type AuthorityLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface GovernanceValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitized?: any;
}

export interface GovernanceMutationContext {
  userId?: string;
  userRole?: 'ADMIN' | 'SYSTEM' | 'CRON' | 'CUSTOMER';
  requestId?: string;
  ip?: string;
  origin?: string;
  timestamp: string;
}

export interface GovernedEntityMetadata {
  entityType: UniversalEntityType;
  id: string;
  slug?: string;
  state: GovernanceState;
  createdAt: string;
  updatedAt: string;
  lockedByAdmin?: boolean;
  version?: number;
}

export interface GovernedEntityDefinition<T = any> {
  entityType: UniversalEntityType;
  displayName: string;
  tableName: string;
  requiresAdminAuth: boolean;
  requiresCsrf: boolean;
  allowedStates: GovernanceState[];
  defaultState: GovernanceState;
  isSeoEligible: boolean;
  isAnalyticsEligible: boolean;
  validate: (entity: T, isNew?: boolean) => GovernanceValidationResult;
  getRevalidationTags: (entity: T) => string[];
  getRevalidationPaths: (entity: T) => string[];
  onDeleted?: (entityId: string, slug?: string) => Promise<void>;
}

export interface AiSuggestionEnvelope<T = any> {
  source: 'AI_AUTOFILL' | 'AI_GROWTH' | 'HEURISTIC_PARSER';
  confidenceScore: number;
  generatedAt: string;
  suggestedState: 'NEEDS_REVIEW';
  payload: T;
  auditTrail: string[];
}
