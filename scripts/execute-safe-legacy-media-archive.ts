/**
 * MUSKY DOSE — SAFE LEGACY MEDIA ARCHIVE EXECUTION
 * 
 * Safely updates confirmed old catalog/stock/Unsplash media rows in public.media_assets
 * to status = 'archived' with full replacement and audit metadata.
 * 
 * STRICT GUARANTEES:
 * - NEVER touches products, orders, customers, pricing, or catalog tables.
 * - STRICTLY preserves official logo and favicon assets.
 * - STRICTLY preserves all verified MANUAL_UPLOAD assets.
 */

import { archiveLegacyMediaRecords } from '../lib/growth/media-replacement-engine';
import { getSupabaseAdmin } from '../lib/supabase';
import { isSafeInternalMediaUrl } from '../lib/db/media';

async function runArchive() {
  console.log('🚀 Executing Safe Legacy Media Archival...');
  const result = await archiveLegacyMediaRecords();
  console.log(`\nArchival Results:`);
  console.log(` - Archived legacy/external rows: ${result.archivedCount}`);
  console.log(` - Preserved official brand assets: ${result.preservedCount}`);
  
  // Verify database state
  const sb = getSupabaseAdmin();
  if (!sb) {
    console.error('No Supabase admin client');
    return;
  }
  const { data: approvedAssets } = await sb
    .from('media_assets')
    .select('id, entity_type, entity_id, url, status, source')
    .eq('status', 'approved');

  const unsafeApproved = approvedAssets?.filter((a) => !isSafeInternalMediaUrl(a.url)) || [];
  console.log(`\nRemaining approved assets with unsafe URLs: ${unsafeApproved.length}`);
  if (unsafeApproved.length > 0) {
    console.warn('Unsafe assets still approved:', unsafeApproved);
  } else {
    console.log('✅ 100% of approved media assets in public.media_assets are now safe internal assets!');
  }
}

runArchive().catch((err) => {
  console.error('Archival failed:', err);
  process.exit(1);
});

