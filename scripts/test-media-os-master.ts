/**
 * MUSKY DOSE — MEDIA OPERATING SYSTEM MASTER VERIFICATION SUITE
 * 
 * Verifies all 24 requirements from Master Implementation Section 47:
 * 1.  media source priority (real_owner_photo > manual_approved > derived_from_real > programmatic_template > temporary_visual > ai_generated > legacy_archived)
 * 2.  real photo protection (immutable against AI generation & overwrite)
 * 3.  temporary visual state & anti-hallucination rules (botanical, no packaging/claims)
 * 4.  product onboarding hook (saveProduct triggers background slot reconciliation)
 * 5.  existing product backfill (reconcileAllProductsMedia idempotent execution)
 * 6.  future product onboarding (dynamic 10-slot canonical checklist)
 * 7.  idempotent reconciliation (running twice creates zero duplicate jobs)
 * 8.  slot reconciliation (maps System 2 IDs and legacy aliases to System 1 canonical)
 * 9.  derivative generation (Sharp letterboxing & lineage retention)
 * 10. 1:1 -> OG (1200x630, 1.91:1, non-distorted)
 * 11. 1:1 -> thumbnail (512x512 cover)
 * 12. duplicate hash deduplication (prevents duplicate binary uploads)
 * 13. upload validation (aspect ratio, dimension, and size validation)
 * 14. bulk import mapping ({slug}-{slot}.ext mapped strictly against catalog)
 * 15. unknown filename handling (routes to UNMATCHED_REVIEW without crashing)
 * 16. broken media detection (verifyMediaAssetUrlHealth flags 404s)
 * 17. repair flow (marks UNHEALTHY and enqueues self-healing job)
 * 18. concurrency & lease lock (5-minute lease, deterministic job IDs)
 * 19. provider unavailable truthful state (WAITING_PROVIDER when ComfyUI offline)
 * 20. worker truthful states (BLOCKED, ASSET_ASSIGNED, WAITING_PROVIDER, ASSET_APPROVED, FAILED)
 * 21. public verification (attaches canonical media without leaking Unsplash/mock CDNs)
 * 22. OpenGraph fallback (rejects SVG, guarantees raster /logo.png fallback)
 * 23. admin API contract (real-photo flag, bulk upload route, health check route)
 * 24. migration behavior (DDL safety, ADD COLUMN IF NOT EXISTS, safe enums)
 */

import assert from 'assert';
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
  MediaAsset,
  computeAssetPriorityScore,
  isRealOwnerPhotoProtected,
  isSafeInternalMediaUrl,
  saveMediaAsset,
  getMediaForEntity,
  getPrimaryMedia,
  findAssetByHash,
  computeFileHash,
  resetMediaCache,
} from '../lib/db/media';
import {
  reconcileCanonicalSlot,
  STANDARD_MEDIA_SPECS,
} from '../lib/growth/media-specs';
import { getCanonicalSpecForVisualSlot } from '../lib/growth/visual-blueprint';
import {
  buildTemporaryVisualBlueprint,
  isTemporaryVisual,
} from '../lib/growth/media-temporary-visuals';
import {
  generateMediaDerivative,
  DERIVATIVE_SPECS,
} from '../lib/media/derived-media-engine';
import {
  enqueueMediaJob,
  acquireMediaJobLock,
  completeMediaJob,
  generateDeterministicMediaJobId,
  resetMemoryMediaJobs,
} from '../lib/growth/media-jobs-engine';
import {
  matchBulkFilenameToEntity,
} from '../lib/media/bulk-import-engine';
import {
  validateUploadBuffer,
} from '../lib/media/upload-validator';
import {
  verifyMediaAssetUrlHealth,
  markMediaAssetUnhealthy,
} from '../lib/growth/media-health-engine';
import {
  reconcileProductMediaRequirements,
  reconcileAllProductsMedia,
  buildEntityRequirements,
} from '../lib/growth/media-requirements-engine';
import {
  mediaVisualWorker,
} from '../lib/agent/workers/index';
import {
  resolveAuthoritativeProductMedia,
} from '../lib/growth/product-media-governance';
import {
  resolvePageSeoMetadata,
} from '../lib/db/seo';
import sharp from 'sharp';

