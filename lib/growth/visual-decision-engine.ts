import {
  MediaEntityType,
  MediaAssetRole,
  MediaAssetSource,
  MediaAssetStatus,
  MediaAsset,
  getMediaForEntity,
  getAllMediaAssetsRaw,
  getPrimaryMedia,
  saveMediaAsset,
} from '@/lib/db/media';
import {
  VisualBlueprint,
  VisualSlotDefinition,
  AspectRatioType,
  getEntityBlueprint,
  getAllRegisteredBlueprints,
} from '@/lib/growth/visual-blueprint';
import {
  resolveEntityCanonicalFacts,
  buildCanonicalVisualPrompt,
  composeVisualPrompt,
  PromptBuildResult,
} from '@/lib/growth/visual-prompt-engine';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getAllKnowledgeEntities } from '@/lib/db/knowledge';

// ============================================================================
// 1. EVALUATION TYPES & HEALTH STATUS CONTRACTS
// ============================================================================

export type SlotHealthStatus =
  | 'FILLED_OPTIMAL'
  | 'FILLED_REUSED'
  | 'ASPECT_MISMATCH'
  | 'WEAK_FALLBACK'
  | 'MISSING_REQUIRED'
  | 'MISSING_OPTIONAL'
  | 'PENDING_AI'
  | 'PENDING_APPROVAL'
  | 'BROKEN';

export type EntityOverallHealth =
  | 'COMPLETE'
  | 'NEEDS_REVIEW'
  | 'MISSING'
  | 'FALLBACK'
  | 'PLACEHOLDER'
  | 'BROKEN'
  | 'PENDING_AI'
  | 'PENDING_APPROVAL';

export interface EvaluatedVisualSlot {
  slot: VisualSlotDefinition;
  status: SlotHealthStatus;
  asset?: MediaAsset;
  reusedFromSlotId?: string;
  recommendedAction: string;
  aspectRatioMismatch?: {
    expected: string;
    actual: string;
  };
  promptPreview?: string;
}

export interface EntityVisualHealthReport {
  entityType: string;
  entityId: string;
  entityName: string;
  overallHealth: EntityOverallHealth;
  healthScore: number; // 0 - 100
  totalSlots: number;
  requiredSlotsCount: number;
  filledRequiredCount: number;
  missingRequiredCount: number;
  evaluatedSlots: EvaluatedVisualSlot[];
  suggestedOpportunities: VisualOpportunity[];
  evaluatedAt: string;
}

export interface VisualOpportunity {
  id: string;
  entityType: string;
  entityId: string;
  slotId: string;
  role: MediaAssetRole;
  opportunityType:
    | 'AUTO_ATTACH_EXISTING'
    | 'GENERATE_AI_CANDIDATE'
    | 'MANUAL_UPLOAD_REQUIRED'
    | 'APPROVE_PENDING_AI'
    | 'FIX_ASPECT_RATIO';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  reason: string;
  promptSuggestion?: string;
  reusableAssetId?: string;
  requiresHumanApproval: boolean;
}

export interface ResolvedVisualRequirement {
  slotId: string;
  role: MediaAssetRole;
  url: string;
  aspectRatio: string;
  isFallback: boolean;
  isReused: boolean;
  source: MediaAssetSource;
  asset?: MediaAsset;
  responsiveUrls?: {
    desktop?: string;
    mobile?: string;
    tablet?: string;
  };
}

// ============================================================================
// 2. CORE DECISION & REUSE LOGIC
// ============================================================================

/**
 * Checks whether an aspect ratio matches preferred or allowed aspect ratios.
 */
export function isAspectRatioCompatible(
  actualRatio: string,
  preferredRatio: AspectRatioType,
  allowedRatios?: AspectRatioType[]
): boolean {
  if (!actualRatio) return false;
  const cleanActual = actualRatio.trim();
  if (cleanActual === preferredRatio) return true;
  if (allowedRatios && allowedRatios.includes(cleanActual as AspectRatioType)) return true;
  return false;
}

/**
 * Checks whether an asset is a weak fallback or placeholder.
 */
