import { MediaAsset, MediaEntityType, MediaAssetRole, isSafeInternalMediaUrl } from '@/lib/db/media';
import { STANDARD_MEDIA_SPECS, SlotSpecification, checkAspectRatioMatch, PROTECTED_OFFICIAL_BRAND_ASSETS } from './media-specs';
import { Product, Category, ProductGuide } from '@/lib/types';
import { KnowledgeEntity } from '@/lib/db/knowledge';

export type SlotRequirementStatus = 'MISSING' | 'READY' | 'LIVE' | 'NEEDS_REVIEW' | 'INVALID';

export interface MediaSlotRequirement {
  entityType: MediaEntityType;
  entityId: string;
  entityName: string;
  entitySlug?: string;
  page: string;
  section: string;
  slotKey: string;
  role: MediaAssetRole;
  purpose: string;
  exactRoute: string;
  exactConsumer: string;
  isRequired: boolean;
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  aspectRatio: string;
  preferredFormat: string;
  maxFileSizeBytes: number;
  deviceTarget: 'DESKTOP' | 'MOBILE' | 'UNIVERSAL';
  status: SlotRequirementStatus;
  currentAssetId?: string;
  currentAssetUrl?: string;
  isLivePublic: boolean;
  hasLegacyOrInvalidAsset?: boolean;
  whatToCreate: string;
  why: string;
  whereUsed: string;
  visualDirection: string;
  safeAreaGuide: string;
  validationIssues?: string[];
}

export interface EntityMediaHealth {
  entityType: MediaEntityType;
  entityId: string;
  entityName: string;
  entitySlug?: string;
  totalSlots: number;
  requiredSlots: number;
  filledSlots: number;
  missingRequiredSlots: number;
  invalidSlots: number;
  liveSlots: number;
  healthScorePercent: number;
  healthGrade: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL';
  slots: MediaSlotRequirement[];
}

export interface SiteMediaRequirementsSummary {
  totalEntities: number;
  totalRequirements: number;
  totalRequired: number;
  totalOptional: number;
  liveCount: number;
  readyCount: number;
  missingCount: number;
  needsReviewCount: number;
  invalidCount: number;
  overallHealthScore: number;
  entities: EntityMediaHealth[];
}

/**
 * Strict validator for canonical assigned media assets.
 * Only a VERIFIED, APPROVED, CURRENT CANONICAL media_assets record may appear as an assigned/live asset.
 * NEVER allows Unsplash, external URLs, fallback.svg, archived media, rejected media, test/mock media.
 */
export function isCanonicalApprovedMediaAsset(asset: MediaAsset | undefined | null): boolean {
  if (!asset) return false;
  // Status must strictly be 'approved'
  if (asset.status !== 'approved') return false;
  // URL must be a non-empty string
  if (!asset.url || typeof asset.url !== 'string') return false;
  const cleanUrl = asset.url.trim();
  // NEVER fallback.svg (fallback.svg is a UI placeholder, NEVER an assigned media asset)
  if (cleanUrl.includes('fallback.svg') || cleanUrl.includes('/fallback')) return false;
  // NEVER unsplash
  if (cleanUrl.includes('unsplash.com')) return false;
  // NEVER test/mock CDN
  if (cleanUrl.includes('cdn.muskydose.in')) return false;
  // Must satisfy canonical safe internal / Supabase URL
  if (!isSafeInternalMediaUrl(cleanUrl)) return false;
  return true;
}

/**
 * Universal Media Requirement Engine
 * Automatically derives all media requirements for any entity using canonical specs.
 */
