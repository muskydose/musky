import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';
import { MediaAsset, MediaEntityType, MediaAssetRole, resetMediaCache } from '@/lib/db/media';
import { PROTECTED_OFFICIAL_BRAND_ASSETS } from './media-specs';

export interface ReplacementResult {
  success: boolean;
  newAssetId: string;
  previousAssetId?: string;
  archivedPreviousAsset: boolean;
  error?: string;
  details: {
    entityType: MediaEntityType;
    entityId: string;
    role: MediaAssetRole;
    newUrl: string;
    oldUrl?: string;
    switchTimestamp: string;
  };
}

/**
 * Executes a zero-downtime media replacement.
 * 
 * Sequence:
 * 1. Fetches current live asset.
 * 2. Validates new asset readiness.
 * 3. Switches new asset to active public / approved.
 * 4. Only upon successful confirmation, safely archives the old asset with full audit provenance.
 * 5. If new asset activation fails, leaves the old asset 100% untouched.
 */
export async function performZeroDowntimeReplacement(options: {
  entityType: MediaEntityType;
  entityId: string;
  role: MediaAssetRole;
  newAssetId: string;
  consumingRoute: string;
  reason?: string;
}): Promise<ReplacementResult> {
  const { entityType, entityId, role, newAssetId, consumingRoute, reason } = options;
  const supabase = getSupabaseAdmin() || getSupabase();

  if (!supabase) {
    return {
      success: false,
      newAssetId,
      archivedPreviousAsset: false,
      error: 'Supabase client unavailable.',
      details: {
        entityType,
        entityId,
        role,
        newUrl: '',
        switchTimestamp: new Date().toISOString(),
      },
    };
  }

  const now = new Date().toISOString();

  // 1. Fetch current live asset for this slot
  let previousAsset: any = null;
  try {
    const { data: currentRows } = await supabase
      .from('media_assets')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .eq('role', role)
      .neq('id', newAssetId)
      .in('status', ['approved', 'live'])
      .order('updated_at', { ascending: false });

    if (currentRows && currentRows.length > 0) {
      previousAsset = currentRows[0];
    }
  } catch (err: any) {
    console.warn('[ReplacementEngine] Warning fetching current live asset:', err.message);
  }

  // 2. Fetch new asset to ensure it exists and is ready
  const { data: newAssetData, error: newAssetErr } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', newAssetId)
    .single();

  if (newAssetErr || !newAssetData) {
    return {
      success: false,
      newAssetId,
      archivedPreviousAsset: false,
      error: `New media asset ${newAssetId} not found. Previous live asset remains active.`,
      details: {
        entityType,
        entityId,
        role,
        newUrl: '',
        oldUrl: previousAsset?.url,
        switchTimestamp: now,
      },
    };
  }

  // Real Owner Photo Protection Guard
  const previousIsProtected = Boolean(
    previousAsset?.is_locked ||
    previousAsset?.source === 'MANUAL_UPLOAD' ||
    previousAsset?.asset_origin === 'real_owner_photo' ||
    previousAsset?.visual_context?.asset_origin === 'real_owner_photo'
  );

  const newIsRealOwner = Boolean(
    newAssetData.asset_origin === 'real_owner_photo' ||
    newAssetData.visual_context?.asset_origin === 'real_owner_photo' ||
    newAssetData.source === 'MANUAL_UPLOAD'
  );

  if (previousIsProtected && !newIsRealOwner) {
    return {
      success: false,
      newAssetId,
      archivedPreviousAsset: false,
      error: `Cannot replace protected real owner photo with an automated/AI asset. Previous live asset remains active.`,
      details: {
        entityType,
        entityId,
        role,
        newUrl: newAssetData.url,
        oldUrl: previousAsset?.url,
        switchTimestamp: now,
      },
    };
  }

  // 3. Activate the new asset FIRST (Zero Downtime)
  const isPrimary = role === 'PRIMARY';
  const newAiMeta = {
    ...(newAssetData.ai_metadata || {}),
    activated_at: now,
    activated_for_route: consumingRoute,
    previous_asset_id: previousAsset?.id || null,
  };

  const { error: activateErr } = await supabase
    .from('media_assets')
    .update({
      status: 'approved',
      is_locked: isPrimary ? true : newAssetData.is_locked,
      ai_metadata: newAiMeta,
      updated_at: now,
    })
    .eq('id', newAssetId);

  if (activateErr) {
    return {
      success: false,
      newAssetId,
      archivedPreviousAsset: false,
      error: `Failed to activate new asset: ${activateErr.message}. Previous live asset remains active.`,
      details: {
        entityType,
        entityId,
        role,
        newUrl: newAssetData.url,
        oldUrl: previousAsset?.url,
        switchTimestamp: now,
      },
    };
  }

  // 4. Archive previous asset ONLY after new asset activation succeeded
  let archivedPrevious = false;
  if (previousAsset && previousAsset.id) {
    // Check if previous asset is protected brand asset
    const isProtected = PROTECTED_OFFICIAL_BRAND_ASSETS.has(previousAsset.url);
    if (!isProtected) {
      const archiveMeta = {
        ...(previousAsset.ai_metadata || {}),
        replaced_by: newAssetId,
        replacement_date: now,
        old_hash: previousAsset.file_hash || '',
        new_asset_id: newAssetId,
        old_route: consumingRoute,
        reason: reason || 'upgraded_to_canonical_replacement',
      };

      const { error: archiveErr } = await supabase
        .from('media_assets')
        .update({
          status: 'archived',
          ai_metadata: archiveMeta,
          updated_at: now,
        })
        .eq('id', previousAsset.id);

      if (!archiveErr) {
        archivedPrevious = true;
      } else {
        console.warn(`[ReplacementEngine] Could not archive previous asset ${previousAsset.id}:`, archiveErr.message);
      }
    }
  }

  resetMediaCache();

  return {
    success: true,
    newAssetId,
    previousAssetId: previousAsset?.id,
    archivedPreviousAsset: archivedPrevious,
    details: {
      entityType,
      entityId,
      role,
      newUrl: newAssetData.url,
      oldUrl: previousAsset?.url,
      switchTimestamp: now,
    },
  };
}

