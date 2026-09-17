import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runCleanup() {
  console.log('=== PHASE 2: TEST POLLUTION CLEANUP ===\n');

  // 1. Fetch all real products to guarantee zero collateral damage
  const { data: realProducts, error: prodErr } = await supabase.from('products').select('id, name');
  if (prodErr || !realProducts) {
    throw new Error('Failed to fetch real products: ' + prodErr?.message);
  }
  const realProductIds = new Set(realProducts.map(p => p.id));
  console.log(`Guarded ${realProductIds.size} real products from deletion.`);

  // 2. Fetch all media assets
  const { data: allAssets, error: mediaErr } = await supabase.from('media_assets').select('*');
  if (mediaErr || !allAssets) {
    throw new Error('Failed to fetch media assets: ' + mediaErr?.message);
  }

  const recordsToDelete: any[] = [];
  const storageFilesToDelete: string[] = [];

  for (const asset of allAssets) {
    const isTestEntity =
      asset.entity_id?.startsWith('test-') ||
      asset.entity_id?.startsWith('prod-mock-') ||
      asset.entity_id?.startsWith('prod-gov-') ||
      asset.entity_id?.startsWith('prod-priority-');

    const isTestId =
      asset.id?.startsWith('test-') ||
      asset.id?.startsWith('mock-') ||
      asset.id?.startsWith('suggested-ai-') ||
      asset.id?.startsWith('ai-claim-') ||
      asset.id === 'asset-ai-overwrite-attempt' ||
      asset.id === 'asset-ai-primary' ||
      asset.id === 'media-test-henna';

    // The two corrupt mock uploads for prod-1 that contain only 124 bytes of fake header
    const isCorruptMockUpload =
      (asset.id === 'med-1789584457665-4zxkt' || asset.id === 'med-1789577808299-r9n5k') &&
      asset.file_size_bytes === 124;

    if (isTestEntity || isTestId || isCorruptMockUpload) {
      // Verification safeguard: never delete if it's a real product UNLESS it is specifically the corrupt 124b mock artifact
      if (realProductIds.has(asset.entity_id) && !isCorruptMockUpload) {
        console.warn(`PROTECTED: Skipping potential test match on real product: ${asset.entity_id}`);
        continue;
      }

      recordsToDelete.push(asset);
      if (asset.storage_path) {
        storageFilesToDelete.push(asset.storage_path);
      }
    }
  }

  console.log(`Identified ${recordsToDelete.length} test pollution records for safe removal.`);
  console.log(`Identified ${storageFilesToDelete.length} storage artifacts for cleanup.`);

  // Delete records from database in batches
  const idsToDelete = recordsToDelete.map(r => r.id);
  const batchSize = 50;
  for (let i = 0; i < idsToDelete.length; i += batchSize) {
    const batch = idsToDelete.slice(i, i + batchSize);
    const { error: delErr } = await supabase.from('media_assets').delete().in('id', batch);
    if (delErr) {
      console.error(`Failed to delete batch ${i} - ${i + batch.length}:`, delErr.message);
    } else {
      console.log(`Deleted batch of ${batch.length} media records.`);
    }
  }

  // Delete corrupt files from storage
  if (storageFilesToDelete.length > 0) {
    const { data: storageDel, error: storageDelErr } = await supabase.storage
      .from('product-images')
      .remove(storageFilesToDelete);
    if (storageDelErr) {
      console.warn('Storage cleanup warning:', storageDelErr.message);
    } else {
      console.log(`Removed ${storageFilesToDelete.length} test storage objects:`, storageDel);
    }
  }

  // 3. Verify final state
  const { data: remainingAssets } = await supabase.from('media_assets').select('id, entity_type, entity_id, role, source');
  console.log(`\nRemaining media assets in production: ${remainingAssets?.length}`);

  const anyTestRemaining = remainingAssets?.filter(a =>
    a.entity_id?.startsWith('test-') ||
    a.entity_id?.startsWith('prod-mock-') ||
    a.id?.startsWith('mock-') ||
    a.id?.startsWith('suggested-ai-')
  );

  console.log(`Test records remaining: ${anyTestRemaining?.length || 0}`);
  console.log('=== TEST POLLUTION CLEANUP COMPLETE ===\n');
}

runCleanup().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});