export function buildEntityRequirements(
  entityType: MediaEntityType,
  entityId: string,
  entityName: string,
  entitySlug: string,
  assignedAssets: MediaAsset[] = []
): EntityMediaHealth {
  const normType = entityType.toUpperCase().trim() as MediaEntityType;
  const cleanId = String(entityId || '').trim();
  const cleanSlug = String(entitySlug || '').trim();

  const slotDefs = getSlotDefinitionsForEntityType(normType);
  const requirements: MediaSlotRequirement[] = [];

  let requiredCount = 0;
  let filledCount = 0;
  let missingRequiredCount = 0;
  let invalidCount = 0;
  let liveCount = 0;

  for (const def of slotDefs) {
    if (def.isRequired) requiredCount++;

    // 1. Find verified, approved canonical media asset for this role/slot
    const approvedAsset = assignedAssets.find((a) => {
      if (a.entityType !== normType || String(a.entityId) !== cleanId) return false;
      if (a.role !== def.role) return false;
      return isCanonicalApprovedMediaAsset(a);
    });

    // 2. Detect if there is any historical/legacy/archived/invalid asset for this role
    const hadLegacyOrInvalid = !approvedAsset && assignedAssets.some((a) => {
      if (a.entityType !== normType || String(a.entityId) !== cleanId) return false;
      if (a.role !== def.role) return false;
      return !isCanonicalApprovedMediaAsset(a);
    });

    let status: SlotRequirementStatus = 'MISSING';
    let isLivePublic = false;
    let currentAssetId: string | undefined = undefined;
    let currentAssetUrl: string | undefined = undefined;
    const issues: string[] = [];

    if (approvedAsset) {
      currentAssetId = approvedAsset.id;
      currentAssetUrl = approvedAsset.url;

      // Check dimensions and aspect ratio
      if (approvedAsset.width && approvedAsset.height) {
        if (approvedAsset.width < def.minWidth || approvedAsset.height < def.minHeight) {
          issues.push(`Dimensions (${approvedAsset.width}×${approvedAsset.height}) are below required minimum of ${def.minWidth}×${def.minHeight}.`);
          status = 'NEEDS_REVIEW';
          invalidCount++;
          filledCount++;
        } else {
          const ratioCheck = checkAspectRatioMatch(approvedAsset.width, approvedAsset.height, def.aspectRatio as any);
          if (!ratioCheck.isMatch) {
            issues.push(`Aspect ratio ${approvedAsset.aspectRatio} differs from required ${def.aspectRatio} by ${ratioCheck.diffPercent}%.`);
            status = 'NEEDS_REVIEW';
            invalidCount++;
            filledCount++;
          }
        }
      }

      if (issues.length === 0) {
        status = 'LIVE';
        isLivePublic = true;
        liveCount++;
        filledCount++;
      }
    } else {
      // Strictly MISSING when no approved canonical asset exists
      status = 'MISSING';
      if (def.isRequired) {
        missingRequiredCount++;
      }

      if (hadLegacyOrInvalid) {
        issues.push('MEDIA REQUIRED — REPLACE OLD ASSET');
      }
    }

    const routeInfo = deriveExactConsumerRoute(normType, cleanSlug, def.role);

    requirements.push({
      entityType: normType,
      entityId: cleanId,
      entityName,
      entitySlug: cleanSlug,
      page: routeInfo.page,
      section: routeInfo.section,
      slotKey: def.slotKey,
      role: def.role as MediaAssetRole,
      purpose: def.purpose,
      exactRoute: routeInfo.route,
      exactConsumer: routeInfo.consumer,
      isRequired: def.isRequired,
      recommendedWidth: def.recommendedWidth,
      recommendedHeight: def.recommendedHeight,
      minWidth: def.minWidth,
      minHeight: def.minHeight,
      aspectRatio: def.aspectRatio,
      preferredFormat: def.allowedMimeTypes.join(', '),
      maxFileSizeBytes: def.maxFileSizeBytes,
      deviceTarget: def.deviceTarget,
      status,
      currentAssetId,
      currentAssetUrl,
      isLivePublic,
      hasLegacyOrInvalidAsset: hadLegacyOrInvalid,
      whatToCreate: `Create a ${def.supportedMediaTypes.join('/')} asset with exact ${def.aspectRatio} ratio (${def.recommendedWidth}×${def.recommendedHeight}px recommended, min ${def.minWidth}×${def.minHeight}px).`,
      why: def.purpose,
      whereUsed: `${routeInfo.page} (${routeInfo.section})`,
      visualDirection: def.visualDirection,
      safeAreaGuide: def.safeAreaGuide || 'Ensure primary subject is centered with 10% clear padding.',
      validationIssues: issues.length > 0 ? issues : undefined,
    });
  }

  const totalSlots = slotDefs.length;
  const healthScore = totalSlots > 0 ? Math.round(((liveCount * 1.5 + (filledCount - liveCount)) / (requiredCount * 1.5 + (totalSlots - requiredCount))) * 100) : 0;
  const clampedHealth = Math.min(100, Math.max(0, healthScore));

  let healthGrade: 'OPTIMAL' | 'GOOD' | 'NEEDS_ATTENTION' | 'CRITICAL' = 'OPTIMAL';
  if (missingRequiredCount > 0 || clampedHealth < 40) {
    healthGrade = 'CRITICAL';
  } else if (clampedHealth < 75) {
    healthGrade = 'NEEDS_ATTENTION';
  } else if (clampedHealth < 95) {
    healthGrade = 'GOOD';
  }

  return {
    entityType: normType,
    entityId: cleanId,
    entityName,
    entitySlug: cleanSlug,
    totalSlots,
    requiredSlots: requiredCount,
    filledSlots: filledCount,
    missingRequiredSlots: missingRequiredCount,
    invalidSlots: invalidCount,
    liveSlots: liveCount,
    healthScorePercent: clampedHealth,
    healthGrade,
    slots: requirements,
  };
}

