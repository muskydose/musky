import { Product, Category, ProductGuide } from '@/lib/types';
import { KnowledgeEntity } from '@/lib/db/knowledge';
import { MediaAsset, MediaEntityType, MediaAssetRole } from '@/lib/db/media';

export type MediaAuthorityStatus =
  | 'LIVE_AUTHORITATIVE'
  | 'APPROVED_NOT_CURRENT'
  | 'SUGGESTED'
  | 'REJECTED'
  | 'ARCHIVED';

export interface ConsumingRouteInfo {
  route: string;
  label: string;
  isLive: boolean;
}

export interface MediaAssetUsageInfo {
  assetId: string;
  entityType: MediaEntityType;
  entityId: string;
  entityName: string;
  entitySlug?: string;
  existsInCatalog: boolean;
  role: MediaAssetRole;
  usedAs: string;
  exactSlot: string;
  authorityStatus: MediaAuthorityStatus;
  authorityBadgeLabel: string;
  isLivePublic: boolean;
  isLocked: boolean;
  consumingRoutes: ConsumingRouteInfo[];
  consumptionSummary: string;
  whyNotPublicYet: string | null;
}

export interface EntityLookupContext {
  products: Product[];
  categories: Category[];
  guides: ProductGuide[];
  knowledge: KnowledgeEntity[];
}

/**
 * Human-readable mapping of role to "Used As" purpose
 */
export function getUsedAsDescription(role: MediaAssetRole, entityType: MediaEntityType): string {
  switch (role) {
    case 'PRIMARY':
      return entityType === 'PRODUCT'
        ? 'Product Hero Packshot & Primary Meta Image'
        : `${entityType} Primary Cover Image`;
    case 'HERO':
      return `${entityType} Top Banner / Hero Visual`;
    case 'GALLERY':
      return `${entityType} Carousel Gallery Slide`;
    case 'PACKAGING':
      return 'Product Packaging & Outer Box Specifications';
    case 'LIFESTYLE':
      return 'Lifestyle & Real-World Application Scene';
    case 'DETAIL':
      return 'Macro Texture & Quality Inspection Close-up';
    case 'INGREDIENTS':
      return 'Botanical Source & Botanical Provenance Monograph';
    case 'USAGE':
      return 'Step-by-Step Usage & Application Instruction';
    case 'OG_SOCIAL':
      return 'Social Media OpenGraph Share Preview Card';
    case 'BANNER':
      return 'Campaign & Section Header Banner';
    case 'INFOGRAPHIC':
      return 'Educational Monograph Infographic';
    case 'PROCESS':
      return 'Traditional Manufacturing / Sifting Process';
    case 'ICON':
      return 'Feature Badge / Trust Seal Icon';
    default:
      return `${role} Asset`;
  }
}

/**
 * Resolves truthful identity, consuming routes, and authority status for a media asset.
 * 
 * CRITICAL TRUTHFULNESS RULES:
 * 1. isLivePublic is TRUE ONLY if the asset is actually the currently resolved public asset
 *    for that entity/slot AND its governance status is 'approved'.
 * 2. Consuming routes inspect actual page consumers; never claim unrendered routes.
 * 3. Shows "Not currently consumed" when no real consumer exists.
 */