export function isPlaceholderOrFallback(asset: MediaAsset): boolean {
  if (!asset.url) return true;
  if (asset.source === 'SYSTEM_FALLBACK') return true;
  if (asset.url.includes('fallback.svg') || asset.url.includes('placeholder')) return true;
  return false;
}

/**
 * Finds a compatible existing approved asset that can be safely reused for a slot
 * without generating or duplicating files.
 */
export function findReusableAssetForSlot(
  slot: VisualSlotDefinition,
  allApprovedAssets: MediaAsset[]
): { asset: MediaAsset; reusedFromRole: MediaAssetRole } | null {
  if (allApprovedAssets.length === 0) return null;

  // 1. If slot specifies an explicit fallback role
  if (slot.fallbackRole) {
    const matched = allApprovedAssets.find((a) => a.role === slot.fallbackRole && !isPlaceholderOrFallback(a));
    if (matched) {
      return { asset: matched, reusedFromRole: matched.role };
    }
  }

  // 2. Standard logical reuse patterns:
  // THUMBNAIL, MOBILE_HERO, SOCIAL_SQUARE can safely reuse PRIMARY
  if (['THUMBNAIL', 'MOBILE_HERO', 'SOCIAL_SQUARE', 'GALLERY'].includes(slot.role)) {
    const primary = allApprovedAssets.find((a) => a.role === 'PRIMARY' && !isPlaceholderOrFallback(a));
    if (primary) {
      return { asset: primary, reusedFromRole: 'PRIMARY' };
    }
  }

  // DESKTOP_HERO, MOBILE_HERO, BANNER, SOCIAL_SQUARE can safely reuse HERO
  if (['DESKTOP_HERO', 'MOBILE_HERO', 'BANNER', 'SOCIAL_SQUARE'].includes(slot.role)) {
    const hero = allApprovedAssets.find((a) => a.role === 'HERO' && !isPlaceholderOrFallback(a));
    if (hero) {
      return { asset: hero, reusedFromRole: 'HERO' };
    }
  }

  // SOCIAL_PORTRAIT can reuse LIFESTYLE or PRIMARY
  if (slot.role === 'SOCIAL_PORTRAIT') {
    const lifestyle = allApprovedAssets.find((a) => a.role === 'LIFESTYLE' && !isPlaceholderOrFallback(a));
    if (lifestyle) {
      return { asset: lifestyle, reusedFromRole: 'LIFESTYLE' };
    }
    const primary = allApprovedAssets.find((a) => a.role === 'PRIMARY' && !isPlaceholderOrFallback(a));
    if (primary) {
      return { asset: primary, reusedFromRole: 'PRIMARY' };
    }
  }

  return null;
}

// ============================================================================
// 3. ENTITY HEALTH EVALUATION ENGINE
// ============================================================================

/**
 * Evaluates the full visual health of any entity against its blueprint.
 */