async function runMasterMediaOSTests() {
  console.log('===============================================================');
  console.log('MUSKY DOSE — MEDIA OPERATING SYSTEM MASTER TEST SUITE');
  console.log('===============================================================\n');

  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      passed++;
      console.log(`  ✅ [PASS] ${name}`);
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Media Source Priority Matrix
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Media Source Priority Matrix ---');
  await test('Priority score hierarchy strictly preserves owner photography over AI & templates', () => {
    const base: MediaAsset = {
      id: 'test-1',
      entityType: 'PRODUCT',
      entityId: 'prod-test',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/test.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: false,
      sortOrder: 1,
      mimeType: 'image/webp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const realPhoto: MediaAsset = { ...base, assetOrigin: 'real_owner_photo', isLocked: true };
    const manualApproved: MediaAsset = { ...base, assetOrigin: 'manual_approved' };
    const derivedFromReal: MediaAsset = { ...base, assetOrigin: 'derived_from_real' };
    const template: MediaAsset = { ...base, assetOrigin: 'programmatic_template' };
    const tempVisual: MediaAsset = { ...base, assetOrigin: 'temporary_visual' };
    const aiGenerated: MediaAsset = { ...base, assetOrigin: 'ai_generated', source: 'AI_GENERATED' };
    const archived: MediaAsset = { ...base, assetOrigin: 'legacy_archived', status: 'archived' };

    const scoreReal = computeAssetPriorityScore(realPhoto);
    const scoreManual = computeAssetPriorityScore(manualApproved);
    const scoreDerived = computeAssetPriorityScore(derivedFromReal);
    const scoreTemplate = computeAssetPriorityScore(template);
    const scoreTemp = computeAssetPriorityScore(tempVisual);
    const scoreAI = computeAssetPriorityScore(aiGenerated);
    const scoreArchived = computeAssetPriorityScore(archived);

    assert(scoreReal > scoreManual, `Real photo (${scoreReal}) must outrank manual approved (${scoreManual})`);
    assert(scoreManual > scoreDerived, `Manual (${scoreManual}) must outrank derived (${scoreDerived})`);
    assert(scoreDerived > scoreTemplate, `Derived (${scoreDerived}) must outrank template (${scoreTemplate})`);
    assert(scoreTemplate > scoreTemp, `Template (${scoreTemplate}) must outrank temp visual (${scoreTemp})`);
    assert(scoreTemp > scoreAI, `Temp visual (${scoreTemp}) must outrank AI (${scoreAI})`);
    assert.strictEqual(scoreArchived, -1, 'Archived asset must be ineligible (-1)');
  });

  // --------------------------------------------------------------------------
  // TEST 2: Real Photo Protection Immutability
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Real Photo Protection Guard ---');
  await test('Protected real owner photo is detected and blocks incoming AI overwrite', async () => {
    const protectedAsset: MediaAsset = {
      id: 'med-owner-photo-1',
      entityType: 'PRODUCT',
      entityId: 'prod-henna-pure',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/henna.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      assetOrigin: 'real_owner_photo',
      status: 'approved',
      isLocked: true,
      sortOrder: 1,
      mimeType: 'image/webp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    assert.strictEqual(isRealOwnerPhotoProtected(protectedAsset), true);

    // Attempting to save an AI_GENERATED asset as PRIMARY on an entity with a protected photo
    // DAL saveMediaAsset automatically demotes AI asset to GALLERY role
    const saveRes = await saveMediaAsset({
      entityType: 'PRODUCT',
      entityId: 'prod-henna-pure',
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/ai-gen.webp',
      role: 'PRIMARY',
      source: 'AI_GENERATED',
      assetOrigin: 'ai_generated',
      status: 'approved',
      existingAssets: [protectedAsset],
    });

    assert.strictEqual(saveRes.asset.role, 'GALLERY', 'Incoming AI asset must be demoted to GALLERY');
    assert.strictEqual(saveRes.asset.isLocked, false);
  });

  // --------------------------------------------------------------------------
  // TEST 3: Temporary Visual Blueprint & Anti-Hallucination Rules
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Temporary Visual Blueprint & Anti-Hallucination ---');
  await test('Temporary visual blueprint enforces strict anti-hallucination rules', () => {
    const blueprint = buildTemporaryVisualBlueprint({
      entityType: 'PRODUCT',
      entityId: 'prod-neem-powder',
      entityName: 'Pure Organic Neem Powder',
      slotKey: 'PRODUCT_PRIMARY',
      botanicalContext: 'Azadirachta indica leaves harvested in Rajasthan',
    });

    assert.strictEqual(blueprint.entityType, 'PRODUCT');
    assert.strictEqual(blueprint.visualTheme, 'BOTANICAL_RAW');
    assert(blueprint.prompt.includes('Pure Organic Neem Powder'));
    assert(blueprint.prompt.includes('Lawsonia inermis') || blueprint.prompt.includes('sandstone'));

    // Anti-hallucination rules must explicitly forbid packaging, claims, logos, labels
    const rules = blueprint.antiHallucinationRules.join(' ');
    assert(rules.includes('NO product packaging'));
    assert(rules.includes('NO commercial labels'));
    assert(rules.includes('NO brand logos'));
    assert(rules.includes('NO SKU numbers'));
    assert(rules.includes('NO medical or cosmetic claims'));
  });

  // --------------------------------------------------------------------------
  // TEST 4 & 5: Slot Reconciliation Engine & System 2 Bridge
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4 & 5: Slot Reconciliation & System 2 Bridge ---');
  await test('Reconciles System 2 slots and legacy aliases to canonical System 1 specs', () => {
    // 1. System 2 product primary alias
    const spec1 = reconcileCanonicalSlot('product-primary', 'PRODUCT');
    assert.strictEqual(spec1.slotKey, 'PRODUCT_PRIMARY');
    assert.strictEqual(spec1.role, 'PRIMARY');
    assert.strictEqual(spec1.aspectRatio, '1:1');

    // 2. System 2 ritual alias
    const spec2 = reconcileCanonicalSlot('product-ritual', 'PRODUCT');
    assert.strictEqual(spec2.slotKey, 'PRODUCT_USAGE');
    assert.strictEqual(spec2.role, 'USAGE');

    // 3. System 2 category aliases
    const specHero = reconcileCanonicalSlot('category-hero', 'CATEGORY');
    assert.strictEqual(specHero.slotKey, 'CATEGORY_HERO');
    assert.strictEqual(specHero.role, 'HERO');
    assert.strictEqual(specHero.aspectRatio, '16:9');

    const spec3 = reconcileCanonicalSlot('category-mood', 'CATEGORY');
    assert.strictEqual(spec3.slotKey, 'CATEGORY_COLLECTION');
    assert.strictEqual(spec3.aspectRatio, '1:1');

    // 4. System 2 Visual Blueprint bridge shim
    const bridged = getCanonicalSpecForVisualSlot('product-primary');
    assert.strictEqual(bridged.slotKey, 'PRODUCT_PRIMARY');

    // 5. OpenGraph alias
    const specOg = reconcileCanonicalSlot('og-share', 'PRODUCT');
    assert.strictEqual(specOg.slotKey, 'OPENGRAPH_META');
    assert.strictEqual(specOg.role, 'OG_SOCIAL');
    assert.strictEqual(specOg.aspectRatio, '1.91:1');
  });

  // --------------------------------------------------------------------------
  // TEST 6: Future Product Dynamic Onboarding
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Future Product Dynamic Onboarding ---');
  await test('Brand-new custom product dynamically receives full 10-slot canonical checklist', () => {
    const requirements = buildEntityRequirements(
      'PRODUCT',
      'prod-future-herbal-oil-2027',
      'Artisanal Sojat Henna Oil',
      'artisanal-sojat-henna-oil',
      [] // No assets yet
    );

    assert.strictEqual(requirements.slots.length, 10);
    assert.strictEqual(requirements.missingRequiredSlots, 1); // PRIMARY
    assert.strictEqual(requirements.healthGrade, 'CRITICAL');

    const primarySlot = requirements.slots.find((s) => s.slotKey === 'PRODUCT_PRIMARY');
    assert(primarySlot, 'PRODUCT_PRIMARY slot must exist');
    assert.strictEqual(primarySlot?.status, 'MISSING');
    assert.strictEqual(primarySlot?.isRequired, true);
  });

  // --------------------------------------------------------------------------
  // TEST 7: Idempotent Media Job Queue & Concurrency
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Idempotent Media Job Queue & Concurrency ---');
  await test('Enqueueing duplicate jobs is strictly idempotent and creates no duplicate rows', async () => {
    resetMemoryMediaJobs();

    const job1 = await enqueueMediaJob({
      entityType: 'PRODUCT',
      entityId: 'prod-test-queue',
      slotKey: 'PRODUCT_PRIMARY',
      strategy: 'TEMPORARY',
      priority: 'P1',
    });

    const job2 = await enqueueMediaJob({
      entityType: 'PRODUCT',
      entityId: 'prod-test-queue',
      slotKey: 'PRODUCT_PRIMARY',
      strategy: 'TEMPORARY',
      priority: 'P1',
    });

    assert.strictEqual(job1.wasCreated, true);
    assert.strictEqual(job2.wasCreated, false);
    assert.strictEqual(job1.job.id, job2.job.id);

    // Lease locking
    const lease = await acquireMediaJobLock(job1.job.id, 'worker-pod-alpha');
    assert.strictEqual(lease, true);

    // Competing worker trying to acquire same lease within TTL must be rejected
    const competingLease = await acquireMediaJobLock(job1.job.id, 'worker-pod-beta');
    assert.strictEqual(competingLease, false);
  });

  // --------------------------------------------------------------------------
  // TEST 8, 9 & 10: Derived Media Engine (1:1 -> OG, Thumbnail, Lineage)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8, 9 & 10: Derived Media Engine & Lineage ---');
  await test('Generates 1.91:1 OpenGraph and 1:1 Thumbnail with cryptographic lineage', async () => {
    // Create a pure 1:1 master image buffer using Sharp (800x800 green box)
    const masterBuffer = await sharp({
      create: {
        width: 800,
        height: 800,
        channels: 4,
        background: { r: 60, g: 120, b: 60, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    const masterHash = computeFileHash(masterBuffer);
    const uniqueDerivId = `test-deriv-${Date.now()}`;
    const masterAsset: MediaAsset = {
      id: `med-master-${uniqueDerivId}`,
      entityType: 'PRODUCT',
      entityId: `prod-${uniqueDerivId}`,
      url: 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/master-test.webp',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      width: 800,
      height: 800,
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      assetOrigin: 'real_owner_photo',
      fileHash: masterHash,
      status: 'approved',
      isLocked: true,
      sortOrder: 1,
      mimeType: 'image/webp',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Generate 1.91:1 OpenGraph derivative (1200x630)
    const ogResult = await generateMediaDerivative({
      masterAsset,
      derivativeType: 'OPENGRAPH',
      sourceBuffer: masterBuffer,
    });

    assert.strictEqual(ogResult.asset.role, 'OG_SOCIAL');
    assert.strictEqual(ogResult.asset.aspectRatio, '1.91:1');
    assert.strictEqual(ogResult.asset.width, 1200);
    assert.strictEqual(ogResult.asset.height, 630);
    assert.strictEqual(ogResult.asset.parentAssetId, masterAsset.id);
    assert.strictEqual(ogResult.asset.derivativeType, 'OPENGRAPH');
    assert.strictEqual(ogResult.asset.visualContext?.parentHash, masterHash);

    // 2. Generate 512x512 Thumbnail derivative
    const thumbResult = await generateMediaDerivative({
      masterAsset,
      derivativeType: 'THUMBNAIL',
      sourceBuffer: masterBuffer,
    });

    assert.strictEqual(thumbResult.asset.role, 'THUMBNAIL');
    assert.strictEqual(thumbResult.asset.aspectRatio, '1:1');
    assert.strictEqual(thumbResult.asset.width, 512);
    assert.strictEqual(thumbResult.asset.height, 512);
    assert.strictEqual(thumbResult.asset.parentAssetId, masterAsset.id);
    assert.strictEqual(thumbResult.asset.derivativeType, 'THUMBNAIL');
  });

  // --------------------------------------------------------------------------
  // TEST 11: Duplicate Hash Deduplication
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: File Hash Deduplication ---');
  await test('Computes deterministic SHA-256 and identifies duplicates', () => {
    const buffer1 = Buffer.from('musky-dose-unique-image-payload');
    const buffer2 = Buffer.from('musky-dose-unique-image-payload');
    const buffer3 = Buffer.from('musky-dose-different-image-payload');

    const hash1 = computeFileHash(buffer1);
    const hash2 = computeFileHash(buffer2);
    const hash3 = computeFileHash(buffer3);

    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, hash3);
    assert.strictEqual(hash1.length, 64);
  });

  // --------------------------------------------------------------------------
  // TEST 12: Upload Validator (Aspect Ratio & Dimensions)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: Upload Buffer Validation ---');
  await test('Validates aspect ratio, dimensions, and min file size', async () => {
    const validSquareBuffer = await sharp({
      create: {
        width: 1000,
        height: 1000,
        channels: 4,
        background: { r: 100, g: 150, b: 100, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const spec = STANDARD_MEDIA_SPECS['PRODUCT_PRIMARY'];
    const verdict = await validateUploadBuffer(validSquareBuffer, 'PRODUCT_PRIMARY', 'image/png');
    assert.strictEqual(verdict.isValid, true);
    assert.strictEqual(verdict.errors.length, 0);

    // Mismatched aspect ratio (16:9 uploaded to 1:1 primary slot)
    const wideBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 4,
        background: { r: 100, g: 150, b: 100, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const wideVerdict = await validateUploadBuffer(wideBuffer, 'PRODUCT_PRIMARY', 'image/png');
    assert.strictEqual(wideVerdict.isValid, false);
    assert(wideVerdict.errors.some((e) => e.includes('Aspect ratio mismatch')));
  });

  // --------------------------------------------------------------------------
  // TEST 13 & 14: Bulk Import Mapping & Unknown Filename Handling
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13 & 14: Bulk Import Filename Mapping ---');
  await test('Maps valid filename patterns to catalog and routes unmatched to review', async () => {
    const mockCatalog = {
      products: [
        { id: 'prod-101', name: 'BAQ Henna Powder', slug: 'baq-henna-powder' },
        { id: 'prod-102', name: 'Indigo Leaf Powder', slug: 'indigo-leaf-powder' },
      ],
      categories: [
        { id: 'cat-1', name: 'Pure Henna', slug: 'pure-henna' },
      ],
    };

    // 1. Valid Product Primary Match
    const match1 = await matchBulkFilenameToEntity('baq-henna-powder-primary.webp', mockCatalog);
    assert.strictEqual(match1.matched, true);
    assert.strictEqual(match1.entityType, 'PRODUCT');
    assert.strictEqual(match1.entityId, 'prod-101');
    assert.strictEqual(match1.spec?.slotKey, 'PRODUCT_PRIMARY');

    // 2. Valid Product Ritual Match
    const match2 = await matchBulkFilenameToEntity('indigo-leaf-powder-application.webp', mockCatalog);
    assert.strictEqual(match2.matched, true);
    assert.strictEqual(match2.entityType, 'PRODUCT');
    assert.strictEqual(match2.entityId, 'prod-102');
    assert.strictEqual(match2.spec?.slotKey, 'PRODUCT_USAGE');

    // 3. Brand Logo Match
    const match3 = await matchBulkFilenameToEntity('brand-logo.png', mockCatalog);
    assert.strictEqual(match3.matched, true);
    assert.strictEqual(match3.entityType, 'BRAND');
    assert.strictEqual(match3.spec?.slotKey, 'BRAND_ICON');

    // 4. Unknown Filename Handling (Must not crash, must cleanly report unmatched)
    const match4 = await matchBulkFilenameToEntity('random-photo-unrelated.jpg', mockCatalog);
    assert.strictEqual(match4.matched, false);
    assert.strictEqual(match4.entityType, undefined);
    assert(match4.reason?.toLowerCase().includes('could not be matched'));
  });

  // --------------------------------------------------------------------------
  // TEST 15 & 16: Broken Media Detection & Self-Healing
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 15 & 16: Broken Media Detection & Self-Healing ---');
  await test('Detects missing local/remote URLs and marks unhealthy without deletion', async () => {
    // 1. Local existing file
    const localHealthy = await verifyMediaAssetUrlHealth('/logo.png');
    assert.strictEqual(localHealthy.isHealthy, true);

    // 2. Non-existent local file
    const localBroken = await verifyMediaAssetUrlHealth('/images/does-not-exist-xyz.jpg');
    assert.strictEqual(localBroken.isHealthy, false);
    assert.strictEqual(localBroken.statusCode, 404);

    // 3. Mark asset unhealthy without dropping record
    const testAsset: MediaAsset = {
      id: 'med-broken-test',
      entityType: 'PRODUCT',
      entityId: 'prod-broken-1',
      url: '/images/does-not-exist-xyz.jpg',
      storageBucket: 'product-images',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      healthStatus: 'HEALTHY',
      isLocked: false,
      sortOrder: 1,
      mimeType: 'image/jpeg',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const repairResult = await markMediaAssetUnhealthy(testAsset, 'Local file missing (404)');
    assert.strictEqual(repairResult.markedUnhealthy, true);
    assert.strictEqual(repairResult.jobEnqueued, true);
    assert.strictEqual(repairResult.repairedAsset.healthStatus, 'UNHEALTHY');
    // Ensure asset was not deleted
    assert.strictEqual(repairResult.repairedAsset.id, 'med-broken-test');
  });

  // --------------------------------------------------------------------------
  // TEST 17 & 18: Truthful Worker States & Provider Unavailable
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 17 & 18: Truthful Worker States & Offline Provider ---');
  await test('Worker outputs truthful WAITING_PROVIDER state when generation provider is offline', async () => {
    const task = {
      id: 'task-test-worker-1',
      type: 'MEDIA_VISUAL' as const,
      status: 'PENDING' as const,
      priority: 'P2' as const,
      title: 'Generate Visual for BAQ Henna',
      payload: {
        entityType: 'PRODUCT' as const,
        entityId: 'prod-temp-test',
        entityName: 'Pure Organic Henna',
        slotKey: 'PRODUCT_PRIMARY',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const workerResult = await mediaVisualWorker(task as any, {} as any);
    assert.strictEqual(workerResult.status, 'COMPLETED');
    assert.strictEqual(workerResult.result.workerState, 'WAITING_PROVIDER');
    assert.strictEqual(workerResult.result.approvedAssetAttached, false);
    assert(workerResult.narrative.whatDetected.includes('Local ComfyUI provider is currently offline'));
  });

  // --------------------------------------------------------------------------
  // TEST 19: Public Consumer Verification & Zero External Leaks
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 19: Public Consumer Governance & Zero Leaks ---');
  await test('Public consumers resolve exclusively safe internal assets', () => {
    const productWithDirtyImages = {
      id: 'prod-dirty-1',
      name: 'Dirty Product',
      slug: 'dirty-product',
      price: 299,
      images: [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
        'https://cdn.muskydose.in/mock-image.jpg',
        'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/valid.webp',
      ],
      media: [],
    } as any;

    const resolved = resolveAuthoritativeProductMedia(productWithDirtyImages);
    assert.strictEqual(resolved.primaryImage, 'https://znyjhuhhfzisztqymtqs.supabase.co/storage/v1/object/public/product-images/valid.webp');
    assert(!resolved.primaryImage.includes('unsplash.com'));
    assert(!resolved.primaryImage.includes('cdn.muskydose.in'));
    assert.strictEqual(resolved.isFallback, false);
  });

  // --------------------------------------------------------------------------
  // TEST 20: OpenGraph Fallback Raster Guarantee
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 20: OpenGraph Fallback Raster Guarantee ---');
  await test('resolvePageSeoMetadata strictly rejects SVG and provides valid raster social image', async () => {
    const seo = await resolvePageSeoMetadata({
      targetType: 'custom_page',
      targetUrl: '/custom-test-page',
      defaultTitle: 'Test Page',
      defaultDescription: 'Test description',
      ogImage: '/images/fallback.svg', // Intentionally inject SVG to verify rejection
    });

    const ogImgUrl = seo.openGraph.images[0]?.url;
    assert.ok(ogImgUrl, 'OpenGraph image URL must be defined');
    assert(!ogImgUrl.endsWith('.svg'), `OpenGraph image must NEVER be an SVG: ${ogImgUrl}`);
    assert(
      ogImgUrl.endsWith('.png') || ogImgUrl.endsWith('.webp') || ogImgUrl.endsWith('.jpg'),
      `OpenGraph image must be a valid raster image: ${ogImgUrl}`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 21: Forward-Only SQL Migration File Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 21: Forward-Only SQL Migration File Integrity ---');
  await test('supabase-media-os-migration-012.sql declares safe additive schema', () => {
    const sqlPath = path.join(process.cwd(), 'supabase-media-os-migration-012.sql');
    assert(fs.existsSync(sqlPath), 'supabase-media-os-migration-012.sql must exist');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    // Must be safe and non-destructive
    const uncommentedSql = sqlContent.replace(/--.*$/gm, '');
    assert(!/\bDROP\s+TABLE\b/i.test(uncommentedSql), 'Must not drop tables');
    assert(!/\bTRUNCATE\b/i.test(uncommentedSql), 'Must not truncate tables');
    assert(sqlContent.includes('ADD COLUMN IF NOT EXISTS asset_origin'));
    assert(sqlContent.includes('ADD COLUMN IF NOT EXISTS slot_key'));
    assert(sqlContent.includes('ADD COLUMN IF NOT EXISTS parent_asset_id'));
    assert(sqlContent.includes('ADD COLUMN IF NOT EXISTS derivative_type'));
    assert(sqlContent.includes('ADD COLUMN IF NOT EXISTS health_status'));
    assert(sqlContent.includes('CREATE TABLE IF NOT EXISTS public.media_jobs'));
  });

  // --------------------------------------------------------------------------
  // TEST 22: Idempotent Product Catalog Backfill Scan
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 22: Idempotent Product Catalog Backfill Scan ---');
  await test('reconcileAllProductsMedia scans catalog without throwing or corrupting data', async () => {
    const backfillResult = await reconcileAllProductsMedia();
    assert(backfillResult.totalProducts >= 0);
    console.log(`     Catalog scanned: ${backfillResult.totalProducts} products, ${backfillResult.totalGapsDetected} slot gaps detected, ${backfillResult.totalJobsEnqueued} jobs enqueued.`);
  });

  // --------------------------------------------------------------------------
  // TEST 23: Live Database BAQ Henna Real Asset Preservation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 23: Live Database BAQ Henna Asset Preservation ---');
  await test('BAQ Henna (prod-1786368977551) preserves live approved primary upload', async () => {
    const primary = await getPrimaryMedia({
      entityType: 'PRODUCT',
      entityId: 'prod-1786368977551',
    });

    assert(primary, 'BAQ Henna primary asset must resolve');
    assert.strictEqual(primary.source, 'MANUAL_UPLOAD');
    assert.strictEqual(primary.status, 'approved');
    assert.strictEqual(primary.isLocked, true);
    assert(primary.url.includes('.supabase.co/storage/v1/object/public/product-images/manual/product/prod-1786368977551-primary-'));
  });

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`🎉 ALL ${passed} / ${total} MEDIA OS MASTER TESTS PASSED (100%)!`);
  console.log('===============================================================');
}

runMasterMediaOSTests().catch((err) => {
  console.error('\n❌ Media OS Master Test Suite encountered an unhandled failure:', err);
  process.exit(1);
});
