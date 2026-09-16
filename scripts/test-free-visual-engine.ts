import {
  getProviderCapabilities,
  getProviderById,
  generateAndSaveVisualForEntity,
  composeVisualPrompt,
  resolveEntityCanonicalFacts,
  buildCanonicalVisualPrompt,
} from '../lib/ai/visual-engine';
import {
  getMediaForEntity,
  saveMediaAsset,
  archiveMediaAsset,
} from '../lib/db/media';
import crypto from 'crypto';

async function runTests() {
  console.log('========================================================================');
  console.log('🧪 VERIFYING FREE-FIRST / ZERO-MANDATORY-COST AI VISUAL ENGINE');
  console.log('========================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Provider Capabilities Discovery & Tiers
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Provider Capabilities & Tier Discovery ---');
  const capabilities = await getProviderCapabilities();
  assert(capabilities.length >= 3, `Discovered ${capabilities.length} providers (expected at least 3)`);

  const freeStudio = capabilities.find((c) => c.id === 'manual-studio');
  assert(Boolean(freeStudio), 'Discovered Free AI Studio provider');
  assert(freeStudio?.tier === 'FREE', `Free Studio tier is FREE (got ${freeStudio?.tier})`);
  assert(freeStudio?.isAvailable === true, 'Free Studio is always available out of the box');
  assert(freeStudio?.requiresApiKey === false, 'Free Studio requires no API keys');
  assert(Boolean(freeStudio?.costPerImage?.includes('₹0')), `Free Studio cost is ₹0 (got: ${freeStudio?.costPerImage})`);

  const localSd = capabilities.find((c) => c.id === 'local-sd');
  assert(Boolean(localSd), 'Discovered Local AI provider');
  assert(Boolean(localSd?.costPerImage?.includes('₹0')), `Local AI cost is ₹0 (got: ${localSd?.costPerImage})`);

  const gemini = capabilities.find((c) => c.id === 'gemini');
  assert(Boolean(gemini), 'Discovered Google Gemini provider');
  assert(gemini?.tier === 'PAID' || gemini?.tier === 'UNAVAILABLE', `Gemini tier is marked PAID/UNAVAILABLE`);
  assert(gemini?.requiresApiKey === true, 'Gemini correctly marks requiresApiKey = true');

  // Default provider fallback
  const defaultProvider = getProviderById();
  assert(defaultProvider.id === 'manual-studio', `Default provider fails over to manual-studio (got: ${defaultProvider.id})`);
  assert(defaultProvider.tier === 'FREE', 'Default provider tier is strictly FREE');

  // --------------------------------------------------------------------------
  // TEST 2: Anti-Hallucination Canonical Prompt Engine (All 6 Entities)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Anti-Hallucination Canonical Prompt Engine (All 6 Entities) ---');
  const entityTypes = ['PRODUCT', 'CATEGORY', 'GUIDE', 'KNOWLEDGE', 'BRAND', 'MARKETING'] as const;

  for (const entityType of entityTypes) {
    const promptRes = await composeVisualPrompt({
      entityType,
      entityId: entityType === 'PRODUCT' ? 'prod-1' : entityType.toLowerCase(),
      variant: 'packshot',
    });

    assert(Boolean(promptRes.canonicalPrompt), `Generated canonical prompt for ${entityType}`);
    assert(promptRes.canonicalPrompt.includes('Musky Dose'), `Prompt includes brand heritage name for ${entityType}`);
    assert(
      promptRes.canonicalPrompt.includes('#0f2d22') || promptRes.canonicalPrompt.includes('green'),
      `Prompt includes brand palette for ${entityType}`
    );
    assert(promptRes.isOverride === false, `isOverride is false for canonical prompt`);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Strict Botanical Facts & Zero Hallucinated Claims
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Botanical Factual Truth & Claim Safety ---');
  const hennaFacts = await resolveEntityCanonicalFacts('PRODUCT', 'prod-1');
  assert(Boolean(hennaFacts.name), `Resolved canonical product name: ${hennaFacts.name}`);

  const hennaPrompt = await composeVisualPrompt({
    entityType: 'PRODUCT',
    entityId: 'prod-1',
    variant: 'ingredient',
  });

  assert(
    hennaPrompt.finalPrompt.includes('Lawsonia Inermis') || hennaPrompt.finalPrompt.includes('Henna'),
    'Botanical identity (Lawsonia Inermis) correctly derived for henna product'
  );
  assert(
    !hennaPrompt.finalPrompt.toLowerCase().includes('fda approved') &&
    !hennaPrompt.finalPrompt.toLowerCase().includes('cures diseases') &&
    !hennaPrompt.finalPrompt.toLowerCase().includes('miracle chemical'),
    'Prompt is free from fake medical or FDA claims'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Prompt Override Provenance Tracking
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Prompt Override & Provenance Tracking ---');
  const customOverrideText = 'Studio packshot on warm Rajasthani Jodhpur sandstone with brass bowl accents.';
  const overrideRes = await composeVisualPrompt({
    entityType: 'PRODUCT',
    entityId: 'prod-1',
    variant: 'packshot',
    promptOverride: customOverrideText,
  });

  assert(overrideRes.isOverride === true, 'isOverride flag set to true');
  assert(overrideRes.finalPrompt === customOverrideText, 'finalPrompt accurately reflects custom override');
  assert(overrideRes.canonicalPrompt !== customOverrideText, 'canonicalPrompt still preserves original factual prompt');
  assert(overrideRes.promptOverride === customOverrideText, 'promptOverride field stores user modification');

  // --------------------------------------------------------------------------
  // TEST 5: Fail-Closed Zero-Cost Guard
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Fail-Closed Zero-Cost Guard ---');
  const originalApiKey = process.env.GEMINI_API_KEY;
  try {
    delete process.env.GEMINI_API_KEY;
    const unconfiguredGemini = new (await import('../lib/ai/visual-engine')).GeminiNativeProvider();
    assert(unconfiguredGemini.isAvailable() === false, 'Gemini reports unavailable when API key is missing');

    let threwExpectedError = false;
    try {
      await unconfiguredGemini.generateImage('test prompt');
    } catch (err: any) {
      threwExpectedError = true;
      assert(
        err.message.includes('GEMINI_API_KEY is not configured') || err.message.includes('unavailable'),
        `Error message is clear and instructional: ${err.message}`
      );
    }
    assert(threwExpectedError, 'Fail-closed guard prevents execution when paid provider is unconfigured');
  } finally {
    if (originalApiKey) process.env.GEMINI_API_KEY = originalApiKey;
  }

  // --------------------------------------------------------------------------
  // TEST 6: Free AI Studio Image Import & Canonical Registration
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Free AI Studio Image Import & Governance ---');
  // Create a 1x1 test JPEG buffer (valid JPEG header)
  const testJpegBuffer = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
    0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00,
    0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x80, 0xff, 0xd9,
  ]);

  const testEntityId = 'prod-1';
  const genResult = await generateAndSaveVisualForEntity({
    entityType: 'PRODUCT',
    entityId: testEntityId,
    role: 'GALLERY',
    variant: 'packshot',
    providerId: 'manual-studio',
    imageBuffer: testJpegBuffer,
    imageMimeType: 'image/jpeg',
    imageFileName: 'test-free-studio-packshot.jpg',
  });

  const createdAsset = genResult.asset;
  assert(Boolean(createdAsset.id), `Created asset ID: ${createdAsset.id}`);
  assert(createdAsset.source === 'AI_GENERATED', `Asset source is strictly AI_GENERATED (got: ${createdAsset.source})`);
  assert(createdAsset.status === 'suggested', `Asset status is strictly SUGGESTED (got: ${createdAsset.status})`);
  assert(createdAsset.isLocked === false, `Asset isLocked is false (got: ${createdAsset.isLocked})`);
  assert(genResult.tier === 'FREE', `Generation tier is FREE (got: ${genResult.tier})`);
  assert(genResult.cost.includes('₹0'), `Generation cost is ₹0 (got: ${genResult.cost})`);

  // Verify SHA-256 hash was computed
  const expectedHash = crypto.createHash('sha256').update(testJpegBuffer).digest('hex');
  assert(createdAsset.fileHash === expectedHash, `SHA-256 hash match: ${createdAsset.fileHash}`);

  // --------------------------------------------------------------------------
  // TEST 7: Governance — Locked Primary Protection
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Governance & Immutability (Locked Manual Primary) ---');
  // Create a locked manual primary asset
  const { asset: lockedPrimary } = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: 'test-gov-prod',
    url: 'https://cdn.muskydose.in/products/manual-locked.jpg',
    storageBucket: 'product-images',
    storagePath: 'products/test-gov-prod/manual-locked.jpg',
    fileHash: 'dummy-hash-locked-primary-1',
    fileName: 'manual-locked.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 12345,
    role: 'PRIMARY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
    isLocked: true, // LOCKED!
  });

  assert(lockedPrimary.role === 'PRIMARY', 'Manual asset set as PRIMARY');
  assert(lockedPrimary.isLocked === true, 'Manual asset is LOCKED');

  // Attempt to save an AI generated asset as PRIMARY for the same entity
  const { asset: aiSuggestedPrimary } = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: 'test-gov-prod',
    url: 'https://cdn.muskydose.in/products/ai-suggested-primary.jpg',
    storageBucket: 'product-images',
    storagePath: 'products/test-gov-prod/ai-suggested-primary.jpg',
    fileHash: 'dummy-hash-ai-primary-2',
    fileName: 'ai-primary.jpg',
    mimeType: 'image/jpeg',
    fileSizeBytes: 54321,
    role: 'PRIMARY',
    source: 'AI_GENERATED',
    status: 'suggested',
    isLocked: false,
  });

  // Verify AI asset was demoted because the existing primary is locked
  assert(
    aiSuggestedPrimary.role === 'GALLERY',
    `AI generated primary asset was demoted to GALLERY because manual primary is locked (got: ${aiSuggestedPrimary.role})`
  );

  // Verify the locked manual primary remains PRIMARY and LOCKED
  const currentAssets = await getMediaForEntity({
    entityType: 'PRODUCT',
    entityId: 'test-gov-prod',
    includeDrafts: true,
  });
  const verifiedLockedPrimary = currentAssets.find((a) => a.id === lockedPrimary.id);
  assert(verifiedLockedPrimary?.role === 'PRIMARY', 'Locked manual primary is unchanged as PRIMARY');
  assert(verifiedLockedPrimary?.isLocked === true, 'Locked manual primary remains LOCKED');

  // Clean up test assets
  await archiveMediaAsset(createdAsset.id);
  await archiveMediaAsset(lockedPrimary.id);
  await archiveMediaAsset(aiSuggestedPrimary.id);
  console.log('  Cleaned up temporary test assets.');

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
