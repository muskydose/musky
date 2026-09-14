import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  saveMediaAsset,
  getMediaForEntity,
  getPrimaryMedia,
  resolveAuthoritativeMedia,
  computeFileHash,
  findAssetByHash,
  resetMediaCache,
  MediaAsset,
  MediaEntityType,
  MediaAssetRole,
  SaveMediaAssetInput,
} from '@/lib/db/media';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';
import { getSiteSettings } from '@/lib/db/settings';
import { getSupabaseAdmin } from '@/lib/supabase';
import { ProductMediaItem } from '@/lib/types';

// ============================================================================
// TYPES & REPORTING CONTRACTS
// ============================================================================

export interface MediaMigrationEntityCount {
  products: number;
  categories: number;
  guides: number;
  knowledgeEntities: number;
  siteSettings: number;
}

export interface MediaMigrationMetrics {
  entityCounts: MediaMigrationEntityCount;
  sourceRecordsProcessed: number;
  mediaAssetsCreated: number;
  mediaAssetsUpdated: number;
  duplicatesDeduplicated: number;
  primaryAssignedCount: number;
  orphanAssetsDetected: Array<{ path: string; bucket: string; sizeBytes?: number }>;
  missingOrBrokenUrls: Array<{ url: string; entityType: string; entityId?: string; reason: string }>;
  durationMs: number;
}

export interface MigrationOptions {
  dryRun?: boolean;
  clearExistingMedia?: boolean;
  verbose?: boolean;
}

// ============================================================================
// HASHING & BINARY UTILITIES
// ============================================================================

/**
 * Computes SHA-256 for a local file if it exists, or falls back to URL-based hash.
 */
export function resolveBinaryHashAndMetadata(url: string): {
  hash: string;
  sizeBytes?: number;
  mimeType: string;
  isLocalBinary: boolean;
  existsOnDisk: boolean;
} {
  const cleanUrl = (url || '').trim();
  const lower = cleanUrl.toLowerCase();

  // 1. Determine MIME type
  let mimeType = 'image/webp';
  if (lower.endsWith('.png')) mimeType = 'image/png';
  else if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) mimeType = 'image/jpeg';
  else if (lower.endsWith('.svg')) mimeType = 'image/svg+xml';
  else if (lower.endsWith('.webp')) mimeType = 'image/webp';
  else if (lower.endsWith('.ico')) mimeType = 'image/x-icon';

  // 2. Check local file in public/
  if (cleanUrl.startsWith('/')) {
    const localRelative = cleanUrl.replace(/^\//, '');
    const localPath = path.join(process.cwd(), 'public', localRelative);
    if (fs.existsSync(localPath)) {
      try {
        const buffer = fs.readFileSync(localPath);
        const hash = computeFileHash(buffer);
        return {
          hash,
          sizeBytes: buffer.length,
          mimeType,
          isLocalBinary: true,
          existsOnDisk: true,
        };
      } catch {
        // Fallback to URL hash if read fails
      }
    } else {
      // Local reference but missing on disk
      const hash = crypto.createHash('sha256').update(cleanUrl).digest('hex');
      return {
        hash,
        mimeType,
        isLocalBinary: true,
        existsOnDisk: false,
      };
    }
  }

  // 3. Remote URL: Compute cryptographic SHA-256 of normalized URL
  const normalizedUrl = cleanUrl.split('?')[0].toLowerCase();
  const hash = crypto.createHash('sha256').update(normalizedUrl).digest('hex');
  return {
    hash,
    mimeType,
    isLocalBinary: false,
    existsOnDisk: true,
  };
}

/**
 * Generates a deterministic asset ID to guarantee 100% idempotent rerun.
 */
export function generateDeterministicAssetId(
  entityType: MediaEntityType,
  entityId: string | undefined,
  role: MediaAssetRole,
  index: number
): string {
  const cleanType = entityType.toLowerCase();
  const cleanId = (entityId || 'global').replace(/[^a-zA-Z0-9-_]/g, '-');
  return `legacy-${cleanType}-${cleanId}-${role.toLowerCase()}-${index}`;
}

// ============================================================================
// CANONICAL BACKFILL & MIGRATION ENGINE
// ============================================================================

