/**
 * ============================================================================
 * MUSKY DOSE — UNIVERSAL COMMERCE CONTRACT & FUTURE-PROOFING TEST SUITE
 *
 * DATA-DRIVEN VALIDATION:
 * - Uses generic, representative fixtures (NOT today's product IDs).
 * - Tests Product, Variant, Media, Pricing, Order, OrderItem, Customer,
 *   Governance, and WhatsApp builder contracts across all current and future
 *   botanical categories (Henna, Oils, Herbal powders, Haircare, Skincare, etc.).
 * ============================================================================
 */

import { Product, ProductVariant, Order, OrderItem } from '../lib/types';
import { UniversalGovernanceCore } from '../lib/governance/core';
import '../lib/governance/entity-registry';
import { CommerceGovernance } from '../lib/governance/commerce-governance';
import { normalizeOrderInput } from '../lib/orders/order-contract';
import {
  resolveCanonicalProductOffer,
  resolveProductVisibility,
} from '../lib/growth/product-catalog-governance';
import { resolveAuthoritativeProductMedia } from '../lib/growth/product-media-governance';
import {
  generateStructuredWhatsAppOrderMessage,
  getWhatsAppDirectUrl,
} from '../lib/whatsapp';

console.log('================================================================');
console.log('MUSKY DOSE: UNIVERSAL COMMERCE CONTRACTS & FUTURE-PROOF TEST SUITE');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${testName}`, detail || '');
    failCount++;
  }
}

// ============================================================================
// SUITE 1: FUTURE-PRODUCT FIXTURES & RESOLUTION MATRIX
// ============================================================================
console.log('--- SUITE 1: Future Product Fixtures & Canonical Resolution ---');

const nowIso = new Date().toISOString();

const futureProductFixtures: Array<{ description: string; product: Product }> = [
  {
    description: '1. Henna Powder (multi-variant, featured, in-stock)',
    product: {
      id: 'fixture-henna-001',
      name: 'Ultra-Pure Rajasthani Sojat Henna',
      slug: 'ultra-pure-sojat-henna',
      categoryId: 'cat-henna',
      categoryName: 'Henna & Mehndi',
      shortDescription: 'Triple-sifted micro-fine henna.',
      fullDescription: 'Authentic harvest henna from Sojat.',
      price: 199,
      compareAtPrice: 249,
      quantityOrWeight: '100g',
      sku: 'HENNA-SOJAT-100G',
      images: ['https://cdn.muskydose.in/henna-1.jpg', 'https://cdn.muskydose.in/henna-2.jpg'],
      variants: [
        { id: 'v1', sku: 'HEN-100', weight: '100g', price: 199, compareAtPrice: 249, stockStatus: 'in_stock', isDefault: true, packQuantity: 100, packUnit: 'g' },
        { id: 'v2', sku: 'HEN-250', weight: '250g', price: 399, compareAtPrice: 499, stockStatus: 'in_stock', packQuantity: 250, packUnit: 'g' },
        { id: 'v3', sku: 'HEN-500', weight: '500g', price: 699, compareAtPrice: 899, stockStatus: 'in_stock', packQuantity: 500, packUnit: 'g' },
      ],
      ingredients: ['100% Lawsonia Inermis Leaf Powder'],
      benefits: ['Deep stain', 'Cooling scalp'],
      usageInstructions: 'Mix with warm water and let release for 2 hours.',
      stockStatus: 'in_stock',
      isFeatured: true,
      isActive: true,
      sortOrder: 1,
      productType: 'POWDER',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  },
  {
    description: '2. Botanical Hair Oil (single-variant, featured, in-stock)',
    product: {
      id: 'fixture-oil-002',
      name: 'Cold-Pressed Damask Rose Hair Elixir',
      slug: 'cold-pressed-rose-hair-elixir',
      categoryId: 'cat-oils',
      categoryName: 'Botanical Oils',
      shortDescription: 'Steam-distilled pure rose oil infusion.',
      fullDescription: 'Nourishing botanical hair oil.',
      price: 499,
      compareAtPrice: 599,
      quantityOrWeight: '100ml',
      sku: 'OIL-ROSE-100ML',
      images: ['https://cdn.muskydose.in/rose-oil.jpg'],
      ingredients: ['Rosa Damascena Flower Oil', 'Cold-Pressed Sesame Oil'],
      benefits: ['Hair luster', 'Scalp nourishment'],
      usageInstructions: 'Massage gently into scalp overnight.',
      stockStatus: 'in_stock',
      isFeatured: true,
      isActive: true,
      sortOrder: 2,
      productType: 'FINISHED',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  },
  {
    description: '3. Herbal Powder (Indigo, no variants, non-featured)',
    product: {
      id: 'fixture-indigo-003',
      name: 'Organic Sojat Indigo Leaf Powder',
      slug: 'organic-sojat-indigo-powder',
      categoryId: 'cat-herbal',
      categoryName: 'Herbal Powders',
      shortDescription: 'Pure Indigofera tinctoria leaf powder.',
      fullDescription: 'Natural plant-based hair coloring powder.',
      price: 249,
      quantityOrWeight: '100g',
      sku: 'IND-100G',
      images: ['https://cdn.muskydose.in/indigo.jpg'],
      ingredients: ['100% Indigofera Tinctoria Leaf Powder'],
      benefits: ['Natural dark brown and black tones'],
      usageInstructions: 'Apply immediately after henna.',
      stockStatus: 'in_stock',
      isFeatured: false,
      isActive: true,
      sortOrder: 3,
      productType: 'POWDER',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  },
  {
    description: '4. Hair Care Treatment (5+ variants, wholesale eligible)',
    product: {
      id: 'fixture-haircare-004',
      name: 'Amla Reetha Shikakai Tri-Herb Cleanser',
      slug: 'tri-herb-cleanser',
      categoryId: 'cat-haircare',
      categoryName: 'Hair Care',
      shortDescription: 'Ayurvedic traditional clarifying hair wash.',
      fullDescription: 'Sulfate-free ancient hair wash formulation.',
      price: 149,
      compareAtPrice: 199,
      quantityOrWeight: '100g',
      sku: 'TRI-100G',
      images: ['https://cdn.muskydose.in/triherb.jpg'],
      variants: [
        { id: 'v1', sku: 'TRI-100', weight: '100g', price: 149, stockStatus: 'in_stock', isDefault: true, packQuantity: 100, packUnit: 'g' },
        { id: 'v2', sku: 'TRI-250', weight: '250g', price: 299, stockStatus: 'in_stock', packQuantity: 250, packUnit: 'g' },
        { id: 'v3', sku: 'TRI-500', weight: '500g', price: 549, stockStatus: 'in_stock', packQuantity: 500, packUnit: 'g' },
        { id: 'v4', sku: 'TRI-1KG', weight: '1000g', price: 999, stockStatus: 'in_stock', packQuantity: 1000, packUnit: 'g' },
        { id: 'v5', sku: 'TRI-5KG', weight: '5000g', price: 4499, stockStatus: 'in_stock', packQuantity: 5000, packUnit: 'g' },
      ],
      ingredients: ['Amla', 'Reetha', 'Shikakai'],
      benefits: ['Root strengthening', 'Gentle clarifying'],
      usageInstructions: 'Make a paste and apply to scalp.',
      stockStatus: 'in_stock',
      isFeatured: false,
      isActive: true,
      sortOrder: 4,
      isWholesaleEligible: true,
      productType: 'POWDER',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  },
  {
    description: '5. Face Care Formulation (pre-order, rich media video)',
    product: {
      id: 'fixture-face-005',
      name: 'Sojat Multani Mitti & Rose Facial Clay',
      slug: 'multani-rose-clay',
      categoryId: 'cat-skincare',
      categoryName: 'Skin Care',
      shortDescription: 'Purifying mineral clay facial pack.',
      fullDescription: 'Deep pore purification with rose essence.',
      price: 179,
      compareAtPrice: 229,
      quantityOrWeight: '150g',
      sku: 'CLAY-150G',
      images: ['https://cdn.muskydose.in/clay.jpg'],
      media: [
        { id: 'm1', type: 'image', url: 'https://cdn.muskydose.in/clay-hero.jpg', role: 'PRIMARY', sortOrder: 1, enabled: true },
        { id: 'm2', type: 'video', url: 'https://cdn.muskydose.in/clay-demo.mp4', role: 'USAGE', sortOrder: 2, enabled: true },
      ],
      ingredients: ['Fullers Earth', 'Rosa Damascena Petal Powder'],
      benefits: ['Excess sebum absorption', 'Pore toning'],
      usageInstructions: 'Mix with rose water and apply for 15 minutes.',
      stockStatus: 'pre_order',
      isFeatured: true,
      isActive: true,
      sortOrder: 5,
      productType: 'FINISHED',
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  },
  {
    description: '6. Inactive Draft Product (private draft, not visible)',
    product: {
      id: 'fixture-draft-006',
      name: 'Unreleased Formulation Draft',
      slug: 'unreleased-draft',
      categoryId: 'cat-rd',
      categoryName: 'R&D',
      shortDescription: 'Upcoming formulation.',
      fullDescription: 'Internal formulation.',
      price: 299,
      quantityOrWeight: '100g',
      sku: 'DRAFT-001',
      images: ['https://cdn.muskydose.in/draft.jpg'],
      ingredients: ['Herbal Extracts'],
      benefits: ['Testing'],
      usageInstructions: 'N/A',
      stockStatus: 'out_of_stock',
      isFeatured: false,
      isActive: false,
      sortOrder: 99,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  },
];

for (const { description, product } of futureProductFixtures) {
  // 1. Canonical Offer Resolution
  const offer = resolveCanonicalProductOffer(product);
  assert(typeof offer.price === 'number' && offer.price > 0, `${description} -> Offer resolves valid price (₹${offer.price})`);
  assert(typeof offer.displayWeight === 'string' && offer.displayWeight.length > 0, `${description} -> Offer resolves displayWeight ("${offer.displayWeight}")`);

  // 2. Authoritative Media Resolution
  const media = resolveAuthoritativeProductMedia(product);
  assert(Boolean(media.primaryImage), `${description} -> Authoritative media resolves primaryImage`);

  // 3. Universal Visibility Governance
  const visibility = resolveProductVisibility(product);
  if (product.isActive === false) {
    assert(visibility.isPubliclyVisible === false && visibility.isHomepageEligible === false, `${description} -> Inactive product correctly hidden from storefront & homepage`);
  } else {
    assert(visibility.isPubliclyVisible === true, `${description} -> Active product publicly visible`);
    assert(visibility.isHomepageEligible === Boolean(product.isFeatured), `${description} -> Homepage featured eligibility matches isFeatured (${product.isFeatured})`);
  }

  // 4. Universal Platform Governance Validation
  const govCheck = UniversalGovernanceCore.validateEntity('PRODUCT', product, true);
  assert(govCheck.isValid === true, `${description} -> Universal Governance validation passes cleanly`);
}

// ============================================================================
// SUITE 2: PRODUCT PRICING & COMPARE-AT CONTRACT
// ============================================================================
console.log('\n--- SUITE 2: Product Pricing & Compare-At Contract ---');

// Valid pricing
const pricing1 = CommerceGovernance.validateProductPricing(199, 249);
assert(pricing1.isValid === true, 'compareAtPrice (₹249) > price (₹199) passes');

// Invalid pricing: comparePrice <= price
const pricing2 = CommerceGovernance.validateProductPricing(249, 199);
assert(pricing2.isValid === false && pricing2.errors[0].includes('must be greater than selling price'), 'compareAtPrice (₹199) <= price (₹249) is rejected');

// comparePrice equals price
const pricing3 = CommerceGovernance.validateProductPricing(200, 200);
assert(pricing3.isValid === false, 'compareAtPrice (₹200) === price (₹200) is rejected');

// Governance PRODUCT validator with canonical compareAtPrice
const testProductCompare = {
  id: 'test-compare-prod',
  name: 'Compare Test Henna',
  price: 199,
  compareAtPrice: 150, // Invalid: compareAtPrice < price
};
const govCompareCheck = UniversalGovernanceCore.validateEntity('PRODUCT', testProductCompare, true);
assert(govCompareCheck.isValid === false && govCompareCheck.errors.some(e => e.includes('greater than selling price')), 'Universal Governance catches invalid compareAtPrice < price');

// ============================================================================
// SUITE 3: CENTRAL ORDER INPUT NORMALIZER (SINGLE BOUNDARY ADAPTER)
// ============================================================================
console.log('\n--- SUITE 3: Central Order Input Normalizer Contract ---');

// Case A: Canonical customerPhone payload
const rawCanonical = {
  customerName: 'Aarav Mehta',
  customerPhone: '9876543210',
  customerWhatsapp: '9876543210',
  customerHouseShop: 'House 42',
  customerAddress: 'Station Road, Opp Post Office',
  customerCity: 'Sojat',
  customerState: 'Rajasthan',
  customerPincode: '306104',
  items: [
    {
      productId: 'fixture-henna-001',
      productName: 'Ultra-Pure Rajasthani Sojat Henna',
      packSize: '250g Pack',
      quantity: 2,
      price: 399,
      variantId: 'v2',
      variantSku: 'HEN-250',
    },
  ],
  subtotal: 798,
  totalAmount: 798,
};
const normA = normalizeOrderInput(rawCanonical);
assert(normA.isValid === true && normA.canonical?.customerPhone === '9876543210', 'Canonical customerPhone payload normalizes cleanly');
assert(normA.canonical?.phone === '9876543210', 'Boundary attaches compatibility alias phone: cleanPhone');

// Case B: Legacy phone alias only
const rawLegacyPhone = {
  ...rawCanonical,
  customerPhone: undefined,
  phone: '9876543210',
};
const normB = normalizeOrderInput(rawLegacyPhone);
assert(normB.isValid === true && normB.canonical?.customerPhone === '9876543210', 'Legacy phone alias is normalized to canonical customerPhone');

// Case C: Dual fields provided
const rawDual = {
  ...rawCanonical,
  customerPhone: '9876543210',
  phone: '9876543210',
};
const normC = normalizeOrderInput(rawDual);
assert(normC.isValid === true && normC.canonical?.customerPhone === '9876543210', 'Dual fields handled without conflict');

// Case D: Missing phone completely
const rawNoPhone = {
  ...rawCanonical,
  customerPhone: undefined,
  phone: undefined,
};
const normD = normalizeOrderInput(rawNoPhone);
assert(normD.isValid === false && normD.errors.includes('Contact phone is required.'), 'Missing phone is strictly rejected');

// Case E: Empty string phone
const rawEmptyPhone = {
  ...rawCanonical,
  customerPhone: '',
  phone: '',
};
const normE = normalizeOrderInput(rawEmptyPhone);
assert(normE.isValid === false && normE.errors.includes('Contact phone is required.'), 'Empty string phone is strictly rejected');

// Case F: Whitespace phone
const rawWhitespacePhone = {
  ...rawCanonical,
  customerPhone: '     ',
  phone: '     ',
};
const normF = normalizeOrderInput(rawWhitespacePhone);
assert(normF.isValid === false && normF.errors.includes('Contact phone is required.'), 'Whitespace phone is strictly rejected');

// Case G: Invalid 8-digit phone
const rawShortPhone = {
  ...rawCanonical,
  customerPhone: '98765432',
};
const normG = normalizeOrderInput(rawShortPhone);
assert(normG.isValid === false && normG.errors.includes('Valid 10-digit mobile number is required.'), 'Invalid short phone rejected');

// Case H: snake_case address aliases (house_shop, pincode)
const rawSnake = {
  name: 'Sneha Patel',
  customer_phone: '8233703080',
  house_shop: 'Shop 10',
  customer_address: 'Bazaar Road',
  city: 'Jodhpur',
  state: 'Rajasthan',
  pincode: '342001',
  items: rawCanonical.items,
};
const normH = normalizeOrderInput(rawSnake);
assert(normH.isValid === true && normH.canonical?.customerHouseShop === 'Shop 10', 'snake_case house_shop normalized to customerHouseShop');
assert(normH.canonical?.customerPincode === '342001', 'snake_case pincode normalized to customerPincode');
assert(normH.canonical?.customerPhone === '8233703080', 'snake_case customer_phone normalized to customerPhone');

// ============================================================================
// SUITE 4: ORDER GOVERNANCE & COMMERCE INVARIANTS
// ============================================================================
console.log('\n--- SUITE 4: Order Governance & Invariants ---');

// Governance validation on canonical order input
const canonicalOrder = normA.canonical!;
const govOrderCheck = UniversalGovernanceCore.validateEntity('ORDER', canonicalOrder, true);
assert(govOrderCheck.isValid === true, 'Governance accepts CanonicalOrderInput');

// Totals invariant: subtotal - discount + shipping === total
const totalsPass = CommerceGovernance.validateOrderTotals(
  canonicalOrder.items,
  798, // subtotal
  50,  // discount
  0,   // shipping
  748  // total
);
assert(totalsPass.isValid === true, 'Commerce totals invariant holds: 798 - 50 + 0 = 748');

const totalsFail = CommerceGovernance.validateOrderTotals(
  canonicalOrder.items,
  798,
  50,
  0,
  900 // Wrong total
);
assert(totalsFail.isValid === false && totalsFail.errors[0].toLowerCase().includes('arithmetic mismatch'), 'Tampered total is caught by Commerce Governance');

// ============================================================================
// SUITE 5: ORDER ITEM EXTENDED CONTRACT
// ============================================================================
console.log('\n--- SUITE 5: OrderItem Extended Contract ---');

const itemFixture: OrderItem = {
  productId: 'fixture-henna-001',
  productName: 'Ultra-Pure Rajasthani Sojat Henna',
  quantity: 2,
  price: 399,
  weight: '250g Pack',
  packSize: '250g Pack',
  variantId: 'v2',
  variantSku: 'HEN-250',
  packQuantity: 250,
  packUnit: 'g',
};
assert(itemFixture.variantId === 'v2', 'OrderItem supports variantId');
assert(itemFixture.variantSku === 'HEN-250', 'OrderItem supports variantSku');
assert(itemFixture.packSize === '250g Pack', 'OrderItem supports packSize');
assert(itemFixture.packQuantity === 250, 'OrderItem supports packQuantity');
assert(itemFixture.packUnit === 'g', 'OrderItem supports packUnit');

// ============================================================================
// SUITE 6: WHATSAPP MESSAGE BUILDER (SAVED CANONICAL ORDER)
// ============================================================================
console.log('\n--- SUITE 6: WhatsApp Message Builder Contract ---');

const savedMockOrder: Order = {
  id: 'ord-sim-2026',
  orderNumber: 'ORD-20260911-AUTO',
  customerName: canonicalOrder.customerName,
  customerPhone: canonicalOrder.customerPhone,
  customerWhatsapp: canonicalOrder.customerWhatsapp,
  customerHouseShop: canonicalOrder.customerHouseShop,
  customerAddress: canonicalOrder.customerAddress,
  customerArea: canonicalOrder.customerArea,
  customerLandmark: canonicalOrder.customerLandmark,
  customerCity: canonicalOrder.customerCity,
  customerState: canonicalOrder.customerState,
  customerPincode: canonicalOrder.customerPincode,
  items: [itemFixture],
  subtotal: 798,
  discountAmount: 50,
  discountDetails: 'Festival Offer',
  shippingFee: 0,
  totalAmount: 748,
  orderStatus: 'NEW',
  paymentStatus: 'UNPAID',
  paymentMethod: 'WhatsApp',
  notes: 'Express courier requested',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const waMessage = generateStructuredWhatsAppOrderMessage(savedMockOrder);
assert(waMessage.includes('ORD-20260911-AUTO'), 'WhatsApp message contains order number');
assert(waMessage.includes('Aarav Mehta'), 'WhatsApp message contains customer name');
assert(waMessage.includes('9876543210'), 'WhatsApp message contains customer phone');
assert(waMessage.includes('Ultra-Pure Rajasthani Sojat Henna'), 'WhatsApp message contains product name');
assert(waMessage.includes('250g Pack'), 'WhatsApp message contains pack size');
assert(waMessage.includes('HEN-250'), 'WhatsApp message contains SKU');
assert(waMessage.includes('₹748'), 'WhatsApp message contains total amount');

const waUrl = getWhatsAppDirectUrl('918233703080', waMessage);
assert(waUrl.startsWith('https://wa.me/918233703080?text='), 'WhatsApp direct URL matches canonical wa.me format');

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================');
console.log(`CONTRACT SUITE RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
}
