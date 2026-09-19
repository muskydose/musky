import { MediaEntityType, MediaAssetRole, MediaAssetSource, MotionLayerType } from '@/lib/db/media';
import { VisualVariant } from '@/lib/growth/visual-prompt-engine';
import { STANDARD_MEDIA_SPECS, SlotSpecification, reconcileCanonicalSlot } from './media-specs';

// ============================================================================
// 1. BLUEPRINT TYPES & CONTRACTS
// ============================================================================

export type AspectRatioType = '1:1' | '4:5' | '16:9' | '9:16' | '3:2';

export function getCanonicalSpecForVisualSlot(slot: VisualSlotDefinition | string): SlotSpecification {
  const slotKey = typeof slot === 'string' ? slot : slot.slotId;
  return reconcileCanonicalSlot(slotKey);
}

export type ResponsiveBehaviorType =
  | 'DESKTOP'
  | 'TABLET'
  | 'MOBILE'
  | 'OG'
  | 'SOCIAL_SQUARE'
  | 'SOCIAL_PORTRAIT';

export interface VisualSlotDefinition {
  slotId: string;
  role: MediaAssetRole;
  purpose: string;
  preferredAspectRatio: AspectRatioType;
  allowedAspectRatios?: AspectRatioType[];
  minQuality: {
    minWidth?: number;
    minHeight?: number;
  };
  allowedSources: MediaAssetSource[];
  generationContext: {
    variant: VisualVariant;
    promptFocus: string;
    motionLayer?: MotionLayerType;
  };
  approvalRequired: boolean;
  fallbackRole?: MediaAssetRole;
  responsiveBehavior: ResponsiveBehaviorType;
  isRequired: boolean;
}

export interface VisualBlueprint {
  entityType: string;
  displayName: string;
  description: string;
  slots: VisualSlotDefinition[];
}

// ============================================================================
// 2. STANDARD BUILT-IN BLUEPRINTS
// ============================================================================

export const PRODUCT_BLUEPRINT: VisualBlueprint = {
  entityType: 'PRODUCT',
  displayName: 'Product Catalog Item',
  description: 'Physical Ayurvedic botanical goods, powders, and formulas.',
  slots: [
    {
      slotId: 'product-primary',
      role: 'PRIMARY',
      purpose: 'Authoritative packshot representing product in listings and hero banners.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'packshot',
        promptFocus: 'Studio product packshot with clean lighting on neutral stone.',
        motionLayer: 'PRODUCT_CUTOUT',
      },
      approvalRequired: true,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'product-gallery',
      role: 'GALLERY',
      purpose: 'Additional multi-angle imagery for product detail pages.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 600, minHeight: 600 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'packshot',
        promptFocus: 'Alternate angle view of packaging and formula texture.',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'product-packaging',
      role: 'PACKAGING',
      purpose: 'Detailed packaging visual showing eco-pouch and label geometry.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'packshot',
        promptFocus: 'Kraft pouch packaging detail with botanical seal.',
        motionLayer: 'PRODUCT_CUTOUT',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'product-lifestyle',
      role: 'LIFESTYLE',
      purpose: 'Atmospheric placement in natural Ayurvedic sanctuary or courtyard.',
      preferredAspectRatio: '4:5',
      allowedAspectRatios: ['4:5', '1:1', '16:9'],
      minQuality: { minWidth: 800, minHeight: 1000 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'lifestyle',
        promptFocus: 'Ayurvedic wellness sanctuary setting with stone mortar and linen.',
        motionLayer: 'STORY_SCENE',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'product-detail',
      role: 'DETAIL',
      purpose: 'Macro closeup of powder grain, sift quality, or paste texture.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'ingredient',
        promptFocus: 'Macro botanical sifted powder texture showing ultra-fine grain.',
        motionLayer: 'BACKGROUND_TEXTURE',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'product-usage',
      role: 'USAGE',
      purpose: 'Application ritual demonstrating natural mixing and application.',
      preferredAspectRatio: '4:5',
      allowedAspectRatios: ['4:5', '1:1'],
      minQuality: { minWidth: 800, minHeight: 1000 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'usage',
        promptFocus: 'Mixing paste in ceramic bowl with gentle respectful hands.',
        motionLayer: 'PROCESS_STAGE',
      },
      approvalRequired: true,
      fallbackRole: 'LIFESTYLE',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'product-ingredients',
      role: 'INGREDIENTS',
      purpose: 'Raw botanical leaves and roots celebrating authentic terroir.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'ingredient',
        promptFocus: 'Raw botanical ingredients arranged naturally.',
        motionLayer: 'BOTANICAL_OBJECT',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'product-mobile-hero',
      role: 'MOBILE_HERO',
      purpose: 'Vertical mobile-first hero crop optimized for small screens.',
      preferredAspectRatio: '9:16',
      allowedAspectRatios: ['9:16', '4:5', '1:1'],
      minQuality: { minWidth: 600, minHeight: 1067 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'packshot',
        promptFocus: 'Vertical mobile hero visual with clean top negative space.',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'MOBILE',
      isRequired: false,
    },
    {
      slotId: 'product-social-square',
      role: 'SOCIAL_SQUARE',
      purpose: '1:1 feed tile for Instagram, WhatsApp catalog, and Google Shopping.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Square social promotional tile highlighting pure botanical formula.',
      },
      approvalRequired: true,
      fallbackRole: 'PRIMARY',
      responsiveBehavior: 'SOCIAL_SQUARE',
      isRequired: false,
    },
    {
      slotId: 'product-social-portrait',
      role: 'SOCIAL_PORTRAIT',
      purpose: '4:5 story/reel portrait for social campaigns.',
      preferredAspectRatio: '4:5',
      allowedAspectRatios: ['4:5', '9:16'],
      minQuality: { minWidth: 800, minHeight: 1000 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Portrait social story visual with warm ambient botanical glow.',
      },
      approvalRequired: true,
      fallbackRole: 'LIFESTYLE',
      responsiveBehavior: 'SOCIAL_PORTRAIT',
      isRequired: false,
    },
  ],
};

