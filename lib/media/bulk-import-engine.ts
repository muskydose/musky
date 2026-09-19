import path from 'path';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  MediaAsset,
  MediaEntityType,
  saveMediaAsset,
  computeFileHash,
} from '@/lib/db/media';
import { STANDARD_MEDIA_SPECS, SlotSpecification, reconcileCanonicalSlot } from '@/lib/growth/media-specs';
import { validateUploadBuffer } from '@/lib/media/upload-validator';
import { performZeroDowntimeReplacement } from '@/lib/growth/media-replacement-engine';
import { generateMediaDerivative } from '@/lib/media/derived-media-engine';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';

export type BulkImportFileStatus =
  | 'ASSIGNED'
  | 'UNMATCHED_REVIEW'
  | 'VALIDATION_FAILED'
  | 'ERROR';

export interface BulkImportItemResult {
  fileName: string;
  status: BulkImportFileStatus;
  entityType?: MediaEntityType;
  entityId?: string;
  entityName?: string;
  slotKey?: string;
  role?: string;
  assetId?: string;
  publicUrl?: string;
  reason?: string;
  errors?: string[];
  derivativesGenerated?: string[];
}

export interface ParsedFilenameMatch {
  matched: boolean;
  entityType?: MediaEntityType;
  entityId?: string;
  entityName?: string;
  spec?: SlotSpecification;
  reason?: string;
}

/**
 * Parses a filename formatted as {entity-slug}-{slot-key}.{ext}
 * and maps it strictly against live catalog entities.
 */
export async function matchBulkFilenameToEntity(
  filename: string,
  catalogCache?: {
    products?: any[];
    categories?: any[];
    guides?: any[];
    knowledge?: any[];
  }
): Promise<ParsedFilenameMatch> {
  const base = path.parse(filename).name.trim().toLowerCase();
  
  // Special Brand match
  if (base.startsWith('brand-') || base === 'logo' || base === 'favicon') {
    const rolePart = base.replace(/^brand-/, '');
    const spec = reconcileCanonicalSlot(rolePart, 'BRAND');
    return {
      matched: true,
      entityType: 'BRAND',
      entityId: 'musky-dose-brand',
      entityName: 'Musky Dose Official Brand',
      spec,
    };
  }

  // Load catalog entities if not provided
  const [products, categories, guides, knowledge] = await Promise.all([
    catalogCache?.products || getAllProductsAdmin().catch(() => []),
    catalogCache?.categories || getCategories().catch(() => []),
    catalogCache?.guides || getGuides().catch(() => []),
    catalogCache?.knowledge || getAllKnowledgeEntitiesAdmin().catch(() => []),
  ]);

  // Try matching product slugs: find the longest matching slug prefix
  // Filename format: {entity-slug}-{slot-or-role}.{ext}
  for (const p of products) {
    const pSlug = (p.slug || '').toLowerCase().trim();
    if (pSlug && base.startsWith(`${pSlug}-`)) {
      const slotPart = base.slice(pSlug.length + 1);
      const spec = reconcileCanonicalSlot(slotPart, 'PRODUCT');
      return {
        matched: true,
        entityType: 'PRODUCT',
        entityId: p.id,
        entityName: p.name,
        spec,
      };
    }
  }

  // Try matching categories
  for (const c of categories) {
    const cSlug = (c.slug || '').toLowerCase().trim();
    if (cSlug && base.startsWith(`${cSlug}-`)) {
      const slotPart = base.slice(cSlug.length + 1);
      const spec = reconcileCanonicalSlot(slotPart, 'CATEGORY');
      return {
        matched: true,
        entityType: 'CATEGORY',
        entityId: c.id,
        entityName: c.name,
        spec,
      };
    }
  }

  // Try matching guides
  for (const g of guides) {
    const gSlug = (g.slug || '').toLowerCase().trim();
    if (gSlug && base.startsWith(`${gSlug}-`)) {
      const slotPart = base.slice(gSlug.length + 1);
      const spec = reconcileCanonicalSlot(slotPart, 'GUIDE');
      return {
        matched: true,
        entityType: 'GUIDE',
        entityId: g.id,
        entityName: g.title,
        spec,
      };
    }
  }

  // Try matching knowledge entities
  for (const k of knowledge) {
    const kSlug = (k.slug || k.entityKey || '').toLowerCase().trim();
    if (kSlug && base.startsWith(`${kSlug}-`)) {
      const slotPart = base.slice(kSlug.length + 1);
      const spec = reconcileCanonicalSlot(slotPart, 'KNOWLEDGE');
      return {
        matched: true,
        entityType: 'KNOWLEDGE',
        entityId: k.id || k.entityKey,
        entityName: k.canonicalName || k.entityKey,
        spec,
      };
    }
  }

  return {
    matched: false,
    reason: `Filename [${filename}] could not be matched against any known product, category, guide, knowledge, or brand slug. Moved to UNMATCHED_REVIEW.`,
  };
}

