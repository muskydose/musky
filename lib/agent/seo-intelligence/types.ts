// ============================================================================
// MUSKY DOSE — SEO INTELLIGENCE LAYER: TYPES
// Canonical definitions for GSC ingestion, opportunity detection,
// search intent classification, and daily intelligence reporting.
// ============================================================================

export type SeoOpportunityType =
  | 'CTR_IMPROVEMENT'
  | 'RANKING_IMPROVEMENT'
  | 'CONTENT_GAP'
  | 'NEW_KEYWORD'
  | 'DECLINING_QUERY'
  | 'DECLINING_PAGE'
  | 'INDEXING_ISSUE'
  | 'INTERNAL_LINK_OPPORTUNITY'
  | 'TITLE_META_OPPORTUNITY'
  | 'PRODUCT_SEO_OPPORTUNITY';

export type SeoSearchIntent =
  | 'INFORMATIONAL'
  | 'COMMERCIAL'
  | 'TRANSACTIONAL'
  | 'NAVIGATIONAL'
  | 'LOCAL'
  | 'WHOLESALE';

export type SeoOpportunityStatus =
  | 'OPEN'
  | 'TASK_CREATED'
  | 'COMPLETED'
  | 'DISMISSED'
  | 'PENDING_APPROVAL';

export type OpportunitySource =
  | 'GSC_OBSERVED'
  | 'CATALOG_DERIVED'
  | 'INTERNAL_GRAPH_DERIVED'
  | 'HEURISTIC_HYPOTHESIS'
  | 'GOOGLE_SEARCH_CONSOLE'
  | 'CATALOG_AUDIT'
  | 'FIRST_PARTY_SEARCH';

export type DataConfidence =
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'INSUFFICIENT_DATA';

export interface SeoOpportunity {
  id: string;
  query: string;
  pageUrl: string;
  clicks: number;
  impressions: number;
  ctr: number; // 0.0000 - 1.0000
  averagePosition: number;
  dateRange: string; // e.g. 'last_7_days'
  country: string; // e.g. 'IND'
  device: 'ALL' | 'DESKTOP' | 'MOBILE' | 'TABLET';
  opportunityType: SeoOpportunityType;
  opportunityScore: number; // 1 - 100
  searchIntent: SeoSearchIntent;
  recommendedAction: string;
  suggestedTitle?: string;
  suggestedOutline?: string[];
  internalLinkTargets?: string[];
  relatedProducts?: string[];
  status: SeoOpportunityStatus;
  detectedAt: string;
  source: OpportunitySource;
  confidence?: DataConfidence;
  evidence?: string;
  isActualGscQuery?: boolean;
  isActualGscPage?: boolean;
  reason?: string;
  taskId?: string;
  requiresApproval: boolean;
  approvalReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GscPeriodComparison {
  current: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
    startDate: string;
    endDate: string;
  };
  previous: {
    clicks: number;
    impressions: number;
    ctr: number;
    averagePosition: number;
    startDate: string;
    endDate: string;
  };
  deltas: {
    clicksDelta: number;
    impressionsDelta: number;
    ctrDelta: number;
    positionDelta: number;
    clickChangePercent: number;
    impressionChangePercent: number;
  };
  isAvailable: boolean;
  statusMessage: string;
}

export interface DailySeoBriefReport {
  id: string;
  date: string; // YYYY-MM-DD
  generatedAt: string;
  title: string; // 'MUSKY DOSE SEO BRIEF'
  sections: {
    // 1. OVERALL STATUS
    overallStatus: {
      organicClicks: number;
      impressions: number;
      ctr: number;
      averagePosition: number;
      indexedPagesEstimate: number;
      dataFreshness: string;
    };
    // 2. WHAT CHANGED
    whatChanged: {
      importantImprovements: Array<{ entity: string; change: string; metric: string }>;
      importantDeclines: Array<{ entity: string; change: string; metric: string }>;
      newQueries: Array<{ query: string; impressions: number; position: number }>;
    };
    // 3. TOP OPPORTUNITIES
    topOpportunities: Array<{
      opportunity: string;
      url: string;
      query: string;
      whyItMatters: string;
      recommendedAction: string;
      priority: 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';
      requiresApproval: boolean;
    }>;
    // 4. CONTENT OPPORTUNITIES
    contentOpportunities: Array<{
      keyword: string;
      searchIntent: SeoSearchIntent;
      recommendedPageType: string;
      existingRelevantPage?: string;
      suggestedTitle: string;
      suggestedTopicOutline: string[];
      internalLinkTargets: string[];
      relatedProducts: string[];
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
      reason: string;
    }>;
    // 5. PRODUCT SEO OPPORTUNITIES
    productSeoOpportunities: Array<{
      productSlug: string;
      productName: string;
      gaps: string[];
      suggestedTitle?: string;
      suggestedMetaDescription?: string;
      structuredDataValid: boolean;
      priority: 'HIGH' | 'MEDIUM' | 'LOW';
    }>;
    // 6. INTERNAL LINK OPPORTUNITIES
    internalLinkOpportunities: Array<{
      sourceUrl: string;
      targetUrl: string;
      anchorText: string;
      relationship: string;
      reason: string;
    }>;
    // 7. TECHNICAL SEO ISSUES
    technicalSeoIssues: Array<{
      issue: string;
      severity: 'WARNING' | 'CRITICAL' | 'INFO';
      affectedUrls: string[];
      recommendation: string;
    }>;
    // 8. ACTIONS ALREADY TAKEN BY MASTER AGENT
    actionsTakenByAgent: Array<{
      action: string;
      worker: string;
      timestamp: string;
      verifiedOutcome: string;
    }>;
    // 9. ACTIONS REQUIRING OWNER APPROVAL
    actionsRequiringApproval: Array<{
      taskId?: string;
      action: string;
      reason: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
    }>;
  };
  metadata: {
    schedule: '8:00 AM IST (02:30 UTC)';
    gscConfigured: boolean;
    totalOpportunitiesDetected: number;
    safeActionsQueued: number;
    approvalRequiredCount: number;
  };
}

