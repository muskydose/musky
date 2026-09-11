/**
 * Regression Test Suite: SEO Future Product Taxonomy & Internal Linking
 *
 * Verifies that:
 * 1. Botanical synergy rules (Henna + Indigo, Henna + Rose Water, Hair Pack + Henna)
 *    work for future products with arbitrary UUIDs or IDs, without reliance on hardcoded seed IDs.
 * 2. Category internal linking uses canonical slug.
 * 3. Inactive products are not suggested.
 * 4. Arbitrary new products added in the future automatically participate in botanical linking.
 */

import { generateProductInternalLinks } from '../lib/growth/seo-opportunity-engine';
import { Product, Category } from '../lib/types';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n=== RUNNING SEO FUTURE PRODUCT TAXONOMY TESTS ===\n');

const mockCategories: Category[] = [
  {
    id: 'cat-henna',
    name: 'Henna & Mehndi',
    slug: 'henna-powders',
    isActive: true,
  } as unknown as Category,
  {
    id: 'cat-herbs',
    name: 'Herbal Hair Care',
    slug: 'herbal-hair-care',
    isActive: true,
  } as unknown as Category,
  {
    id: 'cat-waters',
    name: 'Hydrosols & Sprays',
    slug: 'pure-hydrosols',
    isActive: true,
  } as unknown as Category,
];

// Product 1: Future Henna product with arbitrary UUID
const futureHennaProduct: Product = {
  id: 'prod-future-henna-uuid-8899',
  name: 'Microfine Rajasthani Herbal Henna Blend',
  slug: 'microfine-rajasthani-herbal-henna-blend',
  price: 249,
  categoryId: 'cat-henna',
  categoryName: 'Henna & Mehndi',
  ingredients: ['Lawsonia Inermis Powder'],
  isActive: true,
} as unknown as Product;

// Product 2: Future Indigo product with arbitrary UUID (NOT prod-2)
const futureIndigoProduct: Product = {
  id: 'prod-future-indigo-uuid-7766',
  name: 'Pure Mountain Indigo Leaf Powder',
  slug: 'pure-mountain-indigo-leaf-powder',
  price: 299,
  categoryId: 'cat-herbs',
  categoryName: 'Herbal Hair Care',
  ingredients: ['Indigofera Tinctoria'],
  isActive: true,
} as unknown as Product;

// Product 3: Future Rose Water product with arbitrary UUID (NOT prod-5)
const futureRoseWaterProduct: Product = {
  id: 'prod-future-rose-uuid-5544',
  name: 'Kannauj Steam-Distilled Rose Water Mist',
  slug: 'kannauj-steam-distilled-rose-water-mist',
  price: 349,
  categoryId: 'cat-waters',
  categoryName: 'Hydrosols & Sprays',
  ingredients: ['Rosa Damascena Flower Water'],
  isActive: true,
} as unknown as Product;

// Product 4: Future Hair Pack product with arbitrary UUID
const futureHairPackProduct: Product = {
  id: 'prod-future-hairpack-uuid-3322',
  name: '12-Herb Intensive Scalp & Hair Pack',
  slug: '12-herb-intensive-hair-pack',
  price: 399,
  categoryId: 'cat-herbs',
  categoryName: 'Herbal Hair Care',
  ingredients: ['Amla', 'Shikakai', 'Bhringraj', 'Brahmi', 'Neem'],
  isActive: true,
} as unknown as Product;

// Product 5: Inactive product (should NEVER be suggested)
const inactiveIndigoProduct: Product = {
  id: 'prod-inactive-indigo-000',
  name: 'Discontinued Indigo Powder Batch',
  slug: 'discontinued-indigo',
  price: 199,
  categoryId: 'cat-herbs',
  categoryName: 'Herbal Hair Care',
  ingredients: ['Indigofera Tinctoria'],
  isActive: false,
} as unknown as Product;

const allCatalogProducts: Product[] = [
  futureHennaProduct,
  futureIndigoProduct,
  futureRoseWaterProduct,
  futureHairPackProduct,
  inactiveIndigoProduct,
];

