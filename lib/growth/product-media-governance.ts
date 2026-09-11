/**
 * MUSKY DOSE — UNIVERSAL PRODUCT MEDIA GOVERNANCE SYSTEM V1
 * Single Canonical Shared Engine for Product Images, Videos, Formats, and Specifications
 *
 * ARCHITECTURAL PRINCIPLES:
 * 1. Single Canonical Media Truth:
 *    Every product surface (PDP, Cards, Homepage, Search, SEO, Merchant Feed) resolves
 *    media via resolveAuthoritativeProductMedia(product).
 * 2. Mixed Media Support:
 *    Seamlessly supports images only, videos only, or images + videos together.
 * 3. Centralized Specifications:
 *    Authoritative dimensions, aspect ratios, file size limits, and duration constraints
 *    aligned with modern Core Web Vitals and Google Merchant Center specifications.
 * 4. Zero Product-Specific Exceptions:
 *    Pure data-driven governance with zero hardcoded IDs, slugs, or category hacks.
 */

import { Product, ProductMediaItem, ProductMediaType, ProductMediaRole } from '../types';

export interface MediaPlacementSpec {
  id: string;
  name: string;
  mediaType: ProductMediaType;
  aspectRatio: string;
  minWidth: number;
  minHeight: number;
  recommendedWidth: number;
  recommendedHeight: number;
  maxSizeBytes: number;
  allowedFormats: string[];
  preferredFormat: string;
  cropStrategy: 'cover' | 'contain';
  mobileGuidance: string;
  desktopGuidance: string;
  durationGuidance?: { minSeconds: number; maxSeconds: number };
}

/**
 * Authoritative Media Specifications for All Site Placements
 */
export const MEDIA_PLACEMENT_SPECS: Record<string, MediaPlacementSpec> = {
  PRODUCT_PRIMARY_IMAGE: {
    id: 'PRODUCT_PRIMARY_IMAGE',
    name: 'Product Primary Image',
    mediaType: 'image',
    aspectRatio: '1:1',
    minWidth: 500, // Google Merchant Center 2027 requirement
    minHeight: 500,
    recommendedWidth: 1500,
    recommendedHeight: 1500,
    maxSizeBytes: 16 * 1024 * 1024, // 16MB Google max
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    preferredFormat: 'image/webp',
    cropStrategy: 'cover',
    mobileGuidance: 'Rendered at 100vw or 50vw. Clear botanical presentation with white or neutral backdrop.',
    desktopGuidance: 'Zoomable square container (1:1). Recommended 1500x1500px for sharp high-DPI inspection.',
  },
  PRODUCT_GALLERY_IMAGE: {
    id: 'PRODUCT_GALLERY_IMAGE',
    name: 'Product Gallery Image',
    mediaType: 'image',
    aspectRatio: '1:1',
    minWidth: 500,
    minHeight: 500,
    recommendedWidth: 1200,
    recommendedHeight: 1200,
    maxSizeBytes: 16 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    preferredFormat: 'image/webp',
    cropStrategy: 'cover',
    mobileGuidance: 'Thumbnail carousel item. Consistent square framing.',
    desktopGuidance: 'Gallery thumbnail (80x80) and main viewer. Shows ingredients, harvest origin, or packaging.',
  },
  PRODUCT_CARD_IMAGE: {
    id: 'PRODUCT_CARD_IMAGE',
    name: 'Catalog & Grid Product Card',
    mediaType: 'image',
    aspectRatio: '1:1',
    minWidth: 400,
    minHeight: 400,
    recommendedWidth: 800,
    recommendedHeight: 800,
    maxSizeBytes: 5 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/avif'],
    preferredFormat: 'image/webp',
    cropStrategy: 'cover',
    mobileGuidance: '2-column mobile grid. Lazy loaded below the fold.',
    desktopGuidance: '3 or 4-column desktop grid. Hover zoom transition effect.',
  },
  PRODUCT_VIDEO: {
    id: 'PRODUCT_VIDEO',
    name: 'Product Demonstration Video',
    mediaType: 'video',
    aspectRatio: '16:9',
    minWidth: 720,
    minHeight: 480,
    recommendedWidth: 1920,
    recommendedHeight: 1080,
    maxSizeBytes: 25 * 1024 * 1024, // 25MB direct upload, or external link
    allowedFormats: ['video/mp4', 'video/webm'],
    preferredFormat: 'video/mp4',
    cropStrategy: 'contain',
    mobileGuidance: 'Responsive inline playback with controls. Poster image loaded first to save mobile bandwidth.',
    desktopGuidance: 'Embedded 16:9 high-definition video showcase with play/pause and fullscreen capability.',
    durationGuidance: { minSeconds: 6, maxSeconds: 240 }, // Google Merchant standard
  },
  VIDEO_POSTER: {
    id: 'VIDEO_POSTER',
    name: 'Video Poster Thumbnail',
    mediaType: 'image',
    aspectRatio: '16:9',
    minWidth: 500,
    minHeight: 281,
    recommendedWidth: 1280,
    recommendedHeight: 720,
    maxSizeBytes: 5 * 1024 * 1024,
    allowedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    preferredFormat: 'image/webp',
    cropStrategy: 'cover',
    mobileGuidance: 'Preloaded before video starts. Prevents layout shift (CLS).',
    desktopGuidance: 'Crisp video cover shown in gallery thumbnail with play icon overlay.',
  },
};

