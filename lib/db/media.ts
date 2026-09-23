import crypto from 'crypto';
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase';

// ============================================================================
// 1. TYPES & CONTRACTS
// ============================================================================

export type MediaEntityType =
  | 'PRODUCT'
  | 'CATEGORY'
  | 'GUIDE'
  | 'KNOWLEDGE'
  | 'BRAND'
  | 'MARKETING';

export type MediaAssetRole =
  | 'PRIMARY'
  | 'GALLERY'
  | 'PACKAGING'
  | 'LIFESTYLE'
  | 'DETAIL'
  | 'USAGE'
  | 'INGREDIENTS'
  | 'HERO'
  | 'OG_SOCIAL'
  | 'ICON'
  | 'PROCESS'
  | 'INFOGRAPHIC'
  | 'COMPARISON'
  | 'THUMBNAIL'
  | 'BANNER'
  | 'MOBILE_HERO'
  | 'DESKTOP_HERO'
  | 'SOCIAL_SQUARE'
  | 'SOCIAL_PORTRAIT';

export type MediaAssetSource =
  | 'MANUAL_UPLOAD'
  | 'AI_GENERATED'
  | 'VERIFIED_FREE_LICENSE'
  | 'EXTERNAL_IMPORT'
  | 'SYSTEM_FALLBACK';

export type MediaAssetStatus = 'suggested' | 'approved' | 'rejected' | 'archived';

export type MediaAssetOrigin =
  | 'real_owner_photo'
  | 'temporary_visual'
  | 'ai_generated'
  | 'derived_from_real'
  | 'programmatic_template'
  | 'manual_approved'
  | 'legacy_archived';

export type MediaHealthStatus = 'HEALTHY' | 'UNHEALTHY' | 'NEEDS_REVIEW';

export interface MediaLicenseInfo {
  source: string;
  sourceUrl: string;
  licenseType: string;
  attributionRequirement?: string;
  retrievedAt: string;
  fileHash: string;
  storagePath?: string;
}

export type MotionLayerType =
  | 'BOTANICAL_OBJECT'
  | 'PRODUCT_CUTOUT'
  | 'BACKGROUND_TEXTURE'
  | 'STORY_SCENE'
  | 'PROCESS_STAGE'
  | 'NONE';

export interface MediaMotionLayerInfo {
  layerType: MotionLayerType;
  isTransparent?: boolean;
  depth?: number;
  motionSafe?: boolean;
}

