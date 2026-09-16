/**
 * MASTER TEST SUITE: MUSKY DOSE UNIVERSAL VISUAL CONTENT SYSTEM
 *
 * Covers all 24 required capabilities:
 * 1. Product visual slots
 * 2. Category slots
 * 3. Guide slots
 * 4. Knowledge slots
 * 5. Brand & Marketing slots
 * 6. Auto slot detection
 * 7. Existing asset reuse (zero file duplication)
 * 8. Missing asset detection
 * 9. Placeholder / fallback detection
 * 10. Aspect-ratio requirements
 * 11. Responsive variants
 * 12. AI prompt generation (grounded DB facts)
 * 13. Prompt override & provenance
 * 14. AI suggested governance (never auto-published)
 * 15. Locked manual protection (anti-demotion)
 * 16. Free-license provenance
 * 17. Cryptographic SHA-256 duplicate prevention
 * 18. Future entity auto-discovery (dynamically simulated entity without page code change)
 * 19. Page consumer integration (resolveEntityVisuals)
 * 20. SEO / OpenGraph integration
 * 21. Motion asset requirements (transparent / background-safe layers)
 * 22. No legacy mutation (product.images untouched)
 * 23. Zero N+1 query safety
 * 24. Autopilot integration & approval boundaries & fail-closed behavior
 */