/**
 * Validates and parses external video URLs (YouTube, Vimeo, or Direct Streams).
 */
export function validateExternalVideoUrl(url: string): {
  valid: boolean;
  provider: 'youtube' | 'vimeo' | 'external' | 'upload';
  embedUrl: string;
  videoId?: string;
  thumbnailUrl?: string;
  error?: string;
} {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return { valid: false, provider: 'external', embedUrl: '', error: 'Video URL cannot be empty.' };
  }

  const cleanUrl = url.trim();

  // 1. YouTube detection (standard watch, short youtu.be, embed, shorts)
  const ytMatch = cleanUrl.match(
    /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    return {
      valid: true,
      provider: 'youtube',
      videoId,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  // 2. Vimeo detection
  const vimeoMatch = cleanUrl.match(/(?:https?:\/\/)?(?:www\.)?(?:player\.)?vimeo\.com\/(?:video\/)?([0-9]+)/i);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    return {
      valid: true,
      provider: 'vimeo',
      videoId,
      embedUrl: `https://player.vimeo.com/video/${videoId}?dnt=1`,
    };
  }

  // 3. Direct video stream or cloud storage file (MP4, WebM)
  try {
    const parsed = new URL(cleanUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { valid: false, provider: 'external', embedUrl: '', error: 'URL must use http or https protocol.' };
    }

    const pathname = parsed.pathname.toLowerCase();
    const isDirectVideo =
      pathname.endsWith('.mp4') ||
      pathname.endsWith('.webm') ||
      pathname.includes('/video/') ||
      pathname.includes('product-videos');

    return {
      valid: true,
      provider: isDirectVideo ? 'upload' : 'external',
      embedUrl: cleanUrl,
    };
  } catch {
    return { valid: false, provider: 'external', embedUrl: '', error: 'Invalid URL format.' };
  }
}

/**
 * Resolved Product Media Contract
 */
export interface AuthoritativeProductMedia {
  primaryImage: string;
  primaryMediaItem?: ProductMediaItem;
  galleryImages: ProductMediaItem[];
  images: ProductMediaItem[];
  videos: ProductMediaItem[];
  allMedia: ProductMediaItem[];
  media: ProductMediaItem[];
  hasVideo: boolean;
  totalItems: number;
}

const FALLBACK_IMAGE = '/images/fallback.svg';

/**
 * Single Canonical Product Media Resolver
 * Unifies structured Product.media and legacy Product.images.
 */