export interface MediaAsset {
  id: string;
  entityType: MediaEntityType;
  entityId?: string;
  url: string;
  storagePath?: string;
  storageBucket: string;
  fileHash?: string;
  fileName?: string;
  mimeType: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  aspectRatio: string;
  role: MediaAssetRole;
  source: MediaAssetSource;
  status: MediaAssetStatus;
  isLocked: boolean;
  assetOrigin?: MediaAssetOrigin;
  slotKey?: string;
  parentAssetId?: string;
  derivativeType?: string;
  healthStatus?: MediaHealthStatus;
  title?: string;
  altText?: string;
  caption?: string;
  licenseInfo?: MediaLicenseInfo;
  motionLayer?: MediaMotionLayerInfo;
  visualContext?: Record<string, any>;
  aiMetadata?: Record<string, any>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveMediaAssetInput {
  id?: string;
  entityType: MediaEntityType;
  entityId?: string;
  url: string;
  storagePath?: string;
  storageBucket?: string;
  fileHash?: string;
  fileName?: string;
  mimeType?: string;
  fileSizeBytes?: number;
  width?: number;
  height?: number;
  aspectRatio?: string;
  role?: MediaAssetRole;
  source?: MediaAssetSource;
  status?: MediaAssetStatus;
  isLocked?: boolean;
  assetOrigin?: MediaAssetOrigin;
  slotKey?: string;
  parentAssetId?: string;
  derivativeType?: string;
  healthStatus?: MediaHealthStatus;
  title?: string;
  altText?: string;
  caption?: string;
  licenseInfo?: MediaLicenseInfo;
  motionLayer?: MediaMotionLayerInfo;
  visualContext?: Record<string, any>;
  aiMetadata?: Record<string, any>;
  sortOrder?: number;
  existingAssets?: MediaAsset[];
}

export interface MediaResolutionResult {
  primaryAsset: MediaAsset;
  galleryAssets: MediaAsset[];
  allAssets: MediaAsset[];
  isFallback: boolean;
  source: MediaAssetSource;
}

const DEFAULT_FALLBACK_URL = '/images/fallback.svg';

// ============================================================================
// 2. CRYPTOGRAPHIC HASHING & DEDUPLICATION
// ============================================================================

/**
 * Computes a SHA-256 hash string for a binary buffer.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// ============================================================================
// 3. ROW MAPPING & NORMALIZATION
// ============================================================================

export function mapRowToMediaAsset(row: any): MediaAsset {
  const visualContext = row.visual_context || row.visualContext || {};
  const licenseInfo = row.license_info || row.licenseInfo || visualContext.licenseInfo || undefined;
  const motionLayer = row.motion_layer || row.motionLayer || visualContext.motionLayer || undefined;

  const defaultOrigin: MediaAssetOrigin = row.source === 'MANUAL_UPLOAD'
    ? (Boolean(row.is_locked ?? row.isLocked) ? 'real_owner_photo' : 'manual_approved')
    : (row.status === 'archived' ? 'legacy_archived' : 'ai_generated');

  // Top-level canonical columns are authoritative.
  // Fallback to visual_context ONLY when a top-level value is NULL or undefined.
  const rowOrigin = row.asset_origin !== undefined && row.asset_origin !== null ? row.asset_origin : row.assetOrigin;
  const assetOrigin: MediaAssetOrigin =
    (rowOrigin !== undefined && rowOrigin !== null && rowOrigin !== '')
      ? rowOrigin
      : (visualContext.asset_origin || visualContext.assetOrigin || defaultOrigin);

  const rowSlot = row.slot_key !== undefined && row.slot_key !== null ? row.slot_key : row.slotKey;
  const slotKey: string | undefined =
    (rowSlot !== undefined && rowSlot !== null && rowSlot !== '')
      ? rowSlot
      : (visualContext.slot_key || visualContext.slotKey || undefined);

  const rowParent = row.parent_asset_id !== undefined && row.parent_asset_id !== null ? row.parent_asset_id : row.parentAssetId;
  const parentAssetId: string | undefined =
    (rowParent !== undefined && rowParent !== null && rowParent !== '')
      ? rowParent
      : (visualContext.parent_asset_id || visualContext.parentAssetId || undefined);

  const rowDerivative = row.derivative_type !== undefined && row.derivative_type !== null ? row.derivative_type : row.derivativeType;
  const derivativeType: string | undefined =
    (rowDerivative !== undefined && rowDerivative !== null && rowDerivative !== '')
      ? rowDerivative
      : (visualContext.derivative_type || visualContext.derivativeType || undefined);

  const rowHealth = row.health_status !== undefined && row.health_status !== null ? row.health_status : row.healthStatus;
  const healthStatus: MediaHealthStatus =
    (rowHealth !== undefined && rowHealth !== null && rowHealth !== '')
      ? rowHealth
      : (visualContext.health_status || visualContext.healthStatus || 'HEALTHY');

  return {
    id: String(row.id || `med-${Date.now()}`),
    entityType: (row.entity_type || row.entityType || 'PRODUCT') as MediaEntityType,
    entityId: row.entity_id || row.entityId || undefined,
    url: String(row.url || ''),
    storagePath: row.storage_path || row.storagePath || undefined,
    storageBucket: row.storage_bucket || row.storageBucket || 'product-images',
    fileHash: row.file_hash || row.fileHash || undefined,
    fileName: row.file_name || row.fileName || undefined,
    mimeType: row.mime_type || row.mimeType || 'image/webp',
    fileSizeBytes: row.file_size_bytes ?? row.fileSizeBytes ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    aspectRatio: row.aspect_ratio || row.aspectRatio || '1:1',
    role: (row.role || 'GALLERY') as MediaAssetRole,
    source: (row.source || 'MANUAL_UPLOAD') as MediaAssetSource,
    status: (row.status || 'approved') as MediaAssetStatus,
    isLocked: Boolean(row.is_locked ?? row.isLocked ?? false),
    assetOrigin,
    slotKey,
    parentAssetId,
    derivativeType,
    healthStatus,
    title: row.title || undefined,
    altText: row.alt_text || row.altText || undefined,
    caption: row.caption || undefined,
    licenseInfo,
    motionLayer,
    visualContext,
    aiMetadata: row.ai_metadata || row.aiMetadata || {},
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 100),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapMediaAssetToRow(asset: MediaAsset): any {
  const mergedVisualContext = {
    ...(asset.visualContext || {}),
    ...(asset.licenseInfo ? { licenseInfo: asset.licenseInfo } : {}),
    ...(asset.motionLayer ? { motionLayer: asset.motionLayer } : {}),
    asset_origin: asset.assetOrigin || 'manual_approved',
    assetOrigin: asset.assetOrigin || 'manual_approved',
    ...(asset.slotKey ? { slot_key: asset.slotKey, slotKey: asset.slotKey } : {}),
    ...(asset.parentAssetId ? { parent_asset_id: asset.parentAssetId, parentAssetId: asset.parentAssetId } : {}),
    ...(asset.derivativeType ? { derivative_type: asset.derivativeType, derivativeType: asset.derivativeType } : {}),
    health_status: asset.healthStatus || 'HEALTHY',
    healthStatus: asset.healthStatus || 'HEALTHY',
  };

  return {
    id: asset.id,
    entity_type: asset.entityType,
    entity_id: asset.entityId || null,
    url: asset.url,
    storage_path: asset.storagePath || null,
    storage_bucket: asset.storageBucket || 'product-images',
    file_hash: asset.fileHash || null,
    file_name: asset.fileName || null,
    mime_type: asset.mimeType || 'image/webp',
    file_size_bytes: asset.fileSizeBytes || null,
    width: asset.width || null,
    height: asset.height || null,
    aspect_ratio: asset.aspectRatio || '1:1',
    role: asset.role || 'GALLERY',
    source: asset.source || 'MANUAL_UPLOAD',
    status: asset.status || 'approved',
    is_locked: asset.isLocked ?? false,
    asset_origin: asset.assetOrigin || 'manual_approved',
    slot_key: asset.slotKey || null,
    parent_asset_id: asset.parentAssetId || null,
    derivative_type: asset.derivativeType || null,
    health_status: asset.healthStatus || 'HEALTHY',
    title: asset.title || null,
    alt_text: asset.altText || null,
    caption: asset.caption || null,
    visual_context: mergedVisualContext,
    ai_metadata: asset.aiMetadata || {},
    sort_order: asset.sortOrder ?? 100,
    created_at: asset.createdAt || new Date().toISOString(),
    updated_at: asset.updatedAt || new Date().toISOString(),
  };
}


// ============================================================================
// 4. IN-MEMORY FALLBACK STORE & CACHE
// ============================================================================

let memoryMediaStore: MediaAsset[] = [];
let memoryCache: { assets: MediaAsset[]; loadedAt: number; source: 'database' | 'memory' } | null = null;
const CACHE_TTL_MS = 60_000;

export function resetMediaCache(options?: { clearFallbackStore?: boolean }): void {
  memoryCache = null;
  if (options?.clearFallbackStore) {
    memoryMediaStore = [];
  }
}

/**
 * Upserts specific freshly-written assets into the existing in-process cache,
 * eliminating the DB write/read race without evicting existing DB-fetched data.
 *
 * Strategy:
 * - If a warm cache exists (DB or memory): upsert each provided asset by ID.
 *   Existing DB-sourced entries for other assets are untouched, so live
 *   MANUAL_UPLOAD assets fetched from the DB remain visible to subsequent tests.
 * - If the cache is cold (null): do nothing. The next getAllMediaAssetsRaw call
 *   will naturally re-fetch the full current dataset from the DB, which by that
 *   point will include the just-written row (Supabase commit lag is << the time
 *   between a cold-cache miss and the subsequent read in a sequential test run).
 *
 * This replaces resetMediaCache() in write operations (saveMediaAsset,
 * updateMediaAsset, setPrimaryMedia) to prevent the race where resetMediaCache()
 * forces an immediate DB re-fetch before Supabase has committed the new row.
 *
 * resetMediaCache() is kept for callers (e.g. archiveDiagnosticMediaAssets)
 * that perform bulk direct-DB mutations and want the next read to re-fetch from DB.
 */
function refreshCacheWithAssets(written: MediaAsset[]): void {
  if (!memoryCache) {
    // Cache is cold — do not seed from partial memoryMediaStore (which may only
    // contain test fixtures and would exclude live DB assets). Let the next read
    // go to DB naturally; it will fetch the complete current dataset.
    return;
  }

  // Warm cache exists — upsert only the changed assets, preserve everything else.
  const updated = [...memoryCache.assets];
  for (const asset of written) {
    const idx = updated.findIndex((a) => a.id === asset.id);
    if (idx >= 0) {
      updated[idx] = asset;
    } else {
      updated.push(asset);
    }
  }
  memoryCache = {
    assets: updated,
    loadedAt: memoryCache.loadedAt, // preserve original load timestamp to keep TTL
    source: memoryCache.source,
  };
}

/**
 * Generates a deterministic asset ID to guarantee 100% idempotent rerun and cache parity.
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

/**
 * Checks whether a URL is a safe canonical Musky Dose asset.
 * Rejects Unsplash, external stock, mock CDNs, and arbitrary external URLs.
 */
export function isSafeInternalMediaUrl(url: string | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  if (clean.includes('fallback.svg')) return true;
  if (clean.includes('unsplash.com')) return false;
  if (clean.includes('cdn.muskydose.in')) return false;
  if (clean.includes('googleusercontent.com') || clean.includes('images.google.com')) return false;
  if (clean.startsWith('/')) return true; // local public asset like /logo.png
  if (clean.includes('.supabase.co/storage/v1/object/public/')) return true; // valid Supabase storage
  return false;
}

/**
 * Identifies diagnostic/test-generated media that must never become public
 * canonical media, even if an operator accidentally approves it.
 */
export function isDiagnosticMediaAsset(
  asset: Pick<MediaAsset, 'status' | 'source' | 'aiMetadata'> | undefined | null
): boolean {
  if (!asset) return false;
  const meta = asset.aiMetadata || {};
  if (meta.testFixture === true || meta.test === true || meta.diagnostic === true) return true;

  const providerId = String(meta.providerId || '').toLowerCase();
  const modelName = String(meta.modelName || '').toLowerCase();
  const provider = String(meta.provider || '').toLowerCase();
  const fingerprint = `${providerId} ${modelName} ${provider}`;

  return (
    providerId.includes('mock') ||
    modelName.includes('mock') ||
    provider.includes('mock provider') ||
    fingerprint.includes('universal-mock')
  );
}

/**
 * Public canonical media eligibility guard.
 * Requires approved, healthy, safe internal media and rejects diagnostics.
 */
export function isPubliclyEligibleMediaAsset(asset: MediaAsset | undefined | null): boolean {
  if (!asset) return false;
  if (asset.status !== 'approved') return false;
  if (asset.healthStatus === 'UNHEALTHY') return false;
  if (isDiagnosticMediaAsset(asset)) return false;
  return isSafeInternalMediaUrl(asset.url);
}

/**
 * Archives diagnostic/test media without deleting the underlying file.
 * This is intentionally non-destructive and safe to run on every queue pass.
 */
export async function archiveDiagnosticMediaAssets(): Promise<{ scanned: number; archived: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { scanned: 0, archived: 0 };

  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('id,status,source,ai_metadata')
      .neq('status', 'archived')
      .limit(2000);

    if (error || !Array.isArray(data) || data.length === 0) {
      return { scanned: Array.isArray(data) ? data.length : 0, archived: 0 };
    }

    const diagnosticIds = data
      .map((row: any) => ({
        id: String(row.id || ''),
        status: row.status,
        source: row.source,
        aiMetadata: row.ai_metadata || {},
      }))
      .filter((asset) => isDiagnosticMediaAsset(asset))
      .map((asset) => asset.id)
      .filter(Boolean);

    if (diagnosticIds.length === 0) {
      return { scanned: data.length, archived: 0 };
    }

    const { error: updateError } = await supabase
      .from('media_assets')
      .update({
        status: 'archived',
        health_status: 'NEEDS_REVIEW',
        is_locked: false,
        updated_at: new Date().toISOString(),
      })
      .in('id', diagnosticIds);

    if (updateError) {
      return { scanned: data.length, archived: 0 };
    }

    // Keep the local fallback/cache aligned with the durable DB state.
    for (const asset of memoryMediaStore) {
      if (diagnosticIds.includes(asset.id)) {
        asset.status = 'archived';
        asset.healthStatus = 'NEEDS_REVIEW';
        asset.isLocked = false;
        asset.updatedAt = new Date().toISOString();
      }
    }
    resetMediaCache();

    return { scanned: data.length, archived: diagnosticIds.length };
  } catch {
    return { scanned: 0, archived: 0 };
  }
}