export async function runMediaMigration(options: MigrationOptions = {}): Promise<MediaMigrationMetrics> {
  const startTime = Date.now();
  const { dryRun = false, clearExistingMedia = false, verbose = false } = options;

  if (clearExistingMedia) {
    resetMediaCache({ clearFallbackStore: true });
  }

  const metrics: MediaMigrationMetrics = {
    entityCounts: {
      products: 0,
      categories: 0,
      guides: 0,
      knowledgeEntities: 0,
      siteSettings: 0,
    },
    sourceRecordsProcessed: 0,
    mediaAssetsCreated: 0,
    mediaAssetsUpdated: 0,
    duplicatesDeduplicated: 0,
    primaryAssignedCount: 0,
    orphanAssetsDetected: [],
    missingOrBrokenUrls: [],
    durationMs: 0,
  };

  const knownHashes = new Set<string>();

  // --------------------------------------------------------------------------
  // SOURCE 1: PRODUCTS (products.images & products.media)
  // --------------------------------------------------------------------------
  const products = await getAllProductsAdmin();
  metrics.entityCounts.products = products.length;

  for (const product of products) {
    // Gather all media items (parsed media or raw images)
    const mediaItemsToProcess: Array<{
      url: string;
      role: MediaAssetRole;
      sortOrder: number;
      title?: string;
      altText?: string;
      caption?: string;
    }> = [];

    if (Array.isArray(product.media) && product.media.length > 0) {
      product.media.forEach((item: ProductMediaItem, idx: number) => {
        if (item.url) {
          mediaItemsToProcess.push({
            url: item.url,
            role: (item.role as MediaAssetRole) || (idx === 0 ? 'PRIMARY' : 'GALLERY'),
            sortOrder: item.sortOrder || idx + 1,
            title: item.title || product.name,
            altText: item.altText || product.name,
            caption: item.caption,
          });
        }
      });
    } else if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((img: string, idx: number) => {
        if (typeof img === 'string' && img.trim()) {
          mediaItemsToProcess.push({
            url: img.trim(),
            role: idx === 0 ? 'PRIMARY' : 'GALLERY',
            sortOrder: idx + 1,
            title: product.name,
            altText: `${product.name} visual ${idx + 1}`,
          });
        }
      });
    }

    let hasPrimary = false;
    for (let i = 0; i < mediaItemsToProcess.length; i++) {
      const item = mediaItemsToProcess[i];
      metrics.sourceRecordsProcessed++;

      const meta = resolveBinaryHashAndMetadata(item.url);
      if (meta.isLocalBinary && !meta.existsOnDisk) {
        metrics.missingOrBrokenUrls.push({
          url: item.url,
          entityType: 'PRODUCT',
          entityId: product.id,
          reason: 'Local file referenced does not exist in public directory',
        });
      }

      if (knownHashes.has(meta.hash)) {
        metrics.duplicatesDeduplicated++;
      } else {
        knownHashes.add(meta.hash);
      }

      const role: MediaAssetRole = item.role;
      if (role === 'PRIMARY' && !hasPrimary) {
        hasPrimary = true;
        metrics.primaryAssignedCount++;
      }

      const assetId = generateDeterministicAssetId('PRODUCT', product.id, role, i);

      const assetInput: SaveMediaAssetInput = {
        id: assetId,
        entityType: 'PRODUCT',
        entityId: product.id,
        url: item.url,
        fileHash: meta.hash,
        fileSizeBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
        role,
        source: 'MANUAL_UPLOAD',
        status: 'approved',
        isLocked: role === 'PRIMARY',
        title: item.title,
        altText: item.altText,
        caption: item.caption,
        sortOrder: item.sortOrder,
        visualContext: {
          legacyProductId: product.id,
          productName: product.name,
          categoryName: product.categoryName,
          index: i,
        },
      };

      if (!dryRun) {
        const res = await saveMediaAsset(assetInput);
        if (res.deduplicated) {
          // Additional DAL-level deduplication confirmed
        }
        metrics.mediaAssetsCreated++;
      } else {
        metrics.mediaAssetsCreated++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // SOURCE 2: CATEGORIES (categories.image)
  // --------------------------------------------------------------------------
  const categories = await getCategories();
  metrics.entityCounts.categories = categories.length;

  for (const category of categories) {
    if (category.image) {
      metrics.sourceRecordsProcessed++;
      const meta = resolveBinaryHashAndMetadata(category.image);

      if (meta.isLocalBinary && !meta.existsOnDisk) {
        metrics.missingOrBrokenUrls.push({
          url: category.image,
          entityType: 'CATEGORY',
          entityId: category.id,
          reason: 'Category image referenced does not exist in public directory',
        });
      }

      if (knownHashes.has(meta.hash)) {
        metrics.duplicatesDeduplicated++;
      } else {
        knownHashes.add(meta.hash);
      }

      metrics.primaryAssignedCount++;
      const assetId = generateDeterministicAssetId('CATEGORY', category.id, 'HERO', 0);

      const assetInput: SaveMediaAssetInput = {
        id: assetId,
        entityType: 'CATEGORY',
        entityId: category.id,
        url: category.image,
        fileHash: meta.hash,
        fileSizeBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
        role: 'HERO',
        source: 'MANUAL_UPLOAD',
        status: 'approved',
        isLocked: true,
        title: category.name,
        altText: `${category.name} category visual`,
        sortOrder: category.sortOrder || 1,
        visualContext: {
          legacyCategoryId: category.id,
          categoryName: category.name,
          slug: category.slug,
        },
      };

      if (!dryRun) {
        await saveMediaAsset(assetInput);
      }
      metrics.mediaAssetsCreated++;
    }
  }

  // --------------------------------------------------------------------------
  // SOURCE 3: GUIDES (product_guides.cover_image)
  // --------------------------------------------------------------------------
  const guides = await getGuides();
  metrics.entityCounts.guides = guides.length;

  for (const guide of guides) {
    if (guide.coverImage) {
      metrics.sourceRecordsProcessed++;
      const meta = resolveBinaryHashAndMetadata(guide.coverImage);

      if (meta.isLocalBinary && !meta.existsOnDisk) {
        metrics.missingOrBrokenUrls.push({
          url: guide.coverImage,
          entityType: 'GUIDE',
          entityId: guide.id,
          reason: 'Guide cover image does not exist on disk',
        });
      }

      if (knownHashes.has(meta.hash)) {
        metrics.duplicatesDeduplicated++;
      } else {
        knownHashes.add(meta.hash);
      }

      metrics.primaryAssignedCount++;
      const assetId = generateDeterministicAssetId('GUIDE', guide.id, 'HERO', 0);

      const assetInput: SaveMediaAssetInput = {
        id: assetId,
        entityType: 'GUIDE',
        entityId: guide.id,
        url: guide.coverImage,
        fileHash: meta.hash,
        fileSizeBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
        role: 'HERO',
        source: 'MANUAL_UPLOAD',
        status: 'approved',
        isLocked: true,
        title: guide.title,
        altText: `${guide.title} guide cover`,
        sortOrder: guide.sortOrder || 1,
        visualContext: {
          legacyGuideId: guide.id,
          guideSlug: guide.slug,
        },
      };

      if (!dryRun) {
        await saveMediaAsset(assetInput);
      }
      metrics.mediaAssetsCreated++;
    }
  }

  // --------------------------------------------------------------------------
  // SOURCE 4: KNOWLEDGE ENTITIES (knowledge_entities.og_image_url)
  // --------------------------------------------------------------------------
  const knowledgeEntities = await getAllKnowledgeEntitiesAdmin();
  metrics.entityCounts.knowledgeEntities = knowledgeEntities.length;

  for (const entity of knowledgeEntities) {
    if (entity.ogImageUrl) {
      metrics.sourceRecordsProcessed++;
      const meta = resolveBinaryHashAndMetadata(entity.ogImageUrl);

      if (knownHashes.has(meta.hash)) {
        metrics.duplicatesDeduplicated++;
      } else {
        knownHashes.add(meta.hash);
      }

      metrics.primaryAssignedCount++;
      const assetId = generateDeterministicAssetId('KNOWLEDGE', entity.entityKey, 'OG_SOCIAL', 0);

      const assetInput: SaveMediaAssetInput = {
        id: assetId,
        entityType: 'KNOWLEDGE',
        entityId: entity.entityKey,
        url: entity.ogImageUrl,
        fileHash: meta.hash,
        fileSizeBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
        role: 'OG_SOCIAL',
        source: 'MANUAL_UPLOAD',
        status: 'approved',
        isLocked: true,
        title: entity.canonicalName,
        altText: `${entity.canonicalName} Knowledge Card`,
        sortOrder: entity.sortOrder || 1,
        visualContext: {
          entityKey: entity.entityKey,
          canonicalName: entity.canonicalName,
        },
      };

      if (!dryRun) {
        await saveMediaAsset(assetInput);
      }
      metrics.mediaAssetsCreated++;
    }
  }

  // --------------------------------------------------------------------------
  // SOURCE 5: SITE SETTINGS (mediaLibrary)
  // --------------------------------------------------------------------------
  const settings = await getSiteSettings();
  metrics.entityCounts.siteSettings = 1;

  if (Array.isArray(settings.mediaLibrary) && settings.mediaLibrary.length > 0) {
    for (let i = 0; i < settings.mediaLibrary.length; i++) {
      const item = settings.mediaLibrary[i];
      if (item.url) {
        metrics.sourceRecordsProcessed++;
        const meta = resolveBinaryHashAndMetadata(item.url);

        if (meta.isLocalBinary && !meta.existsOnDisk) {
          metrics.missingOrBrokenUrls.push({
            url: item.url,
            entityType: 'BRAND',
            entityId: item.id,
            reason: 'MediaLibrary item URL missing on disk',
          });
        }

        if (knownHashes.has(meta.hash)) {
          metrics.duplicatesDeduplicated++;
        } else {
          knownHashes.add(meta.hash);
        }

        let role: MediaAssetRole = 'GALLERY';
        if (item.category === 'hero') role = 'HERO';
        else if (item.category === 'factory') role = 'LIFESTYLE';
        else if (item.category === 'brand') role = 'ICON';
        else if (item.category === 'og') role = 'OG_SOCIAL';

        const assetId = generateDeterministicAssetId('BRAND', 'library', role, i);

        const assetInput: SaveMediaAssetInput = {
          id: assetId,
          entityType: 'BRAND',
          entityId: 'media-library',
          url: item.url,
          fileHash: meta.hash,
          fileSizeBytes: item.size || meta.sizeBytes,
          mimeType: item.type || meta.mimeType,
          role,
          source: 'MANUAL_UPLOAD',
          status: 'approved',
          isLocked: true,
          title: item.name,
          altText: item.altText,
          sortOrder: i + 1,
          visualContext: {
            libraryItemId: item.id,
            usedIn: item.usedIn,
          },
        };

        if (!dryRun) {
          await saveMediaAsset(assetInput);
        }
        metrics.mediaAssetsCreated++;
      }
    }
  }

  // --------------------------------------------------------------------------
  // SOURCE 6: BRAND CORE ASSETS (logoUrl, faviconUrl, heroImageUrl)
  // --------------------------------------------------------------------------
  const brandAssetsConfig: Array<{
    url: string | undefined;
    role: MediaAssetRole;
    title: string;
    altText: string;
    slot: string;
  }> = [
    {
      url: settings.logoUrl,
      role: 'ICON',
      title: 'Musky Dose Official Logo',
      altText: 'Musky Dose Logo',
      slot: 'logo',
    },
    {
      url: settings.faviconUrl,
      role: 'ICON',
      title: 'Musky Dose Favicon',
      altText: 'Musky Dose Favicon',
      slot: 'favicon',
    },
    {
      url: settings.heroImageUrl && settings.heroImageUrl !== '/images/fallback.svg' ? settings.heroImageUrl : undefined,
      role: 'HERO',
      title: 'Musky Dose Homepage Hero Visual',
      altText: 'Musky Dose Homepage Hero',
      slot: 'hero',
    },
  ];

  for (let i = 0; i < brandAssetsConfig.length; i++) {
    const brandItem = brandAssetsConfig[i];
    if (brandItem.url) {
      metrics.sourceRecordsProcessed++;
      const meta = resolveBinaryHashAndMetadata(brandItem.url);

      if (meta.isLocalBinary && !meta.existsOnDisk) {
        metrics.missingOrBrokenUrls.push({
          url: brandItem.url,
          entityType: 'BRAND',
          entityId: 'brand-musky',
          reason: `Brand asset ${brandItem.slot} does not exist in public directory`,
        });
      }

      if (knownHashes.has(meta.hash)) {
        metrics.duplicatesDeduplicated++;
      } else {
        knownHashes.add(meta.hash);
      }

      const assetId = generateDeterministicAssetId('BRAND', 'brand-musky', brandItem.role, i);

      const assetInput: SaveMediaAssetInput = {
        id: assetId,
        entityType: 'BRAND',
        entityId: 'brand-musky',
        url: brandItem.url,
        fileHash: meta.hash,
        fileSizeBytes: meta.sizeBytes,
        mimeType: meta.mimeType,
        role: brandItem.role,
        source: 'MANUAL_UPLOAD',
        status: 'approved',
        isLocked: true,
        title: brandItem.title,
        altText: brandItem.altText,
        sortOrder: i + 1,
        visualContext: {
          brandSlot: brandItem.slot,
        },
      };

      if (!dryRun) {
        await saveMediaAsset(assetInput);
      }
      metrics.mediaAssetsCreated++;
    }
  }

  // --------------------------------------------------------------------------
  // SOURCE 7: DETECT STORAGE ORPHAN ASSETS
  // --------------------------------------------------------------------------
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (buckets) {
        for (const b of buckets) {
          const scanFolder = async (prefix = '') => {
            const { data: items } = await supabase.storage.from(b.name).list(prefix);
            if (!items) return;
            for (const item of items) {
              const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
              if (item.id === null) {
                await scanFolder(fullPath);
              } else {
                // Check if this path exists in any product/catalog reference
                const publicUrl = supabase.storage.from(b.name).getPublicUrl(fullPath).data.publicUrl;
                const matchesCatalog = products.some((p) =>
                  p.images?.some((u) => u.includes(fullPath) || u.includes(item.name))
                );
                if (!matchesCatalog) {
                  metrics.orphanAssetsDetected.push({
                    path: fullPath,
                    bucket: b.name,
                    sizeBytes: item.metadata?.size,
                  });
                }
              }
            }
          };
          await scanFolder();
        }
      }
    } catch {
      // Ignore if storage offline
    }
  }

  metrics.durationMs = Date.now() - startTime;
  return metrics;
}

