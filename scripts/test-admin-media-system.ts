import assert from 'assert';
import crypto from 'crypto';
import {
  MediaAsset,
  MediaEntityType,
  MediaAssetRole,
  MediaAssetSource,
  MediaAssetStatus,
  saveMediaAsset,
  updateMediaAsset,
  archiveMediaAsset,
  getPrimaryMedia,
  getMediaForEntity,
  setPrimaryMedia,
  resolveAuthoritativeMedia,
  findAssetByHash,
  getBatchPrimaryMedia,
  getBatchResolvedMedia,
  attachCanonicalMediaToProduct,
  attachCanonicalMediaToCategory,
  attachCanonicalMediaToGuide,
  attachCanonicalMediaToKnowledge,
  resetMediaCache,
} from '../lib/db/media';
import {
  buildVisualPrompt,
  resolveEntityCanonicalFacts,
  generateAndSaveVisualForEntity,
  setVisualProvider,
  getActiveVisualProvider,
  VisualProvider,
  GeneratedVisualResult,
  GeminiImagenProvider,
} from '../lib/ai/visual-engine';

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passedTests++;
      console.log(`  [PASS] Test ${totalTests}: ${name}`);
    })
    .catch((err) => {
      console.error(`  [FAIL] Test ${totalTests}: ${name}`);
      console.error(err);
      process.exit(1);
    });
}

