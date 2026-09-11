import assert from 'assert';
import {
  extractMerchantFeedMedia,
  generateProductMediaSchema,
  resolveAuthoritativeProductMedia,
} from '../lib/growth/product-media-governance';
import { validateProductForMerchantFeed } from '../lib/growth/merchant-feed';
import { deriveProductAutoSeo } from '../lib/growth/product-keyword-engine';
import {
  classifySearchIntent,
  resolveOrganicDestination,
} from '../lib/growth/search-intent-router';
import { getGuides, getPublishedGuides } from '../lib/db/guides';
import { Product } from '../lib/types';

async function runTests() {
  console.log('====================================================');
  console.log('STARTING PHASE 9E GROWTH ACTIONS VERIFICATION SUITE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: PRODUCT MEDIA & MERCHANT READINESS (NO FALLBACK SVG IN FEEDS/SCHEMA)
  // ----------------------------------------------------
  console.log('Test 1: Product Media Governance & Merchant Readiness');

  const emptyMediaProduct: Product = {
    id: 'prod-test-no-image',
    name: 'BAQ Henna Powder Sample',
    slug: 'baq-henna-powder-sample',
    price: 249,
    images: [],
    media: [],
    categoryId: 'cat-henna',
    categoryName: 'Henna & Mehndi',
    shortDescription: 'Natural triple-sifted BAQ henna powder from Sojat, Rajasthan.',
    fullDescription: 'Pure triple-sifted Lawsonia Inermis harvested in Sojat, Rajasthan. Ideal for bridal mehndi artists.',
    stockStatus: 'in_stock',
    sku: 'MD-BAQ-250',
    isActive: true,
  } as any;

  const feedMedia = extractMerchantFeedMedia(emptyMediaProduct);
  assert.strictEqual(
    feedMedia.imageLink,
    '',
    'extractMerchantFeedMedia must return empty string for imageLink when no non-fallback images exist'
  );
  assert.ok(
    !feedMedia.imageLink.includes('fallback.svg'),
    'Merchant feed imageLink must never contain fallback.svg'
  );

  const schemaMedia = generateProductMediaSchema(emptyMediaProduct);
  assert.deepStrictEqual(
    schemaMedia.images,
    [],
    'generateProductMediaSchema must return empty images array when no non-fallback images exist'
  );
  assert.ok(
    !(schemaMedia.images as string[]).some((u) => u.includes('fallback.svg')),
    'Product schema images must never contain fallback.svg'
  );

  const feedValidation = validateProductForMerchantFeed(emptyMediaProduct);
  assert.strictEqual(
    feedValidation.feedStatus,
    'FEED_NEEDS_REVIEW',
    'Product without real photography must be flagged as FEED_NEEDS_REVIEW'
  );
  assert.ok(
    feedValidation.validationErrors.some((e) => e.toLowerCase().includes('fallback') || e.toLowerCase().includes('image')),
    'Feed validation must flag missing real high-res photography'
  );
  console.log('  ✓ Verified: Zero fallback SVGs emitted in Merchant Feed or Schema.');
  console.log('  ✓ Verified: Products without real photography flagged as FEED_NEEDS_REVIEW.\n');

  // ----------------------------------------------------
  // TEST 2: BAQ HENNA POWDER PDP SEO
  // ----------------------------------------------------
  console.log('Test 2: BAQ Henna Powder PDP SEO');

  const baqProduct: Partial<Product> = {
    id: 'prod-1786368977551',
    name: 'BAQ Henna Powder',
    slug: 'baq-henna-powder',
    productType: 'POWDER',
    categoryName: 'Henna & Mehndi',
  };

  const baqSeo = deriveProductAutoSeo(baqProduct);
  assert.strictEqual(baqSeo.primaryKeyword, 'BAQ henna powder', 'BAQ primary keyword must be "BAQ henna powder"');
  assert.ok(
    baqSeo.secondaryKeywords.includes('body art quality henna') ||
    baqSeo.secondaryKeywords.includes('sojat henna powder') ||
    baqSeo.secondaryKeywords.includes('triple sifted henna powder'),
    'BAQ secondary keywords must target body art & Sojat henna'
  );
  assert.ok(
    baqSeo.seoTitle.includes('BAQ Henna Powder') && baqSeo.seoTitle.length <= 60,
    `BAQ SEO title must be <= 60 chars. Got: "${baqSeo.seoTitle}" (${baqSeo.seoTitle.length} chars)`
  );
  assert.ok(
    baqSeo.metaDescription.length >= 120 && baqSeo.metaDescription.length <= 165,
    `BAQ meta description must be between 120-165 chars. Got: ${baqSeo.metaDescription.length} chars`
  );
  assert.ok(
    !baqSeo.metaDescription.toLowerCase().includes('cure') &&
    !baqSeo.metaDescription.toLowerCase().includes('treat') &&
    !baqSeo.metaDescription.toLowerCase().includes('disease'),
    'BAQ SEO metadata must contain ZERO medical/therapeutic claims'
  );
  console.log('  ✓ Verified BAQ Title:', baqSeo.seoTitle);
  console.log('  ✓ Verified BAQ Meta Description:', baqSeo.metaDescription);
  console.log('  ✓ Verified BAQ Keywords:', [baqSeo.primaryKeyword, ...baqSeo.secondaryKeywords].join(', '), '\n');

  // ----------------------------------------------------
  // TEST 3: BRIDAL HENNA OIL PDP SEO
  // ----------------------------------------------------
  console.log('Test 3: Bridal Henna Oil PDP SEO');

  const bridalOilProduct: Partial<Product> = {
    id: 'prod-bridal-henna-oil',
    name: 'Bridal Henna Oil',
    slug: 'bridal-henna-oil',
    productType: 'OIL',
    categoryName: 'Henna & Mehndi',
  };

  const oilSeo = deriveProductAutoSeo(bridalOilProduct);
  assert.strictEqual(oilSeo.primaryKeyword, 'bridal henna oil', 'Oil primary keyword must be "bridal henna oil"');
  assert.ok(
    oilSeo.secondaryKeywords.includes('henna oil') ||
    oilSeo.secondaryKeywords.includes('henna mehendi oil') ||
    oilSeo.secondaryKeywords.includes('henna oil for dark stain'),
    'Oil secondary keywords must target henna oil and darkening'
  );
  assert.ok(
    oilSeo.seoTitle.includes('Bridal Henna Oil') && oilSeo.seoTitle.length <= 60,
    `Oil SEO title must be <= 60 chars. Got: "${oilSeo.seoTitle}" (${oilSeo.seoTitle.length} chars)`
  );
  assert.ok(
    oilSeo.metaDescription.length >= 120 && oilSeo.metaDescription.length <= 165,
    `Oil meta description must be between 120-165 chars. Got: ${oilSeo.metaDescription.length} chars`
  );
  assert.ok(
    !oilSeo.metaDescription.toLowerCase().includes('powder'),
    'Bridal Henna Oil meta description must NOT describe the oil as a powder'
  );
  assert.ok(
    !oilSeo.metaDescription.toLowerCase().includes('cure') &&
    !oilSeo.metaDescription.toLowerCase().includes('heal'),
    'Oil SEO metadata must contain ZERO skin cure or healing claims'
  );
  console.log('  ✓ Verified Oil Title:', oilSeo.seoTitle);
  console.log('  ✓ Verified Oil Meta Description:', oilSeo.metaDescription);
  console.log('  ✓ Verified Oil Keywords:', [oilSeo.primaryKeyword, ...oilSeo.secondaryKeywords].join(', '), '\n');

  // ----------------------------------------------------
  // TEST 4: WHOLESALE INTENT ROUTING
  // ----------------------------------------------------
  console.log('Test 4: Wholesale Intent Routing');

  const wholesaleQueries = [
    'bulk henna',
    'buy henna in bulk',
    'bulk indigo',
    'henna powder manufacturer in sojat',
    'wholesale henna',
    'artist price',
    'wholesale indigo',
  ];

  for (const q of wholesaleQueries) {
    const classified = classifySearchIntent(q);
    assert.strictEqual(classified, 'WHOLESALE', `Query "${q}" must classify as WHOLESALE intent`);

    const dest = resolveOrganicDestination({ rawQuery: q });
    assert.strictEqual(dest.primaryUrl, '/wholesale', `Query "${q}" must route to /wholesale`);
    assert.strictEqual(dest.canonicalUrl, 'https://muskydose.in/wholesale', `Query "${q}" canonical must be /wholesale`);
  }
  console.log(`  ✓ Verified: All ${wholesaleQueries.length} wholesale test queries route to /wholesale.\n`);

  // ----------------------------------------------------
  // TEST 5: 3 DRAFT GUIDES (HUMAN APPROVAL REQUIRED)
  // ----------------------------------------------------
  console.log('Test 5: 3 Draft Guides (needsReview = true, published = false)');

  const allGuides = await getGuides();
  const publishedGuides = await getPublishedGuides();

  const expectedSlugs = [
    'how-to-mix-baq-henna-for-dark-bridal-stain',
    'what-is-baq-henna-vs-regular-mehendi-powder',
    'henna-and-indigo-2-step-natural-hair-dye',
  ];

  for (const slug of expectedSlugs) {
    const g = allGuides.find((item) => item.slug === slug);
    assert.ok(g, `Draft guide with slug "${slug}" must exist in database`);
    assert.strictEqual(g!.published, false, `Draft guide "${slug}" must have published = false`);
    assert.ok(
      g!.status === 'NEEDS_REVIEW' || g!.status === 'DRAFT',
      `Draft guide "${slug}" must have status = NEEDS_REVIEW`
    );
    assert.ok(
      Array.isArray(g!.faqs) && g!.faqs.length >= 3,
      `Draft guide "${slug}" must have at least 3 FAQ items ready for schema`
    );
    assert.ok(
      !publishedGuides.some((pub) => pub.slug === slug),
      `Draft guide "${slug}" must NOT appear in public getPublishedGuides()`
    );
    console.log(`  ✓ Draft Guide Verified: "${g!.title}" [published: ${g!.published}, status: ${g!.status}, FAQs: ${g!.faqs?.length}]`);
  }

  console.log('\n====================================================');
  console.log('ALL PHASE 9E GROWTH ACTIONS TESTS PASSED PERFECTLY!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('Test execution failure:', err);
  process.exit(1);
});