/**
 * Maps entity type to its standard slot specification definitions
 */
function getSlotDefinitionsForEntityType(entityType: MediaEntityType): SlotSpecification[] {
  switch (entityType) {
    case 'PRODUCT':
      return [
        STANDARD_MEDIA_SPECS.PRODUCT_PRIMARY,
        STANDARD_MEDIA_SPECS.PRODUCT_GALLERY,
        STANDARD_MEDIA_SPECS.PRODUCT_PACKAGING,
        STANDARD_MEDIA_SPECS.PRODUCT_LIFESTYLE,
        STANDARD_MEDIA_SPECS.PRODUCT_DETAIL,
        STANDARD_MEDIA_SPECS.PRODUCT_USAGE,
        STANDARD_MEDIA_SPECS.PRODUCT_INGREDIENTS,
        STANDARD_MEDIA_SPECS.PRODUCT_MOBILE,
        STANDARD_MEDIA_SPECS.SOCIAL_SQUARE,
        STANDARD_MEDIA_SPECS.SOCIAL_PORTRAIT,
      ];
    case 'CATEGORY':
      return [
        STANDARD_MEDIA_SPECS.CATEGORY_HERO,
        STANDARD_MEDIA_SPECS.CATEGORY_COLLECTION,
        STANDARD_MEDIA_SPECS.CATEGORY_MOBILE,
        STANDARD_MEDIA_SPECS.SOCIAL_SQUARE,
      ];
    case 'GUIDE':
      return [
        STANDARD_MEDIA_SPECS.GUIDE_HERO,
        STANDARD_MEDIA_SPECS.GUIDE_PROCESS,
        STANDARD_MEDIA_SPECS.GUIDE_INFOGRAPHIC,
        STANDARD_MEDIA_SPECS.SOCIAL_SQUARE,
      ];
    case 'KNOWLEDGE':
      return [
        STANDARD_MEDIA_SPECS.KNOWLEDGE_HERO,
        STANDARD_MEDIA_SPECS.KNOWLEDGE_BOTANICAL,
        STANDARD_MEDIA_SPECS.KNOWLEDGE_INFOGRAPHIC,
        STANDARD_MEDIA_SPECS.SOCIAL_SQUARE,
      ];
    case 'BRAND':
      return [
        STANDARD_MEDIA_SPECS.BRAND_HERO,
        STANDARD_MEDIA_SPECS.BRAND_ICON,
        STANDARD_MEDIA_SPECS.BRAND_STORY,
        STANDARD_MEDIA_SPECS.BRAND_PROCESS,
        STANDARD_MEDIA_SPECS.OPENGRAPH_META,
      ];
    case 'MARKETING':
      return [
        STANDARD_MEDIA_SPECS.BRAND_HERO,
        STANDARD_MEDIA_SPECS.OPENGRAPH_META,
        STANDARD_MEDIA_SPECS.SOCIAL_SQUARE,
        STANDARD_MEDIA_SPECS.SOCIAL_PORTRAIT,
      ];
    default:
      // Future custom entity fallback
      return [
        STANDARD_MEDIA_SPECS.PRODUCT_PRIMARY,
        STANDARD_MEDIA_SPECS.CATEGORY_HERO,
        STANDARD_MEDIA_SPECS.SOCIAL_SQUARE,
      ];
  }
}

