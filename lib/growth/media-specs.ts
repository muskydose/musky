/**
 * CANONICAL CENTRAL MEDIA SPECIFICATIONS
 * 
 * Single source of truth for all image dimensions, aspect ratios,
 * format restrictions, file size limits, and visual guidelines across Musky Dose.
 * 
 * Approved Concept: "From Earth to Ritual"
 */

import { MediaAssetRole } from '@/lib/db/media';
import { MediaJobStrategy } from '@/lib/growth/media-jobs-engine';

export type MediaTypeSupported =
  | 'PHOTO'
  | 'ILLUSTRATION'
  | 'CARTOON'
  | 'BOTANICAL'
  | 'INFOGRAPHIC'
  | 'PROCESS'
  | 'LIFESTYLE'
  | 'PRODUCT_RENDER';

export type StandardAspectRatio = '1:1' | '4:5' | '16:9' | '9:16' | '1.91:1' | '3:2';

export interface SlotSpecification {
  slotKey: string;
  role: MediaAssetRole;
  targetEntityType?: 'PRODUCT' | 'CATEGORY' | 'GUIDE' | 'KNOWLEDGE' | 'BRAND' | 'MARKETING' | 'UNIVERSAL';
  displayName: string;
  purpose: string;
  aspectRatio: StandardAspectRatio;
  aspectRatioNumeric: number;
  recommendedWidth: number;
  recommendedHeight: number;
  minWidth: number;
  minHeight: number;
  maxFileSizeBytes: number;
  allowedMimeTypes: string[];
  supportedMediaTypes: MediaTypeSupported[];
  deviceTarget: 'DESKTOP' | 'MOBILE' | 'UNIVERSAL';
  isRequired: boolean;
  safeAreaGuide?: string;
  visualDirection: string;
  canDeriveFrom?: string; // e.g. 'PRODUCT_PRIMARY'
  derivativeType?: 'OPENGRAPH_1200x630' | 'THUMBNAIL_512x512' | 'SOCIAL_1080x1080';
  requiredStrategy?: MediaJobStrategy;
}

/**
 * Centrally configurable standard specifications matrix
 */
