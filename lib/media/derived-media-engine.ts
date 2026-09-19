import sharp from 'sharp';
import {
  MediaAsset,
  saveMediaAsset,
  computeFileHash,
  getAllMediaAssetsRaw,
  getMediaForEntity,
} from '@/lib/db/media';
import { getSupabaseAdmin } from '@/lib/supabase';

export type SupportedDerivativeType =
  | 'OPENGRAPH'
  | 'THUMBNAIL'
  | 'SOCIAL_SQUARE'
  | 'MOBILE_HERO';

export interface DerivativeSpec {
  type: SupportedDerivativeType;
  width: number;
  height: number;
  fit: 'contain' | 'cover' | 'fill' | 'inside' | 'outside';
  background: { r: number; g: number; b: number; alpha: number };
  role: 'OG_SOCIAL' | 'THUMBNAIL' | 'SOCIAL_SQUARE' | 'MOBILE_HERO';
  slotKey: string;
}

export const DERIVATIVE_SPECS: Record<SupportedDerivativeType, DerivativeSpec> = {
  OPENGRAPH: {
    type: 'OPENGRAPH',
    width: 1200,
    height: 630,
    fit: 'contain',
    background: { r: 247, g: 245, b: 240, alpha: 1 }, // Warm natural ivory/sandstone
    role: 'OG_SOCIAL',
    slotKey: 'OPENGRAPH_META',
  },
  THUMBNAIL: {
    type: 'THUMBNAIL',
    width: 512,
    height: 512,
    fit: 'cover',
    background: { r: 255, g: 255, b: 255, alpha: 1 },
    role: 'THUMBNAIL',
    slotKey: 'PRODUCT_DETAIL',
  },
  SOCIAL_SQUARE: {
    type: 'SOCIAL_SQUARE',
    width: 1080,
    height: 1080,
    fit: 'cover',
    background: { r: 247, g: 245, b: 240, alpha: 1 },
    role: 'SOCIAL_SQUARE',
    slotKey: 'SOCIAL_SQUARE',
  },
  MOBILE_HERO: {
    type: 'MOBILE_HERO',
    width: 1080,
    height: 1920,
    fit: 'contain',
    background: { r: 247, g: 245, b: 240, alpha: 1 },
    role: 'MOBILE_HERO',
    slotKey: 'PRODUCT_MOBILE',
  },
};

/**
 * Derives optimized variant from an authoritative master media asset using Sharp.
 * Retains cryptographic lineage: parentAssetId, parentHash, derivativeType.
 * Prevents redundant regeneration if valid derivative with matching hash already exists.
 */
export async function generateMediaDerivative(options: {
  masterAsset: MediaAsset;
  derivativeType: SupportedDerivativeType;
  sourceBuffer?: Buffer;
}): Promise<{
  asset: MediaAsset;
  reused: boolean;
}> {
  const { masterAsset, derivativeType, sourceBuffer } = options;
  const spec = DERIVATIVE_SPECS[derivativeType];

  if (!spec) {
    throw new Error(`Unsupported derivative type: ${derivativeType}`);
  }

  // 1. Lineage Check: Does an existing derivative for this parent already exist?
  const existingAssets = await getMediaForEntity({
    entityType: masterAsset.entityType,
    entityId: masterAsset.entityId,
    includeDrafts: false,
  });

  const existingDerivative = existingAssets.find((a) => {
    return (
      a.parentAssetId === masterAsset.id &&
      a.derivativeType === derivativeType &&
      a.status === 'approved' &&
      (!masterAsset.fileHash || a.visualContext?.parentHash === masterAsset.fileHash)
    );
  });

  if (existingDerivative) {
    return { asset: existingDerivative, reused: true };
  }

  // 2. Obtain master binary buffer
  let inputBuffer = sourceBuffer;
  if (!inputBuffer) {
    if (masterAsset.url.startsWith('http://') || masterAsset.url.startsWith('https://')) {
      const resp = await fetch(masterAsset.url);
      if (!resp.ok) {
        throw new Error(`Failed to fetch master asset for derivation from ${masterAsset.url}: ${resp.status}`);
      }
      inputBuffer = Buffer.from(await resp.arrayBuffer());
    } else {
      throw new Error(`Cannot retrieve local or relative buffer directly for ${masterAsset.url}`);
    }
  }

  // 3. Process via Sharp (Zero distortion, safe letterboxing when aspect ratios differ)
  const sharpInstance = sharp(inputBuffer);
  const transformedBuffer = await sharpInstance
    .resize({
      width: spec.width,
      height: spec.height,
      fit: spec.fit,
      background: spec.background,
    })
    .webp({ quality: 88, effort: 4 })
    .toBuffer();

  const fileHash = computeFileHash(transformedBuffer);
  const fileName = `${masterAsset.entityId || 'entity'}-${derivativeType.toLowerCase()}-${Date.now()}.webp`;
  const storagePath = `derivatives/${masterAsset.entityType.toLowerCase()}/${fileName}`;

  // 4. Upload to Supabase Storage if available
  let publicUrl = masterAsset.url; // Fallback to master if storage unavailable
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, transformedBuffer, {
        contentType: 'image/webp',
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
    } else {
      console.warn(`[DerivedMediaEngine] Supabase storage upload warning:`, uploadErr.message);
    }
  }

  // 5. Determine lineage origin
  const assetOrigin = masterAsset.assetOrigin === 'real_owner_photo'
    ? 'derived_from_real'
    : (masterAsset.assetOrigin || 'manual_approved');

  // 6. Save canonical derivative record
  const { asset: savedDerivative } = await saveMediaAsset({
    entityType: masterAsset.entityType,
    entityId: masterAsset.entityId,
    url: publicUrl,
    storagePath,
    storageBucket: 'product-images',
    fileHash,
    fileName,
    mimeType: 'image/webp',
    fileSizeBytes: transformedBuffer.length,
    width: spec.width,
    height: spec.height,
    aspectRatio: spec.type === 'OPENGRAPH' ? '1.91:1' : (spec.width === spec.height ? '1:1' : `${spec.width}:${spec.height}`),
    role: spec.role,
    source: masterAsset.source === 'MANUAL_UPLOAD' ? 'MANUAL_UPLOAD' : 'AI_GENERATED',
    status: 'approved',
    isLocked: masterAsset.isLocked,
    assetOrigin,
    slotKey: spec.slotKey,
    parentAssetId: masterAsset.id,
    derivativeType,
    healthStatus: 'HEALTHY',
    title: `${masterAsset.title || 'Asset'} (${derivativeType})`,
    altText: masterAsset.altText || masterAsset.title,
    visualContext: {
      parentAssetId: masterAsset.id,
      parentHash: masterAsset.fileHash || null,
      parentUrl: masterAsset.url,
      derivativeType,
      derivedAt: new Date().toISOString(),
    },
    sortOrder: 150,
  });

  return { asset: savedDerivative, reused: false };
}

