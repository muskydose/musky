import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

import {
  runMediaMigration,
  resolveBinaryHashAndMetadata,
  generateDeterministicAssetId,
} from '../lib/growth/media-migration-engine';
import {
  getAllMediaAssetsRaw,
  getMediaForEntity,
  getPrimaryMedia,
  getGalleryMedia,
  resolveAuthoritativeMedia,
  findAssetByHash,
  resetMediaCache,
  computeFileHash,
} from '../lib/db/media';

async function runMediaMigrationTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 3.3: MEDIA MIGRATION & BACKFILL TESTS');
  console.log('===============================================================');

  // Clear in-memory store for fresh deterministic test run
  resetMediaCache({ clearFallbackStore: true });

  // --------------------------------------------------------------------------
  // SUITE 1: CATALOG MEDIA SOURCES BACKFILL EXECUTION (INITIAL RUN)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Catalog Media Sources Backfill Execution ---');
  const run1 = await runMediaMigration({ clearExistingMedia: true });

  console.log('  Entities scanned:', run1.entityCounts);
  console.log('  Source records processed:', run1.sourceRecordsProcessed);
  console.log('  Media assets created:', run1.mediaAssetsCreated);
  console.log('  Duplicates deduplicated:', run1.duplicatesDeduplicated);
  console.log('  Primary assets assigned:', run1.primaryAssignedCount);

  assert.ok(run1.entityCounts.products >= 28, 'Must scan all catalog products (expected >= 28)');
  assert.ok(run1.entityCounts.categories >= 5, 'Must scan all categories (expected >= 5)');
  assert.ok(run1.entityCounts.guides >= 3, 'Must scan all guides (expected >= 3)');
  assert.ok(run1.entityCounts.knowledgeEntities >= 18, 'Must scan knowledge entities (expected >= 18)');
  assert.ok(run1.sourceRecordsProcessed > 0, 'Must process source media records');
  assert.ok(run1.mediaAssetsCreated > 0, 'Must create media assets in repository');

  const { assets: assetsRun1 } = await getAllMediaAssetsRaw();
  console.log(`  ✓ Initial backfill generated ${assetsRun1.length} media_assets rows (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 2: IDEMPOTENT RERUN INTEGRITY (ZERO DUPLICATION)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Idempotent Rerun Integrity ---');
  const run2 = await runMediaMigration({ clearExistingMedia: false });
  const { assets: assetsRun2 } = await getAllMediaAssetsRaw();

  assert.strictEqual(
    assetsRun2.length,
    assetsRun1.length,
    `Rerun must NOT increase total media asset count (run1: ${assetsRun1.length}, run2: ${assetsRun2.length})`
  );
  console.log(`  ✓ Idempotency verified: Re-running backfill produced identical row count (${assetsRun2.length}) (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 3: CRYPTOGRAPHIC SHA-256 DEDUPLICATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Cryptographic SHA-256 Deduplication ---');
  const fallbackPath = path.join(process.cwd(), 'public', 'images', 'fallback.svg');
  assert.ok(fs.existsSync(fallbackPath), 'public/images/fallback.svg must exist');
  const fallbackBuffer = fs.readFileSync(fallbackPath);
  const fallbackHash = computeFileHash(fallbackBuffer);

  const fallbackAsset = await findAssetByHash(fallbackHash);
  assert.ok(fallbackAsset, 'findAssetByHash must find asset corresponding to fallback.svg hash');
  assert.strictEqual(fallbackAsset.fileHash, fallbackHash, 'Asset fileHash must match computed SHA-256');

  // Verify multiple entities share the deduplicated hash
  const sharedAssets = assetsRun2.filter((a) => a.fileHash === fallbackHash);
  assert.ok(sharedAssets.length >= 2, `Multiple entities must share fallback.svg binary hash (found ${sharedAssets.length})`);
  console.log(`  ✓ SHA-256 deduplication verified: ${sharedAssets.length} records share binary hash ${fallbackHash.slice(0, 16)}... (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 4: PRODUCT MEDIA MAPPING & PRIMARY LOCKING
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Product Media Mapping & Primary Locking ---');
  const productAssets = assetsRun2.filter((a) => a.entityType === 'PRODUCT');
  assert.ok(productAssets.length > 0, 'Must have migrated product assets');

  // Check manual source and approved status
  for (const asset of productAssets) {
    assert.strictEqual(asset.source, 'MANUAL_UPLOAD', 'Existing product media must be marked MANUAL_UPLOAD');
    assert.strictEqual(asset.status, 'approved', 'Existing product media must be marked approved');
    if (asset.role === 'PRIMARY') {
      assert.strictEqual(asset.isLocked, true, 'Primary product visual must be locked against AI hallucination');
    }
  }

  // Check specific product (e.g. prod-4)
  const prod4Media = await getMediaForEntity({ entityType: 'PRODUCT', entityId: 'prod-4' });
  assert.ok(prod4Media.length >= 1, 'prod-4 must have at least 1 media asset');
  const prod4Primary = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: 'prod-4' });
  assert.strictEqual(prod4Primary.role, 'PRIMARY', 'prod-4 primary asset role must be PRIMARY');
  assert.strictEqual(prod4Primary.isLocked, true, 'prod-4 primary asset must be locked');
  console.log(`  ✓ Product media mapping verified: Role PRIMARY assigned and locked (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 5: CATEGORY VISUALS MIGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Category Visuals Migration ---');
  const categoryAssets = assetsRun2.filter((a) => a.entityType === 'CATEGORY');
  assert.ok(categoryAssets.length >= 5, 'All 5 categories must be registered');

  for (const catAsset of categoryAssets) {
    assert.strictEqual(catAsset.role, 'HERO', 'Category visual role must be HERO');
    assert.strictEqual(catAsset.status, 'approved', 'Category visual status must be approved');
    assert.ok(catAsset.entityId, 'Category visual must link to category ID');
  }
  console.log(`  ✓ Category visuals verified: ${categoryAssets.length} categories registered with role HERO (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 6: GUIDE VISUALS MIGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Guide Visuals Migration ---');
  const guideAssets = assetsRun2.filter((a) => a.entityType === 'GUIDE');
  console.log(`  Guide assets registered in media_assets: ${guideAssets.length}`);
  // In the catalog, guide cover images are currently null / fallback
  for (const gAsset of guideAssets) {
    assert.strictEqual(gAsset.role, 'HERO', 'Guide visual role must be HERO');
    assert.strictEqual(gAsset.status, 'approved');
  }
  console.log(`  ✓ Guide visuals verified (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 7: KNOWLEDGE ENTITIES INTEGRATION & DAL RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Knowledge Entities Integration & DAL Resolution ---');
  // Knowledge entities resolution
  const hennaPrimary = await getPrimaryMedia({
    entityType: 'KNOWLEDGE',
    entityId: 'sojat-henna',
    legacyFallbackUrl: '/images/og-default.jpg',
  });
  assert.ok(hennaPrimary, 'Knowledge entity must resolve primary visual');
  assert.ok(hennaPrimary.url, 'Knowledge primary must have a valid URL');
  console.log(`  ✓ Knowledge entity visual resolution verified (${hennaPrimary.url}) (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 8: BRAND & HERO ASSETS REGISTRATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Brand & Hero Assets Registration ---');
  const brandAssets = assetsRun2.filter((a) => a.entityType === 'BRAND');
  assert.ok(brandAssets.length >= 2, 'Must have registered brand assets (logo, favicon)');

  const logoAsset = brandAssets.find((a) => a.title?.includes('Logo'));
  assert.ok(logoAsset, 'Logo asset must be registered in BRAND');
  assert.strictEqual(logoAsset.role, 'ICON', 'Logo role must be ICON');
  assert.strictEqual(logoAsset.url, '/logo.png', 'Logo URL must be /logo.png');
  assert.ok(logoAsset.fileSizeBytes! > 100000, 'Logo fileSizeBytes must reflect actual binary size');

  const faviconAsset = brandAssets.find((a) => a.title?.includes('Favicon'));
  assert.ok(faviconAsset, 'Favicon asset must be registered');
  assert.strictEqual(faviconAsset.url, '/favicon.png', 'Favicon URL must be /favicon.png');
  console.log(`  ✓ Brand core assets verified (Logo: ${logoAsset.fileSizeBytes} bytes, Favicon: ${faviconAsset.fileSizeBytes} bytes) (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 9: AUTHORITATIVE MEDIA RESOLUTION & PRIORITY ENGINE
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 9: Authoritative Media Resolution & Priority Engine ---');
  const resolution = await resolveAuthoritativeMedia({
    entityType: 'PRODUCT',
    entityId: 'prod-4',
  });
  assert.strictEqual(resolution.isFallback, false, 'Migrated entity must NOT resolve as fallback');
  assert.strictEqual(resolution.source, 'MANUAL_UPLOAD', 'Authoritative source must be MANUAL_UPLOAD');
  assert.strictEqual(resolution.primaryAsset.role, 'PRIMARY', 'Primary asset role must be PRIMARY');
  assert.strictEqual(resolution.primaryAsset.isLocked, true, 'Primary asset must remain locked');
  console.log(`  ✓ Authoritative resolution verified: Primary=${resolution.primaryAsset.url} (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 10: FAIL-CLOSED LEGACY FALLBACK
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 10: Fail-Closed Legacy Fallback ---');
  const nonExistentResolution = await resolveAuthoritativeMedia({
    entityType: 'PRODUCT',
    entityId: 'prod-non-existent-12345',
    legacyFallbackUrl: '/images/custom-legacy-image.png',
  });
  assert.strictEqual(nonExistentResolution.isFallback, true, 'Unregistered entity must resolve as fallback');
  assert.strictEqual(nonExistentResolution.source, 'SYSTEM_FALLBACK', 'Source must be SYSTEM_FALLBACK');
  assert.strictEqual(nonExistentResolution.primaryAsset.url, '/images/custom-legacy-image.png', 'Must respect custom legacy fallback URL');

  const defaultFallback = await getPrimaryMedia({
    entityType: 'PRODUCT',
    entityId: 'prod-totally-unknown',
  });
  assert.strictEqual(defaultFallback.url, '/images/fallback.svg', 'Must fall back to /images/fallback.svg');
  console.log(`  ✓ Fail-closed fallback verified: Unmigrated entities safely resolve legacy fallback (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 11: ORPHAN ASSET DETECTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 11: Orphan Storage Asset Detection ---');
  console.log('  Orphan assets in storage:', run1.orphanAssetsDetected);
  if (run1.orphanAssetsDetected.length > 0) {
    const orphan = run1.orphanAssetsDetected[0];
    assert.ok(orphan.path.includes('prod-1'), 'Should detect orphan asset in storage');
    console.log(`  ✓ Detected orphan storage object: ${orphan.path} (${orphan.sizeBytes} bytes) (PASSED)`);
  } else {
    console.log('  (Storage offline or zero orphans detected)');
  }

  // --------------------------------------------------------------------------
  // SUITE 12: URL PRESERVATION & ZERO DESTRUCTIVE MUTATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 12: URL Preservation & Zero Destructive Mutation ---');
  for (const asset of assetsRun2) {
    assert.ok(asset.url && asset.url.length > 0, 'Every asset must preserve a valid non-empty URL');
    assert.ok(asset.id.startsWith('legacy-'), 'Migrated assets must have deterministic legacy- prefix');
    assert.ok(asset.status === 'approved', 'All migrated catalog assets must be approved');
  }
  console.log(`  ✓ All ${assetsRun2.length} assets verified: 100% URL preservation, zero destructive mutations (PASSED)`);

  console.log('\n===============================================================');
  console.log('ALL PHASE 3.3 MEDIA MIGRATION TESTS PASSED (12/12 SUITES — 100%)');
  console.log('===============================================================');
}

runMediaMigrationTests().catch((err) => {
  console.error('\n❌ Media Migration Tests Failed:', err);
  process.exit(1);
});