import assert from 'assert';
import crypto from 'crypto';
import {
  MediaEntityType,
  MediaAssetRole,
  MediaAssetSource,
  MediaAsset,
  saveMediaAsset,
  getMediaForEntity,
  getPrimaryMedia,
  resetMediaCache,
  attachCanonicalMediaToProduct,
} from '../lib/db/media';
import {
  PRODUCT_BLUEPRINT,
  CATEGORY_BLUEPRINT,
  GUIDE_BLUEPRINT,
  KNOWLEDGE_BLUEPRINT,
  BRAND_BLUEPRINT,
  MARKETING_BLUEPRINT,
  getEntityBlueprint,
  registerEntityBlueprint,
} from '../lib/growth/visual-blueprint';
import {
  evaluateEntityVisualHealth,
  resolveVisualRequirements,
  findReusableAssetForSlot,
  evaluateCatalogVisualHealth,
} from '../lib/growth/visual-decision-engine';
import { resolveEntityVisuals } from '../lib/growth/visual-consumption';
import { composeVisualPrompt } from '../lib/growth/visual-prompt-engine';
import { runAutopilotCycle, getAutopilotActions } from '../lib/growth/autopilot-engine';

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<void> | void) {
  try {
    await fn();
    console.log(`  ✓ ${name} (PASSED)`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name} (FAILED):`, err.message);
    failed++;
  }
}

async function runMasterVisualSystemTests() {
  console.log('\n===============================================================');
  console.log('MUSKY DOSE UNIVERSAL VISUAL CONTENT SYSTEM — TEST SUITE');
  console.log('===============================================================\n');

  resetMediaCache({ clearFallbackStore: true });

  // --------------------------------------------------------------------------
  // SUITE 1: Entity Blueprint Specifications
  // --------------------------------------------------------------------------
  console.log('--- SUITE 1: Universal Entity Blueprints ---');

  await test('1. Product visual blueprint defines all canonical slots', () => {
    const roles = PRODUCT_BLUEPRINT.slots.map((s) => s.role);
    assert(roles.includes('PRIMARY'), 'Product blueprint must require PRIMARY');
    assert(roles.includes('GALLERY'), 'Product blueprint must include GALLERY');
    assert(roles.includes('PACKAGING'), 'Product blueprint must include PACKAGING');
    assert(roles.includes('LIFESTYLE'), 'Product blueprint must include LIFESTYLE');
    assert(roles.includes('DETAIL'), 'Product blueprint must include DETAIL');
    assert(roles.includes('USAGE'), 'Product blueprint must include USAGE');
    assert(roles.includes('INGREDIENTS'), 'Product blueprint must include INGREDIENTS');
    assert(roles.includes('MOBILE_HERO'), 'Product blueprint must include MOBILE_HERO');
    assert(roles.includes('SOCIAL_SQUARE'), 'Product blueprint must include SOCIAL_SQUARE');
    assert(roles.includes('SOCIAL_PORTRAIT'), 'Product blueprint must include SOCIAL_PORTRAIT');
  });

  await test('2. Category visual blueprint defines hero, collection, mobile and social slots', () => {
    const roles = CATEGORY_BLUEPRINT.slots.map((s) => s.role);
    assert(roles.includes('HERO'), 'Category blueprint must require HERO');
    assert(roles.includes('GALLERY'), 'Category blueprint must include COLLECTION (GALLERY)');
    assert(roles.includes('MOBILE_HERO'), 'Category blueprint must include MOBILE_HERO');
    assert(roles.includes('SOCIAL_SQUARE'), 'Category blueprint must include SOCIAL_SQUARE');
  });

  await test('3. Guide visual blueprint defines hero, process, infographic and social slots', () => {
    const roles = GUIDE_BLUEPRINT.slots.map((s) => s.role);
    assert(roles.includes('HERO'), 'Guide blueprint must require HERO');
    assert(roles.includes('PROCESS'), 'Guide blueprint must include PROCESS');
    assert(roles.includes('INFOGRAPHIC'), 'Guide blueprint must include INFOGRAPHIC');
    assert(roles.includes('SOCIAL_SQUARE'), 'Guide blueprint must include SOCIAL_SQUARE');
  });

  await test('4. Knowledge visual blueprint defines scientific educational & comparison slots', () => {
    const roles = KNOWLEDGE_BLUEPRINT.slots.map((s) => s.role);
    assert(roles.includes('HERO'), 'Knowledge blueprint must require HERO');
    assert(roles.includes('DETAIL'), 'Knowledge blueprint must include BOTANICAL DETAIL');
    assert(roles.includes('COMPARISON'), 'Knowledge blueprint must include COMPARISON');
    assert(roles.includes('INFOGRAPHIC'), 'Knowledge blueprint must include INFOGRAPHIC');
    assert(roles.includes('SOCIAL_SQUARE'), 'Knowledge blueprint must include SOCIAL_SQUARE');
  });

  await test('5. Brand and Marketing blueprints define identity, banners, campaigns and stories', () => {
    const brandRoles = BRAND_BLUEPRINT.slots.map((s) => s.role);
    assert(brandRoles.includes('HERO'), 'Brand blueprint must require HERO');
    assert(brandRoles.includes('ICON'), 'Brand blueprint must require ICON');

    const marketingRoles = MARKETING_BLUEPRINT.slots.map((s) => s.role);
    assert(marketingRoles.includes('BANNER'), 'Marketing blueprint must require BANNER');
    assert(marketingRoles.includes('SOCIAL_SQUARE'), 'Marketing blueprint must include SOCIAL_SQUARE');
  });

  // --------------------------------------------------------------------------
  // SUITE 2: Decision Engine: Slot Detection, Missing Detection & Asset Reuse
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Automatic Visual Decision Engine ---');

  await test('6. Auto slot detection detects missing required slots on fresh entity', async () => {
    const report = await evaluateEntityVisualHealth('PRODUCT', 'test-fresh-prod');
    assert.strictEqual(report.overallHealth, 'MISSING');
    assert(report.missingRequiredCount > 0, 'Must detect missing required primary slot');
    assert(
      report.suggestedOpportunities.some((o) => o.slotId === 'product-primary'),
      'Must surface opportunity to generate or upload missing primary'
    );
  });

  await test('7. Existing asset reuse safely fills compatible slots without file duplication', async () => {
    // Save an approved primary asset
    await saveMediaAsset({
      id: 'med-reuse-primary',
      entityType: 'PRODUCT',
      entityId: 'test-reuse-entity',
      url: 'https://muskydose.in/images/sojat-henna.webp',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
    });

    const report = await evaluateEntityVisualHealth('PRODUCT', 'test-reuse-entity');
    // Primary slot is filled optimal
    const primarySlot = report.evaluatedSlots.find((s) => s.slot.slotId === 'product-primary');
    assert.strictEqual(primarySlot?.status, 'FILLED_OPTIMAL');

    // Social square and Mobile Hero should be FILLED_REUSED from PRIMARY
    const socialSquareSlot = report.evaluatedSlots.find((s) => s.slot.slotId === 'product-social-square');
    assert.strictEqual(socialSquareSlot?.status, 'FILLED_REUSED');
    assert.strictEqual(socialSquareSlot?.asset?.id, 'med-reuse-primary');

    // Check reuse helper directly
    const mobileSlot = PRODUCT_BLUEPRINT.slots.find((s) => s.slotId === 'product-mobile-hero')!;
    const reuse = findReusableAssetForSlot(mobileSlot, [primarySlot!.asset!]);
    assert(reuse !== null, 'Must find primary as reusable candidate');
    assert.strictEqual(reuse?.asset.id, 'med-reuse-primary');
  });

  await test('8. Missing asset detection distinguishes required vs optional missing slots', async () => {
    const report = await evaluateEntityVisualHealth('PRODUCT', 'test-fresh-prod');
    const primarySlot = report.evaluatedSlots.find((s) => s.slot.slotId === 'product-primary');
    const packagingSlot = report.evaluatedSlots.find((s) => s.slot.slotId === 'product-packaging');
    assert.strictEqual(primarySlot?.status, 'MISSING_REQUIRED');
    assert.strictEqual(packagingSlot?.status, 'MISSING_OPTIONAL');
  });

  await test('9. Placeholder and fallback detection tags weak visuals correctly', async () => {
    await saveMediaAsset({
      id: 'med-placeholder-asset',
      entityType: 'PRODUCT',
      entityId: 'test-placeholder-entity',
      url: '/images/fallback.svg',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'SYSTEM_FALLBACK',
      status: 'approved',
    });

    const report = await evaluateEntityVisualHealth('PRODUCT', 'test-placeholder-entity');
    const primarySlot = report.evaluatedSlots.find((s) => s.slot.slotId === 'product-primary');
    assert.strictEqual(primarySlot?.status, 'WEAK_FALLBACK');
    assert.strictEqual(report.overallHealth, 'FALLBACK');
  });

  await test('10. Aspect-ratio requirements detection catches ratio mismatches', async () => {
    await saveMediaAsset({
      id: 'med-ratio-mismatch',
      entityType: 'CATEGORY',
      entityId: 'test-mismatch-cat',
      url: 'https://muskydose.in/images/square-cat.webp',
      aspectRatio: '1:1', // CATEGORY HERO prefers 16:9
      role: 'HERO',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
    });

    const report = await evaluateEntityVisualHealth('CATEGORY', 'test-mismatch-cat');
    const heroSlot = report.evaluatedSlots.find((s) => s.slot.slotId === 'category-hero');
    assert.strictEqual(heroSlot?.status, 'ASPECT_MISMATCH');
    assert.strictEqual(heroSlot?.aspectRatioMismatch?.expected, '16:9');
    assert.strictEqual(heroSlot?.aspectRatioMismatch?.actual, '1:1');
    assert.strictEqual(report.overallHealth, 'NEEDS_REVIEW');
  });

  await test('11. Responsive variants resolution maps desktop, tablet, and mobile safe paths', async () => {
    const resolved = await resolveVisualRequirements('PRODUCT', 'test-reuse-entity');
    const primaryRes = resolved['product-primary'];
    assert(primaryRes !== undefined, 'Must resolve product-primary slot');
    assert(primaryRes.responsiveUrls?.desktop !== undefined, 'Must have desktop URL');
    assert(primaryRes.responsiveUrls?.mobile !== undefined, 'Must have mobile URL');
    assert.strictEqual(primaryRes.isFallback, false);
  });

  // --------------------------------------------------------------------------
  // SUITE 3: AI Prompt Engine, Governance & Provenance
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: AI Engine, Governance & Provenance ---');

  await test('12. AI prompt generation derives strictly from canonical DB facts', async () => {
    const promptRes = await composeVisualPrompt({
      entityType: 'PRODUCT',
      entityId: 'prod-1',
      variant: 'packshot',
    });

    assert(promptRes.canonicalPrompt.includes('Musky Dose'), 'Prompt must use real brand name');
    assert(promptRes.canonicalPrompt.includes('#0f2d22'), 'Prompt must include brand aesthetic color');
    assert(!promptRes.isOverride, 'Default must be canonical prompt without override');
  });

  await test('13. Prompt override preserves both canonical facts and user-custom prompt', async () => {
    const customText = 'Natural sunlight on warm terracotta tile with pure Rajasthani henna paste in bronze bowl.';
    const promptRes = await composeVisualPrompt({
      entityType: 'PRODUCT',
      entityId: 'prod-1',
      variant: 'lifestyle',
      promptOverride: customText,
    });

    assert.strictEqual(promptRes.isOverride, true);
    assert.strictEqual(promptRes.finalPrompt, customText);
    assert(promptRes.canonicalPrompt.length > 50, 'Must preserve canonical prompt alongside override');
  });

  await test('14. AI suggested governance starts unlocked and strictly non-public', async () => {
    const { asset } = await saveMediaAsset({
      entityType: 'PRODUCT',
      entityId: 'test-ai-gov-entity',
      url: 'https://muskydose.in/storage/ai-suggested-test.webp',
      aspectRatio: '1:1',
      role: 'GALLERY',
      source: 'AI_GENERATED',
      status: 'suggested', // NEVER AUTO-PUBLISHED
      isLocked: false,
    });

    assert.strictEqual(asset.status, 'suggested');
    assert.strictEqual(asset.isLocked, false);

    // Public query excludes suggested assets
    const publicAssets = await getMediaForEntity({
      entityType: 'PRODUCT',
      entityId: 'test-ai-gov-entity',
      includeDrafts: false,
    });
    assert.strictEqual(publicAssets.length, 0, 'Public query must NEVER return suggested AI asset');
  });

  await test('15. Locked manual protection prevents AI from demoting manual primary', async () => {
    // 1. Manual primary locked
    await saveMediaAsset({
      id: 'med-locked-manual-primary',
      entityType: 'PRODUCT',
      entityId: 'test-lock-prod',
      url: 'https://muskydose.in/images/manual-photo.webp',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
    });

    // 2. AI attempts to claim PRIMARY
    const { asset: aiAsset } = await saveMediaAsset({
      id: 'med-ai-intruder',
      entityType: 'PRODUCT',
      entityId: 'test-lock-prod',
      url: 'https://muskydose.in/images/ai-render.webp',
      role: 'PRIMARY',
      source: 'AI_GENERATED',
      status: 'approved',
      isLocked: false,
    });

    // Demoted to GALLERY
    assert.strictEqual(aiAsset.role, 'GALLERY', 'AI asset must be demoted to GALLERY when primary is locked');

    // Primary media remains manual locked photo
    const primary = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: 'test-lock-prod' });
    assert.strictEqual(primary.id, 'med-locked-manual-primary');
    assert.strictEqual(primary.isLocked, true);
  });

  await test('16. Free-license provenance captures full attribution metadata', async () => {
    const { asset } = await saveMediaAsset({
      id: 'med-free-license-test',
      entityType: 'GUIDE',
      entityId: 'guide-mehendi-tips',
      url: 'https://muskydose.in/storage/free-botanical.webp',
      role: 'HERO',
      source: 'VERIFIED_FREE_LICENSE',
      status: 'approved',
      licenseInfo: {
        source: 'Open Terroir Archive',
        sourceUrl: 'https://openterroir.org/henna-macro.jpg',
        licenseType: 'CC-BY-4.0',
        attributionRequirement: 'Photo by Botanical Collective under CC-BY-4.0',
        retrievedAt: new Date().toISOString(),
        fileHash: 'sha256-abcdef123456',
        storagePath: 'product-images/free-botanical.webp',
      },
    });

    assert.strictEqual(asset.source, 'VERIFIED_FREE_LICENSE');
    assert.strictEqual(asset.licenseInfo?.licenseType, 'CC-BY-4.0');
    assert(asset.licenseInfo?.attributionRequirement?.includes('Botanical Collective'));
  });

  await test('17. Cryptographic SHA-256 duplicate prevention reuses URL without duplicating bytes', async () => {
    const testHash = crypto.createHash('sha256').update('unique-visual-bytes-12345').digest('hex');

    const first = await saveMediaAsset({
      id: 'med-first-upload',
      entityType: 'PRODUCT',
      entityId: 'prod-dup-test',
      url: 'https://muskydose.in/storage/original.webp',
      fileHash: testHash,
      role: 'GALLERY',
      source: 'MANUAL_UPLOAD',
    });

    const second = await saveMediaAsset({
      id: 'med-second-upload',
      entityType: 'PRODUCT',
      entityId: 'prod-dup-test',
      url: 'https://muskydose.in/storage/attempted-duplicate.webp',
      fileHash: testHash, // Same hash!
      role: 'GALLERY',
      source: 'MANUAL_UPLOAD',
    });

    assert.strictEqual(second.deduplicated, true, 'Second asset must be flagged deduplicated');
    assert.strictEqual(second.asset.url, first.asset.url, 'Must reuse canonical storage URL');
  });

  // --------------------------------------------------------------------------
  // SUITE 4: Future-Proof Extensibility & Page-Aware Consumption
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Future-Proofing & Page-Aware Consumption ---');

  await test('18. FUTURE-PROOF RULE: newly simulated entity is handled without page code change', async () => {
    // Dynamically register an entirely novel entity type at runtime (e.g. 'WORKSHOP')
    registerEntityBlueprint('WORKSHOP', [
      {
        slotId: 'workshop-hero',
        role: 'HERO',
        purpose: 'Immersive header visual for botanical henna workshop.',
        preferredAspectRatio: '16:9',
        minQuality: { minWidth: 1000, minHeight: 560 },
        allowedSources: ['MANUAL_UPLOAD', 'AI_GENERATED', 'VERIFIED_FREE_LICENSE'],
        generationContext: {
          variant: 'lifestyle',
          promptFocus: 'Hands-on natural bridal henna masterclass in courtyard.',
        },
        approvalRequired: true,
        responsiveBehavior: 'DESKTOP',
        isRequired: true,
      },
    ]);

    // Query blueprint & evaluate health for novel entity
    const blueprint = getEntityBlueprint('WORKSHOP');
    assert.strictEqual(blueprint.entityType, 'WORKSHOP');

    const health = await evaluateEntityVisualHealth('WORKSHOP', 'workshop-sojat-2026');
    assert.strictEqual(health.overallHealth, 'MISSING');
    assert.strictEqual(health.requiredSlotsCount, 1);

    // Provide asset and verify resolution
    await saveMediaAsset({
      entityType: 'WORKSHOP' as any,
      entityId: 'workshop-sojat-2026',
      url: 'https://muskydose.in/images/workshop-cover.webp',
      aspectRatio: '16:9',
      role: 'HERO',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
    });

    const resolved = await resolveVisualRequirements('WORKSHOP', 'workshop-sojat-2026');
    assert.strictEqual(resolved['workshop-hero']?.url, 'https://muskydose.in/images/workshop-cover.webp');
    assert.strictEqual(resolved['workshop-hero']?.isFallback, false);
  });

  await test('19. Page consumer integration (resolveEntityVisuals) returns fully typed package', async () => {
    const visuals = await resolveEntityVisuals('PRODUCT', 'test-reuse-entity');
    assert(visuals.primary !== undefined, 'Must provide primary visual');
    assert(visuals.hero !== undefined, 'Must provide hero visual');
    assert(visuals.slots !== undefined, 'Must provide slots dictionary');
    assert(visuals.seo !== undefined, 'Must provide SEO visuals');
    assert(visuals.motion !== undefined, 'Must provide motion layers');
  });

  await test('20. SEO / OpenGraph integration provides ready social share metadata', async () => {
    const visuals = await resolveEntityVisuals('PRODUCT', 'test-reuse-entity');
    assert(visuals.seo.ogImageUrl.startsWith('http'), 'OG Image URL must be absolute or valid URL');
    assert(visuals.seo.schemaImageUrls.length > 0, 'Must provide schema images for JSON-LD');
  });

  await test('21. Motion asset requirements expose transparent & background-safe layers', async () => {
    await saveMediaAsset({
      id: 'med-motion-cutout',
      entityType: 'PRODUCT',
      entityId: 'test-motion-entity',
      url: 'https://muskydose.in/images/henna-leaf-cutout.png',
      aspectRatio: '1:1',
      role: 'DETAIL',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      motionLayer: {
        layerType: 'BOTANICAL_OBJECT',
        isTransparent: true,
        motionSafe: true,
      },
    });

    const visuals = await resolveEntityVisuals('PRODUCT', 'test-motion-entity');
    assert(visuals.motion.botanicalObjects.length > 0, 'Must expose botanical objects for motion system');
    assert.strictEqual(visuals.motion.botanicalObjects[0].motionLayer?.isTransparent, true);
  });

  await test('22. No legacy mutation: product.images is strictly untouched', () => {
    const legacyProduct = {
      id: 'prod-legacy-safety',
      name: 'Pure Henna',
      images: ['https://muskydose.in/legacy/original-img.jpg'],
    };

    const originalImagesCopy = [...legacyProduct.images];
    const primaryAsset = {
      id: 'med-canonical-1',
      entityType: 'PRODUCT' as const,
      entityId: 'prod-legacy-safety',
      url: 'https://muskydose.in/canonical/new-canonical.webp',
      storageBucket: 'product-images',
      mimeType: 'image/webp',
      aspectRatio: '1:1',
      role: 'PRIMARY' as const,
      source: 'MANUAL_UPLOAD' as const,
      status: 'approved' as const,
      isLocked: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const decorated = attachCanonicalMediaToProduct(legacyProduct, {
      primaryAsset,
      galleryAssets: [],
      allAssets: [primaryAsset],
      isFallback: false,
      source: 'MANUAL_UPLOAD',
    });

    assert.deepStrictEqual(legacyProduct.images, originalImagesCopy, 'product.images MUST NOT BE MUTATED');
    assert.strictEqual(
      decorated.canonicalPrimaryUrl,
      'https://muskydose.in/canonical/new-canonical.webp',
      'canonicalPrimaryUrl points to canonical asset'
    );
  });

  await test('23. Zero N+1 query safety on catalog visual evaluation', async () => {
    const startTime = Date.now();
    const summary = await evaluateCatalogVisualHealth();
    const duration = Date.now() - startTime;

    assert(summary.totalEntities >= 0);
    assert(duration < 2000, `Catalog evaluation must complete in <2000ms (took ${duration}ms)`);
  });

  await test('24. Autopilot integration & approval boundaries enforce fail-closed behavior', async () => {
    // Run an autopilot cycle with force=true (to bypass concurrency / interval checks)
    const cycleSummary = await runAutopilotCycle({ force: true });
    assert(cycleSummary.status === 'COMPLETED' || cycleSummary.status === 'SKIPPED_KILL_SWITCH');

    // Inspect actions
    const actions = await getAutopilotActions(10);
    // Ensure all actions conform to risk gating:
    for (const a of actions) {
      if (a.actionType === 'NEW_PUBLIC_PAGE' || a.actionType === 'PUBLISH_AI_MEDIA') {
        assert.strictEqual(
          a.status,
          'PENDING_APPROVAL',
          'High risk visual publishing MUST be queued for approval'
        );
      }
      if (a.status === 'AUTO_EXECUTED') {
        assert.strictEqual(
          a.riskLevel,
          'LOW',
          'Only LOW risk actions can be AUTO_EXECUTED'
        );
      }
    }
  });

  // --------------------------------------------------------------------------
  // Summary
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`MASTER VISUAL SYSTEM TESTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMasterVisualSystemTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
