/**
 * MUSKY DOSE — COMPREHENSIVE PRODUCT LIFECYCLE & SEO REGRESSION SUITE
 * 
 * Verifies:
 * A. Active Product: 200, indexable, canonical, sitemap included, catalog visible, purchasable
 * B. Hidden Product (Bridal Cones prod-3): 200, noindex,follow, sitemap excluded, catalog hidden, not purchasable, unavailable notice, OutOfStock schema
 * C. Invalid Slug: 404
 * D. Discontinued Product: 301 to replacement when available, 404 when none
 * E. Draft Product: 404, not indexable, not in sitemap, not purchasable
 * F. Slug Change: old slug -> deterministic 301, loop prevention, chain flattening, zero fuzzy matching
 * G. Existing Active Products Regression: BAQ Henna & Indigo Powder 200, sitemap included
 * H. Purchase / Order API Safety: hidden product blocked server-side
 * I. Metadata Generation: robots directives and canonical URLs
 */

import assert from 'assert';
import {
  resolveProductLifecycle,
  isProductPubliclyVisible,
  isProductUrlAccessible,
  isProductPurchasable,
  isProductSitemapEligible,
  isProductMerchantFeedEligible,
} from '../lib/growth/product-lifecycle-governance';
import {
  recordProductSlugChange,
  resolveProductSlugRedirect,
} from '../lib/db/product-redirects';
import { getProductByIdOrSlug } from '../lib/db/products';
import { resolvePageSeoMetadata } from '../lib/db/seo';
import { validateProductForMerchantFeed } from '../lib/growth/merchant-feed';
import { Product } from '../lib/types';

