/**
 * MUSKY DOSE — UNIVERSAL ENTITY RELATIONSHIPS & VISUAL CONTEXT ENGINE (PHASE 1)
 *
 * Production Domain: https://muskydose.in
 *
 * Core Mandates:
 * 1. UNIVERSAL CANONICAL MODEL: Connects PRODUCT, CATEGORY, GUIDE, and KNOWLEDGE
 *    without product-specific branches, hardcoded IDs, or slug checks.
 * 2. DETERMINISTIC RELEVANCE SCORING: Explainable composite scoring based on
 *    explicit links, botanical taxonomy, keyword overlap, categories, and GSC signals.
 * 3. GOVERNANCE & APPROVAL: Supports 'suggested', 'approved', and 'rejected'.
 *    Rejected relationships are strictly excluded from public surfaces (fail-closed).
 * 4. FIRST-CLASS VISUAL CONTEXT: Structured contract preparing downstream AI visual
 *    generation (3D renders, lifestyle, botanical terroir, infographics, illustrations).
 * 5. SINGLE CANONICAL INTELLIGENCE LAYER: Reuses canonical entity registry,
 *    product keyword engine, and growth keywords. No duplicate keyword dictionaries.
 * 6. FAIL-CLOSED DB ADAPTER: Persists overrides to Supabase entity_relationships if available;
 *    gracefully runs deterministic in-memory calculation if table is pending execution.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  CanonicalEntityRecord,
  getEntity,
  resolveCanonicalEntity,
} from './entity-registry';
import { deriveProductAutoSeo } from './product-keyword-engine';
import { getSupabaseAdmin } from '@/lib/supabase';
import { GrowthKeyword, SearchConsoleQuery } from './types';

// ============================================================================
// 1. CORE TYPES & CONTRACTS
// ============================================================================

export type EntityType = 'PRODUCT' | 'CATEGORY' | 'GUIDE' | 'KNOWLEDGE';

export type EntityRelationshipType =
  | 'PRODUCT_GUIDE'
  | 'PRODUCT_KNOWLEDGE'
  | 'GUIDE_PRODUCT'
  | 'GUIDE_KNOWLEDGE'
  | 'CATEGORY_GUIDE'
  | 'CATEGORY_KNOWLEDGE'
  | 'COMPANION_BOTANICAL'
  | 'PARENT_CATEGORY';

export type RelationshipConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type RelationshipStatus = 'suggested' | 'approved' | 'rejected';

export type RelationshipReason =
  | 'EXPLICIT_LINK'
  | 'BOTANICAL_MATCH'
  | 'KEYWORD_OVERLAP'
  | 'CATEGORY_MATCH'
  | 'SEARCH_INTENT_MATCH'
  | 'GSC_SIGNAL'
  | 'COMPANION_PAIRING';

export type SuggestedVisualType =
  | '3D_PRODUCT_RENDER'         // Isolated packaging, jar, bottle, pouch on clean backdrop
  | 'LIFESTYLE_SCENE'           // Real salon, bridal mehndi prep, bathroom vanity
  | 'BOTANICAL_VISUAL'          // Raw leaves, dried pods, botanical harvest, Rajasthani terroir
  | 'INSTRUCTIONAL_INFOGRAPHIC' // Step-by-step paste mixing, ratio chart, timing diagram
  | 'EDUCATIONAL_ILLUSTRATION'  // Plant anatomy, lawsone molecule, hair cuticle absorption
  | 'COLLECTION_SCENE';         // Full category suite, product family grouping

export interface VisualContext {
  entityType: EntityType;
  entityKeywords: string[];
  topic: string;
  category?: string;
  productType?: string;
  suggestedVisualType: SuggestedVisualType;
  visualSubjects: string[];
  approvedFacts: string[];
  antiHallucinationConstraints: string[];
}

export interface EntityRelationshipRecord {
  id: string;
  sourceType: EntityType;
  sourceId: string;
  targetType: EntityType;
  targetId: string;
  relationshipType: EntityRelationshipType;
  relevanceScore: number;
  confidence: RelationshipConfidence;
  status: RelationshipStatus;
  reasons: RelationshipReason[];
  visualContext?: VisualContext;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface GscKeywordSignal {
  query: string;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  position?: number;
}

// ============================================================================
// 2. TOKENIZATION & SIMILARITY UTILITIES (NO DUPLICATE DICTIONARIES)
// ============================================================================

const STOP_WORDS = new Set([
  'for', 'and', 'the', 'with', 'in', 'of', 'to', 'a', 'is', 'by', 'on', 'at',
  'from', 'an', 'as', 'into', 'all', 'pure', 'natural', 'best', 'organic'
]);

/**
 * Normalizes text into a unique set of stemmed/cleaned lowercase alphanumeric tokens.
 */
export function tokenizeText(text: string): Set<string> {
  if (!text || typeof text !== 'string') return new Set();
  const rawTokens = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/);

  const clean = new Set<string>();
  for (const t of rawTokens) {
    const trimmed = t.trim();
    if (trimmed.length > 2 && !STOP_WORDS.has(trimmed)) {
      clean.add(trimmed);
    }
  }
  return clean;
}