export function resolveMediaAssetUsage(
  asset: MediaAsset,
  allAssets: MediaAsset[],
  context: EntityLookupContext
): MediaAssetUsageInfo {
  const { products = [], categories = [], guides = [], knowledge = [] } = context;

  let entityName = `${asset.entityType}: ${asset.entityId || 'Global'}`;
  let entitySlug: string | undefined;
  let existsInCatalog = false;

  // 1. Resolve canonical entity identity
  if (asset.entityType === 'PRODUCT') {
    const p = products.find((item) => item.id === asset.entityId || item.slug === asset.entityId);
    if (p) {
      existsInCatalog = true;
      entityName = p.name;
      entitySlug = p.slug;
    }
  } else if (asset.entityType === 'CATEGORY') {
    const c = categories.find((item) => item.id === asset.entityId || item.slug === asset.entityId);
    if (c) {
      existsInCatalog = true;
      entityName = c.name;
      entitySlug = c.slug;
    }
  } else if (asset.entityType === 'GUIDE') {
    const g = guides.find((item) => item.id === asset.entityId || item.slug === asset.entityId);
    if (g) {
      existsInCatalog = true;
      entityName = g.title;
      entitySlug = g.slug;
    }
  } else if (asset.entityType === 'KNOWLEDGE') {
    const k = knowledge.find(
      (item) => item.id === asset.entityId || item.entityKey === asset.entityId || item.slug === asset.entityId
    );
    if (k) {
      existsInCatalog = true;
      entityName = k.canonicalName;
      entitySlug = k.slug;
    }
  } else if (asset.entityType === 'BRAND') {
    existsInCatalog = true;
    entityName = 'Musky Dose Brand Assets';
  } else if (asset.entityType === 'MARKETING') {
    existsInCatalog = true;
    entityName = 'Storefront Marketing & Banners';
  }

  const usedAs = getUsedAsDescription(asset.role, asset.entityType);
  const exactSlot = asset.role;
  const isLocked = Boolean(asset.isLocked);
  const targetEntityId = asset.entityId || '';

  // 2. Check governance status
  if (asset.status === 'suggested') {
    return {
      assetId: asset.id,
      entityType: asset.entityType,
      entityId: targetEntityId,
      entityName,
      entitySlug,
      existsInCatalog,
      role: asset.role,
      usedAs,
      exactSlot,
      authorityStatus: 'SUGGESTED',
      authorityBadgeLabel: 'SUGGESTED AI (NON-PUBLIC)',
      isLivePublic: false,
      isLocked,
      consumingRoutes: [],
      consumptionSummary: 'Not currently consumed (Pending approval)',
      whyNotPublicYet: 'Suggested by AI. Requires explicit Admin approval before storefront publication.',
    };
  }

  if (asset.status === 'rejected') {
    return {
      assetId: asset.id,
      entityType: asset.entityType,
      entityId: targetEntityId,
      entityName,
      entitySlug,
      existsInCatalog,
      role: asset.role,
      usedAs,
      exactSlot,
      authorityStatus: 'REJECTED',
      authorityBadgeLabel: 'REJECTED (INACTIVE)',
      isLivePublic: false,
      isLocked,
      consumingRoutes: [],
      consumptionSummary: 'Not currently consumed (Rejected)',
      whyNotPublicYet: 'Rejected by Admin. Will not display on storefront.',
    };
  }

  if (asset.status === 'archived') {
    return {
      assetId: asset.id,
      entityType: asset.entityType,
      entityId: targetEntityId,
      entityName,
      entitySlug,
      existsInCatalog,
      role: asset.role,
      usedAs,
      exactSlot,
      authorityStatus: 'ARCHIVED',
      authorityBadgeLabel: 'ARCHIVED',
      isLivePublic: false,
      isLocked,
      consumingRoutes: [],
      consumptionSummary: 'Not currently consumed (Archived)',
      whyNotPublicYet: 'Archived. Inactive.',
    };
  }

  // 3. For approved assets: Check whether entity exists in catalog
  if (!existsInCatalog) {
    return {
      assetId: asset.id,
      entityType: asset.entityType,
      entityId: targetEntityId,
      entityName,
      entitySlug,
      existsInCatalog: false,
      role: asset.role,
      usedAs,
      exactSlot,
      authorityStatus: 'APPROVED_NOT_CURRENT',
      authorityBadgeLabel: 'APPROVED (ORPHANED)',
      isLivePublic: false,
      isLocked,
      consumingRoutes: [],
      consumptionSummary: 'Not currently consumed (Entity not found in catalog)',
      whyNotPublicYet: 'Entity record is not present in active catalog. Asset is not attached to any live entity.',
    };
  }

  // 4. For approved assets belonging to a valid entity: Determine current active resolution
  const approvedEntityAssets = allAssets.filter(
    (a) => a.entityType === asset.entityType && a.entityId === asset.entityId && a.status === 'approved'
  );

  // In DAL, primary is resolved by role === 'PRIMARY' with sortOrder ascending
  const activePrimary = approvedEntityAssets
    .filter((a) => a.role === 'PRIMARY')
    .sort((a, b) => (a.sortOrder ?? 100) - (b.sortOrder ?? 100))[0];

  const consumingRoutes: ConsumingRouteInfo[] = [];

  if (asset.role === 'PRIMARY') {
    const isCurrentPrimary = activePrimary?.id === asset.id;

    if (isCurrentPrimary) {
      if (asset.entityType === 'PRODUCT' && entitySlug) {
        consumingRoutes.push({
          route: `/products/${entitySlug}`,
          label: 'Product Detail Page (Hero Packshot)',
          isLive: true,
        });
      } else if (asset.entityType === 'CATEGORY' && entitySlug) {
        consumingRoutes.push({
          route: `/categories/${entitySlug}`,
          label: 'Category Detail Page (Hero Banner)',
          isLive: true,
        });
      } else if (asset.entityType === 'GUIDE' && entitySlug) {
        consumingRoutes.push({
          route: `/guides/${entitySlug}`,
          label: 'Guide Article Page (Cover Visual)',
          isLive: true,
        });
      } else if (asset.entityType === 'KNOWLEDGE' && entitySlug) {
        consumingRoutes.push({
          route: `/knowledge/${entitySlug}`,
          label: 'Botanical Monograph Page (Primary Visual)',
          isLive: true,
        });
      }

      const badgeLabel = isLocked ? 'LIVE / AUTHORITATIVE (LOCKED)' : 'LIVE / AUTHORITATIVE';

      return {
        assetId: asset.id,
        entityType: asset.entityType,
        entityId: targetEntityId,
        entityName,
        entitySlug,
        existsInCatalog: true,
        role: asset.role,
        usedAs,
        exactSlot,
        authorityStatus: 'LIVE_AUTHORITATIVE',
        authorityBadgeLabel: badgeLabel,
        isLivePublic: true,
        isLocked,
        consumingRoutes,
        consumptionSummary: consumingRoutes.length > 0 ? `Active on ${consumingRoutes[0].route}` : 'Not currently consumed',
        whyNotPublicYet: null,
      };
    } else {
      // Approved but not the current designated primary (another asset took priority)
      return {
        assetId: asset.id,
        entityType: asset.entityType,
        entityId: targetEntityId,
        entityName,
        entitySlug,
        existsInCatalog: true,
        role: asset.role,
        usedAs,
        exactSlot,
        authorityStatus: 'APPROVED_NOT_CURRENT',
        authorityBadgeLabel: 'APPROVED (NOT CURRENT PRIMARY)',
        isLivePublic: false,
        isLocked,
        consumingRoutes: [],
        consumptionSummary: 'Not currently consumed (Secondary candidate)',
        whyNotPublicYet: 'Approved candidate, but another asset is currently designated as the authoritative Primary.',
      };
    }
  }

  // 5. Gallery assets
  if (asset.role === 'GALLERY') {
    if (asset.entityType === 'PRODUCT' && entitySlug) {
      consumingRoutes.push({
        route: `/products/${entitySlug}`,
        label: 'Product Detail Page (Gallery Carousel)',
        isLive: true,
      });
      return {
        assetId: asset.id,
        entityType: asset.entityType,
        entityId: targetEntityId,
        entityName,
        entitySlug,
        existsInCatalog: true,
        role: asset.role,
        usedAs,
        exactSlot,
        authorityStatus: 'LIVE_AUTHORITATIVE',
        authorityBadgeLabel: 'LIVE / GALLERY',
        isLivePublic: true,
        isLocked,
        consumingRoutes,
        consumptionSummary: `Active on ${consumingRoutes[0].route}`,
        whyNotPublicYet: null,
      };
    }

    return {
      assetId: asset.id,
      entityType: asset.entityType,
      entityId: targetEntityId,
      entityName,
      entitySlug,
      existsInCatalog: true,
      role: asset.role,
      usedAs,
      exactSlot,
      authorityStatus: 'APPROVED_NOT_CURRENT',
      authorityBadgeLabel: 'APPROVED (STANDBY)',
      isLivePublic: false,
      isLocked,
      consumingRoutes: [],
      consumptionSummary: 'Not currently consumed',
      whyNotPublicYet: 'Approved gallery item, but current storefront page template does not display gallery slides for this entity type.',
    };
  }

  // 6. Secondary roles (PACKAGING, LIFESTYLE, DETAIL, INGREDIENTS, HERO)
  if (asset.role === 'HERO') {
    if (asset.entityType === 'CATEGORY' && entitySlug) {
      consumingRoutes.push({
        route: `/categories/${entitySlug}`,
        label: 'Category Detail Page (Hero)',
        isLive: true,
      });
      return {
        assetId: asset.id,
        entityType: asset.entityType,
        entityId: targetEntityId,
        entityName,
        entitySlug,
        existsInCatalog: true,
        role: asset.role,
        usedAs,
        exactSlot,
        authorityStatus: 'LIVE_AUTHORITATIVE',
        authorityBadgeLabel: 'LIVE / HERO',
        isLivePublic: true,
        isLocked,
        consumingRoutes,
        consumptionSummary: `Active on ${consumingRoutes[0].route}`,
        whyNotPublicYet: null,
      };
    }
  }

  // For any other approved role without a currently implemented consumer
  return {
    assetId: asset.id,
    entityType: asset.entityType,
    entityId: targetEntityId,
    entityName,
    entitySlug,
    existsInCatalog: true,
    role: asset.role,
    usedAs,
    exactSlot,
    authorityStatus: 'APPROVED_NOT_CURRENT',
    authorityBadgeLabel: `APPROVED (${asset.role})`,
    isLivePublic: false,
    isLocked,
    consumingRoutes: [],
    consumptionSummary: 'Not currently consumed',
    whyNotPublicYet: `Approved for slot ${asset.role}. Storefront section for this slot is not currently rendered.`,
  };
}