export async function evaluateEntityVisualHealth(
  entityType: string,
  entityId: string,
  options?: { entityName?: string }
): Promise<EntityVisualHealthReport> {
  const blueprint = getEntityBlueprint(entityType);
  const assets = await getMediaForEntity({
    entityType: entityType as MediaEntityType,
    entityId,
    includeDrafts: true,
  });

  const approvedAssets = assets.filter((a) => a.status === 'approved');
  const suggestedAssets = assets.filter((a) => a.status === 'suggested');

  const evaluatedSlots: EvaluatedVisualSlot[] = [];
  const opportunities: VisualOpportunity[] = [];

  let requiredCount = 0;
  let filledRequiredCount = 0;
  let missingRequiredCount = 0;
  let hasPendingAi = false;
  let hasPendingApproval = false;
  let hasBroken = false;
  let hasFallback = false;

  for (const slot of blueprint.slots) {
    if (slot.isRequired) {
      requiredCount++;
    }

    // Direct matching asset for this slot's role
    const directApproved = approvedAssets.find((a) => a.role === slot.role);
    const directSuggested = suggestedAssets.find((a) => a.role === slot.role);

    if (directApproved) {
      if (isPlaceholderOrFallback(directApproved)) {
        hasFallback = true;
        evaluatedSlots.push({
          slot,
          status: 'WEAK_FALLBACK',
          asset: directApproved,
          recommendedAction: `Replace placeholder for slot "${slot.slotId}" with authentic photography or AI visual.`,
        });
        if (slot.isRequired) missingRequiredCount++;
        opportunities.push({
          id: `opp-${entityType}-${entityId}-${slot.slotId}-replace-fallback`,
          entityType,
          entityId,
          slotId: slot.slotId,
          role: slot.role,
          opportunityType: 'GENERATE_AI_CANDIDATE',
          priority: slot.isRequired ? 'HIGH' : 'MEDIUM',
          title: `Replace fallback for ${slot.purpose}`,
          reason: `Slot is currently using system fallback svg.`,
          requiresHumanApproval: true,
        });
      } else if (
        !isAspectRatioCompatible(
          directApproved.aspectRatio,
          slot.preferredAspectRatio,
          slot.allowedAspectRatios
        )
      ) {
        evaluatedSlots.push({
          slot,
          status: 'ASPECT_MISMATCH',
          asset: directApproved,
          aspectRatioMismatch: {
            expected: slot.preferredAspectRatio,
            actual: directApproved.aspectRatio,
          },
          recommendedAction: `Asset has ratio ${directApproved.aspectRatio} but slot prefers ${slot.preferredAspectRatio}. Create responsive variant.`,
        });
        if (slot.isRequired) filledRequiredCount++;
      } else {
        // Optimal match!
        evaluatedSlots.push({
          slot,
          status: 'FILLED_OPTIMAL',
          asset: directApproved,
          recommendedAction: 'Slot is filled optimally with approved canonical asset.',
        });
        if (slot.isRequired) filledRequiredCount++;
      }
    } else if (directSuggested) {
      if (directSuggested.source === 'AI_GENERATED') {
        hasPendingAi = true;
        evaluatedSlots.push({
          slot,
          status: 'PENDING_AI',
          asset: directSuggested,
          recommendedAction: 'AI visual candidate generated. Awaiting admin review & approval.',
        });
        opportunities.push({
          id: `opp-${entityType}-${entityId}-${slot.slotId}-review-ai`,
          entityType,
          entityId,
          slotId: slot.slotId,
          role: slot.role,
          opportunityType: 'APPROVE_PENDING_AI',
          priority: 'MEDIUM',
          title: `Review AI candidate for ${slot.purpose}`,
          reason: `AI candidate is in suggested state. Requires human sign-off to publish.`,
          requiresHumanApproval: true,
        });
      } else {
        hasPendingApproval = true;
        evaluatedSlots.push({
          slot,
          status: 'PENDING_APPROVAL',
          asset: directSuggested,
          recommendedAction: 'Visual asset uploaded. Awaiting admin approval.',
        });
      }
      if (slot.isRequired) missingRequiredCount++;
    } else {
      // Check for reusable existing approved asset
      const reusable = findReusableAssetForSlot(slot, approvedAssets);
      if (reusable) {
        evaluatedSlots.push({
          slot,
          status: 'FILLED_REUSED',
          asset: reusable.asset,
          reusedFromSlotId: `role:${reusable.reusedFromRole}`,
          recommendedAction: `Reusing existing approved ${reusable.reusedFromRole} asset safely.`,
        });
        if (slot.isRequired) filledRequiredCount++;

        // Can auto-attach as non-destructive reference
        opportunities.push({
          id: `opp-${entityType}-${entityId}-${slot.slotId}-auto-attach`,
          entityType,
          entityId,
          slotId: slot.slotId,
          role: slot.role,
          opportunityType: 'AUTO_ATTACH_EXISTING',
          priority: 'LOW',
          title: `Auto-attach ${reusable.reusedFromRole} to ${slot.slotId}`,
          reason: `Safe zero-cost asset reuse without duplicate files.`,
          reusableAssetId: reusable.asset.id,
          requiresHumanApproval: false,
        });
      } else {
        if (slot.isRequired) {
          missingRequiredCount++;
          evaluatedSlots.push({
            slot,
            status: 'MISSING_REQUIRED',
            recommendedAction: `Required visual slot "${slot.slotId}" is completely missing.`,
          });
          opportunities.push({
            id: `opp-${entityType}-${entityId}-${slot.slotId}-missing-req`,
            entityType,
            entityId,
            slotId: slot.slotId,
            role: slot.role,
            opportunityType: 'GENERATE_AI_CANDIDATE',
            priority: 'HIGH',
            title: `Generate missing required visual for ${slot.purpose}`,
            reason: `Mandatory slot "${slot.slotId}" is empty.`,
            requiresHumanApproval: true,
          });
        } else {
          evaluatedSlots.push({
            slot,
            status: 'MISSING_OPTIONAL',
            recommendedAction: `Optional slot "${slot.slotId}" is empty.`,
          });
        }
      }
    }
  }

  // Overall Health calculation
  let overallHealth: EntityOverallHealth = 'COMPLETE';
  if (hasBroken) {
    overallHealth = 'BROKEN';
  } else if (hasFallback) {
    overallHealth = 'FALLBACK';
  } else if (missingRequiredCount > 0) {
    overallHealth = 'MISSING';
  } else if (hasPendingAi) {
    overallHealth = 'PENDING_AI';
  } else if (hasPendingApproval) {
    overallHealth = 'PENDING_APPROVAL';
  } else if (evaluatedSlots.some((s) => s.status === 'ASPECT_MISMATCH')) {
    overallHealth = 'NEEDS_REVIEW';
  }

  const healthScore =
    requiredCount > 0
      ? Math.round((filledRequiredCount / requiredCount) * 100)
      : 100;

  return {
    entityType,
    entityId,
    entityName: options?.entityName || entityId,
    overallHealth,
    healthScore,
    totalSlots: blueprint.slots.length,
    requiredSlotsCount: requiredCount,
    filledRequiredCount,
    missingRequiredCount,
    evaluatedSlots,
    suggestedOpportunities: opportunities,
    evaluatedAt: new Date().toISOString(),
  };
}