/**
 * Computes Jaccard token overlap between two token sets.
 */
export function computeTokenOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) {
      intersection++;
    }
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

// ============================================================================
// 3. FIRST-CLASS VISUAL CONTEXT CONTRACT GENERATION
// ============================================================================

export function generateVisualContext(params: {
  entityType: EntityType;
  entity: Product | ProductGuide | CanonicalEntityRecord | Category;
  topic?: string;
  category?: string;
  suggestedType?: SuggestedVisualType;
}): VisualContext {
  const { entityType, entity, topic, category, suggestedType } = params;

  if (entityType === 'PRODUCT') {
    const prod = entity as Product;
    const cat = category || prod.categoryName || 'Botanicals';
    const autoSeo = deriveProductAutoSeo(prod);
    const keywords = [
      autoSeo.primaryKeyword,
      ...autoSeo.secondaryKeywords,
      ...(prod.seoKeywords || []),
      ...(prod.ingredients || []),
      ...(prod.benefits || []),
    ].filter(Boolean);

    return {
      entityType: 'PRODUCT',
      entityKeywords: keywords.slice(0, 8),
      topic: topic || prod.name,
      category: cat,
      productType: prod.sellingUnit ? `Wholesale Packaged (${prod.sellingUnit})` : 'Botanical Retail',
      suggestedVisualType: suggestedType || '3D_PRODUCT_RENDER',
      visualSubjects: [
        prod.name,
        `Authentic ${cat} packaging`,
        'Sojat botanical harvest textures',
      ],
      approvedFacts: [
        'Triple-sifted micro-fine quality',
        'Direct from Sojat, Rajasthan farm facilities',
        'Zero synthetic dyes or chemical additives',
      ],
      antiHallucinationConstraints: [
        'MUST show exact Musky Dose brand logo without alteration',
        'MUST NOT invent unverified medical, FDA, or organic seals',
        'MUST render exact pack weight and unit without fabricated numbers',
      ],
    };
  }

  if (entityType === 'GUIDE') {
    const guide = entity as ProductGuide;
    const keywords = [guide.title, ...(guide.ingredients || []), ...(guide.keyBenefits || [])];

    return {
      entityType: 'GUIDE',
      entityKeywords: keywords.slice(0, 8),
      topic: topic || guide.title,
      category: category || 'Education & Care',
      suggestedVisualType: suggestedType || 'INSTRUCTIONAL_INFOGRAPHIC',
      visualSubjects: [
        guide.title,
        'Botanical preparation and mixing step-by-step',
        'Paste consistency and traditional application',
      ],
      approvedFacts: [
        'Official Musky Dose technical application protocol',
        'Optimal temperature and dye release timing',
      ],
      antiHallucinationConstraints: [
        'MUST NOT portray unrealistic instant color changes',
        'MUST illustrate traditional plant-based oxidation timeline',
      ],
    };
  }

  if (entityType === 'KNOWLEDGE') {
    const record = entity as CanonicalEntityRecord;
    return {
      entityType: 'KNOWLEDGE',
      entityKeywords: [record.canonicalName, ...(record.aliases || [])].slice(0, 8),
      topic: topic || `${record.canonicalName} (${record.scientificName || 'Botanical Entity'})`,
      category: category || record.productFamily,
      suggestedVisualType: suggestedType || 'EDUCATIONAL_ILLUSTRATION',
      visualSubjects: [
        `${record.canonicalName} botanical species`,
        record.scientificName ? `Scientific illustration: ${record.scientificName}` : 'Botanical harvest',
        'Rajasthani terroir and leaf structures',
      ],
      approvedFacts: record.safeUseCases || ['Traditional Ayurvedic and cosmetic botanical'],
      antiHallucinationConstraints: [
        'MUST adhere strictly to botanical taxonomical accuracy',
        'MUST NOT make curative or disease treatment claims',
      ],
    };
  }

  // Default / CATEGORY
  const cat = entity as Category;
  return {
    entityType: 'CATEGORY',
    entityKeywords: [cat.name, cat.slug],
    topic: topic || cat.name,
    category: cat.name,
    suggestedVisualType: suggestedType || 'COLLECTION_SCENE',
    visualSubjects: [`Full collection: ${cat.name}`, 'Heritage Rajasthan botanical suite'],
    approvedFacts: ['100% plant-based botanical offerings'],
    antiHallucinationConstraints: ['Show only genuine Musky Dose catalog items'],
  };
}

// ============================================================================
// 4. DETERMINISTIC RELEVANCE SCORING ENGINES
// ============================================================================

/**
 * Evaluates relationship relevance between a Product and a Product Guide.
 */
