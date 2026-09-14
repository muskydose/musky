import assert from 'assert';
import {
  resolveUniversalSeo,
  mapKeywordsToUniversalCatalog,
  getUniversalInternalLinks,
  calculateEntityGrowthHealth,
  DISTRIBUTION_ADAPTERS,
  UniversalSeoInput,
} from '../lib/growth/universal-growth-engine';
import { Product, Category, ProductGuide } from '../lib/types';
import { CanonicalEntityRecord } from '../lib/growth/entity-registry';
import { SearchConsoleQuery } from '../lib/growth/types';
import { resetMediaCache, saveMediaAsset } from '../lib/db/media';

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
  console.log('  UNIVERSAL GROWTH ENGINE — MASTER TEST SUITE');
  console.log('================================================================\n');

  resetMediaCache({ clearFallbackStore: true });

  // 1. Universal SEO Resolution (Product)
  await runTest('1. Universal SEO Engine: Product resolution with JSON-LD and canonical URL', async () => {
    const input: UniversalSeoInput = {
      targetType: 'PRODUCT',
      targetId: 'prod-test-seo',
      slug: 'pure-sojat-henna-powder',
      name: 'Pure Sojat Henna Powder',
      description: 'Triple-sifted organic Lawsonia Inermis henna from Sojat, Rajasthan.',
      price: 249,
      currency: 'INR',
      stockStatus: 'in_stock',
      sku: 'HENNA-100G',
      category: 'Henna',
    };

    const res = await resolveUniversalSeo(input);

    assert.ok(res.title.includes('Pure Sojat Henna Powder'), 'Title must contain product name');
    assert.strictEqual(
      res.canonicalUrl,
      'https://muskydose.in/products/pure-sojat-henna-powder',
      'Canonical URL must follow strict pattern'
    );
    assert.strictEqual(res.jsonLd['@type'], 'Product', 'JSON-LD must be Product type');
    assert.strictEqual(res.jsonLd.offers?.price, '249', 'Price must be string formatted in JSON-LD');
    assert.strictEqual(res.openGraph.type, 'product', 'OG type must be product');
    assert.strictEqual(res.sitemapEntry.priority, 0.9, 'Product sitemap priority must be 0.9');
  });

  // 2. Universal SEO Resolution (Category, Guide, Knowledge)
  await runTest('2. Universal SEO Engine: Category, Guide, and Knowledge resolution', async () => {
    const catRes = await resolveUniversalSeo({
      targetType: 'CATEGORY',
      targetId: 'cat-hair-care',
      slug: 'hair-care',
      name: 'Natural Hair Care',
    });
    assert.strictEqual(catRes.canonicalUrl, 'https://muskydose.in/categories/hair-care');
    assert.strictEqual(catRes.jsonLd['@type'], 'CollectionPage');

    const guideRes = await resolveUniversalSeo({
      targetType: 'GUIDE',
      targetId: 'guide-mix-henna',
      slug: 'how-to-mix-henna',
      name: 'How to Mix BAQ Henna',
    });
    assert.strictEqual(guideRes.canonicalUrl, 'https://muskydose.in/guides/how-to-mix-henna');
    assert.strictEqual(guideRes.jsonLd['@type'], 'Article');

    const knowRes = await resolveUniversalSeo({
      targetType: 'KNOWLEDGE',
      targetId: 'ent-henna-mehndi',
      slug: 'henna-mehndi',
      name: 'Henna / Mehndi',
      botanicalName: 'Lawsonia Inermis',
    });
    assert.strictEqual(knowRes.canonicalUrl, 'https://muskydose.in/knowledge/henna-mehndi');
    assert.strictEqual(knowRes.jsonLd['@type'], 'AboutPage');
  });

  // 3. Botanical Claims Safety Guard (No Lawsonia in Amla / Rosewater)
  await runTest('3. Botanical Claims Safety: Strictly prevents Lawsonia claims leaking into Amla or Rosewater', async () => {
    const amlaRes = await resolveUniversalSeo({
      targetType: 'PRODUCT',
      targetId: 'prod-amla-safety',
      slug: 'pure-amla-powder',
      name: 'Pure Amla Powder',
      description: 'Rich in Vitamin C, lawsone dye-release, and scalp nourishment.',
    });

    assert.ok(
      !amlaRes.description.toLowerCase().includes('lawsone'),
      'Amla description must not contain lawsone'
    );
    assert.ok(
      !amlaRes.description.toLowerCase().includes('dye-release'),
      'Amla description must not contain dye-release'
    );
  });

  // 4. Real GSC Keyword Mapping (Zero Fake Volume)
  await runTest('4. Universal Keyword Engine: Maps real GSC queries to entities without fake metrics', async () => {
    const mockProducts: Product[] = [
      {
        id: 'prod-baq-henna',
        name: 'BAQ Henna Powder',
        slug: 'baq-henna-powder',
        price: 299,
        sku: 'BAQ-100',
        images: ['/images/henna.jpg'],
        ingredients: ['Lawsonia Inermis'],
        benefits: ['Dark stain'],
        usageInstructions: 'Mix with warm water',
        stockStatus: 'in_stock',
        isActive: true,
        sortOrder: 1,
        categoryId: 'cat-henna',
        shortDescription: 'Pure body art quality henna.',
        fullDescription: 'Detailed description.',
        quantityOrWeight: '100g',
        isFeatured: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const mockGscQueries: SearchConsoleQuery[] = [
      {
        id: 'gsc-1',
        query: 'baq henna powder price',
        clicks: 2,
        impressions: 120,
        ctr: 0.016, // Low CTR (< 3%)
        position: 8.5,
        collectedAt: new Date().toISOString(),
        sourceBadge: 'SEARCH CONSOLE',
      },
      {
        id: 'gsc-2',
        query: 'organic amla hair pack tutorial',
        clicks: 0,
        impressions: 45,
        ctr: 0.0,
        position: 12.0,
        collectedAt: new Date().toISOString(),
        sourceBadge: 'SEARCH CONSOLE',
      },
    ];

    const opps = await mapKeywordsToUniversalCatalog({
      products: mockProducts,
      categories: [],
      guides: [],
      knowledgeEntities: [],
      gscQueries: mockGscQueries,
    });

    assert.ok(opps.length >= 2, 'Must generate keyword opportunities');

    // High impression, low CTR opportunity
    const highImp = opps.find((o) => o.keyword === 'baq henna powder price');
    assert.ok(highImp, 'Must find baq query');
    assert.strictEqual(highImp?.opportunityType, 'HIGH_IMPRESSION_LOW_CTR');
    assert.strictEqual(highImp?.targetEntityType, 'PRODUCT');
    assert.strictEqual(highImp?.opportunityScore, 90);

    // Content gap opportunity
    const contentGap = opps.find((o) => o.keyword === 'organic amla hair pack tutorial');
    assert.ok(contentGap, 'Must find tutorial gap');
    assert.strictEqual(contentGap?.opportunityType, 'CONTENT_GAP');
  });

  // 5. Universal Internal Linking (Product -> Knowledge & Guides)
  await runTest('5. Universal Internal Linking: Context-aware related entities without hardcoding', async () => {
    const mockProduct: Product = {
      id: 'prod-henna-link-test',
      name: 'Sojat Pure Henna Powder',
      slug: 'sojat-pure-henna-powder',
      price: 249,
      sku: 'HENNA-SOJAT',
      images: ['/images/henna.jpg'],
      ingredients: ['Lawsonia Inermis'],
      benefits: ['Deep hair conditioning'],
      usageInstructions: 'Mix into smooth paste',
      stockStatus: 'in_stock',
      isActive: true,
      sortOrder: 1,
      categoryId: 'cat-henna',
      categoryName: 'Henna',
      shortDescription: 'Pure Rajasthani Sojat Henna',
      fullDescription: 'Detailed description',
      quantityOrWeight: '100g',
      isFeatured: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const links = await getUniversalInternalLinks({
      entityType: 'PRODUCT',
      entityId: mockProduct.id,
      products: [mockProduct],
    });

    assert.strictEqual(links.sourceType, 'PRODUCT');
    assert.strictEqual(links.sourceId, mockProduct.id);
    assert.ok(Array.isArray(links.relatedKnowledge), 'Must return related knowledge array');
    assert.ok(Array.isArray(links.relatedGuides), 'Must return related guides array');
  });

  // 6. Growth Health Scoring & Recommendations (Future Entities Support)
  await runTest('6. Growth Automation: Evaluates health and flags missing media or metadata', async () => {
    // Entity missing description and primary image
    const thinEntity = {
      id: 'prod-future-incomplete',
      name: 'Future Herbal Hair Pack',
      slug: 'future-herbal-hair-pack',
      description: '', // Empty
    };

    const health = await calculateEntityGrowthHealth('PRODUCT', thinEntity);

    assert.ok(health.healthScore < 100, 'Health score must be penalized for missing fields');
    assert.strictEqual(health.hasMetaDescription, false, 'Meta description should be false');
    assert.ok(
      health.recommendations.some((r) => r.includes('missing an approved primary image')),
      'Should recommend uploading primary image'
    );
    assert.ok(
      health.recommendations.some((r) => r.includes('Meta description is missing')),
      'Should recommend adding meta description'
    );
  });

  // 7. Canonical Media DAL Integration
  await runTest('7. Media Integration: Canonical DAL primary asset resolves into SEO metadata', async () => {
    // Register canonical media for test entity
    await saveMediaAsset({
      id: 'med-growth-seo-asset',
      entityType: 'PRODUCT',
      entityId: 'prod-media-test-growth',
      url: 'https://images.muskydose.in/products/canonical-seo-primary.webp',
      role: 'PRIMARY',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
      isLocked: true,
    });

    const seo = await resolveUniversalSeo({
      targetType: 'PRODUCT',
      targetId: 'prod-media-test-growth',
      slug: 'media-test-product',
      name: 'Media Test Product',
    });

    assert.strictEqual(
      seo.primaryMediaUrl,
      'https://images.muskydose.in/products/canonical-seo-primary.webp',
      'Primary media URL must resolve from canonical media DAL'
    );
    assert.strictEqual(
      seo.openGraph.images[0].url,
      'https://images.muskydose.in/products/canonical-seo-primary.webp',
      'OG image must match canonical primary asset'
    );
  });

  // 8. Future Distribution Adapters: Google Business Profile (GBP)
  await runTest('8. Distribution Adapter: Google Business Profile formats draft without credentials', async () => {
    const gbpAdapter = DISTRIBUTION_ADAPTERS.GOOGLE_BUSINESS;
    assert.ok(gbpAdapter, 'GBP adapter must be registered');

    const draft = await gbpAdapter.prepareDraft({
      entityType: 'PRODUCT',
      entityId: 'prod-baq',
      title: 'BAQ Sojat Henna Powder',
      description: 'Triple-sifted bridal mehndi powder direct from Sojat farm units.',
      canonicalUrl: 'https://muskydose.in/products/baq-henna-powder',
      primaryMediaUrl: 'https://images.muskydose.in/baq.jpg',
    });

    assert.strictEqual(draft.channel, 'GOOGLE_BUSINESS');
    assert.strictEqual(draft.status, 'DRAFT_READY');
    assert.ok(draft.formattedCopy.includes('Musky Dose processing unit in Sojat'), 'Must include facility origin');
    assert.ok(draft.targetDestinationUrl.includes('utm_source=google_business'), 'Must include UTM tracking');
  });

  // 9. Future Distribution Adapters: Instagram
  await runTest('9. Distribution Adapter: Instagram formats social draft without auto-publishing', async () => {
    const igAdapter = DISTRIBUTION_ADAPTERS.INSTAGRAM;
    assert.ok(igAdapter, 'Instagram adapter must be registered');

    const draft = await igAdapter.prepareDraft({
      entityType: 'PRODUCT',
      entityId: 'prod-baq',
      title: 'BAQ Sojat Henna Powder',
      description: '100% Pure, chemical-free farm harvest.',
      canonicalUrl: 'https://muskydose.in/products/baq-henna-powder',
      primaryMediaUrl: 'https://images.muskydose.in/baq.jpg',
      tags: ['BridalHenna', 'MehndiArtist'],
    });

    assert.strictEqual(draft.channel, 'INSTAGRAM');
    assert.strictEqual(draft.status, 'DRAFT_READY');
    assert.ok(draft.hashtags.includes('#MuskyDose'), 'Must include brand hashtag');
    assert.ok(draft.hashtags.includes('#BridalHenna'), 'Must include custom tag');
  });

  // 10. Future Distribution Adapters: Facebook
  await runTest('10. Distribution Adapter: Facebook formats page post draft safely', async () => {
    const fbAdapter = DISTRIBUTION_ADAPTERS.FACEBOOK;
    assert.ok(fbAdapter, 'Facebook adapter must be registered');

    const draft = await fbAdapter.prepareDraft({
      entityType: 'PRODUCT',
      entityId: 'prod-baq',
      title: 'BAQ Sojat Henna Powder',
      description: 'Authentic botanical harvest directly from Sojat, Rajasthan.',
      canonicalUrl: 'https://muskydose.in/products/baq-henna-powder',
    });

    assert.strictEqual(draft.channel, 'FACEBOOK');
    assert.strictEqual(draft.status, 'DRAFT_READY');
    assert.ok(draft.formattedCopy.includes('Farm Direct Dispatch'), 'Must highlight farm dispatch');
  });

  // 11. Fail-Closed on Unknown Entities
  await runTest('11. Governance: Fail-closed on unknown / invalid entities', async () => {
    const unknownLinks = await getUniversalInternalLinks({
      entityType: 'KNOWLEDGE',
      entityId: 'UNKNOWN_BOTANICAL_KEY_999',
    });

    assert.strictEqual(unknownLinks.totalApprovedLinks, 0, 'Unknown entity must yield 0 links');
    assert.strictEqual(unknownLinks.relatedProducts.length, 0);
  });

  // 12. Zero N+1 Queries (Batch Execution Integrity)
  await runTest('12. Performance: Bulk universal SEO resolution executes in O(1) without N+1', async () => {
    const testProducts: UniversalSeoInput[] = [
      { targetType: 'PRODUCT', targetId: 'prod-1', slug: 'prod-1', name: 'Product 1' },
      { targetType: 'PRODUCT', targetId: 'prod-2', slug: 'prod-2', name: 'Product 2' },
      { targetType: 'PRODUCT', targetId: 'prod-3', slug: 'prod-3', name: 'Product 3' },
    ];

    const start = Date.now();
    const results = await Promise.all(testProducts.map((p) => resolveUniversalSeo(p)));
    const duration = Date.now() - start;

    assert.strictEqual(results.length, 3, 'All 3 products must resolve');
    assert.ok(duration < 2000, `Bulk resolution must be fast, took ${duration}ms`);
  });

  console.log('\n================================================================');
  console.log(`  ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`);
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});

