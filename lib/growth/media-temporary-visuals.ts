import { MediaAsset, MediaEntityType, saveMediaAsset } from '@/lib/db/media';

export interface TemporaryVisualBlueprint {
  entityType: MediaEntityType;
  entityId: string;
  entityName: string;
  slotKey: string;
  visualTheme:
    | 'BOTANICAL_RAW'
    | 'POWDER_TEXTURE'
    | 'CERAMIC_BOWL'
    | 'SOJAT_TERROIR'
    | 'RITUAL_SCENE';
  prompt: string;
  antiHallucinationRules: string[];
}

/**
 * Checks whether an asset is a temporary visual.
 */
export function isTemporaryVisual(asset: MediaAsset | undefined | null): boolean {
  if (!asset) return false;
  return (
    asset.assetOrigin === 'temporary_visual' ||
    asset.visualContext?.assetOrigin === 'temporary_visual' ||
    asset.visualContext?.isTemporaryVisual === true
  );
}

/**
 * Builds an anti-hallucination temporary visual blueprint for an entity when real photos are pending.
 * Strictly forbids fabricated packaging, labels, logos, certification badges, or text claims.
 */
export function buildTemporaryVisualBlueprint(options: {
  entityType: MediaEntityType;
  entityId: string;
  entityName: string;
  slotKey: string;
  botanicalContext?: string;
}): TemporaryVisualBlueprint {
  const { entityType, entityId, entityName, slotKey, botanicalContext } = options;

  const antiHallucinationRules = [
    'CRITICAL: NO product packaging, NO plastic/paper pouches, NO bottles, NO jars.',
    'CRITICAL: NO commercial labels, NO brand logos, NO typography, NO text, NO watermarks.',
    'CRITICAL: NO invented weight, NO SKU numbers, NO price tags, NO medical or cosmetic claims.',
    'Focus solely on pure raw botanical materials, authentic texture, and natural Ayurvedic elements.',
  ];

  let visualTheme: TemporaryVisualBlueprint['visualTheme'] = 'BOTANICAL_RAW';
  let themeDescription = '';

  const normSlot = slotKey.toUpperCase();
  if (normSlot.includes('INGREDIENT') || normSlot.includes('DETAIL')) {
    visualTheme = 'POWDER_TEXTURE';
    themeDescription = `Extreme macro focus on microfine sun-dried botanical powder texture, rich natural olive-green tint, delicate cloth-sifted granularity, natural morning side lighting on rough limestone stone.`;
  } else if (normSlot.includes('USAGE') || normSlot.includes('LIFESTYLE')) {
    visualTheme = 'CERAMIC_BOWL';
    themeDescription = `Traditional handcrafted Rajasthani brass and terracotta mixing bowl with smooth botanical paste and natural neem wooden spatula, placed on rustic linen fabric in warm diffused daylight.`;
  } else if (normSlot.includes('HERO') || normSlot.includes('BRAND')) {
    visualTheme = 'SOJAT_TERROIR';
    themeDescription = `Lush mature Lawsonia inermis henna shrubs growing in the red arid soil of Sojat, Rajasthan, golden hour morning dawn, wide horizon landscape.`;
  } else {
    visualTheme = 'BOTANICAL_RAW';
    themeDescription = `Arrangement of fresh whole harvested Lawsonia inermis leaves and dried botanical specimens on a warm desert sandstone slab, natural shadows, mindful organic sanctuary mood.`;
  }

  const prompt = [
    `Editorial botanical visual for ${entityName}.`,
    botanicalContext ? `Botanical context: ${botanicalContext}.` : '',
    themeDescription,
    `Color palette: Forest Green (#0f2d22), Desert Terracotta, Sandstone Ivory, and warm golden daylight (5400K).`,
    `Photography style: Hasselblad X2D 100C, natural lighting, organic depth of field, authentic unretouched finish.`,
    ...antiHallucinationRules,
  ]
    .filter(Boolean)
    .join(' ');

  return {
    entityType,
    entityId,
    entityName,
    slotKey,
    visualTheme,
    prompt,
    antiHallucinationRules,
  };
}

/**
 * Registers an approved temporary visual asset record.
 */
export async function createTemporaryVisualAsset(options: {
  entityType: MediaEntityType;
  entityId: string;
  entityName: string;
  slotKey: string;
  url: string;
  dimensions?: { width: number; height: number };
  mimeType?: string;
}): Promise<MediaAsset> {
  const { entityType, entityId, entityName, slotKey, url, dimensions, mimeType } = options;

  const blueprint = buildTemporaryVisualBlueprint({
    entityType,
    entityId,
    entityName,
    slotKey,
  });

  const { asset } = await saveMediaAsset({
    entityType,
    entityId,
    url,
    mimeType: mimeType || 'image/webp',
    width: dimensions?.width || 1200,
    height: dimensions?.height || 1200,
    aspectRatio: '1:1',
    role: 'PRIMARY',
    source: 'AI_GENERATED',
    status: 'approved',
    isLocked: false, // NOT locked, so real photo can supersede anytime
    assetOrigin: 'temporary_visual',
    slotKey,
    title: `${entityName} (Temporary Botanical Visual)`,
    altText: `Pure botanical ${entityName} representation`,
    visualContext: {
      isTemporaryVisual: true,
      assetOrigin: 'temporary_visual',
      blueprintTheme: blueprint.visualTheme,
      waitingForRealPhoto: true,
      registeredAt: new Date().toISOString(),
    },
    sortOrder: 10,
  });

  return asset;
}