/**
 * Derives the exact consumer component, route, and section from actual code structure
 */
function deriveExactConsumerRoute(
  entityType: MediaEntityType,
  slug: string,
  role: string
): { page: string; route: string; section: string; consumer: string } {
  switch (entityType) {
    case 'PRODUCT':
      if (role === 'PRIMARY') {
        return {
          page: `/products/${slug}`,
          route: `/products/${slug}`,
          section: 'Product Card & Primary PDP Viewport',
          consumer: 'ProductCard.tsx, ProductGallery.tsx, /products/[slug]/page.tsx',
        };
      }
      if (role === 'GALLERY') {
        return {
          page: `/products/${slug}`,
          route: `/products/${slug}`,
          section: 'PDP Multi-Angle Carousel',
          consumer: 'ProductGallery.tsx',
        };
      }
      if (role === 'MOBILE_HERO') {
        return {
          page: `/products/${slug}`,
          route: `/products/${slug}`,
          section: 'Mobile Handheld Viewport',
          consumer: 'ProductGallery.tsx (Mobile breakpoint)',
        };
      }
      return {
        page: `/products/${slug}`,
        route: `/products/${slug}`,
        section: `PDP ${role} Section`,
        consumer: 'ProductDetail.tsx',
      };

    case 'CATEGORY':
      return {
        page: `/categories/${slug}`,
        route: `/categories/${slug}`,
        section: role === 'HERO' ? 'Category Header Banner' : 'Category Grid',
        consumer: 'CategoryHero.tsx, /categories/[slug]/page.tsx',
      };

    case 'GUIDE':
      return {
        page: `/guides/${slug}`,
        route: `/guides/${slug}`,
        section: role === 'HERO' ? 'Editorial Guide Header' : 'Guide Body',
        consumer: 'GuideHero.tsx, /guides/[slug]/page.tsx',
      };

    case 'KNOWLEDGE':
      return {
        page: `/knowledge/${slug}`,
        route: `/knowledge/${slug}`,
        section: role === 'HERO' ? 'Botanical Monograph Cover' : 'Anatomy & Phytochemicals',
        consumer: 'KnowledgeHero.tsx, /knowledge/[entity]/page.tsx',
      };

    case 'BRAND':
      return {
        page: '/',
        route: '/',
        section: role === 'ICON' ? 'Site Header & Footer Branding' : 'Hero Terroir Showcase',
        consumer: 'Header.tsx, BrandStory.tsx, /app/page.tsx',
      };

    default:
      return {
        page: `/${entityType.toLowerCase()}/${slug}`,
        route: `/${entityType.toLowerCase()}/${slug}`,
        section: `${role} Section`,
        consumer: 'UniversalEntityView.tsx',
      };
  }
}

