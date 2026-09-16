import assert from 'assert';
import { resolveMediaAssetUsage, getUsedAsDescription } from '../lib/growth/media-usage';
import { MediaAsset } from '../lib/db/media';
import { Product, Category, ProductGuide } from '../lib/types';
import { KnowledgeEntity } from '../lib/db/knowledge';

console.log('=== TEST SUITE: ADMIN MEDIA UX & TRUTHFUL USAGE RESOLVER ===\n');

// Mock Entities
const mockProducts: Product[] = [
  {
    id: 'prod-henna-1',
    name: 'Pure Sojat BAQ Henna Powder',
    slug: 'pure-sojat-baq-henna-powder',
    price: 349,
    categoryId: 'cat-henna',
    categoryName: 'Henna',
    images: ['https://example.com/legacy-henna.jpg'],
    stockStatus: 'in_stock',
  } as Product,
  {
    id: 'prod-indigo-1',
    name: 'Natural Microfine Indigo Powder',
    slug: 'natural-microfine-indigo-powder',
    price: 399,
    categoryId: 'cat-indigo',
    categoryName: 'Indigo',
    images: ['https://example.com/legacy-indigo.jpg'],
    stockStatus: 'in_stock',
  } as Product,
];

const mockCategories: Category[] = [
  {
    id: 'cat-henna',
    name: 'Henna Hair Care',
    slug: 'henna-hair-care',
    description: 'Sojat Henna Collection',
  } as Category,
];

const mockGuides: ProductGuide[] = [
  {
    id: 'guide-henna-mix',
    title: 'How to Mix Henna and Indigo for Jet Black Hair',
    slug: 'how-to-mix-henna-and-indigo',
    isPublished: true,
  } as ProductGuide,
];

const mockKnowledge: KnowledgeEntity[] = [
  {
    id: 'know-lawsonia',
    entityKey: 'know-lawsonia',
    canonicalName: 'Lawsonia Inermis (Henna)',
    slug: 'lawsonia-inermis',
  } as KnowledgeEntity,
];

const lookupContext = {
  products: mockProducts,
  categories: mockCategories,
  guides: mockGuides,
  knowledge: mockKnowledge,
};

function createMockAsset(partial: Partial<MediaAsset> & { id: string; entityType: any; role: any; status: any }): MediaAsset {
  return {
    storageBucket: 'product-images',
    mimeType: 'image/webp',
    aspectRatio: '1:1',
    source: 'MANUAL_UPLOAD',
    isLocked: false,
    sortOrder: 100,
    url: 'https://example.com/test.webp',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

let passed = 0;
let total = 0;

function runTest(name: string, fn: () => void) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`[FAIL] ${name}`);
    console.error(err);
  }
}

// 1. Authoritative Primary Product Asset
runTest('Truthful Active Product Primary is LIVE / AUTHORITATIVE with PDP route', () => {
  const primaryAsset = createMockAsset({
    id: 'asset-primary-henna',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/henna-primary.webp',
    isLocked: false,
    sortOrder: 1,
  });

  const usage = resolveMediaAssetUsage(primaryAsset, [primaryAsset], lookupContext);

  assert.strictEqual(usage.isLivePublic, true, 'Must be live public');
  assert.strictEqual(usage.authorityStatus, 'LIVE_AUTHORITATIVE');
  assert.strictEqual(usage.authorityBadgeLabel, 'LIVE / AUTHORITATIVE');
  assert.strictEqual(usage.consumingRoutes.length, 1);
  assert.strictEqual(usage.consumingRoutes[0].route, '/products/pure-sojat-baq-henna-powder');
  assert.strictEqual(usage.whyNotPublicYet, null);
});

