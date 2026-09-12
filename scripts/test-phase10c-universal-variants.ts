/**
 * ============================================================================
 * MUSKY DOSE — PHASE 10C: UNIVERSAL PRODUCT VARIATION SYSTEM HARDENING TEST SUITE
 * "ONE ENGINE FOR ALL CURRENT + ALL FUTURE PRODUCTS"
 *
 * VALIDATES:
 * 1. Universal test factory across Weight, Volume, and Count unit families.
 * 2. Strict & sorted data-driven monotonicity validation (order-independent).
 * 3. Mixed unit family fail-closed safety (e.g. weight + volume rejection).
 * 4. Duplicate pack size rejection.
 * 5. Universal proportional default pricing derivation with collision-free SKUs.
 * 6. Storefront canonical offer resolution & default variant behavior.
 * 7. Collision-free cart identity (${productId}::${variantId}).
 * 8. Order contract normalization & WhatsApp formatted line items.
 * 9. Proof of zero product-ID dependencies.
 * ============================================================================
 */

import assert from 'assert';
import { Product, ProductVariant, OrderItem } from '../lib/types';
import { CommerceGovernance } from '../lib/governance/commerce-governance';
import {
  validateCatalogVariants,
  suggestNextVariant,
  resolveCanonicalProductOffer,
  filterValidActiveVariants,
} from '../lib/growth/product-catalog-governance';
import {
  validateProductVariants,
  formatVariantWeight,
  getCartItemId,
  parseCartItemId,
  getEffectiveVariantPrice,
} from '../lib/product-variants';
import { normalizeOrderInput } from '../lib/orders/order-contract';
import { generateStructuredWhatsAppOrderMessage } from '../lib/whatsapp';

console.log('================================================================');
console.log('STARTING PHASE 10C UNIVERSAL VARIATION ENGINE TEST SUITE');
console.log('================================================================\n');

let passCount = 0;