/**
 * Dynamically synthesizes canonical media assets from live catalog entities (products, categories, guides, settings)
 * when public.media_assets table is pending DDL migration or empty.
 */
async function deriveCatalogFallbackMediaAssets(): Promise<MediaAsset[]> {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) return [];

  const assets: MediaAsset[] = [];
  const now = new Date().toISOString();

  try {
    const [productsRes, categoriesRes, guidesRes, settingsRes] = await Promise.all([
      supabase.from('products').select('id, name, images, slug'),
      supabase.from('categories').select('id, name, image, slug, sort_order'),
      supabase.from('product_guides').select('id, title, cover_image, slug'),
      supabase.from('site_settings').select('data'),
    ]);

    // 1. Products
    if (Array.isArray(productsRes.data)) {
      productsRes.data.forEach((p) => {
        if (Array.isArray(p.images)) {
          p.images.forEach((img: any, idx: number) => {
            const url = typeof img === 'string' ? img : img?.url;
            if (url && typeof url === 'string' && isSafeInternalMediaUrl(url)) {
              const role: MediaAssetRole = idx === 0 ? 'PRIMARY' : 'GALLERY';
              const id = generateDeterministicAssetId('PRODUCT', p.id, role, idx);
              assets.push({
                id,
                entityType: 'PRODUCT',
                entityId: p.id,
                url: url.trim(),
                storageBucket: 'product-images',
                aspectRatio: '1:1',
                role,
                source: 'MANUAL_UPLOAD',
                status: 'approved',
                isLocked: idx === 0,
                title: `${p.name} - Image ${idx + 1}`,
                altText: `${p.name} photo`,
                sortOrder: idx === 0 ? 1 : idx + 1,
                visualContext: { productId: p.id, productName: p.name, slug: p.slug },
                aiMetadata: {},
                mimeType: 'image/webp',
                createdAt: now,
                updatedAt: now,
              });
            }
          });
        }
      });
    }

    // 2. Categories
    if (Array.isArray(categoriesRes.data)) {
      categoriesRes.data.forEach((c) => {
        if (c.image && typeof c.image === 'string' && isSafeInternalMediaUrl(c.image)) {
          const id = generateDeterministicAssetId('CATEGORY', c.id, 'HERO', 0);
          assets.push({
            id,
            entityType: 'CATEGORY',
            entityId: c.id,
            url: c.image.trim(),
            storageBucket: 'product-images',
            aspectRatio: '16:9',
            role: 'HERO',
            source: 'MANUAL_UPLOAD',
            status: 'approved',
            isLocked: true,
            title: `${c.name} Category Banner`,
            altText: `${c.name} banner`,
            sortOrder: c.sort_order || 1,
            visualContext: { categoryId: c.id, categoryName: c.name, slug: c.slug },
            aiMetadata: {},
            mimeType: 'image/webp',
            createdAt: now,
            updatedAt: now,
          });
        }
      });
    }

    // 3. Guides
    if (Array.isArray(guidesRes.data)) {
      guidesRes.data.forEach((g) => {
        if (g.cover_image && typeof g.cover_image === 'string' && isSafeInternalMediaUrl(g.cover_image)) {
          const id = generateDeterministicAssetId('GUIDE', g.id, 'HERO', 0);
          assets.push({
            id,
            entityType: 'GUIDE',
            entityId: g.id,
            url: g.cover_image.trim(),
            storageBucket: 'product-images',
            aspectRatio: '16:9',
            role: 'HERO',
            source: 'MANUAL_UPLOAD',
            status: 'approved',
            isLocked: true,
            title: g.title,
            altText: `${g.title} cover`,
            sortOrder: 1,
            visualContext: { guideId: g.id, guideSlug: g.slug },
            aiMetadata: {},
            mimeType: 'image/webp',
            createdAt: now,
            updatedAt: now,
          });
        }
      });
    }

    // 4. Site Settings Media Library
    const settingsData = settingsRes?.data?.[0]?.data;
    if (settingsData && Array.isArray(settingsData.mediaLibrary)) {
      settingsData.mediaLibrary.forEach((m: any, idx: number) => {
        if (m.url && typeof m.url === 'string' && isSafeInternalMediaUrl(m.url)) {
          const exists = assets.some((a) => a.url === m.url.trim());
          if (!exists) {
            let role: MediaAssetRole = 'GALLERY';
            if (m.category === 'hero') role = 'HERO';
            else if (m.category === 'factory') role = 'LIFESTYLE';
            else if (m.category === 'brand') role = 'ICON';
            else if (m.category === 'og') role = 'OG_SOCIAL';

            const id = generateDeterministicAssetId('BRAND', 'library', role, idx);
            assets.push({
              id,
              entityType: 'BRAND',
              entityId: 'media-library',
              url: m.url.trim(),
              storageBucket: 'product-images',
              aspectRatio: '1:1',
              role,
              source: 'MANUAL_UPLOAD',
              status: 'approved',
              isLocked: false,
              title: m.name || m.title || 'Brand Asset',
              altText: m.altText || 'Brand Asset',
              sortOrder: 100 + idx,
              visualContext: { usedIn: m.usedIn },
              aiMetadata: {},
              mimeType: m.type || 'image/webp',
              createdAt: m.uploadedAt || now,
              updatedAt: now,
            });
          }
        }
      });
    }
  } catch {
    // Fail-safe
  }

  return assets;
}

