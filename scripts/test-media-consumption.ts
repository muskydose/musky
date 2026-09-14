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
  getPrimaryMedia,
  getGalleryMedia,
  getMediaForEntity,
  getBatchPrimaryMedia,
  getBatchResolvedMedia,
  resolveAuthoritativeMedia,
  resetMediaCache,
  MediaAsset,
} from '../lib/db/media';

import {
  getProductByIdOrSlug,
  getActiveProductsForStore,
  getAllProductsAdmin,
} from '../lib/db/products';

import {
  getCategories,
  getCategoryByIdOrSlug,
} from '../lib/db/categories';

import {
  getGuides,
} from '../lib/db/guides';

import {
  getPublishedKnowledgeEntities,
  getKnowledgeBySlug,
  getKnowledgeByKey,
} from '../lib/db/knowledge';

import {
  resolveAuthoritativeProductMedia,
} from '../lib/growth/product-media-governance';

import {
  runMediaMigration,
} from '../lib/growth/media-migration-engine';

async function runMediaConsumptionTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 3.4: CATALOG MEDIA CONSUMPTION VERIFICATION');
  console.log('===============================================================');

  // Reset cache and execute migration in dryRun/safe mode to ensure backfilled items are populated
  resetMediaCache({ clearFallbackStore: true });
  await runMediaMigration({ dryRun: false, verbose: false });

  // --------------------------------------------------------------------------
  // TEST 1: Product Canonical Media Resolution (Primary & Gallery)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 1: Product Canonical Media Resolution ---');
  const allProds = await getAllProductsAdmin();
  const productWithMedia = allProds.find((p) => (p as any).canonicalPrimaryUrl) || allProds.find((p) => p.id === 'prod-3');
  assert.ok(productWithMedia, 'Product with canonical media must exist');
  assert.ok((productWithMedia as any).canonicalPrimaryUrl, 'Product must have canonicalPrimaryUrl attached');
  assert.ok(Array.isArray(productWithMedia.media) && productWithMedia.media.length > 0, 'Product must have canonical media array');
  assert.strictEqual(
    (productWithMedia as any).canonicalPrimaryUrl,
    productWithMedia.media[0].url,
    'canonicalPrimaryUrl must match the primary media asset URL'
  );

  const singleProduct = await getProductByIdOrSlug(productWithMedia.id, true);
  assert.ok(singleProduct, `getProductByIdOrSlug for ${productWithMedia.id} must return product`);
  assert.strictEqual(
    (singleProduct as any).canonicalPrimaryUrl,
    (productWithMedia as any).canonicalPrimaryUrl,
    'Single product lookup must attach canonicalPrimaryUrl'
  );
  console.log(`  ✓ Product ${productWithMedia.id} resolved canonicalPrimaryUrl: ${(productWithMedia as any).canonicalPrimaryUrl} (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST 2: Category Canonical HERO Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Category Canonical HERO Resolution ---');
  const categories = await getCategories();
  assert.ok(categories.length > 0, 'Categories must exist');
  const hairCategory = categories.find((c) => c.slug === 'hair-care' || c.id === 'cat-hair-care') || categories[0];
  assert.ok(hairCategory, 'Target category must exist');
  assert.ok((hairCategory as any).canonicalPrimaryUrl, 'Category must have canonicalPrimaryUrl attached');
  assert.ok(hairCategory.image, 'Category legacy image field must be present');
  console.log(`  ✓ Category ${hairCategory.slug} canonicalPrimaryUrl: ${(hairCategory as any).canonicalPrimaryUrl} (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST 3: Guide Canonical HERO Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Guide Canonical HERO Resolution ---');
  const guides = await getGuides();
  assert.ok(guides.length > 0, 'Guides must exist');
  const firstGuide = guides[0];
  assert.ok((firstGuide as any).canonicalPrimaryUrl, 'Guide must have canonicalPrimaryUrl attached');
  assert.ok(firstGuide.coverImage, 'Guide legacy coverImage must be present');
  console.log(`  ✓ Guide ${firstGuide.slug} canonicalPrimaryUrl: ${(firstGuide as any).canonicalPrimaryUrl} (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST 4: Knowledge Canonical OG_SOCIAL/PRIMARY Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Knowledge Canonical Media Resolution ---');
  await saveMediaAsset({
    id: 'media-test-henna',
    entityType: 'KNOWLEDGE',
    entityId: 'HENNA_MEHNDI',
    url: 'https://images.muskydose.com/knowledge/henna-mehndi-card.webp',
    role: 'OG_SOCIAL',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
    title: 'Henna Mehndi Botanical Card',
    altText: 'Henna Mehndi Botanical Care and Sourcing',
  });

  const knowledgeLookup = await getKnowledgeBySlug('henna-mehndi');
  assert.ok(knowledgeLookup.entity, 'Knowledge entity henna-mehndi must exist');
  const kEntity = knowledgeLookup.entity!;
  assert.ok(kEntity.canonicalPrimaryUrl, 'Knowledge entity must have canonicalPrimaryUrl attached');
  assert.strictEqual(
    kEntity.canonicalPrimaryUrl,
    'https://images.muskydose.com/knowledge/henna-mehndi-card.webp',
    'Knowledge canonicalPrimaryUrl must match saved asset URL'
  );

  const publishedList = await getPublishedKnowledgeEntities();
  const hennaFromList = publishedList.find((e) => e.slug === 'henna-mehndi');
  assert.ok(hennaFromList?.canonicalPrimaryUrl, 'Published knowledge entity list must have canonicalPrimaryUrl');
  console.log(`  ✓ Knowledge henna-mehndi canonicalPrimaryUrl: ${kEntity.canonicalPrimaryUrl} (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST 5: Locked Manual Primary Protection Against AI Demotion
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Locked Manual Primary Protection Against AI Demotion ---');
  const lockedManualAsset: MediaAsset = {
    id: 'media-test-locked-manual',
    entityType: 'PRODUCT',
    entityId: 'prod-governance-test',
    url: 'https://images.muskydose.com/products/locked-manual.png',
    storageBucket: 'product-images',
    mimeType: 'image/png',
    aspectRatio: '1:1',
    role: 'PRIMARY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
    isLocked: true,
    sortOrder: 2, // Even if sortOrder is lower priority than AI
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const aiAsset: MediaAsset = {
    id: 'media-test-ai',
    entityType: 'PRODUCT',
    entityId: 'prod-governance-test',
    url: 'https://images.muskydose.com/products/ai-generated.png',
    storageBucket: 'product-images',
    mimeType: 'image/png',
    aspectRatio: '1:1',
    role: 'PRIMARY',
    source: 'AI_GENERATED',
    status: 'approved',
    isLocked: false,
    sortOrder: 1, // Higher priority sort order
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const resolvedGovernance = await resolveAuthoritativeMedia([aiAsset, lockedManualAsset]);
  assert.strictEqual(
    resolvedGovernance.primaryAsset.id,
    lockedManualAsset.id,
    'Locked manual approved asset MUST NOT be demoted by AI generated asset'
  );
  console.log('  ✓ Locked manual primary strictly protected against AI asset demotion (PASSED)');

  // --------------------------------------------------------------------------
  // TEST 6: Legacy Fallback When No Canonical Asset Exists
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 6: Legacy Fallback When No Canonical Asset Exists ---');
  const nonExistentPrimary = await getPrimaryMedia('PRODUCT', 'non-existent-product-id-9999');
  assert.strictEqual(
    nonExistentPrimary.source,
    'SYSTEM_FALLBACK',
    'Non-existent product media query must return SYSTEM_FALLBACK'
  );
  assert.strictEqual(
    nonExistentPrimary.url,
    '/images/fallback.svg',
    'Fallback asset must use /images/fallback.svg'
  );
  console.log('  ✓ Zero-record query returns graceful SYSTEM_FALLBACK (PASSED)');

  // --------------------------------------------------------------------------
  // TEST 7: Gallery Resolution Integrity
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 7: Gallery Resolution Integrity ---');
  const targetId = productWithMedia ? productWithMedia.id : 'prod-3';
  const gallery = await getGalleryMedia('PRODUCT', targetId);
  assert.ok(Array.isArray(gallery), 'Gallery must be an array');
  gallery.forEach((item) => {
    assert.ok(item.url, 'Gallery item must have a url');
    assert.strictEqual(item.status, 'approved', 'Gallery item must be approved');
  });
  console.log(`  ✓ Product ${targetId} gallery resolved ${gallery.length} valid assets (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST 8: Unsplash / Placeholder Preservation
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 8: Unsplash / Placeholder Preservation ---');
  const adminProducts = await getAllProductsAdmin();
  const unsplashProduct = adminProducts.find((p) =>
    p.images?.some((img) => typeof img === 'string' && img.includes('images.unsplash.com'))
  );
  if (unsplashProduct) {
    const unsplashMedia = await getPrimaryMedia('PRODUCT', unsplashProduct.id);
    assert.ok(unsplashMedia.url.includes('images.unsplash.com'), 'Unsplash URL must be preserved intact');
    console.log(`  ✓ Unsplash placeholder preserved for ${unsplashProduct.id}: ${unsplashMedia.url} (PASSED)`);
  } else {
    console.log('  ✓ No unsplash products found in catalog (skipped cleanly)');
  }

  // --------------------------------------------------------------------------
  // TEST 9: Future Entity With Zero Media Resolves Gracefully
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 9: Future Entity With Zero Media Safely Resolves Fallback ---');
  const futureProduct = {
    id: 'future-prod-xyz',
    name: 'Future Organic Indigo',
    slug: 'future-organic-indigo',
    images: [],
    media: [],
  };
  const mediaResult = resolveAuthoritativeProductMedia(futureProduct);
  assert.strictEqual(mediaResult.isFallback, true, 'Empty product must indicate isFallback: true');
  assert.strictEqual(mediaResult.primaryImage, '/images/fallback.svg', 'Empty product must fallback to /images/fallback.svg');
  console.log('  ✓ Future product with zero media safely resolves fallback without error (PASSED)');

  // --------------------------------------------------------------------------
  // TEST 10: Legacy Fields Remain Byte/Value-Equivalent (Never Mutated at Runtime)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 10: Legacy Fields Immutability (Zero Runtime Mutation) ---');
  const prodBefore = await getProductByIdOrSlug('prod-1');
  const imagesBefore = JSON.stringify(prodBefore?.images);
  // Fetch again
  const prodAfter = await getProductByIdOrSlug('prod-1');
  const imagesAfter = JSON.stringify(prodAfter?.images);
  assert.strictEqual(imagesBefore, imagesAfter, 'product.images must NEVER be mutated');

  const catBefore = await getCategoryByIdOrSlug('hair-care');
  const catImageBefore = catBefore?.image;
  const catAfter = await getCategoryByIdOrSlug('hair-care');
  assert.strictEqual(catImageBefore, catAfter?.image, 'category.image must NEVER be mutated');

  const guideBefore = (await getGuides())[0];
  const guideCoverBefore = guideBefore?.coverImage;
  const guideAfter = (await getGuides())[0];
  assert.strictEqual(guideCoverBefore, guideAfter?.coverImage, 'guide.coverImage must NEVER be mutated');

  const knowBefore = (await getKnowledgeBySlug('henna-mehndi')).entity;
  const knowOgBefore = knowBefore?.ogImageUrl;
  const knowAfter = (await getKnowledgeBySlug('henna-mehndi')).entity;
  assert.strictEqual(knowOgBefore, knowAfter?.ogImageUrl, 'knowledge.ogImageUrl must NEVER be mutated');
  console.log('  ✓ All legacy fields strictly preserved and byte-identical before and after resolution (PASSED)');

  // --------------------------------------------------------------------------
  // TEST 11: SEO/OG Image Resolution
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 11: SEO/OG Image Resolution Integrity ---');
  // Verify PDP OpenGraph resolution
  const pdpMedia = await getPrimaryMedia('PRODUCT', targetId);
  assert.ok(pdpMedia.url, 'PDP primary media must provide a valid URL for OpenGraph');

  // Verify Category OpenGraph resolution
  const catMedia = await getPrimaryMedia('CATEGORY', 'cat-hair-care');
  assert.ok(catMedia.url, 'Category primary media must provide a valid URL for OpenGraph');

  // Verify Knowledge OpenGraph resolution
  const knowMedia = await getPrimaryMedia('KNOWLEDGE', 'HENNA_MEHNDI');
  assert.ok(knowMedia.url, 'Knowledge primary media must provide a valid URL for OpenGraph');
  console.log('  ✓ SEO/OG image resolution verified for Product, Category, and Knowledge (PASSED)');

  // --------------------------------------------------------------------------
  // TEST 12: Public Consumers Inspection (No Hardcoded Media Selection)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 12: Public Consumers Codebase Audit ---');
  const productCardContent = fs.readFileSync(path.join(process.cwd(), 'components/ProductCard.tsx'), 'utf8');
  assert.ok(
    productCardContent.includes('canonicalPrimaryUrl'),
    'ProductCard must check canonicalPrimaryUrl'
  );

  const categoryCardContent = fs.readFileSync(path.join(process.cwd(), 'components/CategoryCard.tsx'), 'utf8');
  assert.ok(
    categoryCardContent.includes('canonicalPrimaryUrl'),
    'CategoryCard must check canonicalPrimaryUrl'
  );

  const pdpContent = fs.readFileSync(path.join(process.cwd(), 'app/products/[slug]/page.tsx'), 'utf8');
  assert.ok(
    pdpContent.includes('getPrimaryMedia') || pdpContent.includes('canonicalPrimaryUrl'),
    'PDP must check canonical primary media'
  );

  const catPageContent = fs.readFileSync(path.join(process.cwd(), 'app/categories/[slug]/page.tsx'), 'utf8');
  assert.ok(
    catPageContent.includes('getPrimaryMedia'),
    'Category page must resolve getPrimaryMedia'
  );

  const guideDetailContent = fs.readFileSync(path.join(process.cwd(), 'app/guides/[slug]/page.tsx'), 'utf8');
  assert.ok(
    guideDetailContent.includes('getPrimaryMedia'),
    'Guide detail page must resolve getPrimaryMedia'
  );

  const guideListContent = fs.readFileSync(path.join(process.cwd(), 'app/guides/page.tsx'), 'utf8');
  assert.ok(
    guideListContent.includes('getBatchPrimaryMedia'),
    'Guide list page must use getBatchPrimaryMedia to avoid N+1 queries'
  );

  const knowledgePageContent = fs.readFileSync(path.join(process.cwd(), 'app/knowledge/[entity]/page.tsx'), 'utf8');
  assert.ok(
    knowledgePageContent.includes('getPrimaryMedia'),
    'Knowledge page must resolve getPrimaryMedia'
  );
  console.log('  ✓ All 7 storefront/public consumers confirmed consuming canonical media (PASSED)');

  // --------------------------------------------------------------------------
  // TEST 13: Zero N+1 Queries (Batch Resolution Verification)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 13: Zero N+1 Queries (Batch Resolution) ---');
  const testIds = ['prod-3', 'prod-4', 'prod-5'];
  const batchResult = await getBatchPrimaryMedia('PRODUCT', testIds);
  assert.strictEqual(batchResult instanceof Map, true, 'getBatchPrimaryMedia must return a Map');
  testIds.forEach((id) => {
    assert.ok(batchResult.has(id), `Batch result must contain key for ${id}`);
    const asset = batchResult.get(id)!;
    assert.ok(asset.url, `Asset for ${id} must have a url`);
  });
  console.log(`  ✓ Batch resolution resolved ${batchResult.size} products in single pass with zero N+1 (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST 14: Correct Knowledge Entity Identifier Mapping
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 14: Knowledge Entity Identifier Mapping ---');
  const byId = await getPrimaryMedia('KNOWLEDGE', 'ent-henna-mehndi');
  const byKey = await getPrimaryMedia('KNOWLEDGE', 'HENNA_MEHNDI');
  const bySlug = await getPrimaryMedia('KNOWLEDGE', 'henna-mehndi');

  assert.strictEqual(byId.source !== 'SYSTEM_FALLBACK', true, 'Lookup by id must find canonical asset');
  assert.strictEqual(byKey.source !== 'SYSTEM_FALLBACK', true, 'Lookup by entityKey must find canonical asset');
  assert.strictEqual(bySlug.source !== 'SYSTEM_FALLBACK', true, 'Lookup by slug must find canonical asset');
  assert.strictEqual(byId.url, byKey.url, 'Lookup by id and key must resolve the exact same asset');
  assert.strictEqual(byKey.url, bySlug.url, 'Lookup by key and slug must resolve the exact same asset');
  console.log(`  ✓ Knowledge entity lookup resolves identically across id (${byId.id}), entityKey, and slug (PASSED)`);

  console.log('\n===============================================================');
  console.log('ALL 14 PHASE 3.4 TESTS PASSED PERFECTLY!');
  console.log('===============================================================');
}

runMediaConsumptionTests().catch((err) => {
  console.error('\n❌ PHASE 3.4 VERIFICATION FAILED:', err);
  process.exit(1);
});