function check(desc: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✔ [PASS] ${desc}`);
    passCount++;
  } catch (err: any) {
    console.error(`  ✖ [FAIL] ${desc}`);
    console.error(`    ${err.message || err}`);
    throw err;
  }
}

// ============================================================================
// TEST 1: UNIVERSAL FUTURE-PRODUCT FACTORY ACROSS FAMILIES
// ============================================================================
console.log('--- TEST 1: Universal Product Factory & Unit Family Governance ---');

interface HypotheticalProductConfig {
  name: string;
  productType: string;
  unitFamily: 'weight' | 'volume' | 'count';
  basePrice: number;
  baseWeight: string;
  packSizes: Array<{ qty: number; unit: string; price: number; comparePrice?: number }>;
}

const hypotheticalCatalog: HypotheticalProductConfig[] = [
  {
    name: 'Future Himalayan Herbal Clay',
    productType: 'POWDER',
    unitFamily: 'weight',
    basePrice: 199,
    baseWeight: '100g',
    packSizes: [
      { qty: 100, unit: 'g', price: 199, comparePrice: 249 },
      { qty: 250, unit: 'g', price: 399, comparePrice: 499 },
      { qty: 500, unit: 'g', price: 699, comparePrice: 899 },
      { qty: 1, unit: 'kg', price: 1249, comparePrice: 1599 },
    ],
  },
  {
    name: 'Future Cold-Pressed Walnut Hair Tonic',
    productType: 'OIL',
    unitFamily: 'volume',
    basePrice: 299,
    baseWeight: '100ml',
    packSizes: [
      { qty: 100, unit: 'ml', price: 299, comparePrice: 399 },
      { qty: 250, unit: 'ml', price: 599, comparePrice: 799 },
      { qty: 500, unit: 'ml', price: 999, comparePrice: 1299 },
      { qty: 1, unit: 'Litre', price: 1799, comparePrice: 2399 },
    ],
  },
  {
    name: 'Future Artisanal Mehendi Cones Special Edition',
    productType: 'FINISHED',
    unitFamily: 'count',
    basePrice: 149,
    baseWeight: '6 Cones',
    packSizes: [
      { qty: 6, unit: 'cone', price: 149, comparePrice: 199 },
      { qty: 12, unit: 'cone', price: 279, comparePrice: 349 },
      { qty: 24, unit: 'cone', price: 499, comparePrice: 649 },
      { qty: 48, unit: 'cone', price: 899, comparePrice: 1199 },
    ],
  },
];

for (const fixture of hypotheticalCatalog) {
  check(`Factory generates and validates valid ladder for ${fixture.name} (${fixture.unitFamily})`, () => {
    const variants: ProductVariant[] = fixture.packSizes.map((p, idx) => ({
      id: `hypo_${fixture.unitFamily}_${idx + 1}`,
      sku: `SKU-HYPO-${p.qty}${p.unit.toUpperCase()}`,
      weight: formatVariantWeight(p.qty, p.unit),
      packQuantity: p.qty,
      packUnit: p.unit,
      price: p.price,
      compareAtPrice: p.comparePrice,
      stockStatus: 'in_stock',
      isActive: true,
      isDefault: idx === 0,
      sortOrder: idx + 1,
    }));

    // 1. Catalog unit governance
    const catCheck = validateCatalogVariants(variants, fixture.productType);
    assert.strictEqual(catCheck.valid, true, `Catalog validation failed: ${catCheck.errors.join('; ')}`);
    assert.strictEqual(catCheck.sanitizedVariants.length, 4);

    // 2. Commerce Monotonicity Governance
    const monoCheck = CommerceGovernance.validateVariantMonotonicity(variants);
    assert.strictEqual(monoCheck.isValid, true, `Monotonicity failed: ${monoCheck.errors.join('; ')}`);
    assert.strictEqual(monoCheck.errors.length, 0);
  });
}

// ============================================================================
// TEST 2: DATA-DRIVEN MONOTONICITY & ORDER-INDEPENDENCE
// ============================================================================
console.log('\n--- TEST 2: Data-Driven Monotonicity & Array Order-Independence ---');

check('Pre-sorting: Out-of-order variants validate correctly by normalized quantity', () => {
  // Input in reverse order: 1kg, 500g, 250g, 100g
  const reverseVariants: ProductVariant[] = [
    { id: 'v4', sku: 'S4', weight: '1kg', packQuantity: 1, packUnit: 'kg', price: 1200, stockStatus: 'in_stock' },
    { id: 'v3', sku: 'S3', weight: '500g', packQuantity: 500, packUnit: 'g', price: 650, stockStatus: 'in_stock' },
    { id: 'v2', sku: 'S2', weight: '250g', packQuantity: 250, packUnit: 'g', price: 350, stockStatus: 'in_stock' },
    { id: 'v1', sku: 'S1', weight: '100g', packQuantity: 100, packUnit: 'g', price: 150, stockStatus: 'in_stock', isDefault: true },
  ];

  const result = CommerceGovernance.validateVariantMonotonicity(reverseVariants);
  assert.strictEqual(result.isValid, true, `Unordered array should sort and pass: ${result.errors.join('; ')}`);
});

check('True Price Inversion Detection: Larger pack costing less or equal is strictly rejected', () => {
  // 500g costs ₹300, 250g costs ₹350 (true inversion)
  const invertedVariants: ProductVariant[] = [
    { id: 'v1', sku: 'S1', weight: '250g', packQuantity: 250, packUnit: 'g', price: 350, stockStatus: 'in_stock' },
    { id: 'v2', sku: 'S2', weight: '500g', packQuantity: 500, packUnit: 'g', price: 300, stockStatus: 'in_stock' },
  ];

  const result = CommerceGovernance.validateVariantMonotonicity(invertedVariants);
  assert.strictEqual(result.isValid, false, 'Inverted pricing must fail');
  assert.ok(result.errors.some((e) => e.includes('Variant pricing inversion')));
});

check('Equal Price Inversion Detection: Larger pack costing equal price is strictly rejected', () => {
  // 100g and 200g both cost ₹199 (common default price mistake)
  const equalVariants: ProductVariant[] = [
    { id: 'v1', sku: 'S1', weight: '100g', packQuantity: 100, packUnit: 'g', price: 199, stockStatus: 'in_stock' },
    { id: 'v2', sku: 'S2', weight: '200g', packQuantity: 200, packUnit: 'g', price: 199, stockStatus: 'in_stock' },
  ];

  const result = CommerceGovernance.validateVariantMonotonicity(equalVariants);
  assert.strictEqual(result.isValid, false, 'Equal price for larger pack must fail');
  assert.ok(result.errors.some((e) => e.includes('Variant pricing inversion')));
});

check('Unit boundary monotonicity: 1 Litre vs 500ml correctly scales and validates', () => {
  const volumeVariants: ProductVariant[] = [
    { id: 'v1', sku: 'V1', weight: '500ml', packQuantity: 500, packUnit: 'ml', price: 499, stockStatus: 'in_stock' },
    { id: 'v2', sku: 'V2', weight: '1 Litre', packQuantity: 1, packUnit: 'Litre', price: 899, stockStatus: 'in_stock' },
  ];

  const result = CommerceGovernance.validateVariantMonotonicity(volumeVariants);
  assert.strictEqual(result.isValid, true, '500ml < 1000ml (1 Litre) with increasing price must pass');
});

// ============================================================================
// TEST 3: MIXED UNIT SAFETY & DUPLICATE DETECTION
// ============================================================================
console.log('\n--- TEST 3: Mixed Unit Safety & Duplicate Pack Size Detection ---');

check('Mixed incompatible units within product are rejected (fail-closed)', () => {
  const mixedVariants: ProductVariant[] = [
    { id: 'v1', sku: 'M1', weight: '100g', packQuantity: 100, packUnit: 'g', price: 100, stockStatus: 'in_stock' },
    { id: 'v2', sku: 'M2', weight: '200ml', packQuantity: 200, packUnit: 'ml', price: 200, stockStatus: 'in_stock' },
  ];

  const result = CommerceGovernance.validateVariantMonotonicity(mixedVariants);
  assert.strictEqual(result.isValid, false, 'Mixed unit families must be rejected');
  assert.ok(result.errors.some((e) => e.includes('unit family mismatch')));
});

check('Duplicate pack size detection: Two variants with identical quantity are rejected', () => {
  const dupVariants: ProductVariant[] = [
    { id: 'v1', sku: 'D1', weight: '250g', packQuantity: 250, packUnit: 'g', price: 299, stockStatus: 'in_stock' },
    { id: 'v2', sku: 'D2', weight: '250g Pack', packQuantity: 250, packUnit: 'g', price: 349, stockStatus: 'in_stock' },
  ];

  const result = CommerceGovernance.validateVariantMonotonicity(dupVariants);
  assert.strictEqual(result.isValid, false, 'Duplicate pack quantities must be rejected');
  assert.ok(result.errors.some((e) => e.includes('Duplicate variant pack size')));
});

// ============================================================================
// TEST 4: UNIVERSAL PROPORTIONAL PRICING SUGGESTIONS
// ============================================================================
console.log('\n--- TEST 4: Universal Suggestion & Collision-Free SKU Derivation ---');

check('Universal suggestion derivation calculates valid next pack & monotonic price', () => {
  const existing: ProductVariant[] = [
    { id: 'v1', sku: 'MD-OIL-100ml', weight: '100ml', packQuantity: 100, packUnit: 'ml', price: 199, compareAtPrice: 299, stockStatus: 'in_stock', isDefault: true },
  ];

  // Suggest next variant for OIL
  const suggestion = suggestNextVariant('OIL', '100ml', existing);
  assert.strictEqual(suggestion.packQuantity, 200);
  assert.strictEqual(suggestion.packUnit, 'ml');

  // Derive proportional price (simulating ProductFormClient handleAddVariant)
  const nextQty = suggestion.packQuantity;
  const refQty = existing[0].packQuantity!;
  const refPrice = existing[0].price;
  const scaledPrice = Math.round(refPrice * (nextQty / refQty) * 0.95);
  const defaultPrice = Math.max(refPrice + 10, scaledPrice);

  assert.ok(defaultPrice > refPrice, 'Derived default price must be strictly greater than reference price');
  assert.strictEqual(defaultPrice, 378); // 199 * 2 * 0.95 = 378.1 -> 378

  // New variant created with derived values
  const newVariant: ProductVariant = {
    id: 'v2',
    sku: 'MD-OIL-200ml',
    weight: suggestion.weight,
    packQuantity: nextQty,
    packUnit: suggestion.packUnit,
    price: defaultPrice,
    compareAtPrice: Math.round(existing[0].compareAtPrice! * (nextQty / refQty)),
    stockStatus: 'in_stock',
    isActive: true,
  };

  const monoCheck = CommerceGovernance.validateVariantMonotonicity([...existing, newVariant]);
  assert.strictEqual(monoCheck.isValid, true, 'Auto-derived new variant must be valid out-of-the-box');
});

// ============================================================================
// TEST 5: STOREFRONT PDP, CART & ORDER COMMERCE PIPELINE
// ============================================================================
console.log('\n--- TEST 5: Storefront PDP, Cart & Order Contracts ---');

check('resolveCanonicalProductOffer returns primary default variant offer', () => {
  const product: Product = {
    id: 'prod-test-future-001',
    name: 'Universal Botanical Extract',
    slug: 'universal-botanical-extract',
    price: 150,
    quantityOrWeight: '50g',
    variants: [
      { id: 'var_1', sku: 'UB-100', weight: '100g', packQuantity: 100, packUnit: 'g', price: 199, stockStatus: 'in_stock', isDefault: false },
      { id: 'var_2', sku: 'UB-250', weight: '250g', packQuantity: 250, packUnit: 'g', price: 399, stockStatus: 'in_stock', isDefault: true },
    ],
    categoryId: 'cat-1',
    categoryName: 'Herbal',
    images: ['/test.jpg'],
    stockStatus: 'in_stock',
    isActive: true,
    sortOrder: 1,
  } as Product;

  const offer = resolveCanonicalProductOffer(product);
  assert.strictEqual(offer.hasVariants, true);
  assert.strictEqual(offer.defaultVariant?.id, 'var_2');
  assert.strictEqual(offer.price, 399);
  assert.strictEqual(offer.displayWeight, '250g');
  assert.strictEqual(offer.sku, 'UB-250');
});

check('Cart item keying is collision-free: multiple pack sizes of same product coexist', () => {
  const prodId = 'prod-future-002';
  const cartKey1 = getCartItemId(prodId, 'var_100g');
  const cartKey2 = getCartItemId(prodId, 'var_250g');
  const cartKeyDefault = getCartItemId(prodId, null);

  assert.strictEqual(cartKey1, 'prod-future-002::var_100g');
  assert.strictEqual(cartKey2, 'prod-future-002::var_250g');
  assert.strictEqual(cartKeyDefault, 'prod-future-002::default');
  assert.notStrictEqual(cartKey1, cartKey2);

  const parsed1 = parseCartItemId(cartKey1);
  assert.strictEqual(parsed1.productId, 'prod-future-002');
  assert.strictEqual(parsed1.variantId, 'var_100g');
});

check('Order normalization preserves variant identity and structured pack attributes', () => {
  const rawInput = {
    customerName: 'Aarav Sharma',
    customerPhone: '9876543210',
    customerHouseShop: 'House 42',
    customerAddress: '42 MG Road, Jaipur, Rajasthan',
    customerCity: 'Jaipur',
    customerState: 'Rajasthan',
    customerPincode: '302001',
    items: [
      {
        productId: 'prod-future-003',
        name: 'Pure Organic Henna',
        price: 399,
        quantity: 2,
        variantId: 'var_250g',
        variantSku: 'HEN-250G',
        packSize: '250g Pack',
        packQuantity: 250,
        packUnit: 'g',
      },
    ],
    subtotal: 798,
    totalAmount: 798,
  };

  const normalized = normalizeOrderInput(rawInput);
  assert.strictEqual(normalized.isValid, true, `Order validation failed: ${normalized.errors.join('; ')}`);
  assert.strictEqual(normalized.canonical?.items[0].variantId, 'var_250g');
  assert.strictEqual(normalized.canonical?.items[0].variantSku, 'HEN-250G');
  assert.strictEqual(normalized.canonical?.items[0].packQuantity, 250);
  assert.strictEqual(normalized.canonical?.items[0].packUnit, 'g');

  // WhatsApp structured order message inclusion
  const waMsg = generateStructuredWhatsAppOrderMessage({
    ...normalized.canonical!,
    subtotal: normalized.canonical!.subtotal ?? 798,
    totalAmount: normalized.canonical!.totalAmount ?? 798,
    orderNumber: 'MD-TEST-001',
  });
  assert.ok(waMsg.includes('250g Pack') || waMsg.includes('HEN-250G'), 'WhatsApp message must include variant pack size');
});

// ============================================================================
// TEST 6: CONFIRMATION OF ZERO PRODUCT-ID COUPLING IN VARIATION LOGIC
// ============================================================================
console.log('\n--- TEST 6: Proof of Zero Product-ID Coupling in Variation Engine ---');

check('Arbitrary dynamic product IDs work with zero hardcoding', () => {
  const dynamicProductIds = [
    `prod_auto_${Date.now()}`,
    'prod-future-brand-new-herbal-blend-2027',
    'x99z-custom-id',
  ];

  for (const id of dynamicProductIds) {
    const p: Product = {
      id,
      name: `Dynamic Product ${id}`,
      slug: `dynamic-product-${id}`,
      price: 299,
      quantityOrWeight: '100ml',
      variants: [
        { id: `v_${id}_1`, sku: `SKU-${id}-100`, weight: '100ml', packQuantity: 100, packUnit: 'ml', price: 299, stockStatus: 'in_stock', isDefault: true },
        { id: `v_${id}_2`, sku: `SKU-${id}-200`, weight: '200ml', packQuantity: 200, packUnit: 'ml', price: 549, stockStatus: 'in_stock' },
      ],
      categoryId: 'cat-custom',
      categoryName: 'Custom Category',
      images: ['/img.jpg'],
      stockStatus: 'in_stock',
      isActive: true,
      sortOrder: 1,
    } as Product;

    const offer = resolveCanonicalProductOffer(p);
    assert.strictEqual(offer.price, 299);
    assert.strictEqual(offer.activeVariants.length, 2);

    const mono = CommerceGovernance.validateVariantMonotonicity(p.variants!);
    assert.strictEqual(mono.isValid, true);
  }
});

console.log('\n================================================================');
console.log(`ALL ${passCount} UNIVERSAL VARIATION ENGINE TESTS PASSED!`);
console.log('================================================================');