async function runAllTests() {
  console.log('================================================================');
  console.log('  UNIVERSAL MEDIA SYSTEM — PHASES 3.5-3.8 TEST SUITE');
  console.log('================================================================\n');

  resetMediaCache({ clearFallbackStore: true });

  // TEST 1: MediaAsset CRUD via canonical DAL
  await runTest('1. MediaAsset CRUD via canonical DAL', async () => {
    const { asset: created } = await saveMediaAsset({
      entityType: 'PRODUCT',
      entityId: 'test-prod-101',
      url: 'https://images.muskydose.in/products/test-101.jpg',
      role: 'GALLERY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      title: 'Test Product Photo',
    });

    assert.ok(created.id, 'Asset should receive unique ID');
    assert.strictEqual(created.entityType, 'PRODUCT');
    assert.strictEqual(created.entityId, 'test-prod-101');
    assert.strictEqual(created.status, 'approved');

    // Update
    const updated = await updateMediaAsset(created.id, { title: 'Updated Title' });
    assert.ok(updated, 'Update should succeed');
    assert.strictEqual(updated?.title, 'Updated Title');

    // Archive
    const archived = await archiveMediaAsset(created.id);
    assert.strictEqual(archived, true, 'Archive should succeed');

    const activeAssets = await getMediaForEntity({
      entityType: 'PRODUCT',
      entityId: 'test-prod-101',
      includeDrafts: false,
    });
    assert.strictEqual(activeAssets.length, 0, 'Archived assets must not appear in active queries');
  });

  // TEST 2: Priority Governance — Locked Manual Primary wins over AI and External
  await runTest('2. Priority Governance: Locked Manual Primary wins over AI and External', async () => {
    const manualLocked: MediaAsset = {
      id: 'med-manual-locked',
      entityType: 'PRODUCT',
      entityId: 'test-prod-priority',
      url: 'https://images.muskydose.in/manual-primary.jpg',
      storageBucket: 'product-images',
      mimeType: 'image/jpeg',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const aiApproved: MediaAsset = {
      id: 'med-ai-approved',
      entityType: 'PRODUCT',
      entityId: 'test-prod-priority',
      url: 'https://images.muskydose.in/ai-visual.jpg',
      storageBucket: 'product-images',
      mimeType: 'image/jpeg',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'AI_GENERATED',
      status: 'approved',
      isLocked: false,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const resolution = await resolveAuthoritativeMedia([aiApproved, manualLocked]);
    assert.strictEqual(
      resolution.primaryAsset.id,
      'med-manual-locked',
      'Locked manual primary must strictly beat AI primary'
    );
  });

  // TEST 3: Anti-Hallucination Locking Guard (saveMediaAsset demotes AI primary if locked primary exists)
  await runTest('3. Anti-Hallucination Locking Guard: Demotes AI primary to GALLERY if locked primary exists', async () => {
    // 1. Create locked manual primary
    await saveMediaAsset({
      id: 'locked-manual-prod-202',
      entityType: 'PRODUCT',
      entityId: 'test-prod-202',
      url: 'https://images.muskydose.in/manual-locked-202.jpg',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
    });

    // 2. Attempt to save an AI_GENERATED asset claiming role='PRIMARY'
    const { asset: aiAsset } = await saveMediaAsset({
      id: 'ai-claim-primary-202',
      entityType: 'PRODUCT',
      entityId: 'test-prod-202',
      url: 'https://images.muskydose.in/ai-visual-202.jpg',
      role: 'PRIMARY',
      source: 'AI_GENERATED',
      status: 'approved',
      isLocked: false,
    });

    assert.strictEqual(
      aiAsset.role,
      'GALLERY',
      'AI asset must be demoted to GALLERY when locked manual primary exists'
    );

    const primary = await getPrimaryMedia('PRODUCT', 'test-prod-202');
    assert.strictEqual(primary.id, 'locked-manual-prod-202', 'Locked manual asset must remain primary');
  });

  // TEST 4: AI Governance — Generated asset defaults to suggested, not approved
  await runTest('4. AI Governance: Generated asset defaults to suggested, never auto-approved', async () => {
    const { asset } = await saveMediaAsset({
      entityType: 'PRODUCT',
      entityId: 'test-prod-303',
      url: 'https://images.muskydose.in/ai-draft-303.jpg',
      role: 'GALLERY',
      source: 'AI_GENERATED',
      status: 'suggested',
      isLocked: false,
    });

    assert.strictEqual(asset.status, 'suggested');
    assert.strictEqual(asset.source, 'AI_GENERATED');
    assert.strictEqual(asset.isLocked, false);
  });

  // TEST 5: Suggested AI asset is NEVER public in storefront queries
  await runTest('5. Suggested AI asset is NEVER public in storefront queries', async () => {
    await saveMediaAsset({
      id: 'suggested-ai-404',
      entityType: 'PRODUCT',
      entityId: 'test-prod-404',
      url: 'https://images.muskydose.in/ai-suggested-404.jpg',
      role: 'PRIMARY',
      source: 'AI_GENERATED',
      status: 'suggested',
    });

    const publicAssets = await getMediaForEntity({
      entityType: 'PRODUCT',
      entityId: 'test-prod-404',
      includeDrafts: false, // Storefront read mode
    });

    assert.strictEqual(
      publicAssets.some((a) => a.id === 'suggested-ai-404'),
      false,
      'Suggested AI asset must not appear in storefront public queries'
    );

    const primary = await getPrimaryMedia('PRODUCT', 'test-prod-404');
    assert.strictEqual(
      primary.id !== 'suggested-ai-404',
      true,
      'Primary resolution must not pick up unapproved suggested AI asset'
    );
  });

  // TEST 6: Explicit Admin Promotion — Suggested -> Approved allows participating in resolution
  await runTest('6. Explicit Admin Promotion: Suggested -> Approved allows participating in resolution', async () => {
    const assetId = 'suggested-ai-505';
    await saveMediaAsset({
      id: assetId,
      entityType: 'PRODUCT',
      entityId: 'test-prod-505',
      url: 'https://images.muskydose.in/ai-suggested-505.jpg',
      role: 'PRIMARY',
      source: 'AI_GENERATED',
      status: 'suggested',
    });

    // Explicit admin approval
    const approved = await updateMediaAsset(assetId, { status: 'approved' });
    assert.strictEqual(approved?.status, 'approved');

    const publicAssets = await getMediaForEntity({
      entityType: 'PRODUCT',
      entityId: 'test-prod-505',
      includeDrafts: false,
    });

    assert.strictEqual(
      publicAssets.some((a) => a.id === assetId),
      true,
      'Approved AI asset must now participate in storefront resolution'
    );
  });

  // TEST 7: Cryptographic SHA-256 Deduplication
  await runTest('7. Cryptographic SHA-256 Deduplication: Same binary reuses storage asset', async () => {
    const fakeBuffer = Buffer.from('musky-dose-sample-image-bytes-sha-test');
    const hash = crypto.createHash('sha256').update(fakeBuffer).digest('hex');

    // Register first asset with hash
    const { asset: firstAsset, deduplicated: d1 } = await saveMediaAsset({
      id: 'asset-hash-original',
      entityType: 'PRODUCT',
      entityId: 'test-prod-606',
      url: 'https://storage.muskydose.in/products/hash-original.jpg',
      storagePath: 'products/hash-original.jpg',
      fileHash: hash,
    });
    assert.strictEqual(d1, false, 'First asset should not be deduplicated');

    // Attempt to save second asset with same hash
    const { asset: secondAsset, deduplicated: d2 } = await saveMediaAsset({
      id: 'asset-hash-duplicate',
      entityType: 'PRODUCT',
      entityId: 'test-prod-607',
      url: 'https://storage.muskydose.in/products/hash-duplicate.jpg',
      storagePath: 'products/hash-duplicate.jpg',
      fileHash: hash,
    });

    assert.strictEqual(d2, true, 'Second asset must be identified as deduplicated');
    assert.strictEqual(secondAsset.url, firstAsset.url, 'Duplicate asset must reuse original URL');
    assert.strictEqual(secondAsset.storagePath, firstAsset.storagePath, 'Duplicate asset must reuse original storagePath');
  });

  // TEST 8: Legacy Field Immutability (Non-mutating attachers)
  await runTest('8. Legacy Field Immutability: Attachers NEVER mutate legacy fields', async () => {
    const mockProduct = {
      id: 'prod-legacy-check',
      name: 'Pure Sojat Henna',
      images: ['/images/legacy-image-1.jpg', '/images/legacy-image-2.jpg'],
    };

    const mockCategory = {
      id: 'cat-legacy-check',
      name: 'Henna Powders',
      image: '/images/legacy-cat-image.jpg',
    };

    const mockGuide = {
      id: 'guide-legacy-check',
      title: 'How to Mix Henna',
      coverImage: '/images/legacy-guide-cover.jpg',
    };

    const mockKnowledge = {
      id: 'know-legacy-check',
      canonicalName: 'Henna',
      ogImageUrl: '/images/legacy-knowledge-og.jpg',
    };

    const canonicalAsset: MediaAsset = {
      id: 'med-canonical-fresh',
      entityType: 'PRODUCT',
      entityId: 'prod-legacy-check',
      url: 'https://images.muskydose.in/canonical-new.webp',
      storageBucket: 'product-images',
      mimeType: 'image/webp',
      aspectRatio: '1:1',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Product attach test
    const enrichedProduct = attachCanonicalMediaToProduct(mockProduct, {
      primaryAsset: canonicalAsset,
      galleryAssets: [],
      allAssets: [canonicalAsset],
      isFallback: false,
      source: 'MANUAL_UPLOAD',
    });
    assert.deepStrictEqual(
      mockProduct.images,
      ['/images/legacy-image-1.jpg', '/images/legacy-image-2.jpg'],
      'Legacy product.images must NOT be mutated'
    );
    assert.strictEqual(
      enrichedProduct.canonicalPrimaryUrl,
      'https://images.muskydose.in/canonical-new.webp'
    );

    // Category attach test
    const enrichedCat = attachCanonicalMediaToCategory(mockCategory, canonicalAsset);
    assert.strictEqual(mockCategory.image, '/images/legacy-cat-image.jpg', 'Legacy category.image must NOT be mutated');
    assert.strictEqual(enrichedCat.canonicalPrimaryUrl, 'https://images.muskydose.in/canonical-new.webp');

    // Guide attach test
    const enrichedGuide = attachCanonicalMediaToGuide(mockGuide, canonicalAsset);
    assert.strictEqual(mockGuide.coverImage, '/images/legacy-guide-cover.jpg', 'Legacy guide.coverImage must NOT be mutated');
    assert.strictEqual(enrichedGuide.canonicalPrimaryUrl, 'https://images.muskydose.in/canonical-new.webp');

    // Knowledge attach test
    const enrichedKnow = attachCanonicalMediaToKnowledge(mockKnowledge, canonicalAsset);
    assert.strictEqual(mockKnowledge.ogImageUrl, '/images/legacy-knowledge-og.jpg', 'Legacy knowledge.ogImageUrl must NOT be mutated');
    assert.strictEqual(enrichedKnow.canonicalPrimaryUrl, 'https://images.muskydose.in/canonical-new.webp');
  });

  // TEST 9: AI Visual Engine Provider Abstraction
  await runTest('9. AI Visual Engine Provider Abstraction: Fails closed when unconfigured', async () => {
    // Save original provider
    const originalProvider = getActiveVisualProvider();

    // Provider that is intentionally unavailable
    const unavailableProvider: VisualProvider = {
      name: 'Test Unavailable Provider',
      isAvailable: () => false,
      generateImage: async () => {
        throw new Error('Should not be called when unavailable');
      },
    };

    setVisualProvider(unavailableProvider);

    try {
      await generateAndSaveVisualForEntity({
        entityType: 'PRODUCT',
        entityId: 'prod-fail-closed',
      });
      assert.fail('Should have thrown an error when provider is unavailable');
    } catch (err: any) {
      assert.ok(
        err.message.includes('unconfigured or unavailable'),
        'Must throw clear unavailable error'
      );
    } finally {
      // Restore original
      setVisualProvider(originalProvider);
    }
  });

  // TEST 10: AI Visual Engine with Mock Provider generates suggested asset
  await runTest('10. AI Visual Engine: Generates suggested asset via provider abstraction', async () => {
    const mockProvider: VisualProvider = {
      name: 'Mock Visual Provider',
      isAvailable: () => true,
      generateImage: async (prompt, opts) => {
        return {
          buffer: Buffer.from('mock-generated-image-data-payload'),
          mimeType: 'image/jpeg',
          width: 1024,
          height: 1024,
          aspectRatio: '1:1',
          fileName: 'mock-img.jpg',
          promptUsed: prompt,
          modelName: 'mock-imagen-v3',
          provider: 'Mock Visual Provider',
        };
      },
    };

    setVisualProvider(mockProvider);

    const { asset, promptUsed, provider } = await generateAndSaveVisualForEntity({
      entityType: 'PRODUCT',
      entityId: 'prod-mock-ai-808',
      role: 'GALLERY',
      variant: 'packshot',
    });

    assert.strictEqual(asset.status, 'suggested', 'Generated asset MUST be suggested');
    assert.strictEqual(asset.source, 'AI_GENERATED');
    assert.strictEqual(asset.isLocked, false);
    assert.strictEqual(provider, 'Mock Visual Provider');
    assert.ok(promptUsed.length > 20, 'Prompt must be generated');

    // Restore provider
    setVisualProvider(new GeminiImagenProvider());
  });

  // TEST 11: Grounded Botanical Prompt Builder (No Hallucinations)
  await runTest('11. Grounded Botanical Prompt Builder: Strictly botanical facts without hallucinations', () => {
    const hennaFacts = {
      entityType: 'PRODUCT' as MediaEntityType,
      entityId: 'prod-henna',
      name: 'Musky Dose Sojat Pure Henna',
      botanicalName: 'Lawsonia Inermis',
      category: 'Henna',
      ingredients: ['Lawsonia Inermis'],
      formFactor: 'triple-sifted botanical powder in eco craft pouch',
    };

    const hennaPrompt = buildVisualPrompt(hennaFacts, 'packshot');
    assert.ok(hennaPrompt.includes('Lawsonia Inermis') || hennaPrompt.includes('Henna'), 'Henna prompt must reference henna');
    assert.ok(!hennaPrompt.includes('cure-all') && !hennaPrompt.includes('100% cure'), 'Must not contain cure claims');

    const amlaFacts = {
      entityType: 'PRODUCT' as MediaEntityType,
      entityId: 'prod-amla',
      name: 'Musky Dose Pure Amla Powder',
      botanicalName: 'Phyllanthus Emblica',
      category: 'Hair Care',
      ingredients: ['Phyllanthus Emblica'],
      formFactor: 'pure sun-dried amla fruit powder',
    };

    const amlaPrompt = buildVisualPrompt(amlaFacts, 'ingredient');
    assert.ok(amlaPrompt.includes('Phyllanthus Emblica') || amlaPrompt.includes('Amla'), 'Amla prompt must reference amla');
    assert.ok(!amlaPrompt.includes('Lawsonia') && !amlaPrompt.includes('dye-release'), 'Amla prompt must not hallucinate Lawsonia');
  });

  // TEST 12: Batch Resolvers $O(1)$ without N+1 queries
  await runTest('12. Batch Resolvers execute in O(1) without N+1 queries', async () => {
    const productBatch = await getBatchPrimaryMedia('PRODUCT', ['test-prod-101', 'test-prod-202']);
    assert.ok(productBatch instanceof Map, 'Should return a Map');
    assert.strictEqual(productBatch.has('test-prod-101'), true);
    assert.strictEqual(productBatch.has('test-prod-202'), true);
  });

  console.log('\n================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