/**
 * Safely archives confirmed old catalog/stock/Unsplash media rows
 * without touching business, product, order, or customer data.
 * 
 * Strictly preserves official logo and favicon assets!
 */
export async function archiveLegacyMediaRecords(): Promise<{
  archivedCount: number;
  preservedCount: number;
  preservedUrls: string[];
}> {
  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) {
    return { archivedCount: 0, preservedCount: 0, preservedUrls: [] };
  }

  const now = new Date().toISOString();
  const { data: allMedia } = await supabase.from('media_assets').select('*');
  if (!allMedia || allMedia.length === 0) {
    return { archivedCount: 0, preservedCount: 0, preservedUrls: [] };
  }

  let archivedCount = 0;
  let preservedCount = 0;
  const preservedUrls: string[] = [];

  for (const m of allMedia) {
    const url = m.url || '';
    const isProtected = PROTECTED_OFFICIAL_BRAND_ASSETS.has(url) || url.includes('logo.png') || url.includes('favicon');

    if (isProtected) {
      preservedCount++;
      preservedUrls.push(url);
      continue;
    }

    // Identify legacy, stock, fallback, or mock CDN assets
    const isLegacyOrExternal =
      url.includes('unsplash.com') ||
      url.includes('cdn.muskydose.in') ||
      url.includes('fallback.svg') ||
      url.startsWith('http://localhost') ||
      m.source === 'EXTERNAL_IMPORT' ||
      m.source === 'SYSTEM_FALLBACK';

    if (isLegacyOrExternal && m.status !== 'archived') {
      const archiveMeta = {
        ...(m.ai_metadata || {}),
        archived_at: now,
        reason: 'legacy_external_stock_cleanup',
        original_url: url,
        original_source: m.source,
      };

      await supabase
        .from('media_assets')
        .update({
          status: 'archived',
          ai_metadata: archiveMeta,
          updated_at: now,
        })
        .eq('id', m.id);

      archivedCount++;
    }
  }

  return { archivedCount, preservedCount, preservedUrls };
}