export const CATEGORY_BLUEPRINT: VisualBlueprint = {
  entityType: 'CATEGORY',
  displayName: 'Category / Collection',
  description: 'Botanical taxonomy groupings (e.g., Henna Powder, Amla, Herbal Oils).',
  slots: [
    {
      slotId: 'category-hero',
      role: 'HERO',
      purpose: 'Wide widescreen hero banner for category archive header.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '3:2'],
      minQuality: { minWidth: 1200, minHeight: 675 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'collection',
        promptFocus: 'Wide atmospheric collection visual featuring category products.',
        motionLayer: 'STORY_SCENE',
      },
      approvalRequired: true,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'category-collection',
      role: 'GALLERY',
      purpose: 'Arrangement of related botanical products in collection context.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'collection',
        promptFocus: 'Artful curation of botanical goods on textured wood.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'category-mobile-hero',
      role: 'MOBILE_HERO',
      purpose: 'Vertical mobile banner for category view on handheld devices.',
      preferredAspectRatio: '9:16',
      allowedAspectRatios: ['9:16', '4:5', '1:1'],
      minQuality: { minWidth: 600, minHeight: 1067 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'collection',
        promptFocus: 'Vertical mobile header for botanical collection.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'MOBILE',
      isRequired: false,
    },
    {
      slotId: 'category-social',
      role: 'SOCIAL_SQUARE',
      purpose: 'Square promotional asset for category features.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Square social card highlighting category craft.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'SOCIAL_SQUARE',
      isRequired: false,
    },
  ],
};

export const GUIDE_BLUEPRINT: VisualBlueprint = {
  entityType: 'GUIDE',
  displayName: 'Product & Application Guide',
  description: 'Educational editorial guides for preparation, mixing, and application.',
  slots: [
    {
      slotId: 'guide-hero',
      role: 'HERO',
      purpose: 'Editorial header cover visual for guide article.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '3:2'],
      minQuality: { minWidth: 1200, minHeight: 675 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'lifestyle',
        promptFocus: 'Serene editorial visual reflecting guide topic and ritual.',
        motionLayer: 'STORY_SCENE',
      },
      approvalRequired: true,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'guide-process',
      role: 'PROCESS',
      purpose: 'Step-by-step preparation and application breakdown.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 600 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'usage',
        promptFocus: 'Step-by-step preparation ritual visual.',
        motionLayer: 'PROCESS_STAGE',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'guide-infographic',
      role: 'INFOGRAPHIC',
      purpose: 'Educational infographic summarising timings, ratios, and steps.',
      preferredAspectRatio: '4:5',
      allowedAspectRatios: ['4:5', '16:9', '1:1'],
      minQuality: { minWidth: 800, minHeight: 1000 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'infographic',
        promptFocus: 'Clean botanical flowchart of preparation steps.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'guide-social',
      role: 'SOCIAL_SQUARE',
      purpose: 'Square visual for social sharing and OpenGraph preview.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '16:9'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'High-impact educational teaser for guide.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'SOCIAL_SQUARE',
      isRequired: false,
    },
  ],
};

export const KNOWLEDGE_BLUEPRINT: VisualBlueprint = {
  entityType: 'KNOWLEDGE',
  displayName: 'Ayurvedic Knowledge Graph Entity',
  description: 'Botanical encyclopedic entries (Lawsonia inermis, Emblica officinalis, Terroir).',
  slots: [
    {
      slotId: 'knowledge-hero',
      role: 'HERO',
      purpose: 'Authoritative encyclopedic hero banner for scientific topic.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '3:2'],
      minQuality: { minWidth: 1200, minHeight: 675 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'illustration',
        promptFocus: 'Scientific botanical illustration with vintage naturalist precision.',
        motionLayer: 'BOTANICAL_OBJECT',
      },
      approvalRequired: true,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'knowledge-botanical',
      role: 'DETAIL',
      purpose: 'Microscopic or fine botanical taxonomy plate showing plant anatomy.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '4:5'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'ingredient',
        promptFocus: 'Detailed botanical leaf and blossom anatomy.',
        motionLayer: 'BOTANICAL_OBJECT',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'knowledge-comparison',
      role: 'COMPARISON',
      purpose: 'Comparative visual showing grading, purity differences, or terroir comparison.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '1:1', '4:5'],
      minQuality: { minWidth: 1000, minHeight: 600 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'infographic',
        promptFocus: 'Side-by-side botanical purity comparison.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'knowledge-infographic',
      role: 'INFOGRAPHIC',
      purpose: 'Educational infographic detailing lawsone content, harvest cycles, or chemistry.',
      preferredAspectRatio: '4:5',
      allowedAspectRatios: ['4:5', '16:9', '1:1'],
      minQuality: { minWidth: 800, minHeight: 1000 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'infographic',
        promptFocus: 'Botanical infographic detailing harvest cycles and natural lawsone.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'knowledge-social',
      role: 'SOCIAL_SQUARE',
      purpose: 'Square botanical card for knowledge snippet syndication.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1', '16:9'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Square botanical knowledge fact card.',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'SOCIAL_SQUARE',
      isRequired: false,
    },
  ],
};

export const BRAND_BLUEPRINT: VisualBlueprint = {
  entityType: 'BRAND',
  displayName: 'Brand Identity & Heritage',
  description: 'Musky Dose brand identity, heritage, craftsmanship, and logos.',
  slots: [
    {
      slotId: 'brand-hero',
      role: 'HERO',
      purpose: 'Brand homepage and mission hero visual.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '3:2'],
      minQuality: { minWidth: 1200, minHeight: 675 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'lifestyle',
        promptFocus: 'Sojat Rajasthan botanical terroir under warm morning sunlight.',
        motionLayer: 'STORY_SCENE',
      },
      approvalRequired: true,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'brand-icon',
      role: 'ICON',
      purpose: 'Brand logo mark or seal in gold and deep forest green.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1'],
      minQuality: { minWidth: 512, minHeight: 512 },
      allowedSources: ['MANUAL_UPLOAD'],
      generationContext: {
        variant: 'packshot',
        promptFocus: 'Clean vector brand logo mark.',
        motionLayer: 'PRODUCT_CUTOUT',
      },
      approvalRequired: false,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'brand-story',
      role: 'LIFESTYLE',
      purpose: 'Sojat heritage craftsmanship and farmer partnership story visual.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '4:5', '3:2'],
      minQuality: { minWidth: 1200, minHeight: 675 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'lifestyle',
        promptFocus: 'Generational Rajasthani henna farmer inspecting fresh harvest.',
        motionLayer: 'STORY_SCENE',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'brand-process',
      role: 'PROCESS',
      purpose: 'Triple-sifting and cold-milling craft documentation.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '1:1'],
      minQuality: { minWidth: 1000, minHeight: 600 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED'],
      generationContext: {
        variant: 'infographic',
        promptFocus: 'Traditional fine cloth sifting and modern cold milling quality check.',
        motionLayer: 'PROCESS_STAGE',
      },
      approvalRequired: true,
      fallbackRole: 'HERO',
      responsiveBehavior: 'DESKTOP',
      isRequired: false,
    },
    {
      slotId: 'brand-social',
      role: 'SOCIAL_SQUARE',
      purpose: 'Brand square hallmark for profile pictures and social icons.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Luxury Ayurvedic brand square mark.',
      },
      approvalRequired: true,
      fallbackRole: 'ICON',
      responsiveBehavior: 'SOCIAL_SQUARE',
      isRequired: false,
    },
  ],
};

export const MARKETING_BLUEPRINT: VisualBlueprint = {
  entityType: 'MARKETING',
  displayName: 'Marketing & Promotional Campaigns',
  description: 'Promotional campaign creatives, seasonal festivals, and announcement banners.',
  slots: [
    {
      slotId: 'marketing-banner',
      role: 'BANNER',
      purpose: 'Wide horizontal announcement banner for sitewide notifications.',
      preferredAspectRatio: '16:9',
      allowedAspectRatios: ['16:9', '3:2'],
      minQuality: { minWidth: 1200, minHeight: 400 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Festive botanical announcement banner with warm Rajasthani ambiance.',
      },
      approvalRequired: true,
      responsiveBehavior: 'DESKTOP',
      isRequired: true,
    },
    {
      slotId: 'marketing-square',
      role: 'SOCIAL_SQUARE',
      purpose: 'Square promotional asset for social ad campaigns and WhatsApp updates.',
      preferredAspectRatio: '1:1',
      allowedAspectRatios: ['1:1'],
      minQuality: { minWidth: 800, minHeight: 800 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Square promotional creative celebrating festival season.',
      },
      approvalRequired: true,
      fallbackRole: 'BANNER',
      responsiveBehavior: 'SOCIAL_SQUARE',
      isRequired: false,
    },
    {
      slotId: 'marketing-portrait',
      role: 'SOCIAL_PORTRAIT',
      purpose: 'Vertical portrait story creative for Instagram Reels and Stories.',
      preferredAspectRatio: '9:16',
      allowedAspectRatios: ['9:16', '4:5'],
      minQuality: { minWidth: 720, minHeight: 1280 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'social',
        promptFocus: 'Vertical full-screen mobile story with elegant typography negative space.',
      },
      approvalRequired: true,
      fallbackRole: 'BANNER',
      responsiveBehavior: 'SOCIAL_PORTRAIT',
      isRequired: false,
    },
    {
      slotId: 'marketing-mobile-hero',
      role: 'MOBILE_HERO',
      purpose: 'Mobile campaign landing page hero graphic.',
      preferredAspectRatio: '9:16',
      allowedAspectRatios: ['9:16', '4:5', '1:1'],
      minQuality: { minWidth: 600, minHeight: 1067 },
      allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
      generationContext: {
        variant: 'lifestyle',
        promptFocus: 'Mobile-first seasonal campaign hero visual.',
      },
      approvalRequired: true,
      fallbackRole: 'BANNER',
      responsiveBehavior: 'MOBILE',
      isRequired: false,
    },
  ],
};

// ============================================================================
// 3. DYNAMIC REGISTRY (FUTURE-PROOF EXTENSIBILITY)
// ============================================================================

const registry = new Map<string, VisualBlueprint>([
  ['PRODUCT', PRODUCT_BLUEPRINT],
  ['CATEGORY', CATEGORY_BLUEPRINT],
  ['GUIDE', GUIDE_BLUEPRINT],
  ['KNOWLEDGE', KNOWLEDGE_BLUEPRINT],
  ['BRAND', BRAND_BLUEPRINT],
  ['MARKETING', MARKETING_BLUEPRINT],
]);

/**
 * Registers a new entity blueprint dynamically at runtime or config time.
 * Supports newly simulated or created entity types WITHOUT editing page code!
 */
export function registerEntityBlueprint(
  entityType: string,
  blueprintOrSlots: VisualBlueprint | VisualSlotDefinition[],
  options?: { displayName?: string; description?: string }
): VisualBlueprint {
  const normType = entityType.toUpperCase().trim();
  let blueprint: VisualBlueprint;

  if (Array.isArray(blueprintOrSlots)) {
    blueprint = {
      entityType: normType,
      displayName: options?.displayName || `${normType} Entity`,
      description: options?.description || `Auto-registered blueprint for entity type ${normType}`,
      slots: blueprintOrSlots,
    };
  } else {
    blueprint = {
      ...blueprintOrSlots,
      entityType: normType,
    };
  }

  registry.set(normType, blueprint);
  return blueprint;
}

/**
 * Retrieves the blueprint for any entity type.
 * If an unknown entity type is requested, a safe dynamic default blueprint is returned!
 */
export function getEntityBlueprint(entityType: string): VisualBlueprint {
  const normType = (entityType || '').toUpperCase().trim();
  const existing = registry.get(normType);
  if (existing) {
    return existing;
  }

  // Dynamic default blueprint for unlisted / simulated entities:
  return {
    entityType: normType,
    displayName: `${normType.charAt(0) + normType.slice(1).toLowerCase()} Entity`,
    description: `Dynamic future-proof visual specification for ${normType}.`,
    slots: [
      {
        slotId: `${normType.toLowerCase()}-primary`,
        role: 'PRIMARY',
        purpose: `Primary authoritative visual for ${normType}.`,
        preferredAspectRatio: '1:1',
        allowedAspectRatios: ['1:1', '16:9', '4:5'],
        minQuality: { minWidth: 600, minHeight: 600 },
        allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
        generationContext: {
          variant: 'packshot',
          promptFocus: `Clear presentation visual for ${normType}.`,
        },
        approvalRequired: true,
        responsiveBehavior: 'DESKTOP',
        isRequired: true,
      },
      {
        slotId: `${normType.toLowerCase()}-hero`,
        role: 'HERO',
        purpose: `Header banner visual for ${normType}.`,
        preferredAspectRatio: '16:9',
        allowedAspectRatios: ['16:9', '3:2'],
        minQuality: { minWidth: 1000, minHeight: 560 },
        allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
        generationContext: {
          variant: 'lifestyle',
          promptFocus: `Atmospheric banner visual for ${normType}.`,
        },
        approvalRequired: true,
        fallbackRole: 'PRIMARY',
        responsiveBehavior: 'DESKTOP',
        isRequired: false,
      },
      {
        slotId: `${normType.toLowerCase()}-social`,
        role: 'SOCIAL_SQUARE',
        purpose: `Social square tile for ${normType}.`,
        preferredAspectRatio: '1:1',
        allowedAspectRatios: ['1:1'],
        minQuality: { minWidth: 600, minHeight: 600 },
        allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
        generationContext: {
          variant: 'social',
          promptFocus: `Social tile for ${normType}.`,
        },
        approvalRequired: true,
        fallbackRole: 'PRIMARY',
        responsiveBehavior: 'SOCIAL_SQUARE',
        isRequired: false,
      },
    ],
  };
}

/**
 * Returns all currently registered blueprints.
 */
export function getAllRegisteredBlueprints(): Record<string, VisualBlueprint> {
  const result: Record<string, VisualBlueprint> = {};
  for (const [key, val] of registry.entries()) {
    result[key] = val;
  }
  return result;
}