/**
 * Returns raw assets from Supabase public.media_assets or falls back to in-memory store.
 */
export async function getAllMediaAssetsRaw(): Promise<{
  assets: MediaAsset[];
  source: 'database' | 'memory';
}> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.loadedAt < CACHE_TTL_MS) {
    return { assets: memoryCache.assets, source: memoryCache.source };
  }

  const supabase = getSupabaseAdmin() || getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('media_assets')
        .select('*')
        .order('sort_order', { ascending: true });

      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map(mapRowToMediaAsset);
        memoryCache = { assets: mapped, loadedAt: now, source: 'database' };
        return { assets: mapped, source: 'database' };
      }
    } catch {
      // Fall through to memory fallback
    }
  }

  // If table is pending migration or empty, populate in-memory fallback store from live catalog
  if (memoryMediaStore.length === 0) {
    const derived = await deriveCatalogFallbackMediaAssets();
    if (derived.length > 0) {
      memoryMediaStore = derived;
    }
  }

  memoryCache = { assets: memoryMediaStore, loadedAt: now, source: 'memory' };
  return { assets: [...memoryMediaStore], source: 'memory' };
}

// ============================================================================
// 5. CANONICAL PRIORITY RESOLVER ENGINE
// ============================================================================

/**
 * Checks whether an asset is a protected real owner photo or locked manual asset.
 * When true, autonomous AI workflows MUST NOT replace, overwrite, archive, or regenerate it.
 */
export function isRealOwnerPhotoProtected(asset: MediaAsset | undefined | null): boolean {
  if (!asset) return false;
  if (asset.assetOrigin === 'real_owner_photo') return true;
  if (asset.source === 'MANUAL_UPLOAD' && (asset.isLocked || asset.role === 'PRIMARY')) return true;
  return Boolean(asset.isLocked);
}

/**
 * Priority Scoring Matrix:
 * Rank 1: REAL_OWNER_PHOTO (score ~ 10000+)
 * Rank 2: APPROVED_MANUAL_ASSET (score ~ 7000+)
 * Rank 3: DERIVED_FROM_REAL (score ~ 5000+)
 * Rank 4: PROGRAMMATIC_TEMPLATE (score ~ 3500+)
 * Rank 5: TEMPORARY_VISUAL (score ~ 2000+)
 * Rank 6: AI_GENERATED (score ~ 1500)
 * Rank 7: SYSTEM_FALLBACK (score ~ 50)
 */
