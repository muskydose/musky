export type SourceTier = 'VERIFIED' | 'IMPORTED' | 'DERIVED' | 'ESTIMATED';

export type FreshnessStatus = 'Fresh' | 'Recent' | 'Stale' | 'Unavailable' | 'Never Synced' | 'Disabled';

export type LeadType =
  | 'Retailer'
  | 'Mehndi Artist'
  | 'Distributor'
  | 'Salon'
  | 'Cosmetics Shop'
  | 'Wholesaler'
  | 'Reseller'
  | 'Influencer'
  | 'Other';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Qualified'
  | 'Negotiation'
  | 'Converted'
  | 'Lost'
  | 'Do Not Contact';

export type RecommendationStatus = 'New' | 'Reviewed' | 'Accepted' | 'Rejected' | 'Completed';

export interface GrowthMarket {
  id: string;
  country: string;
  state: string;
  stateCode?: string;
  district?: string;
  districtCode?: string;
  city?: string;
  cityCode?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  status?: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export interface ScoreBreakdown {
  salesScore: number;
  growthScore: number;
  leadsScore: number;
  wholesaleScore: number;
  productFitScore: number;
  campaignResponseScore: number;
  competitionPenalty: number;
  insufficientDataPenalty: number;
}

export interface GrowthMarketMetric {
  id: string;
  marketId: string;
  marketName: string;
  state: string;
  district?: string;
  city?: string;
  pincode?: string;
  customersCount: number;
  ordersCount: number;
  revenue: number;
  unitsSold: number;
  aov: number;
  repeatCustomersCount: number;
  wholesaleLeadsCount: number;
  retailLeadsCount: number;
  artistLeadsCount: number;
  campaignOrdersCount: number;
  campaignRevenue: number;
  productDemandScore: number;
  marketOpportunityScore: number;
  scoreBreakdown: ScoreBreakdown;
  periodStart?: string;
  periodEnd?: string;
  sourceTier: SourceTier;
  sourceName: string;
  updatedAt: string;
}

export interface GrowthKeyword {
  id: string;
  keyword: string;
  language: string;
  country: string;
  state?: string;
  district?: string;
  city?: string;
  category?: string;
  productId?: string;
  searchVolume?: number | null;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  cpc?: number | null;
  trend?: 'RISING' | 'STABLE' | 'DECLINING' | null;
  sourceTier: SourceTier;
  sourceName: string;
  collectedAt: string;
  updatedAt: string;
}

export interface SearchConsoleQuery {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page?: string;
  country?: string;
  dateRange?: string;
  collectedAt: string;
  sourceBadge: 'SEARCH CONSOLE';
}

export interface GoogleTrendsQuery {
  id: string;
  query: string;
  relativeInterest: number; // 0 to 100 index
  trendDirection: 'RISING' | 'STABLE' | 'DECLINING';
  timeframe: string;
  geoTarget: string; // e.g. "India (National)" or "Rajasthan"
  relatedTopics?: string[];
  collectedAt: string;
  sourceBadge: 'GOOGLE TRENDS';
}

export interface BusinessDemandSignal {
  productId?: string;
  productName?: string;
  categoryName?: string;
  matchedQuery: string;
  ordersCount: number;
  totalRevenue: number;
  unitsSold: number;
  wholesaleInquiriesCount: number;
  topStates: Array<{ state: string; orders: number; revenue: number }>;
  sourceBadge: 'FIRST-PARTY STORE';
}

export interface GrowthKeywordSnapshot {
  id: string;
  keywordId: string;
  keyword: string;
  snapshotDate: string;
  searchVolume?: number | null;
  competition?: string | null;
  cpc?: number | null;
  sourceName: string;
  createdAt: string;
}

export interface GrowthLead {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  leadType: LeadType;
  state: string;
  district?: string;
  city?: string;
  pincode?: string;
  address?: string;
  source: string;
  interestedProducts?: string[];
  status: LeadStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo?: string;
  notes?: string;
  nextFollowUp?: string;
  lastContactedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthCompetitor {
  id: string;
  name: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  state?: string;
  district?: string;
  city?: string;
  productCategories?: string[];
  positioning?: string;
  notes?: string;
  sourceTier: SourceTier;
  sourceName: string;
  lastCheckedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthCompetitorObservation {
  id: string;
  competitorId: string;
  competitorName: string;
  productName: string;
  observedPrice: number;
  currency: string;
  observationDate: string;
  source: string;
  notes?: string;
  createdAt: string;
}

export interface GrowthDataSource {
  id: string;
  providerKey: string;
  name: string;
  type: 'FirstParty' | 'Google' | 'Meta' | 'Import' | 'OpenData' | 'Custom';
  status: FreshnessStatus;
  lastSyncedAt?: string;
  recordsCount: number;
  errorMessage?: string;
  quotaStatus?: string;
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GrowthDataSyncLog {
  id: string;
  sourceId: string;
  providerKey: string;
  status: 'SUCCESS' | 'FAILED' | 'PARTIAL' | 'IN_PROGRESS';
  recordsImported: number;
  recordsUpdated: number;
  errorDetails?: string;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
}

export interface GrowthRecommendation {
  id: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  supportingMetrics: {
    label: string;
    value: string | number;
    sourceTier: SourceTier;
  }[];
  dataSources: string[];
  recommendedActions: {
    type: 'CREATE_CAMPAIGN' | 'CREATE_LEAD' | 'SET_FOLLOWUP' | 'VIEW_MARKET' | 'VIEW_PRODUCT' | 'EXPORT_DATA';
    label: string;
    link?: string;
    payload?: Record<string, any>;
  }[];
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  status: RecommendationStatus;
  generatedAt: string;
  updatedAt: string;
}

export interface GrowthImportJob {
  id: string;
  importType: 'MARKETS' | 'KEYWORDS' | 'LEADS' | 'COMPETITORS' | 'HISTORICAL_SALES';
  filename: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED';
  createdAt: string;
  completedAt?: string;
}

export interface GrowthSettings {
  weights: {
    sales: number;
    growth: number;
    leads: number;
    wholesale: number;
    productFit: number;
    campaignResponse: number;
  };
  minOrdersForScore: number;
  staleDataDays: number;
  aiEnabled: boolean;
  minConfidenceThreshold: number;
}

export type KeywordCategoryType =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'LONG_TAIL'
  | 'QUESTION'
  | 'BUYER_INTENT'
  | 'BENEFIT'
  | 'USE_CASE'
  | 'INGREDIENT'
  | 'REGIONAL'
  | 'SEMANTIC';

export type SearchIntentType = 'INFORMATIONAL' | 'COMMERCIAL' | 'TRANSACTIONAL' | 'NAVIGATIONAL';

export type ProductKeywordStatus =
  | 'DISCOVERED'
  | 'VERIFIED'
  | 'TARGETED'
  | 'OPTIMIZED'
  | 'INDEXED'
  | 'NEEDS_CONTENT'
  | 'ARCHIVED';

export interface ProductKeywordTarget {
  id: string;
  productId: string;
  productName: string;
  category: string;
  keyword: string;
  keywordType: KeywordCategoryType;
  relevanceScore: number;
  searchIntent: SearchIntentType;
  generatedFrom: string;
  status: ProductKeywordStatus;
  isActive: boolean;
  isOpportunity: boolean;
  opportunityReason?: string;
  // Verified Search Metrics (STRICTLY NULL until verified)
  verifiedSearchVolume?: number | null;
  verifiedCpc?: number | null;
  verifiedCompetition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  verifiedTrend?: 'RISING' | 'STABLE' | 'DECLINING' | null;
  verifiedSourceName?: string | null;
  verifiedCollectedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductKeywordUniverse {
  productId: string;
  productName: string;
  slug: string;
  categoryName: string;
  totalKeywords: number;
  verifiedCount: number;
  opportunityCount: number;
  keywords: ProductKeywordTarget[];
  groupedByType: Record<KeywordCategoryType, ProductKeywordTarget[]>;
  topOpportunities: ProductKeywordTarget[];
  suggestedPrimary: string;
  suggestedSecondary: string[];
  suggestedLongTail: string[];
  suggestedQuestions: string[];
  lastGeneratedAt: string;
}

// ============================================================
// PHASE 2 — BUSINESS GROWTH & SEO OPPORTUNITY ENGINE TYPES
// ============================================================

export type ProductSeoRating = 'EXCELLENT' | 'GOOD' | 'NEEDS_WORK';

export interface ProductSeoHealthScore {
  productId: string;
  productName: string;
  overallScore: number; // 0 to 100
  rating: ProductSeoRating;
  completenessScore: number; // 0 to 100
  metadataScore: number; // 0 to 100
  keywordCoverageScore: number; // 0 to 100
  demandMatchScore: number; // 0 to 100
  breakdown: {
    hasPrimaryKeyword: boolean;
    hasSeoTitle: boolean;
    hasSeoDescription: boolean;
    hasKeywords: boolean;
    titleLengthValid: boolean; // 30-65 chars
    descriptionLengthValid: boolean; // 120-165 chars
    completenessMissingFields: string[];
    keywordUniverseCount: number;
    verifiedDemandCount: number;
    longTailCount: number;
    questionCount: number;
    imageCount: number;
  };
  recommendations: string[];
  lastReviewedAt: string;
}

export type GrowthOpportunityPriority = 'P1_NOW' | 'P2_NEXT' | 'P3_LATER';

export type GrowthOpportunityType =
  | 'HIGH_DEMAND_UNTARGETED'
  | 'GSC_LOW_CTR'
  | 'LOW_CTR'
  | 'METADATA_INCOMPLETE'
  | 'PRODUCT_SEO_TITLE_GAP'
  | 'PRODUCT_SEO_DESC_GAP'
  | 'GSC_RANKING_STRIKE'
  | 'ZERO_RESULT_SEARCH'
  | 'HIGH_SEARCH_LOW_CONVERSION'
  | 'HIGH_TRAFFIC_LOW_ATC'
  | 'HIGH_ATC_LOW_PURCHASE'
  | 'MISSING_GUIDE'
  | 'MISSING_REAL_IMAGE'
  | 'MISSING_IMAGE'
  | 'OUT_OF_STOCK_RISK'
  | 'REPEAT_PURCHASE_OPPORTUNITY'
  | 'WHOLESALE_LEAD_OPPORTUNITY'
  | 'LEAD_CAPTURE_GAP'
  | 'LEAD_CONVERSION_GAP'
  | 'HIGH_INTENT_UNCAPTURED'
  | 'PRODUCT_LEAD_OPPORTUNITY'
  | 'SEARCH_TO_LEAD_OPPORTUNITY'
  | 'REPEAT_PURCHASE_LEAD_OPPORTUNITY'
  | 'SEARCH_COVERAGE_GAP'
  | 'PRODUCT_FEED_GAP'
  | 'MERCHANT_FEED_ERROR'
  | 'HIGH_INTENT_LOW_LEAD'
  | 'LANDING_PAGE_LEAD_GAP'
  | 'WHOLESALE_ACQUISITION_GAP'
  | 'LOCAL_INTENT_OPPORTUNITY'
  | 'PRODUCT_INDEXING_GAP'
  | 'COMMERCIAL_CONTENT_GAP'
  | 'CHANNEL_OPPORTUNITY'
  | 'CONTENT_TO_LEAD_OPPORTUNITY'
  | 'PRODUCT_CHANNEL_GAP'
  | 'SOCIAL_TO_LEAD_GAP'
  | 'GOOGLE_TO_LEAD_GAP'
  | 'WHOLESALE_CHANNEL_GAP'
  | 'CAMPAIGN_OPPORTUNITY'
  | 'CANNIBALIZATION'
  | 'CANNIBALIZATION_RISK'
  | 'SEO_CANNIBALIZATION'
  | 'KEYWORD_CANNIBALIZATION'
  | 'PRODUCT_CONTENT_GAP'
  | 'SUPPORTING_CONTENT_GAP'
  | 'SEARCH_SYNONYM_OPPORTUNITY'
  | 'LONGTAIL_UNCOVERED'
  | 'QUESTION_CONTENT_GAP'
  | 'REGIONAL_MARKET_EXPANSION'
  | 'TRAFFIC_LEAK'
  | 'QUERY_DESTINATION_MISMATCH'
  | 'STRIKING_DISTANCE'
  | 'ADS_TARGETING_READY';

export type GrowthOpportunityCategory =
  | 'SEO'
  | 'SEARCH'
  | 'CONVERSION'
  | 'PRODUCT'
  | 'INVENTORY'
  | 'WHOLESALE'
  | 'LEAD'
  | 'ACQUISITION'
  | 'OMNICHANNEL'
  | 'CONTENT';

export type GrowthOpportunityAction =
  | 'OPTIMIZE_PRODUCT'
  | 'CREATE_GUIDE_DRAFT'
  | 'CREATE_FAQ_DRAFT'
  | 'ADD_PRODUCT_IMAGE'
  | 'REVIEW_CANNIBALIZATION'
  | 'REVIEW_CONVERSION'
  | 'RESTOCK_PRODUCT'
  | 'CREATE_LANDING_PAGE_DRAFT'
  | 'PREPARE_ADS_DRAFT'
  | 'ADD_INTERNAL_LINKS'
  | 'MAP_SEARCH_SYNONYM'
  | 'CREATE_REPEAT_REMINDER'
  | 'PRIORITIZE_WHOLESALE_LEAD'
  | 'IMPROVE_PRODUCT_CONTENT';

export type OpportunityStatus = 'NEW' | 'REVIEWING' | 'APPROVED' | 'APPLIED' | 'DISMISSED' | 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface GrowthOpportunity {
  id: string;
  opportunityId?: string;
  title: string;
  description: string;
  shortReason?: string;
  evidence?: string;
  type: GrowthOpportunityType;
  priority: GrowthOpportunityPriority;
  status?: OpportunityStatus;
  growthScore?: number; // 0 to 100 deterministic score
  score?: number;
  scoreBreakdown?: {
    demand: number;
    visibilityGap: number;
    conversionPotential: number;
    commercialValue: number;
    contentReadiness: number;
  };
  source?: string;
  entityType?: 'PRODUCT' | 'GUIDE' | 'SEARCH_QUERY' | 'CATEGORY' | 'WHOLESALE' | 'MARKET';
  entityId?: string;
  categoryFilter?: GrowthOpportunityCategory;
  recommendedAction?: string;
  expectedBusinessImpact?: string;
  confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  keyword: string;
  productId?: string;
  productName?: string;
  productSlug?: string;
  guideSlug?: string;
  guideTitle?: string;
  marketDemand?: {
    searchVolume?: number | null;
    cpc?: number | null;
    competition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
    sourceName?: string;
    collectedAt?: string;
  };
  gscPerformance?: {
    impressions?: number;
    clicks?: number;
    ctr?: number;
    position?: number;
  };
  storeDemand?: {
    ordersCount?: number;
    revenue?: number;
    unitsSold?: number;
  };
  location?: {
    state?: string;
    city?: string;
  };
  cannibalizationDetails?: {
    conflictingPages: { title: string; url: string; intent: string }[];
    resolutionSuggestion: string;
  };
  suggestedAction: GrowthOpportunityAction;
  actionLabel: string;
  actionLink?: string;
  relevanceScore: number;
  isDismissed?: boolean;
  freshnessStatus: FreshnessStatus;
  createdAt: string;
}

export interface GuideAttributionMetric {
  guideSlug: string;
  guideTitle: string;
  category: string;
  guideViews: number;
  productClicks: number;
  addToCartCount: number;
  ordersCount: number;
  attributedRevenue: number;
  ctr: number;
  conversionRate: number;
}

export interface InternalLinkSuggestion {
  id: string;
  sourceProductId: string;
  sourceProductName: string;
  targetType: 'CATEGORY' | 'PRODUCT' | 'GUIDE' | 'FAQ' | 'WHOLESALE';
  targetTitle: string;
  targetUrl: string;
  anchorText: string;
  relevanceReason: string;
  relevanceScore: number;
}

export interface MarketProductMapping {
  keyword: string;
  state?: string;
  city?: string;
  searchVolume?: number | null;
  cpc?: number | null;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  primaryProduct?: {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    inStock: boolean;
    relevance: number;
  };
  alternativeProducts: {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    inStock: boolean;
    relevance: number;
  }[];
  relatedProducts: {
    id: string;
    name: string;
    slug: string;
    categoryName: string;
    inStock: boolean;
    relevance: number;
  }[];
  businessSignals?: {
    orders: number;
    revenue: number;
  };
  actionSuggested: GrowthOpportunityAction;
}

export interface OpportunityDashboardStats {
  totalOpportunities: number;
  p1Count: number;
  p2Count: number;
  p3Count: number;
  productsNeedingSeoCount: number;
  highDemandUntargetedCount: number;
  gscRankingStrikeCount: number;
  regionalExpansionCount: number;
  questionGapsCount: number;
  adsDraftsCount: number;
  averageSeoHealthScore: number;
}

export type SeoCompletenessStatus =
  | 'SEO_READY'
  | 'SEO_NEEDS_DESCRIPTION'
  | 'SEO_NEEDS_CATEGORY'
  | 'SEO_NEEDS_REVIEW';

export interface AutoSeoResult {
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  searchIntent: SearchIntentType;
  seoTitle: string;
  metaDescription: string;
  h1: string;
  semanticTerms: string[];
  canonicalUrl: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  status: SeoCompletenessStatus;
  statusMessage: string;
  suggestedCategory?: string;
  suggestedRelatedGuides?: string[];
  isAutoGenerated: boolean;
}

// ============================================================
// PHASE 3 & 4 — GROWTH ACTION EXECUTION LAYER TYPES
// ============================================================

export type GrowthActionType =
  | 'GENERATE_GUIDE_DRAFT'
  | 'GENERATE_SEO_DRAFT'
  | 'GENERATE_CONTENT_DRAFT'
  | 'CREATE_SEARCH_COVERAGE_TASK'
  | 'CREATE_IMAGE_TASK'
  | 'CREATE_INVENTORY_TASK'
  | 'CREATE_WHOLESALE_FOLLOWUP'
  | 'CREATE_REPEAT_PURCHASE_DRAFT'
  | 'CREATE_CONVERSION_REVIEW'
  | 'CREATE_CANNIBALIZATION_REVIEW'
  | 'CREATE_INTERNAL_LINKING_DRAFT'
  | 'CREATE_LEAD_CAPTURE_RECOMMENDATION'
  | 'CREATE_CTA_OPTIMIZATION_DRAFT'
  | 'CREATE_PRODUCT_ENQUIRY_DRAFT'
  | 'CREATE_INTENT_CAPTURE_RECOMMENDATION'
  | 'CREATE_CONTENT_COVERAGE_DRAFT'
  | 'CREATE_PRODUCT_FEED_FIX'
  | 'CREATE_FEED_REPAIR_TASK'
  | 'CREATE_WHOLESALE_CTA_DRAFT'
  | 'CREATE_CHANNEL_ACTION_DRAFT'
  | 'CREATE_CONTENT_TO_LEAD_DRAFT'
  | 'CREATE_PRODUCT_CHANNEL_TASK'
  | 'CREATE_SOCIAL_CTA_DRAFT'
  | 'CREATE_GOOGLE_LEAD_OPTIMIZATION_DRAFT';

export type GrowthActionLifecycleStatus =
  | 'OPEN'
  | 'APPROVED'
  | 'ACTION_GENERATING'
  | 'ACTION_READY'
  | 'APPLIED'
  | 'VERIFYING'
  | 'DONE'
  | 'ACTION_FAILED'
  | 'VERIFY_FAILED'
  | 'DISMISSED';

export interface GrowthActionVerificationCheck {
  name: string;
  passed: boolean;
  message: string;
}

export interface GrowthActionVerificationResult {
  verified: boolean;
  passed?: boolean;
  checks: GrowthActionVerificationCheck[];
  verifiedAt: string;
  summary: string;
}

export interface GrowthActionProposedChange {
  summary: string;
  payload: Record<string, any>;
  draftText?: string;
  markdownContent?: string;
  copyableText?: string;
  targetUrl?: string;
  requiresSecondConfirmation?: boolean;
  suggestedMetadata?: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
  };
}

export interface GrowthActionRecord {
  actionId: string;
  opportunityId: string;
  actionType: GrowthActionType;
  entityType: 'PRODUCT' | 'GUIDE' | 'SEARCH' | 'INVENTORY' | 'WHOLESALE' | 'CAMPAIGN' | 'GLOBAL' | 'LEAD';
  entityId: string;
  title: string;
  description: string;
  beforeSnapshot?: Record<string, any>;
  proposedChange: GrowthActionProposedChange;
  status: GrowthActionLifecycleStatus;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  appliedBy?: string;
  appliedAt?: string;
  verificationResult?: GrowthActionVerificationResult;
  verificationTimestamp?: string;
  failureReason?: string;
}

export interface GrowthActionAuditLog {
  id: string;
  actor: string;
  timestamp: string;
  opportunityId: string;
  actionId: string;
  oldState: GrowthActionLifecycleStatus;
  newState: GrowthActionLifecycleStatus;
  fromStatus?: GrowthActionLifecycleStatus;
  toStatus?: GrowthActionLifecycleStatus;
  result: 'SUCCESS' | 'FAILURE' | 'INFO';
  details?: string;
}

export interface GrowthActionExecutionSummary {
  openOpportunities: number;
  awaitingApproval: number;
  draftsReady: number;
  actionsApplied: number;
  verificationFailures: number;
  completedToday: number;
  executableCount: number;
  draftOnlyCount: number;
}

// ============================================================
// PHASE 2 — CENTRAL LEAD ENGINE MODEL
// ============================================================

export type CentralLeadType =
  | 'RETAIL'
  | 'MEHNDI_ARTIST'
  | 'SALON'
  | 'RESELLER'
  | 'WHOLESALE'
  | 'MANUFACTURER'
  | 'OTHER';

export type CentralLeadStatus =
  | 'NEW'
  | 'CONTACT_REQUIRED'
  | 'CONTACTED'
  | 'QUOTE_REQUESTED'
  | 'QUOTE_SENT'
  | 'NEGOTIATION'
  | 'WON'
  | 'LOST'
  | 'NURTURE'
  | 'REPEAT_OPPORTUNITY'
  | 'QUALIFIED'; // preserved for backwards compatibility

export type CentralLeadPriority = 'HIGH' | 'MEDIUM' | 'LOW';

export type LeadCaptureSource =
  | 'WHATSAPP_CTA'
  | 'PRODUCT_ENQUIRY'
  | 'BULK_ENQUIRY'
  | 'WHOLESALE_ENQUIRY'
  | 'CONTACT_FORM'
  | 'CUSTOM_REQUIREMENT'
  | 'QUOTE_REQUEST'
  | 'SAMPLE_REQUEST'
  | 'CAMPAIGN_LANDING'
  | 'SEARCH_INTENT'
  | 'MANUAL_ENTRY';

export type LeadIntentLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface LeadAttribution {
  channel: string;
  landingPage?: string;
  sourceQuery?: string;
  searchAttributionType: 'EXACT_INTERNAL_SEARCH' | 'GSC_SIGNAL' | 'DIRECT' | 'UNKNOWN';
  touchpointsCount: number;
  firstTouch?: string;
  lastTouch?: string;
}

export interface LeadRecord {
  leadId: string;
  name: string;
  businessName?: string;
  mobile: string;
  whatsapp?: string;
  email?: string;
  city?: string;
  state?: string;
  leadType: CentralLeadType;
  source: LeadCaptureSource;
  sourceQuery?: string;
  landingPage?: string;
  productId?: string;
  productName?: string;
  variantId?: string;
  categoryId?: string;
  guideId?: string;
  requirement?: string;
  quantity?: string | number;
  quantityUnit?: string;
  packQuantity?: number;
  packUnit?: string;
  pricingUnit?: string;
  wholesaleUnit?: string;
  intentLevel: LeadIntentLevel;
  intentScore: number; // 0 to 100
  commercialScore: number; // 0 to 100
  engagementScore: number; // 0 to 100
  leadScore: number; // 0 to 100 (40% intent + 30% commercial + 30% engagement)
  priority: CentralLeadPriority;
  scoreReasons: string[];
  status: CentralLeadStatus;
  attribution: LeadAttribution;
  firstSeenAt: string;
  lastActivityAt: string;
  assignedTo?: string;
  notes?: string;
  convertedOrderId?: string;
  // B2B Repeat & Quote Intelligence
  wholesaleEnquiryId?: string;
  quoteAmount?: number;
  quoteNotes?: string;
  isRepeatOpportunity?: boolean;
  repeatOpportunityReason?: string;
  previousOrdersCount?: number;
  lastOrderDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LeadFollowUpRecommendation {
  action: string;
  urgency: 'NOW' | 'TODAY' | 'SCHEDULED';
  priority?: CentralLeadPriority;
  suggestedMessage: string;
  channel: 'WHATSAPP' | 'CALL' | 'EMAIL';
  reason: string;
}

export interface LeadFunnelAnalytics {
  visitors: number;
  highIntentVisitors: number;
  leads: number;
  leadRate: number;
  qualifiedLeads: number;
  qualificationRate: number;
  quotes: number;
  orders: number;
  leadToOrderRate: number;
  revenueFromLeads: number;
}

export interface LeadSummaryMetrics {
  totalLeads: number;
  newLeads: number;
  highIntentLeads: number;
  veryHighIntentLeads: number;
  wholesaleLeads: number;
  whatsappLeads: number;
  qualifiedLeads: number;
  convertedLeads: number;
  conversionRate: number;
  leadsToday: number;
  highestLeadSource: string;
  topProductByLeads: string;
}

// ============================================================
// PHASE 3 & 4 — LEAD ACQUISITION & MERCHANT FEED TYPES
// ============================================================

export type MerchantFeedProductStatus = 'FEED_READY' | 'FEED_NEEDS_REVIEW';

export interface GoogleMerchantFeedItem {
  id: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  price: string; // e.g., "499.00 INR"
  salePrice?: string;
  brand: string;
  condition: 'new' | 'refurbished' | 'used';
  productType: string;
  googleProductCategory?: string;
  identifierExists: 'no' | 'yes';
  shippingWeight?: string;
  shipping?: {
    country: string;
    service: string;
    price: string;
  };
  feedStatus: MerchantFeedProductStatus;
  validationErrors: string[];
}

export interface MerchantFeedHealthSummary {
  totalProducts: number;
  feedReadyCount: number;
  needsReviewCount: number;
  missingImageCount: number;
  missingPriceCount: number;
  missingAvailabilityCount: number;
  invalidUrlCount: number;
  lastGeneratedAt: string;
  feedXmlUrl: string;
  feedJsonUrl: string;
}

export interface ProductAcquisitionReadiness {
  productId: string;
  productName: string;
  productSlug: string;
  readinessScore: number; // 0 to 100
  leadPotentialScore: number; // 0 to 100
  feedStatus: MerchantFeedProductStatus;
  missingItems: string[];
  strengths: string[];
  commercialIntentCoverage: string[];
  localIntentCoverage: string[];
  recommendedCta: string;
  canonicalUrl: string;
  isIndexable: boolean;
  hasGuide: boolean;
  hasMerchantFeedItem: boolean;
}

export interface AcquisitionDashboardMetrics {
  totalLeads: number;
  leadsToday: number;
  qualifiedLeads: number;
  highIntentLeads: number;
  leadRate: number;
  organicLeads: number;
  whatsappLeads: number;
  wholesaleLeads: number;
  topProductByLeads: string;
  topLandingPageByLeads: string;
  feedReadyCount: number;
  needsReviewCount: number;
  acquisitionOpportunitiesCount: number;
  gscStatus: 'CONNECTED' | 'NOT_CONFIGURED';
  lastGscSync?: string;
}

// ============================================================
// PHASE 5 — OMNICHANNEL CUSTOMER ENGINE TYPES
// ============================================================

export type OmnichannelChannel =
  | 'GOOGLE_ORGANIC'
  | 'GOOGLE_MERCHANT'
  | 'INSTAGRAM'
  | 'FACEBOOK'
  | 'YOUTUBE'
  | 'GOOGLE_BUSINESS'
  | 'WHATSAPP'
  | 'DIRECT'
  | 'REFERRAL'
  | 'CAMPAIGN'
  | 'UNKNOWN';

export type SocialContentType =
  | 'REEL_CONCEPT'
  | 'FEED_POST'
  | 'YOUTUBE_SHORT'
  | 'COMMUNITY_POST'
  | 'GBUSINESS_POST'
  | 'WHATSAPP_BROADCAST';

export type SocialContentStatus =
  | 'DRAFT'
  | 'READY_TO_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED'
  | 'FAILED';

export interface SocialContentQueueItem {
  id: string;
  channel: OmnichannelChannel;
  productId: string;
  productName: string;
  contentType: SocialContentType;
  title?: string;
  hook?: string;
  copy: string;
  caption?: string;
  script?: string;
  cta: string;
  targetUrl: string;
  utmParameters: {
    utm_source: string;
    utm_medium: string;
    utm_campaign: string;
  };
  assetRequirements: string[];
  status: SocialContentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ChannelPerformanceSummary {
  channel: OmnichannelChannel;
  label: string;
  visitors: number;
  leads: number;
  qualified: number;
  orders: number;
  leadRate: number; // percentage
  conversionRate: number; // percentage
  attributedRevenue: number;
}

export interface ProductOmnichannelLaunchPackage {
  productId: string;
  productName: string;
  productSlug: string;
  category: string;
  price: number;
  generatedAt: string;
  website: {
    pageUrl: string;
    seoTitle: string;
    metaDescription: string;
    schemaTypes: string[];
    recommendedCta: string;
  };
  google: {
    feedStatus: MerchantFeedProductStatus;
    freeListingsEligible: boolean;
    targetQueries: string[];
  };
  instagram: {
    captionDraft: string;
    reelConcept: string;
    suggestedHashtags: string[];
    targetUrl: string;
    cta: string;
  };
  facebook: {
    postDraft: string;
    targetUrl: string;
    cta: string;
  };
  youtube: {
    shortScriptDraft: string;
    videoTitle: string;
    description: string;
    targetUrl: string;
    cta: string;
    tags: string[];
  };
  whatsapp: {
    promotionalDraft: string;
    wholesaleDraft: string;
    artistDraft: string;
  };
  googleBusiness: {
    postDraft: string;
    targetUrl: string;
    callToAction: string;
  };
}

export interface OmnichannelDashboardMetrics {
  totalLeads: number;
  leadsToday: number;
  qualifiedLeads: number;
  highIntentLeads: number;
  whatsappLeads: number;
  instagramLeads: number;
  facebookLeads: number;
  youtubeLeads: number;
  googleLeads: number;
  wholesaleLeads: number;
  ordersFromLeads: number;
  attributedRevenue: number;
  topLeadChannel: string;
  topLeadProduct: string;
  channelPerformance: ChannelPerformanceSummary[];
  contentQueue: SocialContentQueueItem[];
}