// 2. Locked Primary Product Asset
runTest('Locked Product Primary shows LIVE / AUTHORITATIVE (LOCKED)', () => {
  const lockedAsset = createMockAsset({
    id: 'asset-locked-primary',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/henna-primary.webp',
    isLocked: true,
    sortOrder: 1,
  });

  const usage = resolveMediaAssetUsage(lockedAsset, [lockedAsset], lookupContext);

  assert.strictEqual(usage.isLivePublic, true);
  assert.strictEqual(usage.authorityBadgeLabel, 'LIVE / AUTHORITATIVE (LOCKED)');
  assert.strictEqual(usage.isLocked, true);
});

// 3. Second Primary candidate is NOT marked LIVE (truthful single active primary)
runTest('Secondary approved Primary candidate is marked APPROVED_NOT_CURRENT', () => {
  const primary1 = createMockAsset({
    id: 'asset-pri-1',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/henna-1.webp',
    sortOrder: 10,
    isLocked: true,
  });

  const primary2 = createMockAsset({
    id: 'asset-pri-2',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/henna-2.webp',
    sortOrder: 20,
    isLocked: false,
  });

  const usage2 = resolveMediaAssetUsage(primary2, [primary1, primary2], lookupContext);

  assert.strictEqual(usage2.isLivePublic, false, 'Secondary primary candidate must NOT be live public');
  assert.strictEqual(usage2.authorityStatus, 'APPROVED_NOT_CURRENT');
  assert.strictEqual(usage2.authorityBadgeLabel, 'APPROVED (NOT CURRENT PRIMARY)');
  assert.strictEqual(usage2.consumingRoutes.length, 0);
  assert.ok(usage2.whyNotPublicYet?.includes('another asset is currently designated as the authoritative Primary'));
});

// 4. Product Gallery Asset
runTest('Approved Product Gallery is LIVE / GALLERY on PDP', () => {
  const galleryAsset = createMockAsset({
    id: 'asset-gallery-henna',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'GALLERY',
    status: 'approved',
    url: 'https://example.com/henna-gallery.webp',
    isLocked: false,
  });

  const usage = resolveMediaAssetUsage(galleryAsset, [galleryAsset], lookupContext);

  assert.strictEqual(usage.isLivePublic, true);
  assert.strictEqual(usage.authorityStatus, 'LIVE_AUTHORITATIVE');
  assert.strictEqual(usage.authorityBadgeLabel, 'LIVE / GALLERY');
  assert.strictEqual(usage.consumingRoutes[0].route, '/products/pure-sojat-baq-henna-powder');
});

// 5. AI Suggested Asset is NEVER public
runTest('AI-suggested asset is strictly NON-PUBLIC and has zero consuming routes', () => {
  const suggestedAsset = createMockAsset({
    id: 'asset-ai-suggested',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PRIMARY',
    source: 'AI_GENERATED',
    status: 'suggested',
    url: 'https://example.com/ai-draft.webp',
    isLocked: false,
  });

  const usage = resolveMediaAssetUsage(suggestedAsset, [suggestedAsset], lookupContext);

  assert.strictEqual(usage.isLivePublic, false, 'AI suggested asset must NEVER be live');
  assert.strictEqual(usage.authorityStatus, 'SUGGESTED');
  assert.strictEqual(usage.authorityBadgeLabel, 'SUGGESTED AI (NON-PUBLIC)');
  assert.strictEqual(usage.consumingRoutes.length, 0, 'Must have zero consuming routes');
  assert.ok(usage.whyNotPublicYet?.includes('Requires explicit Admin approval'));
});

// 6. Rejected and Archived Assets
runTest('Rejected and Archived assets are strictly non-public', () => {
  const rejectedAsset = createMockAsset({
    id: 'asset-rejected',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'GALLERY',
    status: 'rejected',
    url: 'https://example.com/rejected.webp',
    isLocked: false,
  });

  const archivedAsset = createMockAsset({
    id: 'asset-archived',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PRIMARY',
    status: 'archived',
    url: 'https://example.com/archived.webp',
    isLocked: false,
  });

  const usageRej = resolveMediaAssetUsage(rejectedAsset, [rejectedAsset], lookupContext);
  assert.strictEqual(usageRej.isLivePublic, false);
  assert.strictEqual(usageRej.authorityStatus, 'REJECTED');

  const usageArc = resolveMediaAssetUsage(archivedAsset, [archivedAsset], lookupContext);
  assert.strictEqual(usageArc.isLivePublic, false);
  assert.strictEqual(usageArc.authorityStatus, 'ARCHIVED');
});