export function resolveAuthoritativeProductMedia(
  product: Partial<Product> | null | undefined
): AuthoritativeProductMedia {
  if (!product) {
    return {
      primaryImage: FALLBACK_IMAGE,
      galleryImages: [],
      images: [],
      videos: [],
      allMedia: [],
      media: [],
      hasVideo: false,
      totalItems: 0,
    };
  }

  const structuredMedia: ProductMediaItem[] = [];

  // 1. Ingest existing structured media if present
  if (Array.isArray(product.media) && product.media.length > 0) {
    for (const item of product.media) {
      if (item && item.url && item.enabled !== false) {
        let embedUrl = item.embedUrl;
        let posterUrl = item.posterUrl || item.thumbnailUrl;
        let thumbnailUrl = item.thumbnailUrl || item.posterUrl;
        let provider = item.provider;
        if (item.type === 'video' && (!embedUrl || !provider)) {
          const parsed = validateExternalVideoUrl(item.url);
          if (parsed.valid) {
            embedUrl = embedUrl || parsed.embedUrl;
            provider = provider || parsed.provider;
            posterUrl = posterUrl || parsed.thumbnailUrl;
            thumbnailUrl = thumbnailUrl || parsed.thumbnailUrl;
          }
        }
        structuredMedia.push({
          ...item,
          embedUrl,
          posterUrl,
          thumbnailUrl,
          provider,
          sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : 999,
        });
      }
    }
  }

  // 2. Ingest legacy product.images strings if not already in structured media
  const existingUrls = new Set(structuredMedia.map((m) => m.url));
  if (Array.isArray(product.images)) {
    product.images.forEach((imgUrl, index) => {
      if (imgUrl && typeof imgUrl === 'string' && imgUrl.trim() && !existingUrls.has(imgUrl)) {
        structuredMedia.push({
          id: `legacy-img-${index}-${Date.now()}`,
          type: 'image',
          url: imgUrl.trim(),
          role: index === 0 ? 'PRIMARY' : 'GALLERY',
          sortOrder: index + 1,
          enabled: true,
          altText: product.name ? `${product.name} view ${index + 1}` : undefined,
        });
        existingUrls.add(imgUrl.trim());
      }
    });
  }

  // 3. Separate images and videos
  const activeImages = structuredMedia
    .filter((m) => m.type === 'image')
    .sort((a, b) => {
      if (a.role === 'PRIMARY') return -1;
      if (b.role === 'PRIMARY') return 1;
      return a.sortOrder - b.sortOrder;
    });

  const activeVideos = structuredMedia
    .filter((m) => m.type === 'video')
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // 4. Resolve primary image
  let primaryImage = FALLBACK_IMAGE;
  let primaryMediaItem: ProductMediaItem | undefined;

  const explicitPrimary = activeImages.find((img) => img.role === 'PRIMARY' && !img.url.includes('fallback.svg'));
  if (explicitPrimary) {
    primaryImage = explicitPrimary.url;
    primaryMediaItem = explicitPrimary;
  } else {
    const firstNonFallback = activeImages.find((img) => !img.url.includes('fallback.svg'));
    if (firstNonFallback) {
      primaryImage = firstNonFallback.url;
      primaryMediaItem = firstNonFallback;
    } else if (activeImages.length > 0) {
      primaryImage = activeImages[0].url;
      primaryMediaItem = activeImages[0];
    }
  }

  // 5. Build combined allMedia list
  // Primary image is position 1, followed by gallery images and videos sorted by sortOrder
  const allMedia: ProductMediaItem[] = [...activeImages, ...activeVideos].sort((a, b) => {
    if (a.id === primaryMediaItem?.id) return -1;
    if (b.id === primaryMediaItem?.id) return 1;
    return a.sortOrder - b.sortOrder;
  });

  return {
    primaryImage,
    primaryMediaItem,
    galleryImages: activeImages,
    images: activeImages,
    videos: activeVideos,
    allMedia,
    media: allMedia,
    hasVideo: activeVideos.length > 0,
    totalItems: allMedia.length,
  };
}

/**
 * Emits Schema.org image array and VideoObject metadata.
 */
export function generateProductMediaSchema(
  product: Product,
  baseUrl: string = 'https://muskydose.in'
): {
  images: string[];
  videos: any[];
  videoObjects?: any[];
} {
  const media = resolveAuthoritativeProductMedia(product);

  const images = media.galleryImages
    .map((img) => (img.url.startsWith('http') ? img.url : `${baseUrl}${img.url.startsWith('/') ? '' : '/'}${img.url}`))
    .filter((url) => !url.includes('fallback.svg'));

  const videoObjects = media.videos.map((vid) => ({
    '@type': 'VideoObject',
    name: vid.title || `${product.name} Demonstration`,
    description: vid.caption || `${product.name} pure botanical overview from Sojat, Rajasthan.`,
    thumbnailUrl: vid.thumbnailUrl
      ? vid.thumbnailUrl.startsWith('http')
        ? vid.thumbnailUrl
        : `${baseUrl}${vid.thumbnailUrl.startsWith('/') ? '' : '/'}${vid.thumbnailUrl}`
      : images[0] || `${baseUrl}/images/fallback.svg`,
    uploadDate: product.createdAt || new Date().toISOString(),
    contentUrl: vid.url.startsWith('http') ? vid.url : `${baseUrl}${vid.url}`,
    embedUrl: vid.url,
    duration: vid.duration ? `PT${Math.floor(vid.duration)}S` : undefined,
  }));

  return {
    images: images,
    videos: videoObjects,
    videoObjects: videoObjects.length > 0 ? videoObjects : undefined,
  };
}

/**
 * Extracts Google Merchant XML Feed media attributes.
 */
export function extractMerchantFeedMedia(
  product: Product,
  baseUrl: string = 'https://muskydose.in'
): {
  imageLink: string;
  additionalImageLinks: string[];
  videoLinks: string[];
} {
  const media = resolveAuthoritativeProductMedia(product);

  const formatUrl = (url: string) =>
    url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;

  const validImages = media.galleryImages
    .map((img) => img.url)
    .filter((url) => url && !url.includes('fallback.svg'))
    .map(formatUrl);

  const imageLink = validImages[0] || '';
  const additionalImageLinks = validImages.slice(1, 10); // Google allows up to 10 additional images

  const videoLinks = media.videos
    .filter((v) => v.enabled !== false && v.url)
    .map((v) => formatUrl(v.url))
    .slice(0, 10); // Google allows up to 10 video links

  return {
    imageLink,
    additionalImageLinks,
    videoLinks,
  };
}