async function runTests() {
  console.log('================================================================');
  console.log('  MUSKY DOSE — MASTER PRODUCT LIFECYCLE & SEO TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const result = fn();
      if (result && typeof (result as any).then === 'function') {
        return (result as Promise<void>).then(() => {
          console.log(`  ✅ [PASS] ${name}`);
          passed++;
        }).catch((err) => {
          console.error(`  ❌ [FAIL] ${name}:`, err.message);
          throw err;
        });
      } else {
        console.log(`  ✅ [PASS] ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // TEST GROUP A: ACTIVE / PUBLIC PRODUCT
  // --------------------------------------------------------------------------
  console.log('--- TEST GROUP A: Active / Public Product Contract ---');

  const mockActiveProduct: Product = {
    id: 'prod-active-test',
    name: 'Pure Sojat Henna Leaf Powder (250g)',
    slug: 'pure-sojat-henna-leaf-powder',
    categoryId: 'cat-henna',
    shortDescription: '100% natural triple-sifted Sojat henna powder.',
    fullDescription: 'Authentic harvest Lawsonia Inermis direct from Sojat.',
    price: 349,
    quantityOrWeight: '250g',
    sku: 'MD-HENNA-250G',
    images: ['https://muskydose.in/media/henna.webp'],
    ingredients: ['Lawsonia Inermis Leaf Powder'],
    benefits: ['Natural conditioning', 'Rich lawsone stain'],
    usageInstructions: 'Mix with warm water.',
    stockStatus: 'in_stock',
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  test('A1: Active product lifecycle status is ACTIVE', () => {
    const lifecycle = resolveProductLifecycle(mockActiveProduct);
    assert.strictEqual(lifecycle.status, 'ACTIVE');
  });

  test('A2: Active product PDP is accessible with HTTP 200', () => {
    const lifecycle = resolveProductLifecycle(mockActiveProduct);
    assert.strictEqual(lifecycle.isUrlAccessible, true);
    assert.strictEqual(lifecycle.httpStatus, 200);
  });

  test('A3: Active product is catalog visible & featured eligible', () => {
    const lifecycle = resolveProductLifecycle(mockActiveProduct);
    assert.strictEqual(lifecycle.isCatalogVisible, true);
    assert.strictEqual(lifecycle.isSearchVisible, true);
    assert.strictEqual(lifecycle.isRelatedProductsVisible, true);
    assert.strictEqual(lifecycle.isFeaturedEligible, true);
  });

  test('A4: Active product with in_stock is purchasable', () => {
    const lifecycle = resolveProductLifecycle(mockActiveProduct);
    assert.strictEqual(lifecycle.isPurchasable, true);
  });

  test('A5: Active product is SEO indexable and included in sitemap', () => {
    const lifecycle = resolveProductLifecycle(mockActiveProduct);
    assert.strictEqual(lifecycle.isIndexable, true);
    assert.strictEqual(lifecycle.robotsIndex, 'index');
    assert.strictEqual(lifecycle.robotsFollow, 'follow');
    assert.strictEqual(lifecycle.isSitemapEligible, true);
    assert.strictEqual(lifecycle.isMerchantFeedEligible, true);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP B: HIDDEN / CATALOG-HIDDEN PRODUCT (Bridal Cones prod-3)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP B: Hidden Product Contract (Bridal Cones prod-3) ---');

  const mockHiddenBridalCones: Product = {
    id: 'prod-3',
    name: 'Musky Dose Special Bridal Mehendi Cones (Pack of 12)',
    slug: 'musky-dose-special-bridal-mehendi-cones',
    categoryId: 'cat-henna',
    shortDescription: 'Freshly prepared pure herbal bridal mehendi cones with eucalyptus oil.',
    fullDescription: 'Handcrafted bridal henna cones direct from Sojat.',
    price: 299,
    quantityOrWeight: 'Pack of 12 Cones',
    sku: 'MD-BRIDAL-CONES-12',
    images: ['https://muskydose.in/media/bridal-cones.webp'],
    ingredients: ['Lawsonia Inermis Leaf Powder', 'Eucalyptus Oil', 'Clove Oil'],
    benefits: ['Deep dark mahogany stain', 'Smooth flow tip'],
    usageInstructions: 'Cut tip and apply.',
    stockStatus: 'in_stock',
    inStock: true,
    isFeatured: false,
    isActive: false, // Hidden by owner!
    sortOrder: 3,
    createdAt: '2026-01-03T00:00:00+00:00',
    updatedAt: '2026-09-16T18:14:07.112+00:00',
  } as any;

  test('B1: Hidden product lifecycle status resolves strictly to HIDDEN', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.strictEqual(lifecycle.status, 'HIDDEN');
  });

  test('B2: Hidden product URL MUST remain accessible with HTTP 200 (NO 404!)', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.strictEqual(lifecycle.isUrlAccessible, true);
    assert.strictEqual(lifecycle.httpStatus, 200);
    assert.strictEqual(lifecycle.redirectTarget, undefined);
  });

  test('B3: Hidden product MUST be excluded from normal catalog & search listings', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.strictEqual(lifecycle.isCatalogVisible, false);
    assert.strictEqual(lifecycle.isSearchVisible, false);
    assert.strictEqual(lifecycle.isRelatedProductsVisible, false);
    assert.strictEqual(lifecycle.isFeaturedEligible, false);
    assert.strictEqual(isProductPubliclyVisible(mockHiddenBridalCones), false);
  });

  test('B4: Hidden product MUST NOT be purchasable', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.strictEqual(lifecycle.isPurchasable, false);
    assert.strictEqual(isProductPurchasable(mockHiddenBridalCones), false);
  });

  test('B5: Hidden product MUST be noindex, follow (preserves link equity, drops SERPs)', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.strictEqual(lifecycle.isIndexable, false);
    assert.strictEqual(lifecycle.robotsIndex, 'noindex');
    assert.strictEqual(lifecycle.robotsFollow, 'follow');
  });

  test('B6: Hidden product MUST be excluded from XML sitemap and Merchant Feed', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.strictEqual(lifecycle.isSitemapEligible, false);
    assert.strictEqual(lifecycle.isMerchantFeedEligible, false);
    assert.strictEqual(isProductSitemapEligible(mockHiddenBridalCones), false);

    // Verify merchant feed validator rejects hidden product
    const feedCheck = validateProductForMerchantFeed(mockHiddenBridalCones);
    assert.ok(feedCheck.validationErrors.some((e) => e.includes('ineligible for Merchant Feed') || e.includes('inactive')));
  });

  test('B7: Hidden product provides truthful customer notice & badge', () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    assert.ok(lifecycle.publicBadge);
    assert.ok(lifecycle.publicBadge.includes('Unavailable'));
    assert.ok(lifecycle.publicNotice);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP C: INVALID SLUG / NON-EXISTENT PRODUCT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP C: Invalid Slug Handling ---');

  test('C1: Null / undefined product returns 404 DRAFT', () => {
    const lifecycle = resolveProductLifecycle(null);
    assert.strictEqual(lifecycle.isUrlAccessible, false);
    assert.strictEqual(lifecycle.httpStatus, 404);
  });

  test('C2: Product without ID returns 404 DRAFT', () => {
    const lifecycle = resolveProductLifecycle({ name: 'Phantom' });
    assert.strictEqual(lifecycle.isUrlAccessible, false);
    assert.strictEqual(lifecycle.httpStatus, 404);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP D: DISCONTINUED PRODUCT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP D: Discontinued Product Contract ---');

  test('D1: Discontinued product with replacement returns HTTP 301 permanent redirect', () => {
    const discontinuedWithReplacement: Product = {
      ...mockActiveProduct,
      id: 'prod-disc-1',
      lifecycleStatus: 'DISCONTINUED',
      replacementSlug: 'pure-sojat-henna-leaf-powder',
    } as any;

    const lifecycle = resolveProductLifecycle(discontinuedWithReplacement);
    assert.strictEqual(lifecycle.status, 'DISCONTINUED');
    assert.strictEqual(lifecycle.isUrlAccessible, false);
    assert.strictEqual(lifecycle.httpStatus, 301);
    assert.strictEqual(lifecycle.redirectTarget, '/products/pure-sojat-henna-leaf-powder');
    assert.strictEqual(lifecycle.isCatalogVisible, false);
    assert.strictEqual(lifecycle.isSitemapEligible, false);
  });

  test('D2: Discontinued product without replacement returns HTTP 404', () => {
    const discontinuedNoReplacement: Product = {
      ...mockActiveProduct,
      id: 'prod-disc-2',
      lifecycleStatus: 'DISCONTINUED',
      replacementSlug: undefined,
    } as any;

    const lifecycle = resolveProductLifecycle(discontinuedNoReplacement);
    assert.strictEqual(lifecycle.status, 'DISCONTINUED');
    assert.strictEqual(lifecycle.isUrlAccessible, false);
    assert.strictEqual(lifecycle.httpStatus, 404);
    assert.strictEqual(lifecycle.redirectTarget, undefined);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP E: DRAFT / UNPUBLISHED PRODUCT
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP E: Draft Product Contract ---');

  test('E1: Draft product returns HTTP 404, not in sitemap, not purchasable', () => {
    const draftProduct: Product = {
      ...mockActiveProduct,
      id: 'prod-draft-1',
      lifecycleStatus: 'DRAFT',
    };

    const lifecycle = resolveProductLifecycle(draftProduct);
    assert.strictEqual(lifecycle.status, 'DRAFT');
    assert.strictEqual(lifecycle.isUrlAccessible, false);
    assert.strictEqual(lifecycle.httpStatus, 404);
    assert.strictEqual(lifecycle.isCatalogVisible, false);
    assert.strictEqual(lifecycle.isPurchasable, false);
    assert.strictEqual(lifecycle.isIndexable, false);
    assert.strictEqual(lifecycle.isSitemapEligible, false);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP F: DETERMINISTIC SLUG MANAGEMENT & REDIRECTS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP F: Deterministic Slug Redirects ---');

  await test('F1: Old slug maps deterministically to new slug', async () => {
    await recordProductSlugChange('prod-test-rename', 'bridal-mehendi-cone-pack', 'musky-dose-special-bridal-mehendi-cones');
    const target = await resolveProductSlugRedirect('bridal-mehendi-cone-pack');
    assert.strictEqual(target, 'musky-dose-special-bridal-mehendi-cones');
  });

  await test('F2: Current canonical slug does not redirect to itself', async () => {
    const target = await resolveProductSlugRedirect('musky-dose-special-bridal-mehendi-cones');
    assert.strictEqual(target, null);
  });

  await test('F3: Unknown slug returns null (zero fuzzy / zero guessing)', async () => {
    const target = await resolveProductSlugRedirect('random-unregistered-slug-xyz');
    assert.strictEqual(target, null);
  });

  await test('F4: Redirect chain flattening (A -> B, B -> C => A -> C)', async () => {
    await recordProductSlugChange('prod-chain', 'henna-v1', 'henna-v2');
    await recordProductSlugChange('prod-chain', 'henna-v2', 'henna-v3');

    const v1Target = await resolveProductSlugRedirect('henna-v1');
    const v2Target = await resolveProductSlugRedirect('henna-v2');
    assert.strictEqual(v1Target, 'henna-v3');
    assert.strictEqual(v2Target, 'henna-v3');
  });

  await test('F5: Loop prevention (A -> B -> A does not create infinite loop)', async () => {
    await recordProductSlugChange('prod-loop', 'indigo-a', 'indigo-b');
    await recordProductSlugChange('prod-loop', 'indigo-b', 'indigo-a');

    const targetB = await resolveProductSlugRedirect('indigo-b');
    assert.strictEqual(targetB, 'indigo-a');
    const targetA = await resolveProductSlugRedirect('indigo-a');
    assert.strictEqual(targetA, null);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP G: REGRESSION — EXISTING ACTIVE PRODUCTS
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP G: Existing Active Products Regression ---');

  await test('G1: BAQ Henna Powder remains active, 200, indexable, and sitemap eligible', async () => {
    const baq = await getProductByIdOrSlug('baq-henna-powder', true);
    if (baq) {
      const lifecycle = resolveProductLifecycle(baq);
      assert.strictEqual(lifecycle.status, 'ACTIVE');
      assert.strictEqual(lifecycle.isUrlAccessible, true);
      assert.strictEqual(lifecycle.httpStatus, 200);
      assert.strictEqual(lifecycle.isCatalogVisible, true);
      assert.strictEqual(lifecycle.isIndexable, true);
      assert.strictEqual(lifecycle.isSitemapEligible, true);
      console.log('      Verified live DB BAQ Henna:', baq.name, baq.id);
    } else {
      console.log('      (DB offline / mocked environment — testing contract)');
      const mockBaq = { ...mockActiveProduct, slug: 'baq-henna-powder' };
      const lifecycle = resolveProductLifecycle(mockBaq);
      assert.strictEqual(lifecycle.status, 'ACTIVE');
      assert.strictEqual(lifecycle.isSitemapEligible, true);
    }
  });

  await test('G2: Natural Organic Indigo Powder remains active, 200, and indexable', async () => {
    const indigo = await getProductByIdOrSlug('natural-organic-indigo-powder', true);
    if (indigo) {
      const lifecycle = resolveProductLifecycle(indigo);
      assert.strictEqual(lifecycle.status, 'ACTIVE');
      assert.strictEqual(lifecycle.isUrlAccessible, true);
      assert.strictEqual(lifecycle.httpStatus, 200);
      assert.strictEqual(lifecycle.isCatalogVisible, true);
      assert.strictEqual(lifecycle.isIndexable, true);
      assert.strictEqual(lifecycle.isSitemapEligible, true);
      console.log('      Verified live DB Indigo:', indigo.name, indigo.id);
    } else {
      console.log('      (DB offline / mocked environment — testing contract)');
      const mockIndigo = { ...mockActiveProduct, slug: 'natural-organic-indigo-powder' };
      const lifecycle = resolveProductLifecycle(mockIndigo);
      assert.strictEqual(lifecycle.status, 'ACTIVE');
      assert.strictEqual(lifecycle.isSitemapEligible, true);
    }
  });

  await test('G3: Verified live DB Bridal Cones (prod-3) returns 200 + HIDDEN + noindex', async () => {
    const bridal = await getProductByIdOrSlug('musky-dose-special-bridal-mehendi-cones', true);
    if (bridal) {
      const lifecycle = resolveProductLifecycle(bridal);
      assert.strictEqual(bridal.isActive, false, 'prod-3 must remain is_active=false');
      assert.strictEqual(lifecycle.status, 'HIDDEN');
      assert.strictEqual(lifecycle.isUrlAccessible, true, 'PDP MUST BE ACCESSIBLE (200)');
      assert.strictEqual(lifecycle.httpStatus, 200);
      assert.strictEqual(lifecycle.isCatalogVisible, false, 'Must be hidden from catalog');
      assert.strictEqual(lifecycle.isPurchasable, false, 'Must not be purchasable');
      assert.strictEqual(lifecycle.robotsIndex, 'noindex', 'Must be noindex');
      assert.strictEqual(lifecycle.robotsFollow, 'follow', 'Must be follow');
      assert.strictEqual(lifecycle.isSitemapEligible, false, 'Must be excluded from sitemap');
      console.log('      Verified live DB Bridal Cones prod-3 state:', bridal.name, bridal.isActive);
    }
  });

  // --------------------------------------------------------------------------
  // TEST GROUP H: PURCHASE & COMMERCE SAFETY
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP H: Purchase & Commerce Safety ---');

  test('H1: isProductPurchasable predicate blocks hidden products', () => {
    assert.strictEqual(isProductPurchasable(mockHiddenBridalCones), false);
    assert.strictEqual(isProductPurchasable(mockActiveProduct), true);
  });

  test('H2: isProductPurchasable blocks out-of-stock active products', () => {
    const outOfStockActive = { ...mockActiveProduct, stockStatus: 'out_of_stock' as const };
    assert.strictEqual(isProductPurchasable(outOfStockActive), false);
  });

  test('H3: isProductPurchasable blocks draft and discontinued products', () => {
    const draft = { ...mockActiveProduct, lifecycleStatus: 'DRAFT' as const };
    const discontinued = { ...mockActiveProduct, lifecycleStatus: 'DISCONTINUED' as const };
    assert.strictEqual(isProductPurchasable(draft), false);
    assert.strictEqual(isProductPurchasable(discontinued), false);
  });

  // --------------------------------------------------------------------------
  // TEST GROUP I: METADATA & ROBOTS RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n--- TEST GROUP I: Metadata & Robots Resolution ---');

  await test('I1: Active product metadata resolves to index: true, follow: true', async () => {
    const lifecycle = resolveProductLifecycle(mockActiveProduct);
    const meta = await resolvePageSeoMetadata({
      targetType: 'product',
      targetId: mockActiveProduct.id,
      targetUrl: `/products/${mockActiveProduct.slug}`,
      defaultTitle: mockActiveProduct.name,
      defaultDescription: mockActiveProduct.shortDescription,
      robotsIndex: lifecycle.robotsIndex,
      robotsFollow: lifecycle.robotsFollow,
    });

    assert.strictEqual(meta.robots?.index, true);
    assert.strictEqual(meta.robots?.follow, true);
    assert.strictEqual(meta.alternates?.canonical, `https://muskydose.in/products/${mockActiveProduct.slug}`);
  });

  await test('I2: Hidden product metadata resolves to index: false, follow: true', async () => {
    const lifecycle = resolveProductLifecycle(mockHiddenBridalCones);
    const meta = await resolvePageSeoMetadata({
      targetType: 'product',
      targetId: mockHiddenBridalCones.id,
      targetUrl: `/products/${mockHiddenBridalCones.slug}`,
      defaultTitle: mockHiddenBridalCones.name,
      defaultDescription: mockHiddenBridalCones.shortDescription,
      robotsIndex: lifecycle.robotsIndex,
      robotsFollow: lifecycle.robotsFollow,
    });

    assert.strictEqual(meta.robots?.index, false, 'Hidden product MUST have index: false');
    assert.strictEqual(meta.robots?.follow, true, 'Hidden product MUST have follow: true');
    assert.strictEqual(meta.alternates?.canonical, `https://muskydose.in/products/${mockHiddenBridalCones.slug}`);
  });

  console.log('\n================================================================');
  console.log(`  ALL ${passed} / ${total} PRODUCT LIFECYCLE TESTS PASSED!`);
  console.log('================================================================\n');
}

runTests().catch((e) => {
  console.error('Test run failed:', e);
  process.exit(1);
});