export const STANDARD_MEDIA_SPECS: Record<string, SlotSpecification> = {
  // --- PRODUCT SLOTS ---
  PRODUCT_PRIMARY: {
    slotKey: 'PRODUCT_PRIMARY',
    role: 'PRIMARY',
    displayName: 'Product Primary Packshot',
    purpose: 'Authoritative packshot representing product in catalog listings, search, and primary PDP hero.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PRODUCT_RENDER', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: true,
    safeAreaGuide: 'Center product in the inner 80% circle/box with generous breathing room around borders.',
    visualDirection: 'Clean studio lighting, natural limestone or warm Rajasthani sandstone backdrop, subtle soft shadow, authentic unretouched powder texture.',
  },
  PRODUCT_GALLERY: {
    slotKey: 'PRODUCT_GALLERY',
    role: 'GALLERY',
    displayName: 'Product Gallery Slide',
    purpose: 'Secondary multi-angle imagery for product carousel on product detail pages.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PRODUCT_RENDER', 'ILLUSTRATION', 'BOTANICAL'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Keep subject centered with 10% outer padding.',
    visualDirection: 'Alternate angle view of packaging, powder fineness, or botanical raw components.',
  },
  PRODUCT_LIFESTYLE: {
    slotKey: 'PRODUCT_LIFESTYLE',
    role: 'LIFESTYLE',
    displayName: 'Product Lifestyle & Sanctuary Scene',
    purpose: 'Atmospheric placement in natural Ayurvedic wellness ritual or home courtyard setting.',
    aspectRatio: '4:5',
    aspectRatioNumeric: 0.8,
    recommendedWidth: 1200,
    recommendedHeight: 1500,
    minWidth: 800,
    minHeight: 1000,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Keep essential human hands or focal objects within the middle 70% vertical span.',
    visualDirection: 'Warm morning light, terracotta and raw linen accents, serene personal care ritual.',
  },
  PRODUCT_PACKAGING: {
    slotKey: 'PRODUCT_PACKAGING',
    role: 'PACKAGING',
    displayName: 'Packaging & Specification Detail',
    purpose: 'Detailed packaging visual showing eco-pouch, vacuum seal, and batch labeling geometry.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PRODUCT_RENDER'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Full pouch visible with clear text contrast.',
    visualDirection: 'Crisp focus on kraft zipper pouch, airtight seal, and botanical authenticity badge.',
  },
  PRODUCT_DETAIL: {
    slotKey: 'PRODUCT_DETAIL',
    role: 'DETAIL',
    displayName: 'Macro Sift & Texture Closeup',
    purpose: 'Extreme macro closeup demonstrating microfine cloth-sift quality and fresh olive-green tint.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'BOTANICAL'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Full-bleed macro texture with high focal clarity.',
    visualDirection: 'Fine silky particle granularity, soft natural shadows, zero clumping or sand debris.',
  },
  PRODUCT_USAGE: {
    slotKey: 'PRODUCT_USAGE',
    role: 'USAGE',
    displayName: 'Ritual Application & Paste Preparation',
    purpose: 'Demonstration of smooth paste preparation in a ceramic bowl with tea water or lemon.',
    aspectRatio: '4:5',
    aspectRatioNumeric: 0.8,
    recommendedWidth: 1200,
    recommendedHeight: 1500,
    minWidth: 800,
    minHeight: 1000,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PROCESS', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Bowl and applicator centered in lower two-thirds.',
    visualDirection: 'Rich lustrous dark green paste consistency, wooden whisk or spoon, mindful application.',
  },
  PRODUCT_INGREDIENTS: {
    slotKey: 'PRODUCT_INGREDIENTS',
    role: 'INGREDIENTS',
    displayName: 'Botanical Ingredients & Terroir Origin',
    purpose: 'Visual presentation of raw harvested leaves, seeds, or whole plant parts.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'BOTANICAL', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Arranged specimen layout on neutral textured ground.',
    visualDirection: 'Sun-dried whole Lawsonia inermis leaves, unground Amla berries, authentic Sojat terroir.',
  },
  PRODUCT_MOBILE: {
    slotKey: 'PRODUCT_MOBILE',
    role: 'MOBILE_HERO',
    displayName: 'Mobile-Optimized Vertical Hero',
    purpose: 'Vertical portrait hero optimized specifically for handheld smartphone screens.',
    aspectRatio: '9:16',
    aspectRatioNumeric: 9 / 16,
    recommendedWidth: 1080,
    recommendedHeight: 1920,
    minWidth: 600,
    minHeight: 1067,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'MOBILE',
    isRequired: false,
    safeAreaGuide: 'Top 15% and bottom 20% reserved for viewport UI overlays and CTA buttons.',
    visualDirection: 'Vertical composition emphasizing height, elegance, and natural botanical richness.',
  },

  // --- CATEGORY SLOTS ---
  CATEGORY_HERO: {
    slotKey: 'CATEGORY_HERO',
    role: 'HERO',
    displayName: 'Category Header Banner',
    purpose: 'Widescreen header banner introducing botanical taxonomy category.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION', 'BOTANICAL'],
    deviceTarget: 'DESKTOP',
    isRequired: true,
    safeAreaGuide: 'Keep key subjects inside the central 80% horizontal and 60% vertical box for text readability.',
    visualDirection: 'Cinematic wide crop, expansive botanical atmosphere, warm desert golden hour.',
  },
  CATEGORY_COLLECTION: {
    slotKey: 'CATEGORY_COLLECTION',
    role: 'GALLERY',
    displayName: 'Category Collection Arrangement',
    purpose: 'Square curation visual showing collection family together.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'BOTANICAL', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Balanced flat-lay arrangement with perimeter padding.',
    visualDirection: 'Artful curation of botanical powders, raw leaves, and glass apothecary jars.',
  },
  CATEGORY_MOBILE: {
    slotKey: 'CATEGORY_MOBILE',
    role: 'MOBILE_HERO',
    displayName: 'Category Mobile Header',
    purpose: 'Vertical header crop for mobile category browsing.',
    aspectRatio: '9:16',
    aspectRatioNumeric: 9 / 16,
    recommendedWidth: 1080,
    recommendedHeight: 1920,
    minWidth: 600,
    minHeight: 1067,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'MOBILE',
    isRequired: false,
    safeAreaGuide: 'Center 50% vertical focus.',
    visualDirection: 'Vertical botanical aesthetic with deep forest green and cream contrasts.',
  },

  // --- GUIDE SLOTS ---
  GUIDE_HERO: {
    slotKey: 'GUIDE_HERO',
    role: 'HERO',
    displayName: 'Editorial Guide Cover',
    purpose: 'Widescreen editorial header cover for step-by-step application and mixing guides.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'DESKTOP',
    isRequired: true,
    safeAreaGuide: 'Leave central and left areas uncluttered for article title typography overlay.',
    visualDirection: 'Serene editorial mood, mindful Ayurvedic ritual, soft lighting, clean composition.',
  },
  GUIDE_PROCESS: {
    slotKey: 'GUIDE_PROCESS',
    role: 'PROCESS',
    displayName: 'Step-by-Step Preparation Breakdown',
    purpose: 'Visual guide documenting precise paste resting time, dye release, or rinse method.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1000,
    minHeight: 562,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PROCESS', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Step sequential flow from left to right.',
    visualDirection: 'Clean instructional clarity, natural hands-on technique, authentic ingredients.',
  },
  GUIDE_INFOGRAPHIC: {
    slotKey: 'GUIDE_INFOGRAPHIC',
    role: 'INFOGRAPHIC',
    displayName: 'Preparation & Timing Infographic',
    purpose: 'Detailed ratio and timing chart (e.g., 2-Step Henna + Indigo Black formulation).',
    aspectRatio: '4:5',
    aspectRatioNumeric: 0.8,
    recommendedWidth: 1200,
    recommendedHeight: 1500,
    minWidth: 800,
    minHeight: 1000,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['INFOGRAPHIC', 'ILLUSTRATION', 'CARTOON'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Margin of 40px around outer edge for text retention on mobile zoom.',
    visualDirection: 'Crisp vector charts, elegant botanical iconography, cream backdrop, dark green/gold lines.',
  },

  // --- KNOWLEDGE GRAPH SLOTS ---
  KNOWLEDGE_HERO: {
    slotKey: 'KNOWLEDGE_HERO',
    role: 'HERO',
    displayName: 'Botanical Monograph Plate',
    purpose: 'Authoritative encyclopedic botanical header illustration or specimen plate.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['BOTANICAL', 'ILLUSTRATION'],
    deviceTarget: 'DESKTOP',
    isRequired: true,
    safeAreaGuide: 'Botanical specimen centered on archival cream paper with scientific margins.',
    visualDirection: 'Archival naturalist botanical illustration (Curtis Botanical style), delicate linework, watercolor tint, strictly NO commercial product pouches or bottles.',
  },
  KNOWLEDGE_BOTANICAL: {
    slotKey: 'KNOWLEDGE_BOTANICAL',
    role: 'DETAIL',
    displayName: 'Botanical Anatomy Plate',
    purpose: 'Square botanical plate showing flower, leaf cross-section, and seed pod morphology.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['BOTANICAL', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Anatomical elements neatly labeled or isolated with breathing room.',
    visualDirection: 'Vintage herbarium specimen aesthetic, accurate plant taxonomy, earthy greens and sepia.',
  },
  KNOWLEDGE_INFOGRAPHIC: {
    slotKey: 'KNOWLEDGE_INFOGRAPHIC',
    role: 'INFOGRAPHIC',
    displayName: 'Phytochemical & Lawsone Analysis Chart',
    purpose: 'Scientific chart detailing lawsone content, soil chemistry, harvest timing, or grading.',
    aspectRatio: '4:5',
    aspectRatioNumeric: 0.8,
    recommendedWidth: 1200,
    recommendedHeight: 1500,
    minWidth: 800,
    minHeight: 1000,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['INFOGRAPHIC', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'High legible contrast for data points and chemical structure diagrams.',
    visualDirection: 'Clean minimalist science, cream background, green and gold data points.',
  },

  // --- BRAND HERITAGE SLOTS ---
  BRAND_HERO: {
    slotKey: 'BRAND_HERO',
    role: 'HERO',
    displayName: 'Brand Terroir & Mission Banner',
    purpose: 'Homepage hero and brand heritage banner celebrating Sojat, Rajasthan origin.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'DESKTOP',
    isRequired: true,
    safeAreaGuide: 'Horizon in upper third, expansive landscape with typography space.',
    visualDirection: 'Sojat arid red-soil plains, golden morning dawn, mature henna shrub plantations.',
  },
  BRAND_STORY: {
    slotKey: 'BRAND_STORY',
    role: 'LIFESTYLE',
    displayName: 'Farmer Partnership & Harvest Story',
    purpose: 'Visual documentation of generational farming craft and ethical local partnership.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Subject in natural motion without direct lens stare.',
    visualDirection: 'Respectful, authentic Rajasthani farmer hand-harvesting lush green henna branches.',
  },
  BRAND_PROCESS: {
    slotKey: 'BRAND_PROCESS',
    role: 'PROCESS',
    displayName: 'Cold Milling & Triple Cloth Sifting Craft',
    purpose: 'Demonstrating zero-heat micro-pulverization and fine mesh cloth filtration.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1000,
    minHeight: 562,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PROCESS', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Detailed view of the cloth sieve and powder stream.',
    visualDirection: 'Purity assurance: ultra-fine powder passing through traditional muslin weave.',
  },
  BRAND_ICON: {
    slotKey: 'BRAND_ICON',
    role: 'ICON',
    displayName: 'Official Brand Seal / Mark',
    purpose: 'Authoritative brand seal, trust mark, or vector icon for headers and footers.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 512,
    recommendedHeight: 512,
    minWidth: 256,
    minHeight: 256,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/png', 'image/webp', 'image/svg+xml'],
    supportedMediaTypes: ['ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: true,
    safeAreaGuide: 'Symbol centered with 15% clear margin.',
    visualDirection: 'Official Musky Dose seal: forest green, gold leaf accents, authentic botanical monogram.',
  },

  // --- SOCIAL & OPENGRAPH SLOTS ---
  OPENGRAPH_META: {
    slotKey: 'OPENGRAPH_META',
    role: 'OG_SOCIAL',
    displayName: 'OpenGraph & Twitter Share Card',
    purpose: 'Preview thumbnail when links are shared on WhatsApp, Facebook, LinkedIn, or Twitter.',
    aspectRatio: '1.91:1',
    aspectRatioNumeric: 1.90476,
    recommendedWidth: 1200,
    recommendedHeight: 630,
    minWidth: 1200,
    minHeight: 630,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'ILLUSTRATION', 'PRODUCT_RENDER'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Keep all important graphic elements and text inside the center 1000×520 box.',
    visualDirection: 'Crisp brand presence, prominent product/topic presentation, high shareability.',
    canDeriveFrom: 'PRODUCT_PRIMARY',
    derivativeType: 'OPENGRAPH_1200x630',
  },
  SOCIAL_SQUARE: {
    slotKey: 'SOCIAL_SQUARE',
    role: 'SOCIAL_SQUARE',
    displayName: 'Social Feed Tile (1:1)',
    purpose: 'Square promotional tile for Instagram feed, WhatsApp catalog, and Google Shopping.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 1080,
    recommendedHeight: 1080,
    minWidth: 800,
    minHeight: 800,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'ILLUSTRATION', 'BOTANICAL', 'CARTOON'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Center focal element with 10% perimeter padding.',
    visualDirection: 'Rich color, premium editorial composition, high contrast on mobile feeds.',
    canDeriveFrom: 'PRODUCT_PRIMARY',
    derivativeType: 'SOCIAL_1080x1080',
  },
  SOCIAL_PORTRAIT: {
    slotKey: 'SOCIAL_PORTRAIT',
    role: 'SOCIAL_PORTRAIT',
    displayName: 'Social Story / Reel Cover (4:5)',
    purpose: 'Portrait story/post creative for Instagram, Pinterest, and mobile broadcasts.',
    aspectRatio: '4:5',
    aspectRatioNumeric: 0.8,
    recommendedWidth: 1080,
    recommendedHeight: 1350,
    minWidth: 800,
    minHeight: 1000,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION', 'CARTOON'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Top 10% and bottom 15% free from vital details.',
    visualDirection: 'Vertical elegance, warm ambiance, storytelling depth.',
  },
  PRODUCT_COMPARISON: {
    slotKey: 'PRODUCT_COMPARISON',
    role: 'COMPARISON',
    displayName: 'Product / Formula Comparison Visual',
    purpose: 'Comparison chart or visual demonstrating purity, mesh sift fineness, or lab assay versus generic powders.',
    aspectRatio: '4:5',
    aspectRatioNumeric: 0.8,
    recommendedWidth: 1200,
    recommendedHeight: 1500,
    minWidth: 800,
    minHeight: 1000,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['INFOGRAPHIC', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    safeAreaGuide: 'Clean side-by-side or column layout with readable typography.',
    visualDirection: 'Neutral botanical aesthetic, side-by-side comparison with authentic lab metrics.',
  },
  PRODUCT_THUMBNAIL: {
    slotKey: 'PRODUCT_THUMBNAIL',
    role: 'THUMBNAIL',
    displayName: 'Product Compact Thumbnail (1:1)',
    purpose: 'Compact thumbnail visual for cart, order summaries, search popovers, and quick-views.',
    aspectRatio: '1:1',
    aspectRatioNumeric: 1.0,
    recommendedWidth: 512,
    recommendedHeight: 512,
    minWidth: 256,
    minHeight: 256,
    maxFileSizeBytes: 2 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'PRODUCT_RENDER'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    visualDirection: 'Crisp centered packshot on clean white or warm neutral backdrop.',
    canDeriveFrom: 'PRODUCT_PRIMARY',
    derivativeType: 'THUMBNAIL_512x512',
  },
  MARKETING_BANNER: {
    slotKey: 'MARKETING_BANNER',
    role: 'BANNER',
    displayName: 'Marketing Campaign Banner (16:9)',
    purpose: 'Wide horizontal display banner for marketing announcements, seasonal sales, and header strips.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1600,
    recommendedHeight: 900,
    minWidth: 1200,
    minHeight: 675,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'UNIVERSAL',
    isRequired: false,
    visualDirection: 'Impactful widescreen composition with generous typography negative space.',
  },
  BRAND_DESKTOP_HERO: {
    slotKey: 'BRAND_DESKTOP_HERO',
    role: 'DESKTOP_HERO',
    displayName: 'Desktop Widescreen Hero Banner (16:9)',
    purpose: 'Large desktop viewport hero banner showcasing flagship botanical offerings.',
    aspectRatio: '16:9',
    aspectRatioNumeric: 16 / 9,
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    minWidth: 1440,
    minHeight: 810,
    maxFileSizeBytes: 8 * 1024 * 1024,
    allowedMimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
    supportedMediaTypes: ['PHOTO', 'LIFESTYLE', 'ILLUSTRATION'],
    deviceTarget: 'DESKTOP',
    isRequired: false,
    visualDirection: 'Cinematic widescreen hero image with high clarity and depth.',
  },
};

/**
 * Protected Brand Assets that must NEVER be marked as missing, replaced, or deleted!
 */
export const PROTECTED_OFFICIAL_BRAND_ASSETS = new Set<string>([
  '/logo.png',
  'public/logo.png',
  '/favicon.ico',
  'public/favicon.ico',
  '/favicon.png',
  'public/favicon.png',
  '/apple-touch-icon.png',
  'public/apple-touch-icon.png',
  '/icon-192.png',
  'public/icon-192.png',
  '/icon-512.png',
  'public/icon-512.png',
]);

/**
 * Checks whether an image matches the required aspect ratio within a standard 3% tolerance.
 */
export function checkAspectRatioMatch(
  width: number,
  height: number,
  expectedRatio: StandardAspectRatio,
  tolerance: number = 0.035
): { isMatch: boolean; actualRatioNumeric: number; targetRatioNumeric: number; diffPercent: number } {
  if (!width || !height || width <= 0 || height <= 0) {
    return { isMatch: false, actualRatioNumeric: 0, targetRatioNumeric: 0, diffPercent: 100 };
  }

  const actualRatio = width / height;
  let targetRatio = 1.0;

  switch (expectedRatio) {
    case '1:1':
      targetRatio = 1.0;
      break;
    case '4:5':
      targetRatio = 4 / 5; // 0.80
      break;
    case '16:9':
      targetRatio = 16 / 9; // ~1.778
      break;
    case '9:16':
      targetRatio = 9 / 16; // ~0.5625
      break;
    case '1.91:1':
      targetRatio = 1200 / 630; // ~1.90476
      break;
    case '3:2':
      targetRatio = 3 / 2; // 1.50
      break;
  }

  const diffPercent = Math.abs(actualRatio - targetRatio) / targetRatio;
  return {
    isMatch: diffPercent <= tolerance,
    actualRatioNumeric: Math.round(actualRatio * 1000) / 1000,
    targetRatioNumeric: Math.round(targetRatio * 1000) / 1000,
    diffPercent: Math.round(diffPercent * 10000) / 100,
  };
}

/**
 * Authoritative Canonical Slot Reconciliation Mapping.
 * Resolves legacy aliases, audit slot names, System 2 IDs, and roles to authoritative canonical slotKeys.
 */
export const SLOT_RECONCILIATION_MAP: Record<string, string> = {
  // System 2 Visual Blueprint slotId aliases
  'product-primary': 'PRODUCT_PRIMARY',
  'product-gallery': 'PRODUCT_GALLERY',
  'product-packaging': 'PRODUCT_PACKAGING',
  'product-lifestyle': 'PRODUCT_LIFESTYLE',
  'product-ritual': 'PRODUCT_USAGE',
  'product-usage': 'PRODUCT_USAGE',
  'product-macro': 'PRODUCT_DETAIL',
  'product-detail': 'PRODUCT_DETAIL',
  'product-botanical-source': 'PRODUCT_INGREDIENTS',
  'product-ingredients': 'PRODUCT_INGREDIENTS',
  'product-mobile': 'PRODUCT_MOBILE',
  'category-hero': 'CATEGORY_HERO',
  'category-mood': 'CATEGORY_COLLECTION',
  'category-collection': 'CATEGORY_COLLECTION',
  'category-botanical-origin': 'CATEGORY_COLLECTION',
  'category-mobile': 'CATEGORY_MOBILE',
  'guide-cover': 'GUIDE_HERO',
  'guide-hero': 'GUIDE_HERO',
  'guide-technique': 'GUIDE_PROCESS',
  'guide-process': 'GUIDE_PROCESS',
  'guide-infographic': 'GUIDE_INFOGRAPHIC',
  'knowledge-herbarium-hero': 'KNOWLEDGE_HERO',
  'knowledge-hero': 'KNOWLEDGE_HERO',
  'knowledge-botanical-plate': 'KNOWLEDGE_BOTANICAL',
  'knowledge-botanical': 'KNOWLEDGE_BOTANICAL',
  'knowledge-infographic': 'KNOWLEDGE_INFOGRAPHIC',
  'brand-sojat-heritage': 'BRAND_HERO',
  'brand-hero': 'BRAND_HERO',
  'brand-harvest-craft': 'BRAND_STORY',
  'brand-story': 'BRAND_STORY',
  'brand-cold-milling': 'BRAND_PROCESS',
  'brand-process': 'BRAND_PROCESS',
  'brand-seal-vector': 'BRAND_ICON',
  'brand-icon': 'BRAND_ICON',
  'brand-logo': 'BRAND_ICON',
  'logo': 'BRAND_ICON',
  'favicon': 'BRAND_ICON',
  'opengraph-meta': 'OPENGRAPH_META',
  'og-share': 'OPENGRAPH_META',
  'og': 'OPENGRAPH_META',
  'opengraph': 'OPENGRAPH_META',
  'social-square': 'SOCIAL_SQUARE',
  'social-portrait': 'SOCIAL_PORTRAIT',

  // Forensic Audit aliases
  'PRODUCT_GALLERY_1': 'PRODUCT_GALLERY',
  'PRODUCT_GALLERY_2': 'PRODUCT_GALLERY',
  'PRODUCT_BENEFITS': 'PRODUCT_LIFESTYLE',
  'PRODUCT_HOW_TO_USE': 'PRODUCT_USAGE',
  'PRODUCT_APPLICATION': 'PRODUCT_USAGE',
  'PRODUCT_CERTIFICATE': 'PRODUCT_PACKAGING',
  'PRODUCT_OG': 'OPENGRAPH_META',
  'CATEGORY_ICON': 'BRAND_ICON',
  'CATEGORY_LIFESTYLE': 'CATEGORY_COLLECTION',
  'CATEGORY_OG': 'OPENGRAPH_META',
  'GUIDE_STEP': 'GUIDE_PROCESS',
  'GUIDE_OG': 'OPENGRAPH_META',
  'BRAND_LOGO': 'BRAND_ICON',
  'HERO_PRIMARY': 'PRODUCT_PRIMARY',
  'BOTANICAL_RAW': 'PRODUCT_INGREDIENTS',

  // Generic canonical roles
  'PRIMARY': 'PRODUCT_PRIMARY',
  'PACKAGING': 'PRODUCT_PACKAGING',
  'LIFESTYLE': 'PRODUCT_LIFESTYLE',
  'DETAIL': 'PRODUCT_DETAIL',
  'USAGE': 'PRODUCT_USAGE',
  'APPLICATION': 'PRODUCT_USAGE',
  'application': 'PRODUCT_USAGE',
  'product-application': 'PRODUCT_USAGE',
  'INGREDIENTS': 'PRODUCT_INGREDIENTS',
  'GALLERY': 'PRODUCT_GALLERY',
  'HERO': 'CATEGORY_HERO',
  'OG_SOCIAL': 'OPENGRAPH_META',
  'ICON': 'BRAND_ICON',
  'PROCESS': 'GUIDE_PROCESS',
  'INFOGRAPHIC': 'GUIDE_INFOGRAPHIC',
  'MOBILE_HERO': 'PRODUCT_MOBILE',
  'COMPARISON': 'PRODUCT_COMPARISON',
  'comparison': 'PRODUCT_COMPARISON',
  'product-comparison': 'PRODUCT_COMPARISON',
  'THUMBNAIL': 'PRODUCT_THUMBNAIL',
  'thumbnail': 'PRODUCT_THUMBNAIL',
  'BANNER': 'MARKETING_BANNER',
  'banner': 'MARKETING_BANNER',
  'DESKTOP_HERO': 'BRAND_DESKTOP_HERO',
  'desktop_hero': 'BRAND_DESKTOP_HERO',
  'desktop-hero': 'BRAND_DESKTOP_HERO',
  'SOCIAL_SQUARE': 'SOCIAL_SQUARE',
  'social_square': 'SOCIAL_SQUARE',
  'SOCIAL_PORTRAIT': 'SOCIAL_PORTRAIT',
  'social_portrait': 'SOCIAL_PORTRAIT',
};

/**
 * Reconciles any arbitrary slotKey, slotId, or role into an authoritative canonical SlotSpecification.
 */
export function reconcileCanonicalSlot(
  rawSlotOrRole: string | undefined | null,
  entityType?: string
): SlotSpecification {
  if (!rawSlotOrRole || typeof rawSlotOrRole !== 'string') {
    return STANDARD_MEDIA_SPECS.PRODUCT_PRIMARY;
  }

  const clean = rawSlotOrRole.trim();
  const upper = clean.toUpperCase();
  const lower = clean.toLowerCase();

  // 1. Direct standard key match
  if (STANDARD_MEDIA_SPECS[upper]) {
    return STANDARD_MEDIA_SPECS[upper];
  }

  // 2. Entity-type contextual resolution for generic roles
  const normEntity = (entityType || 'PRODUCT').toUpperCase();
  if (upper === 'HERO') {
    if (normEntity === 'CATEGORY') return STANDARD_MEDIA_SPECS.CATEGORY_HERO;
    if (normEntity === 'GUIDE') return STANDARD_MEDIA_SPECS.GUIDE_HERO;
    if (normEntity === 'KNOWLEDGE') return STANDARD_MEDIA_SPECS.KNOWLEDGE_HERO;
    if (normEntity === 'BRAND' || normEntity === 'MARKETING') return STANDARD_MEDIA_SPECS.BRAND_HERO;
    return STANDARD_MEDIA_SPECS.PRODUCT_PRIMARY;
  }

  if (upper === 'BANNER') {
    if (normEntity === 'CATEGORY') return STANDARD_MEDIA_SPECS.CATEGORY_HERO;
    if (normEntity === 'BRAND') return STANDARD_MEDIA_SPECS.BRAND_HERO;
    if (normEntity === 'GUIDE') return STANDARD_MEDIA_SPECS.GUIDE_HERO;
    if (normEntity === 'KNOWLEDGE') return STANDARD_MEDIA_SPECS.KNOWLEDGE_HERO;
    return STANDARD_MEDIA_SPECS.MARKETING_BANNER;
  }

  if (upper === 'DESKTOP_HERO') {
    if (normEntity === 'CATEGORY') return STANDARD_MEDIA_SPECS.CATEGORY_HERO;
    if (normEntity === 'GUIDE') return STANDARD_MEDIA_SPECS.GUIDE_HERO;
    if (normEntity === 'KNOWLEDGE') return STANDARD_MEDIA_SPECS.KNOWLEDGE_HERO;
    return STANDARD_MEDIA_SPECS.BRAND_DESKTOP_HERO;
  }

  if (upper === 'THUMBNAIL') {
    return STANDARD_MEDIA_SPECS.PRODUCT_THUMBNAIL;
  }

  if (upper === 'COMPARISON') {
    return STANDARD_MEDIA_SPECS.PRODUCT_COMPARISON;
  }

  if (upper === 'OG' || upper === 'OG_SOCIAL') {
    return STANDARD_MEDIA_SPECS.OPENGRAPH_META;
  }

  if (upper === 'ICON') {
    return STANDARD_MEDIA_SPECS.BRAND_ICON;
  }

  if (upper === 'PROCESS') {
    if (normEntity === 'BRAND' || normEntity === 'MARKETING') return STANDARD_MEDIA_SPECS.BRAND_PROCESS;
    return STANDARD_MEDIA_SPECS.GUIDE_PROCESS;
  }

  if (upper === 'INFOGRAPHIC') {
    if (normEntity === 'KNOWLEDGE') return STANDARD_MEDIA_SPECS.KNOWLEDGE_INFOGRAPHIC;
    return STANDARD_MEDIA_SPECS.GUIDE_INFOGRAPHIC;
  }

  if (upper === 'MOBILE' || upper === 'MOBILE_HERO') {
    if (normEntity === 'CATEGORY') return STANDARD_MEDIA_SPECS.CATEGORY_MOBILE;
    return STANDARD_MEDIA_SPECS.PRODUCT_MOBILE;
  }

  if (upper === 'SOCIAL_SQUARE') {
    return STANDARD_MEDIA_SPECS.SOCIAL_SQUARE;
  }

  if (upper === 'SOCIAL_PORTRAIT') {
    return STANDARD_MEDIA_SPECS.SOCIAL_PORTRAIT;
  }

  // 3. Direct map lookup
  if (SLOT_RECONCILIATION_MAP[clean]) {
    const targetKey = SLOT_RECONCILIATION_MAP[clean];
    if (STANDARD_MEDIA_SPECS[targetKey]) return STANDARD_MEDIA_SPECS[targetKey];
  }

  if (SLOT_RECONCILIATION_MAP[lower]) {
    const targetKey = SLOT_RECONCILIATION_MAP[lower];
    if (STANDARD_MEDIA_SPECS[targetKey]) return STANDARD_MEDIA_SPECS[targetKey];
  }

  if (SLOT_RECONCILIATION_MAP[upper]) {
    const targetKey = SLOT_RECONCILIATION_MAP[upper];
    if (STANDARD_MEDIA_SPECS[targetKey]) return STANDARD_MEDIA_SPECS[targetKey];
  }

  // Default fallback
  return STANDARD_MEDIA_SPECS.PRODUCT_PRIMARY;
}


