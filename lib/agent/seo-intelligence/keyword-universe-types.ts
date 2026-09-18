// ============================================================================
// MUSKY DOSE — CANONICAL KEYWORD UNIVERSE ENGINE: TYPES
// Durable schema for free-first, evidence-first, autonomous keyword intelligence.
// ============================================================================

import { OpportunitySource, DataConfidence, SeoSearchIntent } from './types';

export type KeywordLanguage = 'en' | 'hi' | 'hinglish';

export type KeywordClusterId =
  | 'sojat-henna'
  | 'natural-henna'
  | 'henna-powder'
  | 'mehndi-powder'
  | 'bridal-henna'
  | 'body-art-henna'
  | 'hair-henna'
  | 'natural-hair-color'
  | 'indigo'
  | 'amla'
  | 'shikakai'
  | 'herbal-hair-care'
  | 'henna-oil'
  | 'face-care'
  | 'wholesale-b2b'
  | 'rajasthan-botanicals'
  | 'general-botanical';

export type KeywordEntityType =
  | 'PRODUCT'
  | 'CATEGORY'
  | 'GUIDE'
  | 'KNOWLEDGE'
  | 'LANDING'
  | 'TAXONOMY';

export type KeywordUniverseStatus =
  | 'ACTIVE'
  | 'OPPORTUNITY'
  | 'RANKING'
  | 'CANNIBALIZED'
  | 'ARCHIVED';

export type KeywordPrimarySecondary =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'LONG_TAIL';

export interface KeywordUniverseEntry {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  language: KeywordLanguage;
  locale: string; // e.g. 'en-IN'
  country: string; // 'IND'
  source: OpportunitySource; // GSC_OBSERVED | CATALOG_DERIVED | INTERNAL_GRAPH_DERIVED | HEURISTIC_HYPOTHESIS
  confidence: DataConfidence; // HIGH | MEDIUM | LOW | INSUFFICIENT_DATA
  intent: SeoSearchIntent; // WHOLESALE | TRANSACTIONAL | COMMERCIAL | INFORMATIONAL | NAVIGATIONAL | LOCAL
  cluster: KeywordClusterId;
  entityType: KeywordEntityType;
  entityId: string;
  productSlug?: string;
  categorySlug?: string;
  targetUrl: string;
  primaryOrSecondary: KeywordPrimarySecondary;
  status: KeywordUniverseStatus;
  firstSeenAt: string;
  lastSeenAt: string;
  gscClicks: number;
  gscImpressions: number;
  gscCtr: number;
  gscAveragePosition: number;
  evidence: string;
  isActualGscQuery: boolean;
  isGeneratedKeyword: boolean;
  generationMethod: string; // e.g. 'CATALOG_HEAD_TERM', 'CATALOG_WHOLESALE', 'GSC_INGESTION'
  relevanceScore: number; // 1 - 100
  opportunityScore: number; // 1 - 100
  cannibalizationRisk: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KeywordUniverseSummaryStats {
  totalKeywords: number;
  gscObservedCount: number;
  catalogDerivedCount: number;
  internalGraphDerivedCount: number;
  heuristicHypothesesCount: number;
  languagesCount: {
    en: number;
    hi: number;
    hinglish: number;
  };
  clustersCount: Record<string, number>;
  mappedPagesCount: number;
  unmappedKeywordsCount: number;
  cannibalizationRisksCount: number;
  newKeywordsCount: number;
  strikingDistanceCount: number;
  productCoverageCount: number;
  totalProductsInCatalog: number;
}

export interface KeywordUniverseFilters {
  source?: OpportunitySource;
  intent?: SeoSearchIntent;
  cluster?: KeywordClusterId;
  language?: KeywordLanguage;
  status?: KeywordUniverseStatus;
  confidence?: DataConfidence;
  productSlug?: string;
  categorySlug?: string;
  search?: string;
}

export interface CannibalizationIssue {
  keyword: string;
  cluster: KeywordClusterId;
  conflictingUrls: string[];
  recommendedAction: string;
}