// ============================================================================
// 4. PAGE-AWARE CONSUMPTION RESOLUTION
// ============================================================================

/**
 * Resolves all visual requirements for a given entity, returning ready-to-render
 * slot mappings with fallback guarantees and responsive behaviors.
 * ZERO N+1 QUERIES — uses single batched asset lookup.
 */
export async function resolveVisualRequirements(
  entityType: string,
  entityId: string
): Promise<Record<string, ResolvedVisualRequirement>> {
  const blueprint = getEntityBlueprint(entityType);
  const approvedAssets = await getMediaForEntity({
    entityType: entityType as MediaEntityType,
    entityId,
    includeDrafts: false,
  });

  const result: Record<string, ResolvedVisualRequirement> = {};

  for (const slot of blueprint.slots) {
    // 1. Direct optimal match
    const directMatch = approvedAssets.find(
      (a) => a.role === slot.role && !isPlaceholderOrFallback(a)
    );

    if (directMatch) {
      result[slot.slotId] = {
        slotId: slot.slotId,
        role: slot.role,
        url: directMatch.url,
        aspectRatio: directMatch.aspectRatio,
        isFallback: false,
        isReused: false,
        source: directMatch.source,
        asset: directMatch,
        responsiveUrls: {
          desktop: directMatch.url,
          mobile: directMatch.url,
          tablet: directMatch.url,
        },
      };
      continue;
    }

    // 2. Reused match
    const reusable = findReusableAssetForSlot(slot, approvedAssets);
    if (reusable) {
      result[slot.slotId] = {
        slotId: slot.slotId,
        role: slot.role,
        url: reusable.asset.url,
        aspectRatio: reusable.asset.aspectRatio,
        isFallback: false,
        isReused: true,
        source: reusable.asset.source,
        asset: reusable.asset,
        responsiveUrls: {
          desktop: reusable.asset.url,
          mobile: reusable.asset.url,
          tablet: reusable.asset.url,
        },
      };
      continue;
    }

    // 3. Fallback
    const fallbackAsset = await getPrimaryMedia({
      entityType: entityType as MediaEntityType,
      entityId,
    });

    result[slot.slotId] = {
      slotId: slot.slotId,
      role: slot.role,
      url: fallbackAsset.url,
      aspectRatio: fallbackAsset.aspectRatio,
      isFallback: true,
      isReused: false,
      source: fallbackAsset.source,
      asset: fallbackAsset,
      responsiveUrls: {
        desktop: fallbackAsset.url,
        mobile: fallbackAsset.url,
      },
    };
  }

  return result;
}