export function scoreProductGuideRelationship(
  product: Product,
  guide: ProductGuide,
  context?: {
    growthKeywords?: (GscKeywordSignal | GrowthKeyword | SearchConsoleQuery)[];
    category?: Category;
  }
): {
  score: number;
  confidence: RelationshipConfidence;
  reasons: RelationshipReason[];
  visualContext: VisualContext;
} {
  const reasons: RelationshipReason[] = [];
  let score = 0.0;

  // 1. Direct explicit association in database (Authoritative, weight 1.0)
  const isDirectlyLinked =
    guide.productId === product.id ||
    (Array.isArray(guide.productIds) && guide.productIds.includes(product.id)) ||
    (Array.isArray(guide.relatedProductIds) && guide.relatedProductIds.includes(product.id));

  if (isDirectlyLinked) {
    return {
      score: 1.0,
      confidence: 'HIGH',
      reasons: ['EXPLICIT_LINK'],
      visualContext: generateVisualContext({
        entityType: 'GUIDE',
        entity: guide,
        topic: `${guide.title} featuring ${product.name}`,
        category: product.categoryName,
        suggestedType: 'INSTRUCTIONAL_INFOGRAPHIC',
      }),
    };
  }

  // 2. Canonical botanical entity resolution (Weight 0.65)
  const resolvedEntity = resolveCanonicalEntity(product);
  const guideTokens = tokenizeText(`${guide.title} ${guide.slug} ${guide.shortIntro || ''} ${(guide.ingredients || []).join(' ')}`);

  if (resolvedEntity && resolvedEntity.entityKey !== 'UNKNOWN') {
    const mentionsBotanical = resolvedEntity.entityRecord.normalizedAliases.some((alias) =>
      guideTokens.has(alias.toLowerCase())
    );
    if (mentionsBotanical) {
      score += 0.65;
      reasons.push('BOTANICAL_MATCH');
    }
  }

  // 3. Category alignment (Weight 0.15)
  const prodCat = (product.categoryName || '').toLowerCase();
  const guideText = `${guide.title} ${guide.slug} ${guide.overview || ''}`.toLowerCase();
  if (prodCat && guideText.includes(prodCat)) {
    score += 0.15;
    reasons.push('CATEGORY_MATCH');
  }

  // 4. Keyword token overlap from canonical keyword universe (Weight 0.15)
  const autoSeo = deriveProductAutoSeo(product);
  const prodKeywords = [
    autoSeo.primaryKeyword,
    ...autoSeo.secondaryKeywords,
    ...(product.seoKeywords || []),
    ...(product.ingredients || []),
    ...(product.benefits || []),
  ].join(' ');
  const prodTokens = tokenizeText(prodKeywords);
  const overlap = computeTokenOverlap(prodTokens, guideTokens);

  if (overlap >= 0.12) {
    score += Math.min(0.15, overlap * 0.5);
    reasons.push('KEYWORD_OVERLAP');
  }

  // 5. GSC / Search Console query signals (Weight 0.05 bonus)
  if (context?.growthKeywords && context.growthKeywords.length > 0) {
    const highIntentGsc = context.growthKeywords.filter((k) => {
      const q = ('query' in k ? k.query : (k as any).keyword || '').toLowerCase();
      const impressions = ('impressions' in k ? k.impressions : (k as any).searchVolume) || 0;
      if (impressions <= 20) return false;
      const qTokens = tokenizeText(q);
      if (qTokens.size === 0) return false;
      let prodMatches = 0;
      let guideMatches = 0;
      for (const t of qTokens) {
        if (prodTokens.has(t)) prodMatches++;
        if (guideTokens.has(t)) guideMatches++;
      }
      const threshold = Math.min(2, qTokens.size);
      return prodMatches >= threshold && guideMatches >= threshold;
    });

    if (highIntentGsc.length > 0) {
      score += 0.05;
      reasons.push('GSC_SIGNAL');
    }
  }

  const finalScore = Math.min(1.0, Math.round(score * 1000) / 1000);
  const confidence: RelationshipConfidence =
    finalScore >= 0.75 ? 'HIGH' : finalScore >= 0.45 ? 'MEDIUM' : 'LOW';

  return {
    score: finalScore,
    confidence,
    reasons,
    visualContext: generateVisualContext({
      entityType: 'GUIDE',
      entity: guide,
      topic: `${guide.title} — Application with ${product.name}`,
      category: product.categoryName,
      suggestedType: 'INSTRUCTIONAL_INFOGRAPHIC',
    }),
  };
}

/**
 * Evaluates relationship relevance between a Product and a Canonical Knowledge Entity.
 */