// 1. Future Henna Internal Links Generation
console.log('--- 1. Future Henna Botanical Pairing ---');
{
  const suggestions = generateProductInternalLinks(futureHennaProduct, allCatalogProducts, mockCategories);

  // Category link check
  const catLink = suggestions.find((s) => s.targetType === 'CATEGORY');
  assert(
    Boolean(catLink && catLink.targetUrl === '/categories/henna-powders'),
    'Henna links to canonical category URL /categories/henna-powders'
  );

  // Henna -> Indigo pairing (arbitrary UUID)
  const indigoPairing = suggestions.find(
    (s) => s.targetType === 'PRODUCT' && s.targetUrl === '/products/pure-mountain-indigo-leaf-powder'
  );
  assert(
    Boolean(indigoPairing),
    'Henna pairs with arbitrary future Indigo product (prod-future-indigo-uuid-7766)'
  );
  assert(
    indigoPairing?.anchorText.includes('Indigo') === true,
    'Indigo pairing anchor text describes chemical-free dark hair color'
  );

  // Henna -> Rose Water pairing (arbitrary UUID)
  const rosePairing = suggestions.find(
    (s) => s.targetType === 'PRODUCT' && s.targetUrl === '/products/kannauj-steam-distilled-rose-water-mist'
  );
  assert(
    Boolean(rosePairing),
    'Henna pairs with arbitrary future Rose Water product (prod-future-rose-uuid-5544)'
  );

  // Inactive product exclusion
  const inactiveLink = suggestions.find((s) => s.targetUrl.includes('discontinued-indigo'));
  assert(
    !inactiveLink,
    'Inactive indigo product is excluded from internal linking suggestions'
  );
}

// 2. Future Indigo Internal Links Generation
console.log('--- 2. Future Indigo Botanical Pairing ---');
{
  const suggestions = generateProductInternalLinks(futureIndigoProduct, allCatalogProducts, mockCategories);

  // Indigo -> Henna pairing (arbitrary UUID)
  const hennaPairing = suggestions.find(
    (s) => s.targetType === 'PRODUCT' && s.targetUrl === '/products/microfine-rajasthani-herbal-henna-blend'
  );
  assert(
    Boolean(hennaPairing),
    'Future Indigo correctly pairs back with future Henna product (prod-future-henna-uuid-8899)'
  );
  assert(
    hennaPairing?.anchorText.includes('Sojat Henna base') === true,
    'Indigo anchor text recommends 2-step henna base'
  );
}

// 3. Future Hair Pack Internal Links Generation
console.log('--- 3. Future Hair Pack Botanical Pairing ---');
{
  const suggestions = generateProductInternalLinks(futureHairPackProduct, allCatalogProducts, mockCategories);

  // Hair Pack -> Rose Water pairing
  const rosePairing = suggestions.find(
    (s) => s.targetType === 'PRODUCT' && s.targetUrl === '/products/kannauj-steam-distilled-rose-water-mist'
  );
  assert(
    Boolean(rosePairing),
    'Hair Pack pairs with future Rose Water as mixing liquid'
  );

  // Hair Pack -> Henna pairing
  const hennaPairing = suggestions.find(
    (s) => s.targetType === 'PRODUCT' && s.targetUrl === '/products/microfine-rajasthani-herbal-henna-blend'
  );
  assert(
    Boolean(hennaPairing),
    'Hair Pack pairs with future Henna as hair treatment synergy'
  );
}

// 4. Zero Hardcoded Seed IDs Verification
console.log('--- 4. Verify Zero Hardcoded Seed IDs ---');
{
  // A brand new non-botanical product should NOT match botanical pairs
  const futureAccessoryProduct: Product = {
    id: 'prod-wooden-comb-123',
    name: 'Neem Wood Detangling Comb',
    slug: 'neem-wood-detangling-comb',
    price: 149,
    categoryId: 'cat-accessories',
    categoryName: 'Accessories',
    ingredients: ['Neem Wood'],
    isActive: true,
  } as unknown as Product;

  const accessorySuggestions = generateProductInternalLinks(
    futureAccessoryProduct,
    allCatalogProducts,
    mockCategories
  );
  const falseIndigoPairing = accessorySuggestions.find(
    (s) => s.targetUrl === '/products/pure-mountain-indigo-leaf-powder'
  );
  assert(
    !falseIndigoPairing,
    'Non-henna product (Neem Comb) does NOT falsely trigger Henna+Indigo synergy'
  );
}

console.log(`\nSEO Future Product Taxonomy Results: ${passed} PASSED, ${failed} FAILED\n`);
if (failed > 0) {
  process.exit(1);
}