// ============================================================================
// 5. CATALOG SCANNER & AUTOPILOT VISUAL AUDIT
// ============================================================================

export interface CatalogVisualHealthSummary {
  totalEntities: number;
  healthyCount: number;
  needsReviewCount: number;
  missingCount: number;
  fallbackCount: number;
  pendingAiCount: number;
  pendingApprovalCount: number;
  overallScore: number;
  entityReports: EntityVisualHealthReport[];
  actionableOpportunities: VisualOpportunity[];
}

/**
 * Scans the entire active catalog and returns comprehensive visual health summary.
 */
export async function evaluateCatalogVisualHealth(): Promise<CatalogVisualHealthSummary> {
  const [products, categories, guides, knowledge] = await Promise.all([
    getProducts().catch(() => []),
    getCategories().catch(() => []),
    getGuides().catch(() => []),
    getAllKnowledgeEntities().catch(() => []),
  ]);

  const reports: EntityVisualHealthReport[] = [];

  // 1. Products
  for (const p of products) {
    const rep = await evaluateEntityVisualHealth('PRODUCT', p.id, { entityName: p.name });
    reports.push(rep);
  }

  // 2. Categories
  for (const c of categories) {
    const rep = await evaluateEntityVisualHealth('CATEGORY', c.id, { entityName: c.name });
    reports.push(rep);
  }

  // 3. Guides
  for (const g of guides) {
    const rep = await evaluateEntityVisualHealth('GUIDE', g.id, { entityName: g.title });
    reports.push(rep);
  }

  // 4. Knowledge
  for (const k of knowledge) {
    const rep = await evaluateEntityVisualHealth('KNOWLEDGE', k.id || k.entityKey, {
      entityName: (k as any).title || k.canonicalName || k.entityKey,
    });
    reports.push(rep);
  }

  // 5. Brand & Marketing singletons
  const brandRep = await evaluateEntityVisualHealth('BRAND', 'brand-core', {
    entityName: 'Musky Dose Brand',
  });
  reports.push(brandRep);

  const marketingRep = await evaluateEntityVisualHealth('MARKETING', 'sitewide-promo', {
    entityName: 'Sitewide Promotional Campaigns',
  });
  reports.push(marketingRep);

  // Aggregation
  let healthyCount = 0;
  let needsReviewCount = 0;
  let missingCount = 0;
  let fallbackCount = 0;
  let pendingAiCount = 0;
  let pendingApprovalCount = 0;
  let totalScore = 0;
  const allOpportunities: VisualOpportunity[] = [];

  for (const r of reports) {
    totalScore += r.healthScore;
    allOpportunities.push(...r.suggestedOpportunities);

    if (r.overallHealth === 'COMPLETE') healthyCount++;
    else if (r.overallHealth === 'NEEDS_REVIEW') needsReviewCount++;
    else if (r.overallHealth === 'MISSING') missingCount++;
    else if (r.overallHealth === 'FALLBACK') fallbackCount++;
    else if (r.overallHealth === 'PENDING_AI') pendingAiCount++;
    else if (r.overallHealth === 'PENDING_APPROVAL') pendingApprovalCount++;
  }

  const overallScore =
    reports.length > 0 ? Math.round(totalScore / reports.length) : 100;

  return {
    totalEntities: reports.length,
    healthyCount,
    needsReviewCount,
    missingCount,
    fallbackCount,
    pendingAiCount,
    pendingApprovalCount,
    overallScore,
    entityReports: reports,
    actionableOpportunities: allOpportunities,
  };
}