/**
 * Processes a single buffer from bulk import.
 * Validates, uploads, assigns, and generates derivatives where appropriate.
 */
export async function processBulkImportItem(options: {
  filename: string;
  buffer: Buffer;
  providedMime?: string;
  isRealOwnerPhoto?: boolean;
}): Promise<BulkImportItemResult> {
  const { filename, buffer, providedMime, isRealOwnerPhoto } = options;

  // 1. Entity & Slot Match
  const match = await matchBulkFilenameToEntity(filename);
  if (!match.matched || !match.spec || !match.entityType || !match.entityId) {
    return {
      fileName: filename,
      status: 'UNMATCHED_REVIEW',
      reason: match.reason || 'Unmatched slug pattern.',
    };
  }

  const spec = match.spec;

  // 2. Binary & Slot Validation
  const validation = await validateUploadBuffer(buffer, spec.slotKey, providedMime);
  if (!validation.canProceed || !validation.isValid) {
    return {
      fileName: filename,
      status: 'VALIDATION_FAILED',
      entityType: match.entityType,
      entityId: match.entityId,
      entityName: match.entityName,
      slotKey: spec.slotKey,
      role: spec.role,
      errors: validation.errors,
      reason: 'Image buffer failed magic byte, aspect ratio, or dimension constraints.',
    };
  }

  // 3. Storage Upload
  const fileHash = validation.metadata.hash;
  const ext = validation.metadata.format === 'png' ? 'png' : validation.metadata.format === 'webp' ? 'webp' : 'jpg';
  const cleanStorageFileName = `${match.entityId}-${spec.slotKey.toLowerCase()}-${Date.now()}.${ext}`;
  const storagePath = `manual/${match.entityType.toLowerCase()}/${cleanStorageFileName}`;

  const supabase = getSupabaseAdmin();
  let publicUrl = `/images/products/${cleanStorageFileName}`;

  if (supabase) {
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: validation.metadata.mimeType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (!uploadErr) {
      const { data: pubData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath);
      if (pubData?.publicUrl) {
        publicUrl = pubData.publicUrl;
      }
    }
  }

  // 4. Determine Origin
  const isPrimary = spec.role === 'PRIMARY';
  const assetOrigin = isRealOwnerPhoto || isPrimary
    ? 'real_owner_photo'
    : 'manual_approved';

  // 5. Save canonical media asset
  const { asset: savedAsset } = await saveMediaAsset({
    entityType: match.entityType,
    entityId: match.entityId,
    url: publicUrl,
    storagePath,
    storageBucket: 'product-images',
    fileHash,
    fileName: filename,
    mimeType: validation.metadata.mimeType,
    fileSizeBytes: validation.metadata.fileSizeBytes,
    width: validation.metadata.width,
    height: validation.metadata.height,
    aspectRatio: validation.metadata.aspectRatio,
    role: spec.role as any,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
    isLocked: isPrimary ? true : false,
    assetOrigin,
    slotKey: spec.slotKey,
    title: `${match.entityName} — ${spec.displayName}`,
    altText: `${match.entityName} ${spec.displayName.toLowerCase()}`,
    visualContext: {
      importedFromFilename: filename,
      matchedSlug: match.entityId,
      importedAt: new Date().toISOString(),
    },
    sortOrder: isPrimary ? 1 : 100,
  });

  // 6. If PRIMARY, perform zero-downtime switch and derive OpenGraph + Thumbnail
  const derivativesGenerated: string[] = [];
  if (isPrimary) {
    await performZeroDowntimeReplacement({
      entityType: match.entityType,
      entityId: match.entityId,
      role: 'PRIMARY',
      newAssetId: savedAsset.id,
      consumingRoute: `/products/${match.entityId}`,
      reason: 'bulk_import_real_photo_replacement',
    });

    // Auto-derive OpenGraph & Thumbnail
    try {
      const ogDeriv = await generateMediaDerivative({
        masterAsset: savedAsset,
        derivativeType: 'OPENGRAPH',
        sourceBuffer: buffer,
      });
      derivativesGenerated.push(`OPENGRAPH: ${ogDeriv.asset.id}`);

      const thumbDeriv = await generateMediaDerivative({
        masterAsset: savedAsset,
        derivativeType: 'THUMBNAIL',
        sourceBuffer: buffer,
      });
      derivativesGenerated.push(`THUMBNAIL: ${thumbDeriv.asset.id}`);
    } catch (derivErr: any) {
      console.warn(`[BulkImportEngine] Derivative generation notice for ${savedAsset.id}:`, derivErr.message);
    }
  }

  return {
    fileName: filename,
    status: 'ASSIGNED',
    entityType: match.entityType,
    entityId: match.entityId,
    entityName: match.entityName,
    slotKey: spec.slotKey,
    role: spec.role,
    assetId: savedAsset.id,
    publicUrl: savedAsset.url,
    derivativesGenerated,
  };
}