export function computeAssetPriorityScore(asset: MediaAsset): number {
  if (asset.status !== 'approved') return -1; // Ineligible
  if (asset.assetOrigin === 'legacy_archived') return -1;

  let score = 0;

  // Origin weight (Highest Rank)
  if (asset.assetOrigin === 'real_owner_photo') {
    score += 10000;
  } else if (asset.assetOrigin === 'manual_approved') {
    score += 7000;
  } else if (asset.assetOrigin === 'derived_from_real') {
    score += 5000;
  } else if (asset.assetOrigin === 'programmatic_template') {
    score += 3500;
  } else if (asset.assetOrigin === 'temporary_visual') {
    score += 2000;
  } else if (asset.assetOrigin === 'ai_generated') {
    score += 1500;
  }

  // Source weight
  if (asset.source === 'MANUAL_UPLOAD') {
    score += 1000;
  } else if (asset.source === 'VERIFIED_FREE_LICENSE') {
    score += 400;
  } else if (asset.source === 'AI_GENERATED') {
    score += 200;
  } else if (asset.source === 'EXTERNAL_IMPORT') {
    score += 100;
  } else {
    score += 50; // SYSTEM_FALLBACK
  }

  // Primary Role weight
  if (asset.role === 'PRIMARY') {
    score += 2000;
  }

  // Locked override weight (Human manual lock)
  if (asset.isLocked) {
    score += 4000;
  }

  // Prefer lower sort order values (higher priority)
  score -= Math.min(asset.sortOrder, 100);

  return score;
}

/**
 * Creates a synthetic branded fallback asset when no approved media exists.
 */
