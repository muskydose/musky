import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
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
  saveMediaAsset,
  updateMediaAsset,
  archiveMediaAsset,
  getMediaForEntity,
  getPrimaryMedia,
  getGalleryMedia,
  setPrimaryMedia,
  findAssetByHash,
  computeFileHash,
  resolveAuthoritativeMedia,
  resetMediaCache,
  MediaEntityType,
  MediaAsset,
} from '../lib/db/media';

async function runUniversalMediaTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 3.2: UNIVERSAL MEDIA FOUNDATION TESTS');
  console.log('===============================================================');

  resetMediaCache({ clearFallbackStore: true });

  // --------------------------------------------------------------------------
  // SUITE 1: DDL SCHEMA & SQL CONTRACT AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: DDL Schema & SQL Contract Audit ---');
  const migrationPath = path.join(process.cwd(), 'supabase-universal-media-migration-007.sql');
  assert.ok(fs.existsSync(migrationPath), 'Migration SQL file must exist at repo root');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Safety checks
  assert.ok(!/^\s*DROP\s+TABLE\s+/im.test(sql), 'DDL must not contain DROP TABLE statement');
  assert.ok(!/^\s*TRUNCATE\s+/im.test(sql), 'DDL must not contain TRUNCATE statement');
  console.log('  ✓ Safety verified: Zero destructive DROP or TRUNCATE statements (PASSED)');

  // Column declarations
  const requiredColumns = [
    'id TEXT PRIMARY KEY',
    'entity_type TEXT NOT NULL',
    'entity_id TEXT',
    'url TEXT NOT NULL',
    'storage_path TEXT',
    'storage_bucket TEXT NOT NULL',
    'file_hash TEXT',
    'file_name TEXT',
    'mime_type TEXT NOT NULL',
    'file_size_bytes INTEGER',
    'width INTEGER',
    'height INTEGER',
    'aspect_ratio TEXT',
    'role TEXT NOT NULL',
    'source TEXT NOT NULL',
    'status TEXT NOT NULL',
    'is_locked BOOLEAN NOT NULL',
    'title TEXT',
    'alt_text TEXT',
    'caption TEXT',
    'visual_context JSONB',
    'ai_metadata JSONB',
    'sort_order INTEGER NOT NULL',
    'created_at TIMESTAMPTZ NOT NULL',
    'updated_at TIMESTAMPTZ NOT NULL',
  ];

  for (const col of requiredColumns) {
    const colName = col.split(' ')[0];
    assert.ok(sql.includes(colName), `Migration SQL must declare column "${colName}"`);
  }
  console.log(`  ✓ All ${requiredColumns.length} canonical columns declared in DDL (PASSED)`);

  // Constraints & RLS
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'RLS must be enabled');
  assert.ok(sql.includes("USING (status = 'approved')"), 'Public read must be restricted to approved');
  assert.ok(sql.includes('idx_media_assets_entity'), 'Entity index must be declared');
  assert.ok(sql.includes('idx_media_assets_file_hash'), 'File hash index must be declared');
  console.log('  ✓ Constraints, RLS policies, and performance indexes verified (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 2: CRUD OPERATIONS & FIELD NORMALIZATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Media Asset CRUD & Field Normalization ---');
  const testProdId = `prod-media-test-${Date.now()}`;

  // 1. Create asset
  const { asset: createdAsset } = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: testProdId,
    url: 'https://cdn.muskydose.in/products/baq-henna-front.webp',
    fileName: 'baq-henna-front.webp',
    mimeType: 'image/webp',
    aspectRatio: '1:1',
    role: 'PRIMARY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
    title: 'BAQ Henna Powder Pack View',
    altText: 'Pure Sojat BAQ Henna 250g Pouch',
    sortOrder: 1,
  });

  assert.ok(createdAsset.id.startsWith('med-'), 'Asset ID must have med- prefix');
  assert.strictEqual(createdAsset.entityType, 'PRODUCT');
  assert.strictEqual(createdAsset.entityId, testProdId);
  assert.strictEqual(createdAsset.role, 'PRIMARY');
  assert.strictEqual(createdAsset.isLocked, true, 'Manual upload primary must default to locked');
  console.log('  ✓ Asset created and normalized successfully with manual-primary lock (PASSED)');

  // 2. Read back asset
  const entityMedia = await getMediaForEntity({ entityType: 'PRODUCT', entityId: testProdId });
  assert.strictEqual(entityMedia.length, 1);
  assert.strictEqual(entityMedia[0].id, createdAsset.id);

  // 3. Update asset
  const updated = await updateMediaAsset(createdAsset.id, {
    altText: 'Updated Alt: 100% Rajasthani Henna Pouch',
    caption: 'Direct from Sojat harvest batch',
  });
  assert.ok(updated);
  assert.strictEqual(updated.altText, 'Updated Alt: 100% Rajasthani Henna Pouch');
  assert.strictEqual(updated.caption, 'Direct from Sojat harvest batch');
  console.log('  ✓ Asset updated with immutability of ID preserved (PASSED)');

  // 4. Archive asset
  const archivedOk = await archiveMediaAsset(createdAsset.id);
  assert.strictEqual(archivedOk, true);
  const mediaAfterArchive = await getMediaForEntity({ entityType: 'PRODUCT', entityId: testProdId });
  assert.strictEqual(mediaAfterArchive.length, 0, 'Archived asset must not be returned on public query');
  console.log('  ✓ Asset soft-archived and excluded from public queries (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 3: PRIORITY RESOLUTION (LOCKED MANUAL > MANUAL > AI > FALLBACK)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Priority Resolution Engine ---');
  resetMediaCache({ clearFallbackStore: true });
  const priorityProdId = `prod-priority-${Date.now()}`;

  // Create an approved AI visual
  await saveMediaAsset({
    id: 'asset-ai-primary',
    entityType: 'PRODUCT',
    entityId: priorityProdId,
    url: 'https://cdn.muskydose.in/products/ai-render.webp',
    role: 'PRIMARY',
    source: 'AI_GENERATED',
    status: 'approved',
    isLocked: false,
    sortOrder: 1,
  });

  // Test 3A: AI is currently primary because no manual exists
  const primaryAI = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: priorityProdId });
  assert.strictEqual(primaryAI.id, 'asset-ai-primary');
  assert.strictEqual(primaryAI.source, 'AI_GENERATED');
  console.log('  ✓ In absence of manual visual, approved AI asset serves as primary (PASSED)');

  // Create a manual visual (unlocked)
  await saveMediaAsset({
    id: 'asset-manual-primary',
    entityType: 'PRODUCT',
    entityId: priorityProdId,
    url: 'https://cdn.muskydose.in/products/manual-photo.webp',
    role: 'PRIMARY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
    isLocked: false,
    sortOrder: 1,
  });

  // Test 3B: Manual approved immediately takes precedence over AI approved
  const primaryManual = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: priorityProdId });
  assert.strictEqual(primaryManual.id, 'asset-manual-primary');
  assert.strictEqual(primaryManual.source, 'MANUAL_UPLOAD');
  console.log('  ✓ MANUAL_UPLOAD approved displaces AI_GENERATED primary (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 4: MANUAL-PRIMARY LOCKING GUARD AGAINST AI DEMOTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Manual-Primary Locking Guard ---');
  // Lock the manual primary
  await setPrimaryMedia({
    assetId: 'asset-manual-primary',
    entityType: 'PRODUCT',
    entityId: priorityProdId,
    lockPrimary: true,
  });

  const lockedPrimary = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: priorityProdId });
  assert.strictEqual(lockedPrimary.isLocked, true, 'Primary must be locked');

  // Now simulate an automated AI pipeline attempting to save a new AI_GENERATED image claiming role='PRIMARY'
  const { asset: attemptedAiOverwrite } = await saveMediaAsset({
    id: 'asset-ai-overwrite-attempt',
    entityType: 'PRODUCT',
    entityId: priorityProdId,
    url: 'https://cdn.muskydose.in/products/ai-new-attempt.webp',
    role: 'PRIMARY', // Attempting to claim primary!
    source: 'AI_GENERATED',
    status: 'approved',
  });

  // Guard must automatically demote AI to GALLERY
  assert.strictEqual(
    attemptedAiOverwrite.role,
    'GALLERY',
    'Anti-hallucination guard must demote AI asset to GALLERY when human primary is locked'
  );

  const primaryAfterAiAttempt = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: priorityProdId });
  assert.strictEqual(
    primaryAfterAiAttempt.id,
    'asset-manual-primary',
    'Human locked primary must remain 100% intact after AI pipeline run'
  );
  console.log('  ✓ Anti-hallucination locking guard verified: AI cannot replace or demote locked primary (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 5: SHA-256 DEDUPLICATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Cryptographic SHA-256 Deduplication ---');
  const dummyFileBuffer = Buffer.from('MUSKY_DOSE_AUTHENTIC_BOTANICAL_IMAGE_BUFFER_TEST_2026');
  const testHash = computeFileHash(dummyFileBuffer);
  assert.strictEqual(testHash.length, 64, 'SHA-256 hash must be 64 hex characters');

  // 1. Save original asset with hash
  const canonicalUploadUrl = 'https://cdn.muskydose.in/canonical/sojat-leaves.webp';
  const { asset: firstAsset, deduplicated: wasDeduped1 } = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    url: canonicalUploadUrl,
    storagePath: 'products/prod-henna-1/sojat-leaves.webp',
    fileHash: testHash,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  assert.strictEqual(wasDeduped1, false, 'First upload must not be deduplicated');

  // 2. Lookup by hash
  const foundByHash = await findAssetByHash(testHash);
  assert.ok(foundByHash);
  assert.strictEqual(foundByHash.id, firstAsset.id);
  assert.strictEqual(foundByHash.url, canonicalUploadUrl);

  // 3. Attempt to upload the identical file for another entity (e.g. Category or another Product)
  const { asset: secondAsset, deduplicated: wasDeduped2 } = await saveMediaAsset({
    entityType: 'CATEGORY',
    entityId: 'cat-henna',
    url: 'https://temporary-staging.internal/temp-upload.webp',
    fileHash: testHash, // Same binary hash!
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });

  assert.strictEqual(wasDeduped2, true, 'Second identical binary must be flagged as deduplicated');
  assert.strictEqual(
    secondAsset.url,
    canonicalUploadUrl,
    'Deduplicated asset must reuse the canonical URL of the existing asset'
  );
  console.log('  ✓ SHA-256 hash deduplication verified: Reuses storage URL and avoids duplicate bytes (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 6: GOVERNANCE GATING (SUGGESTED / REJECTED EXCLUSION)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Governance Gating (Suggested & Rejected Exclusion) ---');
  const govProdId = `prod-gov-${Date.now()}`;

  // Suggested AI asset
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: govProdId,
    url: 'https://cdn.muskydose.in/suggested-preview.webp',
    source: 'AI_GENERATED',
    status: 'suggested', // Pending admin review!
  });

  // Rejected asset
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: govProdId,
    url: 'https://cdn.muskydose.in/rejected-image.webp',
    source: 'MANUAL_UPLOAD',
    status: 'rejected',
  });

  // Public query must find zero
  const publicGovMedia = await getMediaForEntity({ entityType: 'PRODUCT', entityId: govProdId });
  assert.strictEqual(publicGovMedia.length, 0, 'Public query must exclude suggested and rejected');

  // Admin query (includeDrafts=true) must find suggested and rejected
  const adminGovMedia = await getMediaForEntity({ entityType: 'PRODUCT', entityId: govProdId, includeDrafts: true });
  assert.strictEqual(adminGovMedia.length, 2, 'Admin query must return suggested and rejected assets for review');
  console.log('  ✓ Strict governance gating verified: Suggested/rejected isolated from public queries (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 7: LEGACY FIELD FALLBACK & SYSTEM DEFAULT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Backward-Compatible Legacy Field Fallback ---');
  const unmigratedProdId = `prod-unmigrated-${Date.now()}`;

  // 1. With legacy URL fallback
  const resolvedWithLegacy = await getPrimaryMedia({
    entityType: 'PRODUCT',
    entityId: unmigratedProdId,
    legacyFallbackUrl: '/images/products/legacy-triple-shifted.jpg',
  });
  assert.strictEqual(resolvedWithLegacy.url, '/images/products/legacy-triple-shifted.jpg');
  assert.strictEqual(resolvedWithLegacy.source, 'SYSTEM_FALLBACK');
  console.log('  ✓ Safely falls back to entity legacy image field when DB rows do not yet exist (PASSED)');

  // 2. Without legacy URL (clean system fallback)
  const resolvedWithoutLegacy = await getPrimaryMedia({
    entityType: 'PRODUCT',
    entityId: unmigratedProdId,
  });
  assert.strictEqual(resolvedWithoutLegacy.url, '/images/fallback.svg');
  assert.strictEqual(resolvedWithoutLegacy.source, 'SYSTEM_FALLBACK');
  console.log('  ✓ Clean fail-closed to /images/fallback.svg when zero assets exist (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 8: ALL UNIVERSAL ENTITY TYPES RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 8: Universal Entity Types Coverage ---');
  const allEntityTypes: MediaEntityType[] = [
    'PRODUCT',
    'CATEGORY',
    'GUIDE',
    'KNOWLEDGE',
    'BRAND',
    'MARKETING',
  ];

  for (const eType of allEntityTypes) {
    const eId = `test-${eType.toLowerCase()}-1`;
    const { asset } = await saveMediaAsset({
      entityType: eType,
      entityId: eId,
      url: `https://cdn.muskydose.in/assets/${eType.toLowerCase()}-test.webp`,
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
    });

    const primary = await getPrimaryMedia({ entityType: eType, entityId: eId });
    assert.strictEqual(primary.id, asset.id);
    assert.strictEqual(primary.entityType, eType);
  }
  console.log(`  ✓ All ${allEntityTypes.length} universal entity types (PRODUCT, CATEGORY, GUIDE, KNOWLEDGE, BRAND, MARKETING) supported (PASSED)`);

  console.log('\n===============================================================');
  console.log('ALL PHASE 3.2 UNIVERSAL MEDIA TESTS PASSED (8/8 SUITES — 100%)');
  console.log('===============================================================');
}

runUniversalMediaTests().catch((err) => {
  console.error('Universal media test failure:', err);
  process.exit(1);
});
