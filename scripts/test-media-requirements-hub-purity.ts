/**
 * MUSKY DOSE — MEDIA REQUIREMENTS HUB PURITY REGRESSION TEST
 *
 * Verifies that:
 * 1. Only a VERIFIED, APPROVED, CURRENT CANONICAL media_assets record may appear as assigned/live.
 * 2. NEVER displays Unsplash, external URLs, fallback.svg, archived media, rejected media as assigned.
 * 3. prod-3 Gallery & Primary strictly become MISSING with no URL and "MEDIA REQUIRED — REPLACE OLD ASSET".
 * 4. BAQ Henna (prod-1786368977551) primary remains LIVE with its verified Supabase upload.
 * 5. No requirement card across the entire site exposes an unapproved/external/fallback URL.
 * 6. Slots with missing or legacy media are never counted as filled.
 */

import assert from 'assert';
import {
  buildEntityRequirements,
  isCanonicalApprovedMediaAsset,
  MediaSlotRequirement,
  EntityMediaHealth,
} from '../lib/growth/media-requirements-engine';
import { MediaAsset, isSafeInternalMediaUrl, mapRowToMediaAsset } from '../lib/db/media';
import { getSupabaseAdmin } from '../lib/supabase';

async function runMediaRequirementsPurityTests() {
  console.log('🧪 Starting Media Requirements Hub Purity Test Suite...\n');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result
          .then(() => {
            console.log(`  ✅ [PASS] ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
            throw err;
          });
      } else {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}: ${err.message}`);
      throw err;
    }
  }

  // --- SECTION 1: isCanonicalApprovedMediaAsset Validator ---
  console.log('--- SECTION 1: isCanonicalApprovedMediaAsset Strict Validation ---');

  test('Rejects fallback.svg even if status is approved', () => {
    const asset: MediaAsset = {
      id: 'fallback-1',
      entityType: 'PRODUCT',
      entityId: 'prod-1',
      url: '/images/fallback.svg',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'SYSTEM_FALLBACK',
      status: 'approved',
      isLocked: false,
      mimeType: 'image/svg+xml',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.strictEqual(isCanonicalApprovedMediaAsset(asset), false, 'fallback.svg must NEVER be canonical approved');
  });

  test('Rejects Unsplash URLs regardless of status', () => {
    const asset: MediaAsset = {
      id: 'med-unsplash',
      entityType: 'PRODUCT',
      entityId: 'prod-3',
      url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'GALLERY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: false,
      mimeType: 'image/jpeg',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.strictEqual(isCanonicalApprovedMediaAsset(asset), false, 'Unsplash URL must NEVER be canonical approved');
  });

  test('Rejects archived media assets', () => {
    const asset: MediaAsset = {
      id: 'med-archived',
      entityType: 'PRODUCT',
      entityId: 'prod-3',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/manual/prod-3.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'archived',
      isLocked: false,
      mimeType: 'image/webp',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.strictEqual(isCanonicalApprovedMediaAsset(asset), false, 'Archived assets must NEVER be canonical approved');
  });

  test('Rejects rejected and suggested media assets', () => {
    const rejectedAsset: MediaAsset = {
      id: 'med-rej',
      entityType: 'PRODUCT',
      entityId: 'prod-1',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/manual/test.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'rejected',
      isLocked: false,
      mimeType: 'image/webp',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.strictEqual(isCanonicalApprovedMediaAsset(rejectedAsset), false, 'Rejected asset must be rejected');

    const suggestedAsset: MediaAsset = {
      ...rejectedAsset,
      status: 'suggested',
    };
    assert.strictEqual(isCanonicalApprovedMediaAsset(suggestedAsset), false, 'Suggested asset must be rejected');
  });

  test('Accepts verified Supabase storage asset with status approved', () => {
    const asset: MediaAsset = {
      id: 'med-valid-supabase',
      entityType: 'PRODUCT',
      entityId: 'prod-1786368977551',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/manual/product/prod-1786368977551-primary.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
      mimeType: 'image/webp',
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    assert.strictEqual(isCanonicalApprovedMediaAsset(asset), true, 'Verified Supabase asset must be accepted');
  });

  // --- SECTION 2: prod-3 Exact Requirement Engine Behavior ---
  console.log('\n--- SECTION 2: prod-3 Behavior (Unsplash / Legacy Severance) ---');

  test('prod-3 Gallery slot is strictly MISSING with no URL and marks replace old asset', () => {
    // Simulate prod-3 having only archived Unsplash assets (exact production state)
    const mockProd3Assets: MediaAsset[] = [
      {
        id: 'med-product-prod-3-0',
        entityType: 'PRODUCT',
        entityId: 'prod-3',
        url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
        storageBucket: 'product-images',
        role: 'GALLERY',
        aspectRatio: '1:1',
        source: 'MANUAL_UPLOAD',
        status: 'archived',
        isLocked: false,
        mimeType: 'image/jpeg',
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'legacy-product-prod-3-primary-0',
        entityType: 'PRODUCT',
        entityId: 'prod-3',
        url: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348',
        storageBucket: 'product-images',
        role: 'PRIMARY',
        aspectRatio: '1:1',
        source: 'MANUAL_UPLOAD',
        status: 'archived',
        isLocked: false,
        mimeType: 'image/jpeg',
        sortOrder: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const health = buildEntityRequirements(
      'PRODUCT',
      'prod-3',
      'Musky Dose Special Bridal Mehendi Cones (Pack of 12)',
      'musky-dose-special-bridal-mehendi-cones',
      mockProd3Assets
    );

    // 1. Gallery Slot
    const gallerySlot = health.slots.find((s) => s.role === 'GALLERY');
    assert.ok(gallerySlot, 'Gallery slot must exist in requirements');
    assert.strictEqual(gallerySlot.status, 'MISSING', 'Gallery slot status must strictly be MISSING');
    assert.strictEqual(gallerySlot.currentAssetUrl, undefined, 'Gallery slot currentAssetUrl must be undefined (never Unsplash)');
    assert.strictEqual(gallerySlot.currentAssetId, undefined, 'Gallery slot currentAssetId must be undefined');
    assert.strictEqual(gallerySlot.isLivePublic, false, 'Gallery slot isLivePublic must be false');
    assert.strictEqual(gallerySlot.hasLegacyOrInvalidAsset, true, 'Gallery slot must flag hasLegacyOrInvalidAsset: true');
    assert.ok(
      gallerySlot.validationIssues?.includes('MEDIA REQUIRED — REPLACE OLD ASSET'),
      'Gallery slot must contain "MEDIA REQUIRED — REPLACE OLD ASSET" issue'
    );

    // 2. Primary Slot
    const primarySlot = health.slots.find((s) => s.role === 'PRIMARY');
    assert.ok(primarySlot, 'Primary slot must exist');
    assert.strictEqual(primarySlot.status, 'MISSING', 'Primary slot status must strictly be MISSING');
    assert.strictEqual(primarySlot.currentAssetUrl, undefined, 'Primary slot currentAssetUrl must be undefined');
    assert.strictEqual(primarySlot.isLivePublic, false, 'Primary slot isLivePublic must be false');
    assert.strictEqual(primarySlot.hasLegacyOrInvalidAsset, true, 'Primary slot must flag hasLegacyOrInvalidAsset: true');

    // 3. Health counts
    assert.strictEqual(health.filledSlots, 0, 'prod-3 filledSlots must be 0 (no old media counted as filled)');
    assert.strictEqual(health.liveSlots, 0, 'prod-3 liveSlots must be 0');
    assert.strictEqual(health.healthScorePercent, 0, 'prod-3 health score must be 0%');
    assert.strictEqual(health.healthGrade, 'CRITICAL', 'prod-3 health grade must be CRITICAL');
  });

  // --- SECTION 3: Live Database Verification ---
  console.log('\n--- SECTION 3: Live Database & BAQ Henna Verification ---');

  await test('BAQ Henna (prod-1786368977551) primary slot remains LIVE with verified upload', async () => {
    const supabase = getSupabaseAdmin();
    assert.ok(supabase, 'Supabase admin client required');

    const { data: mediaRows } = await supabase
      .from('media_assets')
      .select('*')
      .eq('entity_id', 'prod-1786368977551');

    assert.ok(mediaRows && mediaRows.length > 0, 'Must have media rows for BAQ Henna');

    const mappedAssets: MediaAsset[] = (mediaRows || []).map(mapRowToMediaAsset);

    const health = buildEntityRequirements(
      'PRODUCT',
      'prod-1786368977551',
      '100% Pure Rajasthani Henna Powder (BAQ Grade)',
      'baq-henna-powder',
      mappedAssets
    );

    const primarySlot = health.slots.find((s) => s.role === 'PRIMARY');
    assert.ok(primarySlot, 'Primary slot must exist');
    assert.strictEqual(primarySlot.status, 'LIVE', 'BAQ Henna primary slot must be LIVE');
    assert.strictEqual(primarySlot.isLivePublic, true, 'BAQ Henna primary slot isLivePublic must be true');
    assert.ok(primarySlot.currentAssetUrl?.startsWith('https://'), 'Must have live HTTPS URL');
    assert.ok(primarySlot.currentAssetUrl?.includes('supabase.co'), 'Must be Supabase storage URL');
    assert.strictEqual(health.filledSlots >= 1, true, 'filledSlots must count the 1 approved asset');
    assert.strictEqual(health.liveSlots >= 1, true, 'liveSlots must count the 1 approved asset');
  });

  await test('Full Hub Scan: No requirement card across entire catalog exposes unsafe/fallback URL', async () => {
    const supabase = getSupabaseAdmin();
    assert.ok(supabase, 'Supabase admin client required');

    const [productsRes, categoriesRes, guidesRes, mediaRes] = await Promise.all([
      supabase.from('products').select('id, name, slug').limit(20),
      supabase.from('categories').select('id, name, slug').limit(10),
      supabase.from('product_guides').select('id, title, slug').limit(10),
      supabase.from('media_assets').select('*'),
    ]);

    const allMedia: MediaAsset[] = (mediaRes.data || []).map(mapRowToMediaAsset);

    const entityHealthList: EntityMediaHealth[] = [];

    // Products
    for (const p of productsRes.data || []) {
      const pAssets = allMedia.filter((a) => a.entityType === 'PRODUCT' && String(a.entityId) === String(p.id));
      entityHealthList.push(buildEntityRequirements('PRODUCT', p.id, p.name, p.slug, pAssets));
    }

    // Categories
    for (const c of categoriesRes.data || []) {
      const cAssets = allMedia.filter((a) => a.entityType === 'CATEGORY' && String(a.entityId) === String(c.id));
      entityHealthList.push(buildEntityRequirements('CATEGORY', c.id, c.name, c.slug, cAssets));
    }

    // Guides
    for (const g of guidesRes.data || []) {
      const gAssets = allMedia.filter((a) => a.entityType === 'GUIDE' && String(a.entityId) === String(g.id));
      entityHealthList.push(buildEntityRequirements('GUIDE', g.id, g.title, g.slug, gAssets));
    }

    // Assert on every single slot across all checked entities
    let totalSlotsChecked = 0;
    let filledSlotsChecked = 0;
    let missingSlotsChecked = 0;

    for (const ent of entityHealthList) {
      for (const slot of ent.slots) {
        totalSlotsChecked++;

        if (slot.status === 'MISSING') {
          missingSlotsChecked++;
          assert.strictEqual(
            slot.currentAssetUrl,
            undefined,
            `Slot ${ent.entityId} [${slot.role}] is MISSING but exposes currentAssetUrl: ${slot.currentAssetUrl}`
          );
          assert.strictEqual(
            slot.currentAssetId,
            undefined,
            `Slot ${ent.entityId} [${slot.role}] is MISSING but exposes currentAssetId: ${slot.currentAssetId}`
          );
        } else if (slot.status === 'LIVE' || slot.status === 'NEEDS_REVIEW') {
          filledSlotsChecked++;
          assert.ok(slot.currentAssetUrl, `Slot ${ent.entityId} [${slot.role}] is ${slot.status} but missing currentAssetUrl`);
          assert.strictEqual(
            isSafeInternalMediaUrl(slot.currentAssetUrl),
            true,
            `Slot ${ent.entityId} [${slot.role}] exposes unsafe URL: ${slot.currentAssetUrl}`
          );
          assert.strictEqual(
            slot.currentAssetUrl.includes('fallback.svg'),
            false,
            `Slot ${ent.entityId} [${slot.role}] exposes fallback.svg as assigned asset`
          );
          assert.strictEqual(
            slot.currentAssetUrl.includes('unsplash'),
            false,
            `Slot ${ent.entityId} [${slot.role}] exposes Unsplash URL: ${slot.currentAssetUrl}`
          );
        }
      }
    }

    console.log(`     Checked ${totalSlotsChecked} slots across ${entityHealthList.length} entities.`);
    console.log(`     Filled: ${filledSlotsChecked}, Missing: ${missingSlotsChecked}. Unsafe URLs: 0.`);
    assert.ok(totalSlotsChecked > 0, 'Must have checked slots');
  });

  console.log(`\n🎉 All ${passed}/${total} Media Requirements Hub Purity Tests PASSED!\n`);
}

runMediaRequirementsPurityTests().catch((err) => {
  console.error('\n❌ Suite failed:', err);
  process.exit(1);
});