function createSyntheticFallbackAsset(
  entityType?: MediaEntityType,
  entityId?: string,
  customFallbackUrl?: string
): MediaAsset {
  const now = new Date().toISOString();
  const safeType = entityType ? String(entityType).toLowerCase() : 'product';
  const safeUrl = isSafeInternalMediaUrl(customFallbackUrl) ? customFallbackUrl! : DEFAULT_FALLBACK_URL;
  return {
    id: `fallback-${safeType}-${entityId || 'global'}`,
    entityType: entityType || 'PRODUCT',
    entityId,
    url: safeUrl,
    storageBucket: 'product-images',
    aspectRatio: '1:1',
    role: 'PRIMARY',
    source: 'SYSTEM_FALLBACK',
    status: 'approved',
    isLocked: false,
    sortOrder: 999,
    mimeType: 'image/svg+xml',
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// 6. PUBLIC QUERY INTERFACES
// ============================================================================

/**
 * Finds an existing media asset by its SHA-256 file hash for instant deduplication.
 */
export async function findAssetByHash(fileHash: string): Promise<MediaAsset | null> {
  if (!fileHash || typeof fileHash !== 'string') return null;

  const cleanHash = fileHash.trim().toLowerCase();
  const { assets } = await getAllMediaAssetsRaw();
  const found = assets.find((a) => (a.fileHash || '').toLowerCase() === cleanHash && a.status !== 'archived');
  return found || null;
}

/**
 * Normalizes a Knowledge entity identifier (id, entityKey, slug) to canonical comparable form.
 * E.g. 'HENNA_MEHNDI', 'ent-henna-mehndi', 'henna-mehndi', 'ke-henna-mehndi' -> 'hennamehndi'
 */
export function normalizeKnowledgeEntityIdentifier(id: string): string {
  if (!id || typeof id !== 'string') return '';
  return id
    .toLowerCase()
    .trim()
    .replace(/^(ent|ke)[-_]/, '')
    .replace(/[-_]/g, '');
}

/**
 * Resolves all media assets for an entity sorted by primary priority first, then sortOrder.
 * Respects governance gating: suggested and rejected are omitted unless includeDrafts=true.
 */
export async function getMediaForEntity(options: {
  entityType: MediaEntityType;
  entityId?: string;
  includeDrafts?: boolean;
}): Promise<MediaAsset[]> {
  const { entityType, entityId, includeDrafts } = options;
  const { assets } = await getAllMediaAssetsRaw();

  const matched = assets.filter((a) => {
    if (a.entityType !== entityType) return false;
    if (entityId !== undefined) {
      if (a.entityId !== entityId) {
        if (entityType === 'KNOWLEDGE') {
          const normA = normalizeKnowledgeEntityIdentifier(a.entityId || '');
          const normQuery = normalizeKnowledgeEntityIdentifier(entityId);
          if (normA !== normQuery) return false;
        } else {
          return false;
        }
      }
    }

    if (includeDrafts) {
      return a.status !== 'archived';
    }
    return isPubliclyEligibleMediaAsset(a);
  });

  // Sort by priority score descending
  return matched.sort((a, b) => {
    const scoreA = computeAssetPriorityScore(a);
    const scoreB = computeAssetPriorityScore(b);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.sortOrder - b.sortOrder;
  });
}

/**
 * Resolves the authoritative Primary media asset for an entity.
 * Supports both object parameter and positional parameters.
 * Follows strict priority:
 * MANUAL approved locked > MANUAL approved > AI approved > legacyFallbackUrl > BRANDED_FALLBACK
 */
export async function getPrimaryMedia(
  optionsOrType:
    | MediaEntityType
    | {
        entityType: MediaEntityType;
        entityId?: string;
        legacyFallbackUrl?: string;
      },
  entityId?: string,
  legacyFallbackUrl?: string
): Promise<MediaAsset> {
  const options =
    typeof optionsOrType === 'string'
      ? { entityType: optionsOrType, entityId, legacyFallbackUrl }
      : optionsOrType;

  const { entityType, entityId: targetEntityId, legacyFallbackUrl: targetFallbackUrl } = options;
  const approvedAssets = await getMediaForEntity({ entityType, entityId: targetEntityId, includeDrafts: false });

  if (approvedAssets.length > 0) {
    // Top asset is the highest priority primary asset
    return approvedAssets[0];
  }

  // Fallback to legacy field or system fallback
  return createSyntheticFallbackAsset(entityType, targetEntityId, targetFallbackUrl);
}

/**
 * Resolves the gallery media assets for an entity (excluding the primary asset).
 * Supports both object parameter and positional parameters.
 */
export async function getGalleryMedia(
  optionsOrType:
    | MediaEntityType
    | {
        entityType: MediaEntityType;
        entityId?: string;
        includeDrafts?: boolean;
      },
  entityId?: string,
  includeDrafts?: boolean
): Promise<MediaAsset[]> {
  const options =
    typeof optionsOrType === 'string'
      ? { entityType: optionsOrType, entityId, includeDrafts }
      : optionsOrType;

  const all = await getMediaForEntity(options);
  if (all.length <= 1) return [];
  return all.slice(1);
}

/**
 * Returns comprehensive media resolution: primary, gallery, and fallback indicator.
 * Supports direct MediaAsset[] evaluation, object options, and positional parameters.
 */
export async function resolveAuthoritativeMedia(
  optionsOrTypeOrAssets:
    | MediaAsset[]
    | MediaEntityType
    | {
        entityType: MediaEntityType;
        entityId?: string;
        legacyFallbackUrl?: string;
      },
  entityId?: string,
  legacyFallbackUrl?: string
): Promise<MediaResolutionResult> {
  if (Array.isArray(optionsOrTypeOrAssets)) {
    const allAssets = optionsOrTypeOrAssets.filter(isPubliclyEligibleMediaAsset).sort((a, b) => {
      const scoreA = computeAssetPriorityScore(a);
      const scoreB = computeAssetPriorityScore(b);
      if (scoreA !== scoreB) return scoreB - scoreA;
      return a.sortOrder - b.sortOrder;
    });

    if (allAssets.length > 0) {
      const primaryAsset = allAssets[0];
      return {
        primaryAsset,
        galleryAssets: allAssets.slice(1),
        allAssets,
        isFallback: primaryAsset.source === 'SYSTEM_FALLBACK',
        source: primaryAsset.source,
      };
    }

    const fallback = createSyntheticFallbackAsset('PRODUCT');
    return {
      primaryAsset: fallback,
      galleryAssets: [],
      allAssets: [fallback],
      isFallback: true,
      source: 'SYSTEM_FALLBACK',
    };
  }

  const options =
    typeof optionsOrTypeOrAssets === 'string'
      ? { entityType: optionsOrTypeOrAssets, entityId, legacyFallbackUrl }
      : optionsOrTypeOrAssets;

  const { entityType, entityId: targetEntityId, legacyFallbackUrl: targetFallbackUrl } = options;
  const allAssets = await getMediaForEntity({ entityType, entityId: targetEntityId, includeDrafts: false });

  if (allAssets.length > 0) {
    const primaryAsset = allAssets[0];
    const galleryAssets = allAssets.slice(1);
    return {
      primaryAsset,
      galleryAssets,
      allAssets,
      isFallback: primaryAsset.source === 'SYSTEM_FALLBACK',
      source: primaryAsset.source,
    };
  }

  const fallbackAsset = createSyntheticFallbackAsset(entityType, targetEntityId, targetFallbackUrl);
  return {
    primaryAsset: fallbackAsset,
    galleryAssets: [],
    allAssets: [fallbackAsset],
    isFallback: true,
    source: 'SYSTEM_FALLBACK',
  };
}

/**
 * Batch resolves media for multiple entities in $O(1)$ without N+1 queries.
 * Uses the cached media assets.
 */
export async function getBatchResolvedMedia(
  entityType: MediaEntityType,
  entityIds?: string[]
): Promise<Map<string, MediaResolutionResult>> {
  const { assets } = await getAllMediaAssetsRaw();
  const approved = assets.filter((a) => a.entityType === entityType && isPubliclyEligibleMediaAsset(a));

  // Group by entityId
  const grouped = new Map<string, MediaAsset[]>();
  for (const asset of approved) {
    const key = asset.entityId || 'global';
    const list = grouped.get(key) || [];
    list.push(asset);
    grouped.set(key, list);
  }

  const resultMap = new Map<string, MediaResolutionResult>();
  const targetIds = entityIds || Array.from(grouped.keys());

  for (const id of targetIds) {
    let matchedAssets = grouped.get(id) || [];
    if (matchedAssets.length === 0 && entityType === 'KNOWLEDGE') {
      const normId = normalizeKnowledgeEntityIdentifier(id);
      for (const [key, list] of grouped.entries()) {
        const normKey = normalizeKnowledgeEntityIdentifier(key);
        if (normKey === normId) {
          matchedAssets = list;
          break;
        }
      }
    }

    if (matchedAssets.length > 0) {
      const sorted = [...matchedAssets].sort((a, b) => {
        const scoreA = computeAssetPriorityScore(a);
        const scoreB = computeAssetPriorityScore(b);
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.sortOrder - b.sortOrder;
      });
      resultMap.set(id, {
        primaryAsset: sorted[0],
        galleryAssets: sorted.slice(1),
        allAssets: sorted,
        isFallback: sorted[0].source === 'SYSTEM_FALLBACK',
        source: sorted[0].source,
      });
    } else {
      const fallback = createSyntheticFallbackAsset(entityType, id);
      resultMap.set(id, {
        primaryAsset: fallback,
        galleryAssets: [],
        allAssets: [fallback],
        isFallback: true,
        source: 'SYSTEM_FALLBACK',
      });
    }
  }

  return resultMap;
}

/**
 * Batch resolves primary media assets for multiple entities without N+1 queries.
 */
export async function getBatchPrimaryMedia(
  entityType: MediaEntityType,
  entityIds?: string[]
): Promise<Map<string, MediaAsset>> {
  const resolved = await getBatchResolvedMedia(entityType, entityIds);
  const primaryMap = new Map<string, MediaAsset>();
  for (const [id, res] of resolved.entries()) {
    primaryMap.set(id, res.primaryAsset);
  }
  return primaryMap;
}

/**
 * Attaches canonical media assets to a Product object.
 * CRITICAL ARCHITECTURE RULE:
 * NEVER mutates product.images! product.images remains the untouched legacy source of record.
 * Attaches canonical items to product.media and sets product.canonicalPrimaryUrl.
 */
export function attachCanonicalMediaToProduct<T extends { id?: string; images?: string[]; media?: any[] }>(
  product: T,
  mediaResult?: MediaResolutionResult
): T & { canonicalPrimaryUrl?: string; canonicalMedia?: MediaResolutionResult } {
  if (!product) return product as any;
  if (!mediaResult || mediaResult.isFallback || mediaResult.allAssets.length === 0) {
    return product as any;
  }

  // Map MediaAsset[] to ProductMediaItem[]
  const canonicalMediaItems = mediaResult.allAssets.map((asset, idx) => ({
    id: asset.id,
    type: (asset.mimeType?.startsWith('video/') ? 'video' : 'image') as 'video' | 'image',
    url: asset.url,
    role: asset.role as any,
    sortOrder: asset.sortOrder || idx + 1,
    title: asset.title,
    altText: asset.altText,
    caption: asset.caption,
    enabled: asset.status === 'approved',
  }));

  return {
    ...product,
    media: canonicalMediaItems,
    canonicalPrimaryUrl: mediaResult.primaryAsset.url,
    canonicalMedia: mediaResult,
    // Note: product.images is intentionally untouched to respect legacy immutability!
  };
}

/**
 * Batch attaches canonical media to a collection of products.
 */
export async function attachCanonicalMediaToProducts<T extends { id?: string; images?: string[]; media?: any[] }>(
  products: T[]
): Promise<Array<T & { canonicalPrimaryUrl?: string; canonicalMedia?: MediaResolutionResult }>> {
  if (!products || products.length === 0) return [];
  const productIds = products.map((p) => p.id).filter(Boolean) as string[];
  const mediaMap = await getBatchResolvedMedia('PRODUCT', productIds);

  return products.map((p) => {
    const res = p.id ? mediaMap.get(p.id) : undefined;
    return attachCanonicalMediaToProduct(p, res);
  });
}

/**
 * Attaches canonical media to a Category object without mutating category.image.
 */
export function attachCanonicalMediaToCategory<T extends { id?: string; image?: string }>(
  category: T,
  primaryAsset?: MediaAsset
): T & { canonicalPrimaryUrl?: string } {
  if (!category || !primaryAsset || primaryAsset.source === 'SYSTEM_FALLBACK') {
    return category as any;
  }
  return {
    ...category,
    canonicalPrimaryUrl: primaryAsset.url,
  };
}

/**
 * Batch attaches canonical media to a collection of categories.
 */
export async function attachCanonicalMediaToCategories<T extends { id?: string; image?: string }>(
  categories: T[]
): Promise<Array<T & { canonicalPrimaryUrl?: string }>> {
  if (!categories || categories.length === 0) return [];
  const categoryIds = categories.map((c) => c.id).filter(Boolean) as string[];
  const mediaMap = await getBatchPrimaryMedia('CATEGORY', categoryIds);
  return categories.map((c) => {
    const primary = c.id ? mediaMap.get(c.id) : undefined;
    return attachCanonicalMediaToCategory(c, primary);
  });
}

/**
 * Attaches canonical media to a Guide object without mutating guide.coverImage.
 */
export function attachCanonicalMediaToGuide<T extends { id?: string; coverImage?: string }>(
  guide: T,
  primaryAsset?: MediaAsset
): T & { canonicalPrimaryUrl?: string } {
  if (!guide || !primaryAsset || primaryAsset.source === 'SYSTEM_FALLBACK') {
    return guide as any;
  }
  return {
    ...guide,
    canonicalPrimaryUrl: primaryAsset.url,
  };
}

/**
 * Batch attaches canonical media to a collection of guides.
 */
export async function attachCanonicalMediaToGuides<T extends { id?: string; coverImage?: string }>(
  guides: T[]
): Promise<Array<T & { canonicalPrimaryUrl?: string }>> {
  if (!guides || guides.length === 0) return [];
  const guideIds = guides.map((g) => g.id).filter(Boolean) as string[];
  const mediaMap = await getBatchPrimaryMedia('GUIDE', guideIds);
  return guides.map((g) => {
    const primary = g.id ? mediaMap.get(g.id) : undefined;
    return attachCanonicalMediaToGuide(g, primary);
  });
}

/**
 * Attaches canonical media to a KnowledgeEntity object without mutating entity.ogImageUrl.
 */
export function attachCanonicalMediaToKnowledge<T extends { id?: string; entityKey?: string; ogImageUrl?: string }>(
  entity: T,
  primaryAsset?: MediaAsset
): T & { canonicalPrimaryUrl?: string } {
  if (!entity || !primaryAsset || primaryAsset.source === 'SYSTEM_FALLBACK') {
    return entity as any;
  }
  return {
    ...entity,
    canonicalPrimaryUrl: primaryAsset.url,
  };
}

/**
 * Batch attaches canonical media to a collection of knowledge entities.
 */
export async function attachCanonicalMediaToKnowledgeList<T extends { id?: string; entityKey?: string; ogImageUrl?: string }>(
  entities: T[]
): Promise<Array<T & { canonicalPrimaryUrl?: string }>> {
  if (!entities || entities.length === 0) return [];
  const ids = entities.map((e) => e.id || e.entityKey).filter(Boolean) as string[];
  const mediaMap = await getBatchPrimaryMedia('KNOWLEDGE', ids);
  return entities.map((e) => {
    const primary = (e.id ? mediaMap.get(e.id) : undefined) || (e.entityKey ? mediaMap.get(e.entityKey) : undefined);
    return attachCanonicalMediaToKnowledge(e, primary);
  });
}

// ============================================================================
// 7. MUTATION & GOVERNANCE METHODS
// ============================================================================

/**
 * Saves or creates a media asset with anti-hallucination locking guard:
 * - If an existing primary asset has isLocked=true, an AI_GENERATED asset
 *   is PREVENTED from claiming role='PRIMARY' and is demoted to 'GALLERY'.
 * - Deduplicates by fileHash if the binary hash already exists in storage.
 */
export async function saveMediaAsset(input: SaveMediaAssetInput): Promise<{
  asset: MediaAsset;
  deduplicated: boolean;
}> {
  const now = new Date().toISOString();
  let role = input.role || 'GALLERY';
  let deduplicated = false;

  // Derive assetOrigin
  const assetOrigin: MediaAssetOrigin = input.assetOrigin || (
    input.source === 'MANUAL_UPLOAD'
      ? (input.isLocked || role === 'PRIMARY' ? 'real_owner_photo' : 'manual_approved')
      : (input.source === 'AI_GENERATED' ? 'ai_generated' : 'manual_approved')
  );

  // 1. Deduplication check via SHA-256 hash
  let finalUrl = input.url;
  let finalStoragePath = input.storagePath;
  if (input.fileHash) {
    const existingSameHash = await findAssetByHash(input.fileHash);
    if (existingSameHash) {
      finalUrl = existingSameHash.url;
      finalStoragePath = existingSameHash.storagePath;
      deduplicated = true;
    }
  }

  // 2. Real Owner Photo Protection Guard:
  // Autonomous AI / temporary visuals MUST NOT replace or demote a protected real owner photo
  if (role === 'PRIMARY' && (input.source === 'AI_GENERATED' || assetOrigin === 'ai_generated' || assetOrigin === 'temporary_visual')) {
    const existingAssets = input.existingAssets || await getMediaForEntity({
      entityType: input.entityType,
      entityId: input.entityId,
      includeDrafts: true,
    });
    const protectedPrimary = existingAssets.find((a) => 
      (a.role === 'PRIMARY' || a.slotKey === 'PRODUCT_PRIMARY') && 
      isRealOwnerPhotoProtected(a) && 
      a.status === 'approved'
    );
    if (protectedPrimary) {
      // Demote incoming AI visual to GALLERY — Human/Owner photo is immutable
      role = 'GALLERY';
    }
  }

  const assetId = input.id || `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const isLocked = input.isLocked ?? (assetOrigin === 'real_owner_photo' || (role === 'PRIMARY' && input.source === 'MANUAL_UPLOAD'));

  const fullAsset: MediaAsset = {
    id: assetId,
    entityType: input.entityType,
    entityId: input.entityId,
    url: finalUrl,
    storagePath: finalStoragePath,
    storageBucket: input.storageBucket || 'product-images',
    fileHash: input.fileHash,
    fileName: input.fileName,
    mimeType: input.mimeType || 'image/webp',
    fileSizeBytes: input.fileSizeBytes,
    width: input.width,
    height: input.height,
    aspectRatio: input.aspectRatio || '1:1',
    role,
    source: input.source || 'MANUAL_UPLOAD',
    status: input.status || 'approved',
    isLocked,
    assetOrigin,
    slotKey: input.slotKey,
    parentAssetId: input.parentAssetId,
    derivativeType: input.derivativeType,
    healthStatus: input.healthStatus || 'HEALTHY',
    title: input.title,
    altText: input.altText,
    caption: input.caption,
    licenseInfo: input.licenseInfo,
    motionLayer: input.motionLayer,
    visualContext: input.visualContext || {},
    aiMetadata: input.aiMetadata || {},
    sortOrder: input.sortOrder ?? (role === 'PRIMARY' ? 1 : 100),
    createdAt: now,
    updatedAt: now,
  };

  // If new asset is approved PRIMARY, demote previous primaries for this entity
  const writtenAssets: MediaAsset[] = [];
  if (fullAsset.role === 'PRIMARY' && fullAsset.status === 'approved') {
    const existing = await getMediaForEntity({
      entityType: fullAsset.entityType,
      entityId: fullAsset.entityId,
      includeDrafts: true,
    });
    for (const ex of existing) {
      if (ex.id !== fullAsset.id && ex.role === 'PRIMARY') {
        ex.role = 'GALLERY';
        ex.isLocked = false;
        ex.updatedAt = now;
        await persistAssetRecord(ex);
        writtenAssets.push(ex);
      }
    }
  }

  await persistAssetRecord(fullAsset);
  writtenAssets.push(fullAsset);
  // Upsert only the written assets into the cache. Avoids DB write/read race
  // while preserving all other DB-sourced cache entries (e.g. live MANUAL_UPLOAD assets).
  refreshCacheWithAssets(writtenAssets);

  return { asset: fullAsset, deduplicated };
}

/**
 * Updates an existing media asset.
 */
export async function updateMediaAsset(
  id: string,
  updates: Partial<SaveMediaAssetInput>
): Promise<MediaAsset | null> {
  const { assets } = await getAllMediaAssetsRaw();
  const existing = assets.find((a) => a.id === id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedAsset: MediaAsset = {
    ...existing,
    ...updates,
    id: existing.id, // Immutable ID
    updatedAt: now,
  };

  await persistAssetRecord(updatedAsset);
  refreshCacheWithAssets([updatedAsset]);

  return updatedAsset;
}

/**
 * Soft archives a media asset (status='archived').
 */
export async function archiveMediaAsset(id: string): Promise<boolean> {
  return (await updateMediaAsset(id, { status: 'archived' })) !== null;
}

/**
 * Promotes a specific asset to PRIMARY and optionally locks it.
 */
export async function setPrimaryMedia(options: {
  assetId: string;
  entityType: MediaEntityType;
  entityId?: string;
  lockPrimary?: boolean;
}): Promise<MediaAsset | null> {
  const { assetId, entityType, entityId, lockPrimary } = options;
  const now = new Date().toISOString();

  // 1. Demote all existing primaries for this entity
  const setPrimaryWritten: MediaAsset[] = [];
  const existingAssets = await getMediaForEntity({ entityType, entityId, includeDrafts: true });
  for (const asset of existingAssets) {
    if (asset.role === 'PRIMARY' && asset.id !== assetId) {
      asset.role = 'GALLERY';
      asset.isLocked = false;
      asset.updatedAt = now;
      await persistAssetRecord(asset);
      setPrimaryWritten.push(asset);
    }
  }

  // 2. Promote target asset to PRIMARY
  const target = existingAssets.find((a) => a.id === assetId);
  if (!target) return null;

  target.role = 'PRIMARY';
  target.status = 'approved';
  if (lockPrimary !== undefined) {
    target.isLocked = lockPrimary;
  }
  target.updatedAt = now;

  await persistAssetRecord(target);
  setPrimaryWritten.push(target);
  refreshCacheWithAssets(setPrimaryWritten);

  return target;
}

// ============================================================================
// 8. PERSISTENCE HELPER (DB OR FALLBACK STORE)
// ============================================================================

async function persistAssetRecord(asset: MediaAsset): Promise<void> {
  // Always update in-memory store for fallback parity
  const idx = memoryMediaStore.findIndex((a) => a.id === asset.id);
  if (idx >= 0) {
    memoryMediaStore[idx] = asset;
  } else {
    memoryMediaStore.push(asset);
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const row = mapMediaAssetToRow(asset);
      const { error } = await supabase.from('media_assets').upsert([row], { onConflict: 'id' });
      if (error) {
        // Table may be pending migration; fail-closed gracefully
      }
    } catch {
      // In-memory fallback
    }
  }
}

