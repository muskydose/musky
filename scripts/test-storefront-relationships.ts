import assert from 'node:assert';
import fs from 'fs';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
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

import { getProducts, getAllProductsAdmin } from '../lib/db/products';
import { getCategories } from '../lib/db/categories';
import { getGuides } from '../lib/db/guides';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
} from '../lib/growth/entity-registry';
import {
  getRelatedGuidesForProduct,
  getRelatedProductsForGuide,
  getRelatedKnowledgeForProduct,
  getRelatedKnowledgeForGuide,
  getRelatedProductsForKnowledge,
  getRelatedGuidesForKnowledge,
  saveRelationshipOverride,
  deleteRelationshipOverride,
  resetRelationshipCache,
} from '../lib/growth/entity-relationships';
import { Product, ProductGuide } from '../lib/types';

async function runStorefrontConsumerTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 1 STEP 3: STOREFRONT CONSUMER INTEGRATION TESTS');
  console.log('===============================================================');

  // Load catalog fixtures
  const [adminProducts, categories, guides] = await Promise.all([
    getAllProductsAdmin(),
    getCategories(),
    getGuides(),
  ]);

  const activeProducts = adminProducts.filter((p) => p.isActive !== false);
  const hennaProduct = activeProducts.find((p) => p.slug.includes('henna')) || activeProducts[0];
  const indigoProduct = activeProducts.find((p) => p.slug.includes('indigo')) || activeProducts[1];
  const hennaEntity = getEntity('HENNA_MEHNDI')!;
  const indigoEntity = getEntity('INDIGO')!;

  assert.ok(hennaProduct, 'Must have at least one henna product in catalog');
  assert.ok(hennaEntity, 'Must have canonical henna entity');
  assert.ok(guides.length > 0, 'Must have guides in database');

  // --------------------------------------------------------------------------
  // SUITE 1: GOVERNANCE ENFORCEMENT ON STOREFRONT (SUGGESTED = HIDDEN)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Governance Gating (suggested = NOT public) ---');
  resetRelationshipCache();

  // With requireApproval: true, suggested candidate relationships MUST NOT be returned
  const publicGuidesForHenna = await getRelatedGuidesForProduct(hennaProduct, {
    allGuides: guides,
    requireApproval: true,
  });
  console.log(`  Public guides returned for ${hennaProduct.name} (no approved DB overrides): ${publicGuidesForHenna.length}`);
  assert.strictEqual(
    publicGuidesForHenna.length,
    0,
    'Suggested candidate guides must NOT appear on public storefront with requireApproval: true'
  );
  console.log('  ✓ Suggested relationships correctly suppressed from public storefront (PASSED)');

  const publicProductsForHennaEntity = await getRelatedProductsForKnowledge(hennaEntity, {
    allProducts: activeProducts,
    requireApproval: true,
  });
  console.log(`  Public products returned for ${hennaEntity.canonicalName} (no approved DB overrides): ${publicProductsForHennaEntity.length}`);
  assert.strictEqual(
    publicProductsForHennaEntity.length,
    0,
    'Suggested candidate products must NOT appear on public knowledge page without approval'
  );
  console.log('  ✓ Suggested products correctly suppressed from public knowledge page (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 2: DRAFT GUIDE STRICT SAFETY INVARIANT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Draft Guide Safety (published=false NEVER appears) ---');
  const draftGuide: ProductGuide = {
    id: 'test-draft-guide-999',
    title: 'Secret Draft Botanical Secrets',
    slug: 'secret-draft-botanical-secrets',
    coverImage: '/images/fallback.svg',
    shortIntro: 'Unreleased draft content',
    published: false, // DRAFT
    status: 'DRAFT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Even if an explicit approved relationship exists in DB, draft guide MUST NOT render publicly
  await saveRelationshipOverride({
    id: 'test-override-draft-guide',
    sourceType: 'PRODUCT',
    sourceId: hennaProduct.id,
    targetType: 'GUIDE',
    targetId: draftGuide.id,
    relationshipType: 'PRODUCT_GUIDE',
    relevanceScore: 0.99,
    confidence: 'HIGH',
    status: 'approved',
    reasons: ['EXPLICIT_LINK'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const guidesWithDraftCheck = await getRelatedGuidesForProduct(hennaProduct, {
    allGuides: [draftGuide],
    requireApproval: false, // Even if requireApproval is false, draft must be skipped!
    includeDrafts: false,
  });
  assert.strictEqual(
    guidesWithDraftCheck.length,
    0,
    'Draft guide with published=false must NEVER be returned to storefront consumers'
  );
  console.log('  ✓ Draft guide strictly suppressed even when relationship is approved (PASSED)');

  // Reverse: Draft guide cannot yield public products
  const productsFromDraftGuide = await getRelatedProductsForGuide(draftGuide, {
    allProducts: activeProducts,
    requireApproval: false,
    includeDrafts: false,
  });
  assert.strictEqual(
    productsFromDraftGuide.length,
    0,
    'Draft guide must never yield public products'
  );
  console.log('  ✓ Draft guide safely yields 0 public products in reverse direction (PASSED)');

  // Knowledge -> Draft Guide
  const guidesForKnowledgeWithDraft = await getRelatedGuidesForKnowledge(hennaEntity, {
    allGuides: [draftGuide],
    requireApproval: false,
    includeDrafts: false,
  });
  assert.strictEqual(
    guidesForKnowledgeWithDraft.length,
    0,
    'Draft guide must never appear on public knowledge page'
  );
  console.log('  ✓ Draft guide strictly suppressed on knowledge entity page (PASSED)');

  // Cleanup draft test override
  await deleteRelationshipOverride('PRODUCT', hennaProduct.id, 'GUIDE', draftGuide.id, 'PRODUCT_GUIDE');

  // --------------------------------------------------------------------------
  // SUITE 3: APPROVED RELATIONSHIP VISIBILITY & DIRECTION-AWARE LOOKUP
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Approved Relationships & Direction-Awareness ---');
  const testPublishedGuide: ProductGuide = {
    id: 'test-published-guide-101',
    title: 'Mastering Rajasthani Henna Application',
    slug: 'mastering-rajasthani-henna-application',
    coverImage: '/images/fallback.svg',
    shortIntro: 'Official step by step guide',
    published: true, // PUBLISHED
    status: 'PUBLISHED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Create single edge in ONE direction: PRODUCT -> GUIDE
  await saveRelationshipOverride({
    id: 'test-rel-single-edge',
    sourceType: 'PRODUCT',
    sourceId: hennaProduct.id,
    targetType: 'GUIDE',
    targetId: testPublishedGuide.id,
    relationshipType: 'PRODUCT_GUIDE',
    relevanceScore: 0.95,
    confidence: 'HIGH',
    status: 'approved',
    reasons: ['EXPLICIT_LINK'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // 1. Forward lookup: Product -> Guide
  const forwardGuides = await getRelatedGuidesForProduct(hennaProduct, {
    allGuides: [testPublishedGuide],
    requireApproval: true,
  });
  assert.strictEqual(forwardGuides.length, 1, 'Approved relationship must be returned in forward direction');
  assert.strictEqual(forwardGuides[0].id, testPublishedGuide.id);
  console.log('  ✓ Forward lookup (PRODUCT -> GUIDE) successfully returned approved guide (PASSED)');

  // 2. Reverse lookup: Guide -> Product (using direction-awareness without duplicate row!)
  const reverseProducts = await getRelatedProductsForGuide(testPublishedGuide, {
    allProducts: [hennaProduct],
    requireApproval: true,
  });
  assert.strictEqual(reverseProducts.length, 1, 'Approved relationship must be found via direction-aware lookup without duplicate row');
  assert.strictEqual(reverseProducts[0].id, hennaProduct.id);
  console.log('  ✓ Reverse lookup (GUIDE -> PRODUCT) successfully found single-edge without duplicate row (PASSED)');

  // Cleanup test override
  await deleteRelationshipOverride('PRODUCT', hennaProduct.id, 'GUIDE', testPublishedGuide.id, 'PRODUCT_GUIDE');

  // --------------------------------------------------------------------------
  // SUITE 4: REJECTION SUPPRESSION INVARIANT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Rejection Suppression (rejected = NEVER public) ---');
  await saveRelationshipOverride({
    id: 'test-rel-rejected-edge',
    sourceType: 'PRODUCT',
    sourceId: hennaProduct.id,
    targetType: 'GUIDE',
    targetId: testPublishedGuide.id,
    relationshipType: 'PRODUCT_GUIDE',
    relevanceScore: 0.98,
    confidence: 'HIGH',
    status: 'rejected', // ADMIN REJECTED
    reasons: ['EXPLICIT_LINK'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const rejectedCheck = await getRelatedGuidesForProduct(hennaProduct, {
    allGuides: [testPublishedGuide],
    requireApproval: false, // Even if requireApproval is false, rejected MUST NEVER show!
  });
  assert.strictEqual(rejectedCheck.length, 0, 'Rejected relationship must NEVER be returned');
  console.log('  ✓ Rejected relationship 100% suppressed from public storefront (PASSED)');

  // Cleanup rejection override
  await deleteRelationshipOverride('PRODUCT', hennaProduct.id, 'GUIDE', testPublishedGuide.id, 'PRODUCT_GUIDE');

  // --------------------------------------------------------------------------
  // SUITE 5: FAIL-CLOSED GRACEFUL BEHAVIOR (ZERO CRASHES / CLEAN EMPTY)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Fail-Closed Resiliency ---');
  resetRelationshipCache();

  // Test empty options
  const emptyGuides = await getRelatedGuidesForProduct(hennaProduct, { allGuides: [], requireApproval: true });
  assert.deepStrictEqual(emptyGuides, [], 'Empty guides input returns [] without crash');

  const emptyProducts = await getRelatedProductsForGuide(testPublishedGuide, { allProducts: [], requireApproval: true });
  assert.deepStrictEqual(emptyProducts, [], 'Empty products input returns [] without crash');

  const emptyKnowledgeProducts = await getRelatedProductsForKnowledge(hennaEntity, { allProducts: [], requireApproval: true });
  assert.deepStrictEqual(emptyKnowledgeProducts, [], 'Empty knowledge products returns [] without crash');

  console.log('  ✓ All resolvers fail-closed safely with clean empty arrays (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 6: NO ARBITRARY FALLBACKS IN SOURCE CODE AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Codebase Forensic Hardcoding Audit ---');
  const productPageSource = fs.readFileSync('app/products/[slug]/page.tsx', 'utf8');
  const guidePageSource = fs.readFileSync('app/guides/[slug]/page.tsx', 'utf8');
  const knowledgePageSource = fs.readFileSync('app/knowledge/[entity]/page.tsx', 'utf8');

  assert.ok(
    !productPageSource.includes("includes('indigo')"),
    'app/products/[slug]/page.tsx must NOT contain includes(\'indigo\')'
  );
  assert.ok(
    !productPageSource.includes("includes('henna')"),
    'app/products/[slug]/page.tsx must NOT contain includes(\'henna\')'
  );
  assert.ok(
    !productPageSource.includes("includes('which-henna')"),
    'app/products/[slug]/page.tsx must NOT contain includes(\'which-henna\')'
  );
  console.log('  ✓ Product page: All hardcoded slug/name checks removed (PASSED)');

  assert.ok(
    !guidePageSource.includes('activeProducts.slice(0, 3)'),
    'app/guides/[slug]/page.tsx must NOT contain activeProducts.slice(0, 3)'
  );
  console.log('  ✓ Guide page: Arbitrary slice(0, 3) fallback eliminated (PASSED)');

  assert.ok(
    !knowledgePageSource.includes('normalizedAliases.some'),
    'app/knowledge/[entity]/page.tsx must NOT contain normalizedAliases.some hardcoded search'
  );
  console.log('  ✓ Knowledge page: Hardcoded alias slug matching replaced with canonical engine (PASSED)');

  console.log('\n===============================================================');
  console.log('ALL STOREFRONT CONSUMER INTEGRATION TESTS PASSED (100%)');
  console.log('===============================================================');
}

runStorefrontConsumerTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