export function scoreProductKnowledgeRelationship(
  product: Product,
  entityRecord: CanonicalEntityRecord,
  context?: {
    growthKeywords?: (GscKeywordSignal | GrowthKeyword | SearchConsoleQuery)[];
    category?: Category;
  }
): {
  score: number;
  confidence: RelationshipConfidence;
  reasons: RelationshipReason[];
  visualContext: VisualContext;
} {
  const reasons: RelationshipReason[] = [];
  let score = 0.0;

  // 1. Direct canonical entity match via universal resolver
  const resolved = resolveCanonicalEntity(product);
  if (resolved.entityKey === entityRecord.entityKey) {
    score += 0.85;
    reasons.push('BOTANICAL_MATCH');
  }

  const prodTokens = tokenizeText(
    `${product.name} ${product.fullDescription || product.shortDescription || ''} ${(product.ingredients || []).join(' ')} ${(product.benefits || []).join(' ')} ${(product.seoKeywords || []).join(' ')}`
  );
  const entityTokens = tokenizeText(`${entityRecord.canonicalName} ${entityRecord.aliases.join(' ')} ${entityRecord.safeUseCases.join(' ')}`);
  const overlap = computeTokenOverlap(prodTokens, entityTokens);

  if (overlap >= 0.10) {
    score += Math.min(0.10, overlap * 0.5);
    reasons.push('KEYWORD_OVERLAP');
  }

  // 3. Companion entity pairing (e.g. Henna paired with Indigo)
  if (
    resolved.entityRecord &&
    Array.isArray(resolved.entityRecord.relatedEntities) &&
    resolved.entityRecord.relatedEntities.includes(entityRecord.entityKey)
  ) {
    score += 0.05;
    reasons.push('COMPANION_PAIRING');
  }

  const finalScore = Math.min(1.0, Math.round(score * 1000) / 1000);
  const confidence: RelationshipConfidence =
    finalScore >= 0.75 ? 'HIGH' : finalScore >= 0.40 ? 'MEDIUM' : 'LOW';

  return {
    score: finalScore,
    confidence,
    reasons,
    visualContext: generateVisualContext({
      entityType: 'KNOWLEDGE',
      entity: entityRecord,
      topic: `${entityRecord.canonicalName} Sourcing & Botanical Care for ${product.name}`,
      category: product.categoryName,
      suggestedType: 'EDUCATIONAL_ILLUSTRATION',
    }),
  };
}

/**
 * Evaluates relationship relevance between a Guide and a Canonical Knowledge Entity.
 */
export function scoreGuideKnowledgeRelationship(
  guide: ProductGuide,
  entityRecord: CanonicalEntityRecord
): {
  score: number;
  confidence: RelationshipConfidence;
  reasons: RelationshipReason[];
  visualContext: VisualContext;
} {
  const reasons: RelationshipReason[] = [];
  let score = 0.0;

  const guideTokens = tokenizeText(`${guide.title} ${guide.slug} ${guide.shortIntro || ''} ${(guide.ingredients || []).join(' ')}`);
  const entityAliases = entityRecord.normalizedAliases.map((a) => a.toLowerCase());

  const matchesAlias = entityAliases.some((alias) => guideTokens.has(alias));
  if (matchesAlias) {
    score += 0.80;
    reasons.push('BOTANICAL_MATCH');
  }

  const entityTokens = tokenizeText(entityRecord.description + ' ' + entityRecord.safeUseCases.join(' '));
  const overlap = computeTokenOverlap(guideTokens, entityTokens);
  if (overlap >= 0.10) {
    score += 0.15;
    reasons.push('KEYWORD_OVERLAP');
  }

  const finalScore = Math.min(1.0, Math.round(score * 1000) / 1000);
  const confidence: RelationshipConfidence =
    finalScore >= 0.70 ? 'HIGH' : finalScore >= 0.40 ? 'MEDIUM' : 'LOW';

  return {
    score: finalScore,
    confidence,
    reasons,
    visualContext: generateVisualContext({
      entityType: 'KNOWLEDGE',
      entity: entityRecord,
      topic: `${entityRecord.canonicalName} Botanical Insights for Guide "${guide.title}"`,
      suggestedType: 'EDUCATIONAL_ILLUSTRATION',
    }),
  };
}

// ============================================================================
// 5. GOVERNANCE & PUBLIC FILTERING (FAIL-CLOSED)
// ============================================================================

/**
 * Invariant: REJECTED relationships are NEVER publicly visible.
 * If governance gating is enabled, only APPROVED relationships are shown.
 */
export function isRelationshipPubliclyVisible(
  record: EntityRelationshipRecord,
  options?: { requireExplicitApproval?: boolean; minScore?: number }
): boolean {
  // STRICT SAFETY INVARIANT: Rejected items are never visible.
  if (record.status === 'rejected') {
    return false;
  }

  const minScore = options?.minScore ?? 0.35;
  if (record.relevanceScore < minScore) {
    return false;
  }

  if (options?.requireExplicitApproval) {
    return record.status === 'approved';
  }

  // Default public visibility allows approved, or high-confidence suggested
  return record.status === 'approved' || (record.status === 'suggested' && record.confidence !== 'LOW');
}

// ============================================================================
// 6. RESILIENT OVERRIDES LEDGER (DATABASE + IN-MEMORY FALLBACK)
// ============================================================================

// In-memory cache for manual admin relationship overrides (keyed by source_target_type)
const relationshipOverridesCache = new Map<string, EntityRelationshipRecord>();
let hasAttemptedDbLoad = false;

function buildOverrideKey(sourceType: EntityType, sourceId: string, targetType: EntityType, targetId: string, type: EntityRelationshipType): string {
  return `${sourceType}:${sourceId}-->${targetType}:${targetId}#${type}`;
}

/**
 * Resiliently loads manual overrides from Supabase entity_relationships table if present.
 * Fails gracefully to site_settings.data.entityRelationshipsLedger if table is pending migration.
 */
