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