// 7. Orphaned Asset (Entity not in catalog)
runTest('Approved asset for non-existent entity is marked APPROVED (ORPHANED)', () => {
  const orphanAsset = createMockAsset({
    id: 'asset-orphan',
    entityType: 'PRODUCT',
    entityId: 'non-existent-product-id',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/orphan.webp',
    isLocked: false,
  });

  const usage = resolveMediaAssetUsage(orphanAsset, [orphanAsset], lookupContext);

  assert.strictEqual(usage.isLivePublic, false);
  assert.strictEqual(usage.existsInCatalog, false);
  assert.strictEqual(usage.authorityStatus, 'APPROVED_NOT_CURRENT');
  assert.strictEqual(usage.authorityBadgeLabel, 'APPROVED (ORPHANED)');
  assert.strictEqual(usage.consumingRoutes.length, 0);
  assert.ok(usage.consumptionSummary.includes('Entity not found'));
});

// 8. Category, Guide, and Knowledge Primary Routes
runTest('Category, Guide, and Knowledge map to truthful canonical routes', () => {
  const catAsset = createMockAsset({
    id: 'asset-cat-hero',
    entityType: 'CATEGORY',
    entityId: 'cat-henna',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/cat-hero.webp',
    isLocked: false,
  });

  const guideAsset = createMockAsset({
    id: 'asset-guide-cover',
    entityType: 'GUIDE',
    entityId: 'guide-henna-mix',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/guide-cover.webp',
    isLocked: false,
  });

  const knowAsset = createMockAsset({
    id: 'asset-know-cover',
    entityType: 'KNOWLEDGE',
    entityId: 'know-lawsonia',
    role: 'PRIMARY',
    status: 'approved',
    url: 'https://example.com/know-cover.webp',
    isLocked: false,
  });

  const catUsage = resolveMediaAssetUsage(catAsset, [catAsset], lookupContext);
  assert.strictEqual(catUsage.consumingRoutes[0].route, '/categories/henna-hair-care');

  const guideUsage = resolveMediaAssetUsage(guideAsset, [guideAsset], lookupContext);
  assert.strictEqual(guideUsage.consumingRoutes[0].route, '/guides/how-to-mix-henna-and-indigo');

  const knowUsage = resolveMediaAssetUsage(knowAsset, [knowAsset], lookupContext);
  assert.strictEqual(knowUsage.consumingRoutes[0].route, '/knowledge/lawsonia-inermis');
});

// 9. Exact Usage is Truthful (Never reports fictive routes)
runTest('Truthful consumption: Never reports unconsumed routes like /cart or /factory', () => {
  const standbyAsset = createMockAsset({
    id: 'asset-packaging',
    entityType: 'PRODUCT',
    entityId: 'prod-henna-1',
    role: 'PACKAGING',
    status: 'approved',
    url: 'https://example.com/box-specs.webp',
    isLocked: false,
  });

  const usage = resolveMediaAssetUsage(standbyAsset, [standbyAsset], lookupContext);

  assert.strictEqual(usage.isLivePublic, false, 'Unrendered slot must not be marked live');
  assert.strictEqual(usage.consumingRoutes.length, 0, 'Must have 0 consuming routes');
  assert.strictEqual(usage.consumptionSummary, 'Not currently consumed');
  assert.strictEqual(getUsedAsDescription('PACKAGING', 'PRODUCT'), 'Product Packaging & Outer Box Specifications');
});

console.log(`\nResults: ${passed}/${total} tests passed.`);
if (passed !== total) {
  process.exit(1);
}

