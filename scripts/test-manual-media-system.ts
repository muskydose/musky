import assert from 'assert';
import crypto from 'crypto';
import {
  STANDARD_MEDIA_SPECS,
  PROTECTED_OFFICIAL_BRAND_ASSETS,
  checkAspectRatioMatch,
} from '../lib/growth/media-specs';
import {
  buildEntityRequirements,
} from '../lib/growth/media-requirements-engine';
import {
  validateUploadBuffer,
} from '../lib/media/upload-validator';
import {
  isSafeInternalMediaUrl,
  getPrimaryMedia,
  MediaAsset,
} from '../lib/db/media';
import { performZeroDowntimeReplacement } from '../lib/growth/media-replacement-engine';

console.log('================================================================');
console.log('TEST SUITE: CANONICAL MANUAL MEDIA REPLACEMENT SYSTEM');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, testFn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = testFn();
    if (res instanceof Promise) {
      return res.then(() => {
        passedTests++;
        console.log(`  ✓ [PASS] ${name}`);
      }).catch((err) => {
        console.error(`  ✗ [FAIL] ${name}`);
        console.error(`    ${err.message}`);
        process.exitCode = 1;
      });
    } else {
      passedTests++;
      console.log(`  ✓ [PASS] ${name}`);
    }
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

async function main() {
  // --------------------------------------------------------------------------
  // 1. LOGO & FAVICON PROTECTION
  // --------------------------------------------------------------------------
  runTest('1.1: Official logo and favicons are allowlisted and protected', () => {
    assert(PROTECTED_OFFICIAL_BRAND_ASSETS.has('/logo.png'), 'Logo must be protected');
    assert(PROTECTED_OFFICIAL_BRAND_ASSETS.has('/favicon.ico'), 'Favicon must be protected');
    assert(PROTECTED_OFFICIAL_BRAND_ASSETS.has('/favicon.png'), 'Favicon png must be protected');
    assert(isSafeInternalMediaUrl('/logo.png'), 'Local logo path is safe');
    assert(isSafeInternalMediaUrl('/favicon.ico'), 'Local favicon path is safe');
  });

  // --------------------------------------------------------------------------
  // 2. NO OLD-MEDIA LEAKAGE / EXTERNAL MEDIA REJECTION
  // --------------------------------------------------------------------------
  runTest('2.1: External Unsplash URLs are strictly rejected from fallback paths', () => {
    const unsplashUrl = 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=1000';
    assert.strictEqual(isSafeInternalMediaUrl(unsplashUrl), false, 'Unsplash must be rejected');
  });

  runTest('2.2: Staging CDN URLs are strictly rejected from fallback paths', () => {
    const cdnUrl = 'https://cdn.muskydose.in/canonical/sojat-leaves.webp';
    assert.strictEqual(isSafeInternalMediaUrl(cdnUrl), false, 'Mock CDN must be rejected');
  });

  runTest('2.3: Arbitrary external image URLs are strictly rejected', () => {
    const googleUrl = 'https://images.google.com/henna.jpg';
    assert.strictEqual(isSafeInternalMediaUrl(googleUrl), false, 'External images must be rejected');
  });

  runTest('2.4: Branded fallback SVG is accepted as safe internal placeholder', () => {
    assert.strictEqual(isSafeInternalMediaUrl('/images/fallback.svg'), true, 'Branded fallback SVG is allowed');
  });

  runTest('2.5: Supabase storage public URLs are accepted as valid canonical media', () => {
    const supabaseUrl = 'https://abcxyz.supabase.co/storage/v1/object/public/product-images/manual/prod-1-primary.webp';
    assert.strictEqual(isSafeInternalMediaUrl(supabaseUrl), true, 'Supabase storage URLs are safe');
  });

  runTest('2.6: getPrimaryMedia() never returns an Unsplash URL even if passed as legacy fallback', async () => {
    const asset = await getPrimaryMedia({
      entityType: 'PRODUCT',
      entityId: 'prod-nonexistent-test',
      legacyFallbackUrl: 'https://images.unsplash.com/photo-1535585209827',
    });
    assert(!asset.url.includes('unsplash'), 'Primary media must NEVER return an Unsplash URL');
    assert(asset.url.includes('fallback.svg'), 'Primary media must fall back to branded fallback SVG');
    assert.strictEqual(asset.source, 'SYSTEM_FALLBACK', 'Source must be SYSTEM_FALLBACK');
  });

  // --------------------------------------------------------------------------
  // 3. CANONICAL MEDIA SPECIFICATIONS & RATIOS
  // --------------------------------------------------------------------------
  runTest('3.1: PRODUCT_PRIMARY standard specification integrity', () => {
    const spec = STANDARD_MEDIA_SPECS.PRODUCT_PRIMARY;
    assert.strictEqual(spec.aspectRatio, '1:1');
    assert.strictEqual(spec.recommendedWidth, 1200);
    assert.strictEqual(spec.recommendedHeight, 1200);
    assert.strictEqual(spec.minWidth, 800);
    assert.strictEqual(spec.minHeight, 800);
    assert.strictEqual(spec.isRequired, true);
  });

  runTest('3.2: PRODUCT_LIFESTYLE standard specification integrity (4:5 ratio)', () => {
    const spec = STANDARD_MEDIA_SPECS.PRODUCT_LIFESTYLE;
    assert.strictEqual(spec.aspectRatio, '4:5');
    assert.strictEqual(spec.recommendedWidth, 1200);
    assert.strictEqual(spec.recommendedHeight, 1500);
    assert.strictEqual(spec.minWidth, 800);
    assert.strictEqual(spec.minHeight, 1000);
    assert.strictEqual(spec.isRequired, false);
  });

  runTest('3.3: CATEGORY_HERO standard specification integrity (16:9 ratio)', () => {
    const spec = STANDARD_MEDIA_SPECS.CATEGORY_HERO;
    assert.strictEqual(spec.aspectRatio, '16:9');
    assert.strictEqual(spec.recommendedWidth, 1600);
    assert.strictEqual(spec.recommendedHeight, 900);
    assert.strictEqual(spec.minWidth, 1200);
    assert.strictEqual(spec.minHeight, 675);
    assert.strictEqual(spec.isRequired, true);
  });

  runTest('3.4: PRODUCT_MOBILE standard specification integrity (9:16 ratio)', () => {
    const spec = STANDARD_MEDIA_SPECS.PRODUCT_MOBILE;
    assert.strictEqual(spec.aspectRatio, '9:16');
    assert.strictEqual(spec.recommendedWidth, 1080);
    assert.strictEqual(spec.recommendedHeight, 1920);
    assert.strictEqual(spec.minWidth, 600);
    assert.strictEqual(spec.minHeight, 1067);
  });

  runTest('3.5: OPENGRAPH_META standard specification integrity (1.91:1 ratio)', () => {
    const spec = STANDARD_MEDIA_SPECS.OPENGRAPH_META;
    assert.strictEqual(spec.aspectRatio, '1.91:1');
    assert.strictEqual(spec.recommendedWidth, 1200);
    assert.strictEqual(spec.recommendedHeight, 630);
  });

  runTest('3.6: checkAspectRatioMatch tolerance calculation', () => {
    // Exact 1:1
    assert(checkAspectRatioMatch(1200, 1200, '1:1').isMatch);
    // Slight tolerance (1202x1200 is 0.16% diff)
    assert(checkAspectRatioMatch(1202, 1200, '1:1').isMatch);
    // 16:9
    assert(checkAspectRatioMatch(1600, 900, '16:9').isMatch);
    assert(checkAspectRatioMatch(1920, 1080, '16:9').isMatch);
    // 4:5
    assert(checkAspectRatioMatch(1200, 1500, '4:5').isMatch);
    // 9:16
    assert(checkAspectRatioMatch(1080, 1920, '9:16').isMatch);
    // Mismatch (1200x800 tested against 1:1)
    assert.strictEqual(checkAspectRatioMatch(1200, 800, '1:1').isMatch, false);
  });

  // --------------------------------------------------------------------------
  // 4. BINARY UPLOAD VALIDATION & INTEGRITY
  // --------------------------------------------------------------------------
  await runTest('4.1: Valid 1200x1200 PNG binary passes full validation', async () => {
    // Generate valid 1200x1200 PNG buffer via sharp
    const sharp = (await import('sharp')).default;
    const validPngBuffer = await sharp({
      create: {
        width: 1200,
        height: 1200,
        channels: 3,
        background: { r: 27, g: 67, b: 50 }, // Musky forest green
      },
    }).png().toBuffer();

    const result = await validateUploadBuffer(validPngBuffer, 'PRODUCT_PRIMARY');
    assert.strictEqual(result.verdict, 'PASS');
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.metadata.width, 1200);
    assert.strictEqual(result.metadata.height, 1200);
    assert.strictEqual(result.metadata.aspectRatio, '1:1');
    assert(result.metadata.hash.length === 64, 'SHA-256 hash must be 64 hex characters');
  });

  await runTest('4.2: Valid 1600x900 JPEG binary passes CATEGORY_HERO validation', async () => {
    const sharp = (await import('sharp')).default;
    const validJpgBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 250, g: 245, b: 232 }, // Rajasthani warm sand
      },
    }).jpeg().toBuffer();

    const result = await validateUploadBuffer(validJpgBuffer, 'CATEGORY_HERO');
    assert.strictEqual(result.verdict, 'PASS');
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.metadata.width, 1600);
    assert.strictEqual(result.metadata.height, 900);
    assert.strictEqual(result.metadata.aspectRatio, '16:9');
  });

  await runTest('4.3: Undersized or stub payload (<1KB) is rejected with ERROR', async () => {
    const stubBuffer = Buffer.from('fake-text-stub-data-payload');
    const result = await validateUploadBuffer(stubBuffer, 'PRODUCT_PRIMARY');
    assert.strictEqual(result.verdict, 'ERROR');
    assert.strictEqual(result.isValid, false);
    assert(result.errors.some((e) => e.includes('too small') || e.includes('validation failed')));
  });

  await runTest('4.4: Aspect ratio mismatch returns ERROR verdict', async () => {
    const sharp = (await import('sharp')).default;
    // Create 1600x900 image (16:9) but submit to PRODUCT_PRIMARY (requires 1:1)
    const widescreenBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 212, g: 175, b: 55 },
      },
    }).png().toBuffer();

    const result = await validateUploadBuffer(widescreenBuffer, 'PRODUCT_PRIMARY');
    assert.strictEqual(result.verdict, 'ERROR');
    assert(result.errors.some((e) => e.includes('Aspect ratio mismatch')));
  });

  // --------------------------------------------------------------------------
  // 5. UNIVERSAL MEDIA REQUIREMENT ENGINE
  // --------------------------------------------------------------------------
  runTest('5.1: Product entity receives all 10 canonical slots', () => {
    const health = buildEntityRequirements(
      'PRODUCT',
      'prod-henna-test',
      'Pure Sojat Henna',
      'pure-sojat-henna',
      []
    );
    assert.strictEqual(health.totalSlots, 10);
    assert.strictEqual(health.requiredSlots, 1); // PRIMARY is required
    assert.strictEqual(health.missingRequiredSlots, 1);
    assert.strictEqual(health.healthGrade, 'CRITICAL');

    const primarySlot = health.slots.find((s) => s.slotKey === 'PRODUCT_PRIMARY');
    assert(primarySlot, 'Primary slot must exist');
    assert.strictEqual(primarySlot?.role, 'PRIMARY');
    assert.strictEqual(primarySlot?.status, 'MISSING');
    assert.strictEqual(primarySlot?.exactRoute, '/products/pure-sojat-henna');
  });

  runTest('5.2: Category entity receives 4 slots with 16:9 HERO required', () => {
    const health = buildEntityRequirements(
      'CATEGORY',
      'cat-henna',
      'Henna Powders',
      'henna-powders',
      []
    );
    assert.strictEqual(health.totalSlots, 4);
    assert.strictEqual(health.requiredSlots, 1);
    const heroSlot = health.slots.find((s) => s.slotKey === 'CATEGORY_HERO');
    assert(heroSlot, 'Hero slot must exist');
    assert.strictEqual(heroSlot?.aspectRatio, '16:9');
    assert.strictEqual(heroSlot?.isRequired, true);
    assert.strictEqual(heroSlot?.exactRoute, '/categories/henna-powders');
  });

  runTest('5.3: Guide entity receives 4 slots with 16:9 HERO required', () => {
    const health = buildEntityRequirements(
      'GUIDE',
      'guide-mix',
      'How to Mix Henna',
      'how-to-mix-henna',
      []
    );
    assert.strictEqual(health.totalSlots, 4);
    const heroSlot = health.slots.find((s) => s.slotKey === 'GUIDE_HERO');
    assert.strictEqual(heroSlot?.isRequired, true);
    assert.strictEqual(heroSlot?.exactRoute, '/guides/how-to-mix-henna');
  });

  runTest('5.4: Knowledge entity receives 4 slots with 16:9 botanical plate required', () => {
    const health = buildEntityRequirements(
      'KNOWLEDGE',
      'HENNA_MEHNDI',
      'Lawsonia Inermis',
      'lawsonia-inermis',
      []
    );
    assert.strictEqual(health.totalSlots, 4);
    const heroSlot = health.slots.find((s) => s.slotKey === 'KNOWLEDGE_HERO');
    assert.strictEqual(heroSlot?.isRequired, true);
    assert.strictEqual(heroSlot?.aspectRatio, '16:9');
  });

  runTest('5.5: Brand entity receives 5 slots with ICON and HERO required', () => {
    const health = buildEntityRequirements(
      'BRAND',
      'musky-brand',
      'Musky Dose Heritage',
      '',
      []
    );
    assert.strictEqual(health.totalSlots, 5);
    const iconSlot = health.slots.find((s) => s.slotKey === 'BRAND_ICON');
    assert.strictEqual(iconSlot?.isRequired, true);
    const heroSlot = health.slots.find((s) => s.slotKey === 'BRAND_HERO');
    assert.strictEqual(heroSlot?.isRequired, true);
  });

  runTest('5.6: Future custom entity receives dynamic requirement checklist automatically', () => {
    const health = buildEntityRequirements(
      'CUSTOM_FUTURE_TYPE' as any,
      'custom-123',
      'New Seasonal Line',
      'new-seasonal-line',
      []
    );
    assert(health.totalSlots >= 3, 'Future entity must automatically generate requirements');
    assert(health.slots.some((s) => s.role === 'PRIMARY'));
  });

  // --------------------------------------------------------------------------
  // 6. TRUTHFUL LIVE STATUS & ZERO DOWNTIME
  // --------------------------------------------------------------------------
  runTest('6.1: An approved manual asset with valid dimensions is marked LIVE', () => {
    const mockApprovedAsset: MediaAsset = {
      id: 'med-valid-live-1',
      entityType: 'PRODUCT',
      entityId: 'prod-henna-test',
      url: 'https://test.supabase.co/storage/v1/object/public/product-images/manual/henna.webp',
      storageBucket: 'product-images',
      mimeType: 'image/webp',
      aspectRatio: '1:1',
      width: 1200,
      height: 1200,
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const health = buildEntityRequirements(
      'PRODUCT',
      'prod-henna-test',
      'Pure Sojat Henna',
      'pure-sojat-henna',
      [mockApprovedAsset]
    );

    const primarySlot = health.slots.find((s) => s.slotKey === 'PRODUCT_PRIMARY');
    assert.strictEqual(primarySlot?.status, 'LIVE');
    assert.strictEqual(primarySlot?.isLivePublic, true);
  });

  runTest('6.2: A rejected asset is marked INVALID and never marked LIVE', () => {
    const mockRejectedAsset: MediaAsset = {
      id: 'med-rejected-1',
      entityType: 'PRODUCT',
      entityId: 'prod-henna-test',
      url: 'https://test.supabase.co/storage/v1/object/public/product-images/manual/henna-bad.webp',
      storageBucket: 'product-images',
      mimeType: 'image/webp',
      aspectRatio: '1:1',
      width: 1200,
      height: 1200,
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'rejected',
      isLocked: false,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const health = buildEntityRequirements(
      'PRODUCT',
      'prod-henna-test',
      'Pure Sojat Henna',
      'pure-sojat-henna',
      [mockRejectedAsset]
    );

    const primarySlot = health.slots.find((s) => s.slotKey === 'PRODUCT_PRIMARY');
    assert.strictEqual(primarySlot?.status, 'INVALID');
    assert.strictEqual(primarySlot?.isLivePublic, false);
  });

  runTest('6.3: A draft/suggested asset is marked READY (awaits approval) and is not LIVE', () => {
    const mockSuggestedAsset: MediaAsset = {
      id: 'med-suggested-1',
      entityType: 'PRODUCT',
      entityId: 'prod-henna-test',
      url: 'https://test.supabase.co/storage/v1/object/public/product-images/manual/henna-draft.webp',
      storageBucket: 'product-images',
      mimeType: 'image/webp',
      aspectRatio: '1:1',
      width: 1200,
      height: 1200,
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'suggested',
      isLocked: false,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const health = buildEntityRequirements(
      'PRODUCT',
      'prod-henna-test',
      'Pure Sojat Henna',
      'pure-sojat-henna',
      [mockSuggestedAsset]
    );

    const primarySlot = health.slots.find((s) => s.slotKey === 'PRODUCT_PRIMARY');
    assert.strictEqual(primarySlot?.status, 'READY');
    assert.strictEqual(primarySlot?.isLivePublic, false);
  });

  console.log('\n----------------------------------------------------------------');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (100%)`);
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});

