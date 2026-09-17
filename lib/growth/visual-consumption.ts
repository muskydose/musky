import {
  MediaEntityType,
  MediaAssetRole,
  MediaAsset,
  getMediaForEntity,
  getPrimaryMedia,
  isSafeInternalMediaUrl,
} from '@/lib/db/media';
import {
  resolveVisualRequirements,
  ResolvedVisualRequirement,
} from '@/lib/growth/visual-decision-engine';

export interface EntitySEOVisuals {
  ogImageUrl: string;
  twitterImageUrl: string;
  schemaImageUrls: string[];
  primaryAltText: string;
  primaryWidth: number;
  primaryHeight: number;
}

export interface EntityMotionVisuals {
  botanicalObjects: MediaAsset[];
  productCutouts: MediaAsset[];
  backgroundTextures: MediaAsset[];
  storyScenes: MediaAsset[];
  processStages: MediaAsset[];
}

export interface EntityVisualConsumptionResult {
  primary: MediaAsset;
  hero: MediaAsset;
  gallery: MediaAsset[];
  slots: Record<string, ResolvedVisualRequirement>;
  seo: EntitySEOVisuals;
  motion: EntityMotionVisuals;
  isFallback: boolean;
}

/**
 * Universal page consumer function for any entity (PRODUCT, CATEGORY, GUIDE, KNOWLEDGE, BRAND, MARKETING, etc.).
 * Guarantees zero N+1 database queries, clean fallback, and full typing for storefront pages.
 */
export async function resolveEntityVisuals(
  entityType: string,
  entityId: string,
  legacyFallbackUrl?: string
): Promise<EntityVisualConsumptionResult> {
  const normType = (entityType || 'PRODUCT').toUpperCase() as MediaEntityType;
  const cleanId = entityId ? String(entityId).trim() : 'global';

  // 1. Single batch fetch of all entity media assets
  const allAssets = await getMediaForEntity({
    entityType: normType,
    entityId: cleanId,
    includeDrafts: false,
  });

  // 2. Primary asset resolution
  const safeLegacyFallback = isSafeInternalMediaUrl(legacyFallbackUrl) ? legacyFallbackUrl : undefined;
  let primaryAsset = allAssets.find((a) => a.role === 'PRIMARY');
  if (!primaryAsset) {
    primaryAsset = await getPrimaryMedia({
      entityType: normType,
      entityId: cleanId,
      legacyFallbackUrl: safeLegacyFallback,
    });
  }

  // 3. Hero asset resolution
  let heroAsset = allAssets.find((a) => a.role === 'HERO');
  if (!heroAsset) {
    heroAsset = primaryAsset;
  }

  // 4. Gallery resolution
  const galleryAssets = allAssets.filter((a) => a.role !== 'PRIMARY' && a.id !== primaryAsset?.id);

  // 5. Motion Layer separation
  const motion: EntityMotionVisuals = {
    botanicalObjects: [],
    productCutouts: [],
    backgroundTextures: [],
    storyScenes: [],
    processStages: [],
  };

  for (const asset of allAssets) {
    const layerType = asset.motionLayer?.layerType;
    if (layerType === 'BOTANICAL_OBJECT') motion.botanicalObjects.push(asset);
    else if (layerType === 'PRODUCT_CUTOUT') motion.productCutouts.push(asset);
    else if (layerType === 'BACKGROUND_TEXTURE') motion.backgroundTextures.push(asset);
    else if (layerType === 'STORY_SCENE') motion.storyScenes.push(asset);
    else if (layerType === 'PROCESS_STAGE') motion.processStages.push(asset);
  }

  // 6. Slots resolution via decision engine
  const slots = await resolveVisualRequirements(normType, cleanId);

  // 7. SEO Visuals resolution
  const ogAsset = allAssets.find((a) => a.role === 'OG_SOCIAL') || heroAsset || primaryAsset;
  const seo: EntitySEOVisuals = {
    ogImageUrl: ogAsset.url,
    twitterImageUrl: ogAsset.url,
    schemaImageUrls: allAssets.map((a) => a.url).slice(0, 5),
    primaryAltText: primaryAsset.altText || primaryAsset.title || 'Musky Dose Botanical',
    primaryWidth: primaryAsset.width || 800,
    primaryHeight: primaryAsset.height || 800,
  };

  return {
    primary: primaryAsset,
    hero: heroAsset,
    gallery: galleryAssets,
    slots,
    seo,
    motion,
    isFallback: primaryAsset.source === 'SYSTEM_FALLBACK',
  };
}