export async function loadRelationshipOverrides(): Promise<void> {
  if (hasAttemptedDbLoad) return;
  hasAttemptedDbLoad = true;

  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  // 1. Primary Source: public.entity_relationships table
  try {
    const { data, error } = await supabase
      .from('entity_relationships')
      .select('*')
      .limit(1000);

    if (!error && Array.isArray(data) && data.length > 0) {
      for (const row of data) {
        const record: EntityRelationshipRecord = {
          id: row.id,
          sourceType: row.source_type,
          sourceId: row.source_id,
          targetType: row.target_type,
          targetId: row.target_id,
          relationshipType: row.relationship_type,
          relevanceScore: Number(row.relevance_score) || 0,
          confidence: row.confidence,
          status: row.status,
          reasons: Array.isArray(row.reasons) ? row.reasons : [],
          visualContext: row.visual_context || undefined,
          metadata: row.metadata || undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };
        relationshipOverridesCache.set(
          buildOverrideKey(record.sourceType, record.sourceId, record.targetType, record.targetId, record.relationshipType),
          record
        );
      }
      return;
    }
  } catch {
    // Fall through to dual-persistence backup
  }

  // 2. Resilient Fallback: site_settings.data.entityRelationshipsLedger
  try {
    const { data: currentSite, error: siteErr } = await supabase
      .from('site_settings')
      .select('id, data')
      .limit(1)
      .maybeSingle();

    if (!siteErr && currentSite?.data?.entityRelationshipsLedger) {
      const ledger = currentSite.data.entityRelationshipsLedger;
      if (Array.isArray(ledger)) {
        for (const r of ledger) {
          const record: EntityRelationshipRecord = {
            id: r.id,
            sourceType: r.sourceType,
            sourceId: r.sourceId,
            targetType: r.targetType,
            targetId: r.targetId,
            relationshipType: r.relationshipType,
            relevanceScore: Number(r.relevanceScore) || 0,
            confidence: r.confidence,
            status: r.status,
            reasons: Array.isArray(r.reasons) ? r.reasons : [],
            visualContext: r.visualContext || undefined,
            metadata: r.metadata || undefined,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
          relationshipOverridesCache.set(
            buildOverrideKey(record.sourceType, record.sourceId, record.targetType, record.targetId, record.relationshipType),
            record
          );
        }
      }
    }
  } catch {
    // Fail closed in-memory without breaking storefront
  }
}

/**
 * Saves or updates a single relationship override in Supabase and the in-memory cache.
 */
export async function saveRelationshipOverride(
  record: Partial<EntityRelationshipRecord> & {
    sourceType: EntityType;
    sourceId: string;
    targetType: EntityType;
    targetId: string;
    relationshipType: EntityRelationshipType;
  }
): Promise<EntityRelationshipRecord> {
  const key = buildOverrideKey(record.sourceType, record.sourceId, record.targetType, record.targetId, record.relationshipType);
  const now = new Date().toISOString();

  const fullRecord: EntityRelationshipRecord = {
    id: record.id || `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    sourceType: record.sourceType,
    sourceId: record.sourceId,
    targetType: record.targetType,
    targetId: record.targetId,
    relationshipType: record.relationshipType,
    relevanceScore: record.relevanceScore ?? 0.8,
    confidence: record.confidence || 'HIGH',
    status: record.status || 'approved',
    reasons: record.reasons || ['EXPLICIT_LINK'],
    visualContext: record.visualContext,
    metadata: record.metadata || {},
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  relationshipOverridesCache.set(key, fullRecord);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    // 1. Table upsert
    try {
      await supabase.from('entity_relationships').upsert([
        {
          id: fullRecord.id,
          source_type: fullRecord.sourceType,
          source_id: fullRecord.sourceId,
          target_type: fullRecord.targetType,
          target_id: fullRecord.targetId,
          relationship_type: fullRecord.relationshipType,
          relevance_score: fullRecord.relevanceScore,
          confidence: fullRecord.confidence,
          status: fullRecord.status,
          reasons: fullRecord.reasons,
          visual_context: fullRecord.visualContext,
          metadata: fullRecord.metadata,
          updated_at: fullRecord.updatedAt,
        },
      ]);
    } catch {
      // Best effort
    }

    // 2. Dual persistence in site_settings
    try {
      const { data: currentSite } = await supabase.from('site_settings').select('id, data').limit(1).maybeSingle();
      if (currentSite) {
        const ledger: EntityRelationshipRecord[] = Array.isArray(currentSite.data?.entityRelationshipsLedger)
          ? [...currentSite.data.entityRelationshipsLedger]
          : [];
        const existingIdx = ledger.findIndex(
          (r) =>
            r.sourceType === fullRecord.sourceType &&
            r.sourceId === fullRecord.sourceId &&
            r.targetType === fullRecord.targetType &&
            r.targetId === fullRecord.targetId &&
            r.relationshipType === fullRecord.relationshipType
        );
        if (existingIdx >= 0) {
          ledger[existingIdx] = fullRecord;
        } else {
          ledger.push(fullRecord);
        }
        await supabase
          .from('site_settings')
          .update({
            data: {
              ...currentSite.data,
              entityRelationshipsLedger: ledger,
              entityRelationshipsUpdatedAt: now,
            },
            updated_at: now,
          })
          .eq('id', currentSite.id);
      }
    } catch {
      // Best effort
    }
  }

  return fullRecord;
}

/**
 * Deletes a relationship override from memory and persistent storage.
 */
export async function deleteRelationshipOverride(
  sourceType: EntityType,
  sourceId: string,
  targetType: EntityType,
  targetId: string,
  relationshipType: EntityRelationshipType
): Promise<boolean> {
  const key = buildOverrideKey(sourceType, sourceId, targetType, targetId, relationshipType);
  relationshipOverridesCache.delete(key);

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      await supabase
        .from('entity_relationships')
        .delete()
        .match({
          source_type: sourceType,
          source_id: sourceId,
          target_type: targetType,
          target_id: targetId,
          relationship_type: relationshipType,
        });
    } catch {
      // Ignore
    }

    try {
      const { data: currentSite } = await supabase.from('site_settings').select('id, data').limit(1).maybeSingle();
      if (currentSite?.data?.entityRelationshipsLedger) {
        const filtered = (currentSite.data.entityRelationshipsLedger as EntityRelationshipRecord[]).filter(
          (r) =>
            !(
              r.sourceType === sourceType &&
              r.sourceId === sourceId &&
              r.targetType === targetType &&
              r.targetId === targetId &&
              r.relationshipType === relationshipType
            )
        );
        await supabase
          .from('site_settings')
          .update({
            data: {
              ...currentSite.data,
              entityRelationshipsLedger: filtered,
              entityRelationshipsUpdatedAt: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentSite.id);
      }
    } catch {
      // Ignore
    }
  }

  return true;
}

/**
 * Persists an array of candidate relationship edges into canonical storage.
 * - Idempotently merges with existing state.
 * - Respects existing 'rejected' and 'approved' overrides.
 * - Updates in-memory cache, Supabase entity_relationships (if available), and site_settings.
 */
export async function persistRelationshipLedger(
  records: EntityRelationshipRecord[]
): Promise<{
  persistedCount: number;
  tablePersisted: boolean;
  siteSettingsPersisted: boolean;
  tableError?: string;
}> {
  await loadRelationshipOverrides();

  const supabase = getSupabaseAdmin();
  const validRecordsToPersist: EntityRelationshipRecord[] = [];

  for (const rec of records) {
    const key = buildOverrideKey(rec.sourceType, rec.sourceId, rec.targetType, rec.targetId, rec.relationshipType);
    const existing = relationshipOverridesCache.get(key);

    // Rule 1: Never overwrite an explicit rejected override with suggested
    if (existing && existing.status === 'rejected' && rec.status === 'suggested') {
      validRecordsToPersist.push(existing);
      continue;
    }

    // Rule 2: Preserve approved status if existing was approved
    let status = rec.status;
    if (existing && existing.status === 'approved' && rec.status === 'suggested') {
      status = 'approved';
    }

    const mergedRecord: EntityRelationshipRecord = {
      ...rec,
      status,
      updatedAt: new Date().toISOString(),
    };

    relationshipOverridesCache.set(key, mergedRecord);
    validRecordsToPersist.push(mergedRecord);
  }

  let tablePersisted = false;
  let tableError: string | undefined;
  let siteSettingsPersisted = false;

  if (supabase) {
    // 1. Attempt writing to public.entity_relationships table
    try {
      const rows = validRecordsToPersist.map((r) => ({
        id: r.id,
        source_type: r.sourceType,
        source_id: r.sourceId,
        target_type: r.targetType,
        target_id: r.targetId,
        relationship_type: r.relationshipType,
        relevance_score: r.relevanceScore,
        confidence: r.confidence,
        status: r.status,
        reasons: r.reasons,
        visual_context: r.visualContext,
        metadata: r.metadata || {},
        updated_at: r.updatedAt,
      }));

      // Batch upsert in chunks of 50
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const { error } = await supabase.from('entity_relationships').upsert(chunk, {
          onConflict: 'source_type,source_id,target_type,target_id,relationship_type',
        });
        if (error) {
          tableError = error.message;
          break;
        }
      }
      if (!tableError) {
        tablePersisted = true;
      }
    } catch (err: any) {
      tableError = err.message;
    }

    // 2. Dual-persistence backup into site_settings.data.entityRelationshipsLedger
    try {
      const { data: currentSite, error: siteErr } = await supabase
        .from('site_settings')
        .select('id, data')
        .limit(1)
        .maybeSingle();

      if (!siteErr && currentSite) {
        const existingData = currentSite.data && typeof currentSite.data === 'object' ? currentSite.data : {};
        const updatedData = {
          ...existingData,
          entityRelationshipsLedger: validRecordsToPersist,
          entityRelationshipsUpdatedAt: new Date().toISOString(),
          entityRelationshipsCount: validRecordsToPersist.length,
        };

        const { error: updateErr } = await supabase
          .from('site_settings')
          .update({
            data: updatedData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentSite.id);

        if (!updateErr) {
          siteSettingsPersisted = true;
        }
      }
    } catch {
      // Best-effort dual persistence
    }
  }

  return {
    persistedCount: validRecordsToPersist.length,
    tablePersisted,
    siteSettingsPersisted,
    tableError,
  };
}

/**
 * Returns all currently loaded relationships in the ledger.
 */
export async function getAllPersistedRelationships(): Promise<EntityRelationshipRecord[]> {
  await loadRelationshipOverrides();
  return Array.from(relationshipOverridesCache.values());
}

/**
 * Resets relationship cache (useful for clean testing/reload).
 */
export function resetRelationshipCache(): void {
  relationshipOverridesCache.clear();
  hasAttemptedDbLoad = false;
}

// ============================================================================
// 7. PUBLIC UNIVERSAL RESOLVERS (CALLED BY PDP, GUIDES, KNOWLEDGE, CATEGORIES)
// ============================================================================

/**
 * Resolves related guides for a given product dynamically and universally.
 */
export async function getRelatedGuidesForProduct(
  product: Product,
  options?: {
    allGuides?: ProductGuide[];
    minScore?: number;
    limit?: number;
    requireApproval?: boolean;
    growthKeywords?: GscKeywordSignal[];
    includeDrafts?: boolean;
  }
): Promise<ProductGuide[]> {
  await loadRelationshipOverrides();
  const guides = options?.allGuides || [];
  const limit = options?.limit ?? 2;
  const minScore = options?.minScore ?? 0.40;

  const scoredGuides: { guide: ProductGuide; score: number }[] = [];

  for (const guide of guides) {
    if (guide.published === false && !options?.includeDrafts) continue;

    // Check for manual admin override first
    const overrideKey = buildOverrideKey('PRODUCT', product.id, 'GUIDE', guide.id || guide.slug, 'PRODUCT_GUIDE');
    const override = relationshipOverridesCache.get(overrideKey);

    if (override) {
      if (isRelationshipPubliclyVisible(override, { requireExplicitApproval: options?.requireApproval, minScore })) {
        scoredGuides.push({ guide, score: override.relevanceScore });
      }
      continue;
    }

    // Deterministic engine scoring
    const evaluation = scoreProductGuideRelationship(product, guide, {
      growthKeywords: options?.growthKeywords,
    });

    const candidateRecord: EntityRelationshipRecord = {
      id: `dyn-pg-${product.id}-${guide.id || guide.slug}`,
      sourceType: 'PRODUCT',
      sourceId: product.id,
      targetType: 'GUIDE',
      targetId: guide.id || guide.slug,
      relationshipType: 'PRODUCT_GUIDE',
      relevanceScore: evaluation.score,
      confidence: evaluation.confidence,
      status: 'suggested',
      reasons: evaluation.reasons,
      visualContext: evaluation.visualContext,
      createdAt: '',
      updatedAt: '',
    };

    if (isRelationshipPubliclyVisible(candidateRecord, { requireExplicitApproval: options?.requireApproval, minScore })) {
      scoredGuides.push({ guide, score: evaluation.score });
    }
  }

  return scoredGuides
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.guide);
}

/**
 * Resolves related products for a given guide dynamically and bidirectionally.
 */
export async function getRelatedProductsForGuide(
  guide: ProductGuide,
  options?: {
    allProducts?: Product[];
    minScore?: number;
    limit?: number;
    requireApproval?: boolean;
    growthKeywords?: GscKeywordSignal[];
  }
): Promise<Product[]> {
  await loadRelationshipOverrides();
  const products = options?.allProducts || [];
  const limit = options?.limit ?? 3;
  const minScore = options?.minScore ?? 0.35;

  const scoredProducts: { product: Product; score: number }[] = [];

  for (const product of products) {
    if (product.isActive === false) continue;

    // Check for manual admin override
    const overrideKey = buildOverrideKey('GUIDE', guide.id || guide.slug, 'PRODUCT', product.id, 'GUIDE_PRODUCT');
    const override = relationshipOverridesCache.get(overrideKey);

    if (override) {
      if (isRelationshipPubliclyVisible(override, { requireExplicitApproval: options?.requireApproval, minScore })) {
        scoredProducts.push({ product, score: override.relevanceScore });
      }
      continue;
    }

    // Deterministic scoring (symmetric evaluation with product-guide)
    const evaluation = scoreProductGuideRelationship(product, guide, {
      growthKeywords: options?.growthKeywords,
    });

    const candidateRecord: EntityRelationshipRecord = {
      id: `dyn-gp-${guide.id || guide.slug}-${product.id}`,
      sourceType: 'GUIDE',
      sourceId: guide.id || guide.slug,
      targetType: 'PRODUCT',
      targetId: product.id,
      relationshipType: 'GUIDE_PRODUCT',
      relevanceScore: evaluation.score,
      confidence: evaluation.confidence,
      status: 'suggested',
      reasons: evaluation.reasons,
      visualContext: evaluation.visualContext,
      createdAt: '',
      updatedAt: '',
    };

    if (isRelationshipPubliclyVisible(candidateRecord, { requireExplicitApproval: options?.requireApproval, minScore })) {
      scoredProducts.push({ product, score: evaluation.score });
    }
  }

  return scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.product);
}

/**
 * Resolves related knowledge entities for a product.
 */
export async function getRelatedKnowledgeForProduct(
  product: Product,
  options?: {
    minScore?: number;
    limit?: number;
    requireApproval?: boolean;
  }
): Promise<CanonicalEntityRecord[]> {
  await loadRelationshipOverrides();
  const limit = options?.limit ?? 2;
  const minScore = options?.minScore ?? 0.40;

  const allEntities = Object.values(CANONICAL_ENTITY_REGISTRY).filter((e) => e.status === 'KNOWN');
  const scoredEntities: { entity: CanonicalEntityRecord; score: number }[] = [];

  for (const ent of allEntities) {
    const overrideKey = buildOverrideKey('PRODUCT', product.id, 'KNOWLEDGE', ent.entityKey, 'PRODUCT_KNOWLEDGE');
    const override = relationshipOverridesCache.get(overrideKey);

    if (override) {
      if (isRelationshipPubliclyVisible(override, { requireExplicitApproval: options?.requireApproval, minScore })) {
        scoredEntities.push({ entity: ent, score: override.relevanceScore });
      }
      continue;
    }

    const evaluation = scoreProductKnowledgeRelationship(product, ent);
    const candidateRecord: EntityRelationshipRecord = {
      id: `dyn-pk-${product.id}-${ent.entityKey}`,
      sourceType: 'PRODUCT',
      sourceId: product.id,
      targetType: 'KNOWLEDGE',
      targetId: ent.entityKey,
      relationshipType: 'PRODUCT_KNOWLEDGE',
      relevanceScore: evaluation.score,
      confidence: evaluation.confidence,
      status: 'suggested',
      reasons: evaluation.reasons,
      visualContext: evaluation.visualContext,
      createdAt: '',
      updatedAt: '',
    };

    if (isRelationshipPubliclyVisible(candidateRecord, { requireExplicitApproval: options?.requireApproval, minScore })) {
      scoredEntities.push({ entity: ent, score: evaluation.score });
    }
  }

  return scoredEntities
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entity);
}

/**
 * Resolves related knowledge entities for a guide.
 */
export async function getRelatedKnowledgeForGuide(
  guide: ProductGuide,
  options?: {
    minScore?: number;
    limit?: number;
    requireApproval?: boolean;
  }
): Promise<CanonicalEntityRecord[]> {
  await loadRelationshipOverrides();
  const limit = options?.limit ?? 2;
  const minScore = options?.minScore ?? 0.40;

  const allEntities = Object.values(CANONICAL_ENTITY_REGISTRY).filter((e) => e.status === 'KNOWN');
  const scoredEntities: { entity: CanonicalEntityRecord; score: number }[] = [];

  for (const ent of allEntities) {
    const overrideKey = buildOverrideKey('GUIDE', guide.id || guide.slug, 'KNOWLEDGE', ent.entityKey, 'GUIDE_KNOWLEDGE');
    const override = relationshipOverridesCache.get(overrideKey);

    if (override) {
      if (isRelationshipPubliclyVisible(override, { requireExplicitApproval: options?.requireApproval, minScore })) {
        scoredEntities.push({ entity: ent, score: override.relevanceScore });
      }
      continue;
    }

    const evaluation = scoreGuideKnowledgeRelationship(guide, ent);
    const candidateRecord: EntityRelationshipRecord = {
      id: `dyn-gk-${guide.id || guide.slug}-${ent.entityKey}`,
      sourceType: 'GUIDE',
      sourceId: guide.id || guide.slug,
      targetType: 'KNOWLEDGE',
      targetId: ent.entityKey,
      relationshipType: 'GUIDE_KNOWLEDGE',
      relevanceScore: evaluation.score,
      confidence: evaluation.confidence,
      status: 'suggested',
      reasons: evaluation.reasons,
      visualContext: evaluation.visualContext,
      createdAt: '',
      updatedAt: '',
    };

    if (isRelationshipPubliclyVisible(candidateRecord, { requireExplicitApproval: options?.requireApproval, minScore })) {
      scoredEntities.push({ entity: ent, score: evaluation.score });
    }
  }

  return scoredEntities
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.entity);
}

// ============================================================================
// 8. OMNICHANNEL & FUTURE PLATFORM ADAPTER HOOK
// ============================================================================

/**
 * Produces unified context for future Google Business Profile, Instagram,
 * and Facebook platform adapters without duplicating entity or keyword logic.
 */
export async function getOmnichannelContextForEntity(
  entityType: EntityType,
  entity: Product | ProductGuide | CanonicalEntityRecord | Category
): Promise<{
  entityType: EntityType;
  visualContext: VisualContext;
  approvedKeywords: string[];
  socialCopyHooks: {
    headline: string;
    caption: string;
    hashtags: string[];
  };
}> {
  const visualContext = generateVisualContext({ entityType, entity });
  const approvedKeywords = visualContext.entityKeywords;

  let headline = visualContext.topic;
  let caption = `Discover authentic Rajasthani botanicals directly from Sojat. ${visualContext.approvedFacts.join('. ')}.`;
  const hashtags = [
    '#MuskyDose',
    '#SojatHenna',
    '#PureBotanicals',
    ...approvedKeywords.slice(0, 4).map((k) => `#${k.replace(/[\s-]/g, '')}`),
  ];

  return {
    entityType,
    visualContext,
    approvedKeywords,
    socialCopyHooks: {
      headline,
      caption,
      hashtags,
    },
  };
}
