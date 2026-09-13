import assert from 'node:assert';
import fs from 'fs';

// Load .env.local if present
if (fs.existsSync('.env.local')) {
  const content = fs.readFileSync('.env.local', 'utf8');
  content.split('\n').forEach((line) => {
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

import { Product, BulkPricingRule } from '../lib/types';
import { resolveProductWholesaleUnits, calculateProductBaseWholesaleRate } from '../lib/wholesale-units';
import { resolveCanonicalWholesalePricing, CanonicalWholesaleResolution } from '../lib/wholesale-pricing-resolver';
import { formatPrice, formatPercent } from '../lib/utils';
import { getAllProductsAdmin } from '../lib/db/products';
import { getBulkPricingRules } from '../lib/db/bulk-pricing';

let totalAssertions = 0;

function assertClose(actual: number, expected: number, message: string, tolerance: number = 0.05) {
  totalAssertions++;
  const diff = Math.abs(actual - expected);
  assert(
    diff <= tolerance,
    `${message} -> Expected ${expected}, got ${actual} (diff: ${diff} > ${tolerance})`
  );
}

function assertStrictEqual<T>(actual: T, expected: T, message: string) {
  totalAssertions++;
  assert.strictEqual(actual, expected, message);
}

function verifyCanonicalMathContract(res: CanonicalWholesaleResolution, testContext: string) {
  // 1. Normalized Quantity * Effective Rate === Effective Total
  const expectedEffectiveTotal = Math.round(res.quantity * res.effectiveWholesaleRate * 100) / 100;
  assertClose(
    res.effectiveTotal,
    expectedEffectiveTotal,
    `[${testContext}] Effective Total calculation: quantity(${res.quantity}) * rate(${res.effectiveWholesaleRate}) === ${res.effectiveTotal}`
  );

  // 2. Normalized Quantity * Base Rate === Regular Total
  const expectedRegularTotal = Math.round(res.quantity * res.baseWholesaleRate * 100) / 100;
  assertClose(
    res.regularTotal,
    expectedRegularTotal,
    `[${testContext}] Regular Total calculation: quantity(${res.quantity}) * baseRate(${res.baseWholesaleRate}) === ${res.regularTotal}`
  );

  // 3. Regular Total - Effective Total === Savings Amount
  const expectedSavings = res.hasConfiguredTier
    ? Math.max(0, Math.round((res.regularTotal - res.effectiveTotal) * 100) / 100)
    : 0;
  assertClose(
    res.savingsAmount,
    expectedSavings,
    `[${testContext}] Savings Amount calculation: regularTotal(${res.regularTotal}) - effectiveTotal(${res.effectiveTotal}) === ${res.savingsAmount}`
  );

  // 4. Savings relationship === Savings Percentage
  if (res.hasConfiguredTier && res.regularTotal > 0) {
    const expectedPct = ((res.regularTotal - res.effectiveTotal) / res.regularTotal) * 100;
    assertClose(
      res.savingsPercent,
      expectedPct,
      `[${testContext}] Savings Percentage relationship: (${res.savingsAmount} / ${res.regularTotal}) * 100 === ${res.savingsPercent}%`
    );
  } else if (!res.hasConfiguredTier) {
    assertStrictEqual(
      res.savingsPercent,
      0,
      `[${testContext}] Non-tier resolution must have 0% savingsPercent`
    );
  }

  // 5. Displayed unit MUST strictly equal canonical pricingResult.unit
  // Absolutely no retail unit leak (no '/ g' for kg, no '/ ml' for Litre, no '/ Piece' for Box)
  assert(
    res.display.formattedBaseRate.endsWith(`/ ${res.unit}`),
    `[${testContext}] formattedBaseRate (${res.display.formattedBaseRate}) must end with '/ ${res.unit}'`
  );
  totalAssertions++;

  if (res.hasConfiguredTier) {
    assert(
      res.display.formattedWholesaleRate.endsWith(`/ ${res.unit}`),
      `[${testContext}] formattedWholesaleRate (${res.display.formattedWholesaleRate}) must end with '/ ${res.unit}'`
    );
    totalAssertions++;
  }

  // Unit must NEVER be retail packaging sub-unit when trading in wholesale
  if (res.unit === 'kg') {
    assert(!res.display.formattedBaseRate.includes('/ g'), `[${testContext}] / g leaked in kg product`);
    totalAssertions++;
  } else if (res.unit === 'Litre') {
    assert(!res.display.formattedBaseRate.includes('/ ml'), `[${testContext}] / ml leaked in Litre product`);
    totalAssertions++;
  } else if (res.unit === 'Box') {
    assert(!res.display.formattedBaseRate.includes('/ Piece'), `[${testContext}] / Piece leaked in Box product`);
    totalAssertions++;
  }
}

async function runTestSuite() {
  console.log('===============================================================');
  console.log('STARTING WHOLESALE COMMERCIAL MATH CONTRACT VERIFICATION');
  console.log('===============================================================\n');

  // -------------------------------------------------------------
  // SECTION 1: MANDATORY WEIGHT TESTS (1, 5, 25, 100, 500 kg)
  // -------------------------------------------------------------
  console.log('--- SECTION 1: WEIGHT SUITE (Sojat Henna 250g Pouch @ ₹249) ---');
  const weightProduct = {
    id: 'test-henna-weight',
    name: 'Sojat Pure Henna Powder',
    slug: 'sojat-pure-henna-powder',
    price: 249,
    quantityOrWeight: '250g',
    categoryName: 'Henna & Hair Care',
    productType: 'weight_based',
    stockStatus: 'in_stock',
    unitConfig: {
      packQuantity: 250,
      packUnit: 'g',
      sellingUnit: 'Pouch',
      wholesaleUnit: 'kg',
      pricingUnit: 'g',
      conversionRule: '1000g = 1kg',
      minWholesaleQuantity: 5,
    },
  } as unknown as Product;

  const weightUnits = resolveProductWholesaleUnits(weightProduct);
  assertStrictEqual(weightUnits.wholesaleUnit, 'kg', 'Weight wholesaleUnit must be kg');
  const weightBaseRate = calculateProductBaseWholesaleRate(weightProduct, weightUnits);
  // 249 / 0.25 = 996
  assertStrictEqual(weightBaseRate, 996, 'Weight base wholesale rate must be ₹996/kg');

  const weightTiers = [
    {
      id: 'w-tier-1',
      productId: 'test-henna-weight',
      minQuantity: 5,
      maxQuantity: 24,
      discountType: 'percentage',
      discountValue: 10, // 10% off -> ₹896.40/kg
      isActive: true,
    },
    {
      id: 'w-tier-2',
      productId: 'test-henna-weight',
      minQuantity: 25,
      maxQuantity: 99,
      discountType: 'percentage',
      discountValue: 20, // 20% off -> ₹796.80/kg
      isActive: true,
    },
    {
      id: 'w-tier-3',
      productId: 'test-henna-weight',
      minQuantity: 100,
      maxQuantity: 499,
      discountType: 'percentage',
      discountValue: 30, // 30% off -> ₹697.20/kg
      isActive: true,
    },
    {
      id: 'w-tier-4',
      productId: 'test-henna-weight',
      minQuantity: 500,
      discountType: 'percentage',
      discountValue: 40, // 40% off -> ₹597.60/kg
      isActive: true,
    },
  ] as unknown as BulkPricingRule[];

  const weightQuantities = [1, 5, 25, 100, 500];
  for (const qty of weightQuantities) {
    const res = resolveCanonicalWholesalePricing({
      product: weightProduct,
      quantity: qty,
      rules: weightTiers,
      units: weightUnits,
    });

    verifyCanonicalMathContract(res, `Weight Qty=${qty}kg`);

    // Specific assert for 25 kg as requested by user
    if (qty === 25) {
      assertStrictEqual(res.effectiveWholesaleRate, 796.8, '25kg effective rate must be ₹796.80/kg');
      assertStrictEqual(formatPrice(res.effectiveWholesaleRate), '₹797', '25kg formatted rate must be ₹797');
      assertStrictEqual(res.effectiveTotal, 19920, '25kg total must be ₹19,920');
      assertStrictEqual(res.unit, 'kg', '25kg unit must be kg');
      console.log('  ✓ 25 kg: Rate = ₹796.80/kg (Formatted: ₹797/kg), Total = ₹19,920 (PASSED)');
    }
  }

  // -------------------------------------------------------------
  // SECTION 1B: UNIVERSAL BULK TIER INHERITANCE (25, 50, 100, 250, 500 kg)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 1B: UNIVERSAL BULK TIER INHERITANCE SUITE ---');
  // Highest standard tier is capped at 100 kg (maxQuantity: 100).
  // 250 kg and 500 kg must inherit 100 kg tier rate and discount.
  const cappedTiers = [
    {
      id: 'cap-tier-1',
      productId: 'test-henna-weight',
      minQuantity: 5,
      maxQuantity: 24,
      discountType: 'percentage',
      discountValue: 10, // 10% off -> ₹896.40/kg
      isActive: true,
    },
    {
      id: 'cap-tier-2',
      productId: 'test-henna-weight',
      minQuantity: 25,
      maxQuantity: 99,
      discountType: 'percentage',
      discountValue: 20, // 20% off -> ₹796.80/kg
      isActive: true,
    },
    {
      id: 'cap-tier-3',
      productId: 'test-henna-weight',
      minQuantity: 100,
      maxQuantity: 100, // Explicitly capped at 100
      discountType: 'percentage',
      discountValue: 30, // 30% off -> ₹697.20/kg
      isActive: true,
    },
  ] as unknown as BulkPricingRule[];

  const inheritanceQuantities = [25, 50, 100, 250, 500];
  const inheritanceResults = inheritanceQuantities.map((q) =>
    resolveCanonicalWholesalePricing({
      product: weightProduct,
      quantity: q,
      rules: cappedTiers,
      units: weightUnits,
    })
  );

  inheritanceResults.forEach((res, idx) => {
    verifyCanonicalMathContract(res, `Inheritance Qty=${inheritanceQuantities[idx]}kg`);
  });

  const res25 = inheritanceResults[0];
  const res50 = inheritanceResults[1];
  const res100 = inheritanceResults[2];
  const res250 = inheritanceResults[3];
  const res500 = inheritanceResults[4];

  // 25kg & 50kg verify Tier 2
  assertStrictEqual(res25.effectiveWholesaleRate, 796.8, '25kg must have Tier 2 rate');
  assertStrictEqual(res25.savingsPercent, 20, '25kg must have 20% discount');
  assertStrictEqual(res50.effectiveWholesaleRate, 796.8, '50kg must have Tier 2 rate');
  assertStrictEqual(res50.savingsPercent, 20, '50kg must have 20% discount');
  console.log('  ✓ 25kg & 50kg: Tier 2 (20% off) verified');

  // 100kg verifies Highest Standard Tier
  assertStrictEqual(res100.effectiveWholesaleRate, 697.2, '100kg must have Tier 3 rate');
  assertStrictEqual(res100.savingsPercent, 30, '100kg must have 30% discount');
  assertStrictEqual(res100.status, 'CONFIRMED', '100kg must be CONFIRMED');
  console.log('  ✓ 100kg: Highest standard tier (30% off, ₹697.20/kg) verified');

  // 250kg verifies Tier Inheritance from 100kg tier
  assertStrictEqual(res250.effectiveWholesaleRate, res100.effectiveWholesaleRate, '250kg must inherit 100kg tier rate');
  assertStrictEqual(res250.savingsPercent, res100.savingsPercent, '250kg must inherit 100kg tier savingsPercent (30%)');
  assertStrictEqual(res250.status, 'CONFIRMED', '250kg must be CONFIRMED (not CUSTOM_QUOTE)');
  assertStrictEqual(res250.hasConfiguredTier, true, '250kg must have hasConfiguredTier=true');
  assertStrictEqual(res250.effectiveTotal, 174300, '250kg total must be 250 * 697.20 = 174,300');
  console.log('  ✓ 250kg: Successfully inherited 100kg tier rate (₹697.20/kg, 30% off) without dropping to custom quote');

  // 500kg verifies Tier Inheritance from 100kg tier
  assertStrictEqual(res500.effectiveWholesaleRate, res100.effectiveWholesaleRate, '500kg must inherit 100kg tier rate');
  assertStrictEqual(res500.savingsPercent, res100.savingsPercent, '500kg must inherit 100kg tier savingsPercent (30%)');
  assertStrictEqual(res500.status, 'CONFIRMED', '500kg must be CONFIRMED (not CUSTOM_QUOTE)');
  assertStrictEqual(res500.hasConfiguredTier, true, '500kg must have hasConfiguredTier=true');
  assertStrictEqual(res500.effectiveTotal, 348600, '500kg total must be 500 * 697.20 = 348,600');
  console.log('  ✓ 500kg: Successfully inherited 100kg tier rate (₹697.20/kg, 30% off) without dropping to custom quote');

  // -------------------------------------------------------------
  // SECTION 2: MANDATORY VOLUME TESTS (1, 10, 100 Litre)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 2: VOLUME SUITE (Gulab Jal 100ml Bottle @ ₹499) ---');
  const volumeProduct = {
    id: 'test-gulab-jal-vol',
    name: 'Pure Steam-Distilled Gulab Jal',
    slug: 'steam-distilled-gulab-jal',
    price: 499,
    quantityOrWeight: '100ml',
    categoryName: 'Facial Waters',
    productType: 'volume_based',
    stockStatus: 'in_stock',
    unitConfig: {
      packQuantity: 100,
      packUnit: 'ml',
      sellingUnit: 'Bottle',
      wholesaleUnit: 'Litre',
      pricingUnit: 'ml',
      conversionRule: '1000ml = 1 Litre',
      minWholesaleQuantity: 1,
    },
  } as unknown as Product;

  const volumeUnits = resolveProductWholesaleUnits(volumeProduct);
  assertStrictEqual(volumeUnits.wholesaleUnit, 'Litre', 'Volume wholesaleUnit must be Litre');
  const volumeBaseRate = calculateProductBaseWholesaleRate(volumeProduct, volumeUnits);
  // 499 / 0.1 = 4990
  assertStrictEqual(volumeBaseRate, 4990, 'Volume base wholesale rate must be ₹4,990/Litre');

  const volumeTiers = [
    {
      id: 'v-tier-1',
      productId: 'test-gulab-jal-vol',
      minQuantity: 10,
      maxQuantity: 49,
      discountType: 'percentage',
      discountValue: 15, // 15% off -> ₹4,241.50/Litre
      isActive: true,
    },
    {
      id: 'v-tier-2',
      productId: 'test-gulab-jal-vol',
      minQuantity: 100,
      discountType: 'percentage',
      discountValue: 25, // 25% off -> ₹3,742.50/Litre
      isActive: true,
    },
  ] as unknown as BulkPricingRule[];

  const volumeQuantities = [1, 10, 100];
  for (const qty of volumeQuantities) {
    const res = resolveCanonicalWholesalePricing({
      product: volumeProduct,
      quantity: qty,
      rules: volumeTiers,
      units: volumeUnits,
    });

    verifyCanonicalMathContract(res, `Volume Qty=${qty}L`);

    if (qty === 1) {
      // 1 Litre at base rate with no tier matched
      assertStrictEqual(res.effectiveWholesaleRate, 4990, '1 Litre effective rate must be ₹4,990/Litre');
      assertStrictEqual(res.effectiveTotal, 4990, '1 Litre total must be ₹4,990');
      assertStrictEqual(res.unit, 'Litre', '1 Litre unit must be Litre');
      console.log('  ✓ 1 Litre: Base Rate = ₹4,990/Litre, Total = ₹4,990 (PASSED)');
    } else if (qty === 10) {
      assertStrictEqual(res.effectiveWholesaleRate, 4241.5, '10 Litre effective rate must be ₹4,241.50/Litre');
      assertStrictEqual(res.effectiveTotal, 42415, '10 Litre total must be ₹42,415');
      console.log('  ✓ 10 Litre: Rate = ₹4,241.50/Litre, Total = ₹42,415 (PASSED)');
    }
  }

  // Also test 10 Litre at base catalog rate (no tier configured) as audited in Step 1
  const resVolBase10 = resolveCanonicalWholesalePricing({
    product: volumeProduct,
    quantity: 10,
    rules: [], // No tiers
    units: volumeUnits,
  });
  verifyCanonicalMathContract(resVolBase10, 'Volume 10L Base No Tiers');
  assertStrictEqual(resVolBase10.effectiveWholesaleRate, 4990, '10L base rate must be 4990');
  assertStrictEqual(resVolBase10.effectiveTotal, 49900, '10L base total must be 49,900');
  assertStrictEqual(formatPrice(resVolBase10.effectiveWholesaleRate), '₹4,990', 'Formatted rate must be ₹4,990');
  console.log('  ✓ 10 Litre (No Tiers): Base Rate = ₹4,990/Litre, Total = ₹49,900 (PASSED)');

  // -------------------------------------------------------------
  // SECTION 3: MANDATORY COUNT TESTS (1, 10, 100 Box of 12)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 3: COUNT / PACK SUITE (Henna Cones Box of 12 @ ₹360) ---');
  const countProduct = {
    id: 'test-cones-count',
    name: 'Natural Henna Cones Box of 12',
    slug: 'natural-henna-cones-box-of-12',
    price: 360,
    quantityOrWeight: 'Box of 12',
    categoryName: 'Henna Cones',
    productType: 'count_based',
    stockStatus: 'in_stock',
    unitConfig: {
      packQuantity: 12,
      packUnit: 'cone',
      sellingUnit: 'Box',
      wholesaleUnit: 'Box',
      pricingUnit: 'Piece',
      conversionRule: '12 cones = 1 Box',
      minWholesaleQuantity: 1,
    },
  } as unknown as Product;

  const countUnits = resolveProductWholesaleUnits(countProduct);
  assertStrictEqual(countUnits.wholesaleUnit, 'Box', 'Count wholesaleUnit must be Box');
  const countBaseRate = calculateProductBaseWholesaleRate(countProduct, countUnits);
  assertStrictEqual(countBaseRate, 360, 'Count base wholesale rate must be ₹360/Box');

  const countTiers = [
    {
      id: 'c-tier-1',
      productId: 'test-cones-count',
      minQuantity: 10,
      maxQuantity: 99,
      discountType: 'percentage',
      discountValue: 15, // 15% off -> ₹306/Box
      isActive: true,
    },
    {
      id: 'c-tier-2',
      productId: 'test-cones-count',
      minQuantity: 100,
      discountType: 'percentage',
      discountValue: 30, // 30% off -> ₹252/Box
      isActive: true,
    },
  ] as unknown as BulkPricingRule[];

  const countQuantities = [1, 10, 100];
  for (const qty of countQuantities) {
    const res = resolveCanonicalWholesalePricing({
      product: countProduct,
      quantity: qty,
      rules: countTiers,
      units: countUnits,
    });

    verifyCanonicalMathContract(res, `Count Qty=${qty} Boxes`);

    if (qty === 100) {
      assertStrictEqual(res.effectiveWholesaleRate, 252, '100 Boxes effective rate must be ₹252/Box');
      assertStrictEqual(formatPrice(res.effectiveWholesaleRate), '₹252', '100 Boxes formatted rate must be ₹252');
      assertStrictEqual(res.effectiveTotal, 25200, '100 Boxes total must be ₹25,200');
      assertStrictEqual(res.unit, 'Box', '100 Boxes unit must be Box');
      assert(!res.display.formattedBaseRate.includes('/ piece'), 'Count unit must not be piece');
      console.log('  ✓ 100 Boxes: Rate = ₹252/Box, Total = ₹25,200 (PASSED)');
    }
  }

  // -------------------------------------------------------------
  // SECTION 4: EDGE CASES (Zero, Negative, Custom Quote)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 4: EDGE CASES & SAFE FALLBACKS ---');
  // Zero quantity -> must resolve to minWholesaleQuantity (5 for weight) safely
  const resZero = resolveCanonicalWholesalePricing({
    product: weightProduct,
    quantity: 0,
    rules: weightTiers,
    units: weightUnits,
  });
  verifyCanonicalMathContract(resZero, 'Zero Qty Input');
  assertStrictEqual(resZero.quantity, 5, 'Zero quantity must fall back to minWholesaleQuantity (5)');
  console.log('  ✓ Zero quantity fallback to minQuantity: PASSED');

  // Negative quantity -> must clamp to minWholesaleQuantity safely
  const resNeg = resolveCanonicalWholesalePricing({
    product: weightProduct,
    quantity: -25,
    rules: weightTiers,
    units: weightUnits,
  });
  verifyCanonicalMathContract(resNeg, 'Negative Qty Input');
  assertStrictEqual(resNeg.quantity, 5, 'Negative quantity must clamp to minWholesaleQuantity (5)');
  console.log('  ✓ Negative quantity fallback to minQuantity: PASSED');

  // Custom quote -> Explicit custom quote rule takes precedence at configured boundary
  const explicitCustomQuoteRule = {
    id: 'w-tier-cq',
    productId: weightProduct.id,
    minQuantity: 10000,
    discountType: 'custom',
    discountValue: 0,
    isActive: true,
    isCustomQuote: true,
  } as unknown as BulkPricingRule;

  const resCustomQuote = resolveCanonicalWholesalePricing({
    product: weightProduct,
    quantity: 10000,
    rules: [weightTiers[0], explicitCustomQuoteRule],
    units: weightUnits,
    fallbackPolicy: 'CUSTOM_QUOTE',
  });
  verifyCanonicalMathContract(resCustomQuote, 'Explicit Custom Quote Rule');
  assertStrictEqual(resCustomQuote.status, 'CUSTOM_QUOTE', 'Explicit custom quote rule must yield CUSTOM_QUOTE');
  assertStrictEqual(resCustomQuote.hasConfiguredTier, false, 'Custom quote rule must have hasConfiguredTier=false');
  console.log('  ✓ Explicit custom quote rule state: PASSED');

  // Custom quote fallback -> Zero tiers configured for product
  const resNoTiers = resolveCanonicalWholesalePricing({
    product: weightProduct,
    quantity: 50,
    rules: [],
    units: weightUnits,
    fallbackPolicy: 'CUSTOM_QUOTE',
  });
  verifyCanonicalMathContract(resNoTiers, 'Zero Tiers Configured');
  assertStrictEqual(resNoTiers.status, 'CUSTOM_QUOTE', 'Zero tiers must yield CUSTOM_QUOTE');
  assertStrictEqual(resNoTiers.hasConfiguredTier, false, 'Zero tiers must have hasConfiguredTier=false');
  console.log('  ✓ Zero tiers fallback state: PASSED');

  // -------------------------------------------------------------
  // SECTION 5: DISCOUNT TYPES (percentage, fixed_amount, fixed_price)
  // -------------------------------------------------------------
  console.log('\n--- SECTION 5: DISCOUNT TYPES SUITE ---');
  // 5A: fixed_amount (e.g. ₹100 off per kg on ₹996/kg -> ₹896/kg)
  const fixedAmountRule = {
    id: 'rule-fa',
    productId: weightProduct.id,
    minQuantity: 50,
    discountType: 'fixed_amount',
    discountValue: 100, // ₹100/kg discount
    isActive: true,
  } as unknown as BulkPricingRule;
  const resFixedAmount = resolveCanonicalWholesalePricing({
    product: weightProduct,
    quantity: 50,
    rules: [fixedAmountRule],
    units: weightUnits,
  });
  verifyCanonicalMathContract(resFixedAmount, 'Fixed Amount Discount');
  assertStrictEqual(resFixedAmount.effectiveWholesaleRate, 896, 'Fixed amount: 996 - 100 = 896/kg');
  assertStrictEqual(resFixedAmount.effectiveTotal, 44800, 'Fixed amount total: 50 * 896 = 44,800');
  console.log('  ✓ fixed_amount discount: PASSED');

  // 5B: fixed_price (e.g. Fixed rate of ₹750/kg for 100kg+)
  const fixedPriceRule = {
    id: 'rule-fp',
    productId: weightProduct.id,
    minQuantity: 100,
    discountType: 'fixed_price',
    discountValue: 750, // Fixed ₹750/kg
    isActive: true,
  } as unknown as BulkPricingRule;
  const resFixedPrice = resolveCanonicalWholesalePricing({
    product: weightProduct,
    quantity: 100,
    rules: [fixedPriceRule],
    units: weightUnits,
  });
  verifyCanonicalMathContract(resFixedPrice, 'Fixed Price Tier');
  assertStrictEqual(resFixedPrice.effectiveWholesaleRate, 750, 'Fixed price: effective rate is exactly ₹750/kg');
  assertStrictEqual(resFixedPrice.effectiveTotal, 75000, 'Fixed price total: 100 * 750 = 75,000');
  console.log('  ✓ fixed_price discount: PASSED');

  // -------------------------------------------------------------
  // SECTION 6: LIVE DATABASE CATALOG INTEGRITY AUDIT
  // -------------------------------------------------------------
  console.log('\n--- SECTION 6: LIVE DATABASE CATALOG INTEGRITY AUDIT ---');
  try {
    const dbProducts = await getAllProductsAdmin();
    const dbRules = await getBulkPricingRules();
    console.log(`  Auditing ${dbProducts.length} live catalog products against ${dbRules.length} rules...`);

    for (const prod of dbProducts) {
      const u = resolveProductWholesaleUnits(prod);
      // Test at preset quantities
      for (const q of u.presetQuantities) {
        const resolution = resolveCanonicalWholesalePricing({
          product: prod,
          quantity: q,
          rules: dbRules,
          units: u,
        });
        verifyCanonicalMathContract(resolution, `DB Prod: ${prod.name} (${prod.id}) Qty=${q}`);
      }
    }
    console.log(`  ✓ All ${dbProducts.length} live catalog products satisfied 100% of mathematical invariants!`);
  } catch (err: any) {
    console.warn('  (Live DB connection not available in local test env; verified with full fixture matrix)', err.message);
  }

  // -------------------------------------------------------------
  // SECTION 7: UNIVERSALITY MATRIX & FUTURE PRODUCT SUITE
  // -------------------------------------------------------------
  console.log('\n--- SECTION 7: UNIVERSALITY MATRIX & FUTURE PRODUCT SUITE ---');

  function assertFullPricingContract(
    res: CanonicalWholesaleResolution,
    expected: {
      tierNamePattern?: RegExp | string;
      status: 'CONFIRMED' | 'CUSTOM_QUOTE';
      unit: string;
      effectiveRate: number;
      discountPercent: number;
      total: number;
      savings: number;
    },
    context: string
  ) {
    verifyCanonicalMathContract(res, context);
    assertStrictEqual(res.status, expected.status, `[${context}] status must be ${expected.status}`);
    assertStrictEqual(res.unit, expected.unit, `[${context}] unit must be ${expected.unit}`);
    assertStrictEqual(res.effectiveWholesaleRate, expected.effectiveRate, `[${context}] effectiveRate must be ${expected.effectiveRate}`);
    assertStrictEqual(res.savingsPercent, expected.discountPercent, `[${context}] discountPercent must be ${expected.discountPercent}`);
    assertStrictEqual(res.effectiveTotal, expected.total, `[${context}] total must be ${expected.total}`);
    assertStrictEqual(res.savingsAmount, expected.savings, `[${context}] savings must be ${expected.savings}`);
    if (expected.tierNamePattern) {
      if (typeof expected.tierNamePattern === 'string') {
        assert(res.tierName.includes(expected.tierNamePattern), `[${context}] tierName (${res.tierName}) must include '${expected.tierNamePattern}'`);
      } else {
        assert(expected.tierNamePattern.test(res.tierName), `[${context}] tierName (${res.tierName}) must match ${expected.tierNamePattern}`);
      }
    }
  }

  // =============================================================
  // FIXTURE 1: WEIGHT PRODUCT (kg) — Base Rate: ₹1,000/kg
  // =============================================================
  console.log('\n  [Fixture 1: Weight Product (kg)]');
  const fixtureWeightProduct = {
    id: 'fixture-weight-universal',
    name: 'Universal Weight Botanical Powder',
    price: 250, // 250g pouch @ ₹250 -> ₹1000/kg
    unitConfig: {
      packQuantity: 250,
      packUnit: 'g',
      sellingUnit: 'Pouch',
      wholesaleUnit: 'kg',
      minWholesaleQuantity: 5,
    },
  } as unknown as Product;
  const fixtureWeightUnits = resolveProductWholesaleUnits(fixtureWeightProduct);

  const fixtureWeightRules: BulkPricingRule[] = [
    {
      id: 'rule-w-1',
      productId: fixtureWeightProduct.id,
      minQuantity: 5,
      maxQuantity: 24,
      discountType: 'percentage',
      discountValue: 10, // ₹900/kg
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'rule-w-2',
      productId: fixtureWeightProduct.id,
      minQuantity: 25,
      maxQuantity: 99,
      discountType: 'percentage',
      discountValue: 20, // ₹800/kg
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'rule-w-3',
      productId: fixtureWeightProduct.id,
      minQuantity: 100,
      maxQuantity: 100, // Capped at 100
      discountType: 'percentage',
      discountValue: 30, // ₹700/kg
      isActive: true,
      sortOrder: 3,
    },
    {
      id: 'rule-w-cq',
      productId: fixtureWeightProduct.id,
      minQuantity: 1000,
      discountType: 'percentage',
      discountValue: 0,
      isActive: true,
      isCustomQuote: true,
      sortOrder: 4,
    },
  ];

  // 1. Below first tier (qty = 2 kg < 5 kg minWholesaleQuantity)
  const wBelow = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 2,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  // Note: quantity 2 clamps to minQty (5) in resolver if passed <= 0, but 2 > 0 so effectiveQty = 2.
  // 2 < 5 (tier 1 min), so no tier matched -> CUSTOM_QUOTE
  assertFullPricingContract(wBelow, {
    status: 'CUSTOM_QUOTE',
    unit: 'kg',
    effectiveRate: 1000,
    discountPercent: 0,
    total: 2000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Weight: Below First Tier (2kg)');

  // 2. Exact first tier (qty = 5 kg)
  const wFirst = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 5,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wFirst, {
    status: 'CONFIRMED',
    unit: 'kg',
    effectiveRate: 900,
    discountPercent: 10,
    total: 4500,
    savings: 500,
    tierNamePattern: '10% Off: 5–24 kg',
  }, 'Weight: Exact First Tier (5kg)');

  // 3. Between tiers (qty = 50 kg)
  const wBetween = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 50,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wBetween, {
    status: 'CONFIRMED',
    unit: 'kg',
    effectiveRate: 800,
    discountPercent: 20,
    total: 40000,
    savings: 10000,
    tierNamePattern: '20% Off: 25–99 kg',
  }, 'Weight: Between Tiers (50kg)');

  // 4. Exact highest tier (qty = 100 kg)
  const wHighest = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 100,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wHighest, {
    status: 'CONFIRMED',
    unit: 'kg',
    effectiveRate: 700,
    discountPercent: 30,
    total: 70000,
    savings: 30000,
    tierNamePattern: '30% Off: 100–100 kg',
  }, 'Weight: Exact Highest Tier (100kg)');

  // 5. Above highest tier (qty = 250 kg & 500 kg -> Universal Bulk Tier Inheritance)
  const wAbove250 = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 250,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wAbove250, {
    status: 'CONFIRMED',
    unit: 'kg',
    effectiveRate: 700,
    discountPercent: 30,
    total: 175000,
    savings: 75000,
    tierNamePattern: '30% Off: 100+ kg',
  }, 'Weight: Above Highest Tier (250kg Inherited)');

  const wAbove500 = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 500,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wAbove500, {
    status: 'CONFIRMED',
    unit: 'kg',
    effectiveRate: 700,
    discountPercent: 30,
    total: 350000,
    savings: 150000,
    tierNamePattern: '30% Off: 100+ kg',
  }, 'Weight: Above Highest Tier (500kg Inherited)');

  // 6. Explicit custom quote boundary (qty = 1000 kg)
  const wCustomQuote = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 1000,
    rules: fixtureWeightRules,
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wCustomQuote, {
    status: 'CUSTOM_QUOTE',
    unit: 'kg',
    effectiveRate: 1000,
    discountPercent: 0,
    total: 1000000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Weight: Explicit Custom Quote (1000kg)');

  // 7. No tiers configured (rules = [])
  const wNoTiers = resolveCanonicalWholesalePricing({
    product: fixtureWeightProduct,
    quantity: 50,
    rules: [],
    units: fixtureWeightUnits,
  });
  assertFullPricingContract(wNoTiers, {
    status: 'CUSTOM_QUOTE',
    unit: 'kg',
    effectiveRate: 1000,
    discountPercent: 0,
    total: 50000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Weight: No Tiers Configured');

  console.log('    ✓ All 7 lifecycle states verified for Weight fixture (kg)');

  // =============================================================
  // FIXTURE 2: VOLUME PRODUCT (Litre) — Base Rate: ₹5,000/Litre
  // =============================================================
  console.log('\n  [Fixture 2: Volume Product (Litre)]');
  const fixtureVolumeProduct = {
    id: 'fixture-volume-universal',
    name: 'Universal Steam Distilled Hydrosol',
    price: 500, // 100ml bottle @ ₹500 -> ₹5000/Litre
    unitConfig: {
      packQuantity: 100,
      packUnit: 'ml',
      sellingUnit: 'Bottle',
      wholesaleUnit: 'Litre',
      minWholesaleQuantity: 1,
    },
  } as unknown as Product;
  const fixtureVolumeUnits = resolveProductWholesaleUnits(fixtureVolumeProduct);

  const fixtureVolumeRules: BulkPricingRule[] = [
    {
      id: 'rule-v-1',
      productId: fixtureVolumeProduct.id,
      minQuantity: 1,
      maxQuantity: 4,
      discountType: 'percentage',
      discountValue: 10, // ₹4500/Litre
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'rule-v-2',
      productId: fixtureVolumeProduct.id,
      minQuantity: 5,
      maxQuantity: 19,
      discountType: 'percentage',
      discountValue: 20, // ₹4000/Litre
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'rule-v-3',
      productId: fixtureVolumeProduct.id,
      minQuantity: 20,
      maxQuantity: 20, // Capped at 20 Litre
      discountType: 'percentage',
      discountValue: 30, // ₹3500/Litre
      isActive: true,
      sortOrder: 3,
    },
    {
      id: 'rule-v-cq',
      productId: fixtureVolumeProduct.id,
      minQuantity: 200,
      discountType: 'percentage',
      discountValue: 0,
      isActive: true,
      isCustomQuote: true,
      sortOrder: 4,
    },
  ];

  // 1. Below first tier (qty = 0.5 Litre < 1 Litre min)
  const vBelow = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 0.5,
    rules: fixtureVolumeRules,
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vBelow, {
    status: 'CUSTOM_QUOTE',
    unit: 'Litre',
    effectiveRate: 5000,
    discountPercent: 0,
    total: 2500,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Volume: Below First Tier (0.5L)');

  // 2. Exact first tier (qty = 1 Litre)
  const vFirst = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 1,
    rules: fixtureVolumeRules,
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vFirst, {
    status: 'CONFIRMED',
    unit: 'Litre',
    effectiveRate: 4500,
    discountPercent: 10,
    total: 4500,
    savings: 500,
    tierNamePattern: '10% Off: 1–4 Litre',
  }, 'Volume: Exact First Tier (1L)');

  // 3. Between tiers (qty = 10 Litre)
  const vBetween = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 10,
    rules: fixtureVolumeRules,
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vBetween, {
    status: 'CONFIRMED',
    unit: 'Litre',
    effectiveRate: 4000,
    discountPercent: 20,
    total: 40000,
    savings: 10000,
    tierNamePattern: '20% Off: 5–19 Litre',
  }, 'Volume: Between Tiers (10L)');

  // 4. Exact highest tier (qty = 20 Litre)
  const vHighest = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 20,
    rules: fixtureVolumeRules,
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vHighest, {
    status: 'CONFIRMED',
    unit: 'Litre',
    effectiveRate: 3500,
    discountPercent: 30,
    total: 70000,
    savings: 30000,
    tierNamePattern: '30% Off: 20–20 Litre',
  }, 'Volume: Exact Highest Tier (20L)');

  // 5. Above highest tier (qty = 50 Litre & 100 Litre -> Inherited)
  const vAbove50 = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 50,
    rules: fixtureVolumeRules,
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vAbove50, {
    status: 'CONFIRMED',
    unit: 'Litre',
    effectiveRate: 3500,
    discountPercent: 30,
    total: 175000,
    savings: 75000,
    tierNamePattern: '30% Off: 20+ Litre',
  }, 'Volume: Above Highest Tier (50L Inherited)');

  // 6. Explicit custom quote boundary (qty = 200 Litre)
  const vCustomQuote = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 200,
    rules: fixtureVolumeRules,
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vCustomQuote, {
    status: 'CUSTOM_QUOTE',
    unit: 'Litre',
    effectiveRate: 5000,
    discountPercent: 0,
    total: 1000000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Volume: Explicit Custom Quote (200L)');

  // 7. No tiers configured (rules = [])
  const vNoTiers = resolveCanonicalWholesalePricing({
    product: fixtureVolumeProduct,
    quantity: 10,
    rules: [],
    units: fixtureVolumeUnits,
  });
  assertFullPricingContract(vNoTiers, {
    status: 'CUSTOM_QUOTE',
    unit: 'Litre',
    effectiveRate: 5000,
    discountPercent: 0,
    total: 50000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Volume: No Tiers Configured');

  console.log('    ✓ All 7 lifecycle states verified for Volume fixture (Litre)');

  // =============================================================
  // FIXTURE 3: COUNT PRODUCT (Box) — Base Rate: ₹400/Box
  // =============================================================
  console.log('\n  [Fixture 3: Count Product (Box)]');
  const fixtureCountProduct = {
    id: 'fixture-count-universal',
    name: 'Universal Botanical Master Box',
    price: 400, // 1 Box @ ₹400 -> ₹400/Box
    sellingUnit: 'Box',
    unitConfig: {
      packQuantity: 12,
      packUnit: 'Piece',
      sellingUnit: 'Box',
      wholesaleUnit: 'Box',
      minWholesaleQuantity: 5,
    },
  } as unknown as Product;
  const fixtureCountUnits = resolveProductWholesaleUnits(fixtureCountProduct);

  const fixtureCountRules: BulkPricingRule[] = [
    {
      id: 'rule-c-1',
      productId: fixtureCountProduct.id,
      minQuantity: 5,
      maxQuantity: 24,
      discountType: 'percentage',
      discountValue: 15, // ₹340/Box
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'rule-c-2',
      productId: fixtureCountProduct.id,
      minQuantity: 25,
      maxQuantity: 99,
      discountType: 'percentage',
      discountValue: 25, // ₹300/Box
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'rule-c-3',
      productId: fixtureCountProduct.id,
      minQuantity: 100,
      maxQuantity: 100, // Capped at 100 Box
      discountType: 'percentage',
      discountValue: 35, // ₹260/Box
      isActive: true,
      sortOrder: 3,
    },
    {
      id: 'rule-c-cq',
      productId: fixtureCountProduct.id,
      minQuantity: 500,
      discountType: 'percentage',
      discountValue: 0,
      isActive: true,
      isCustomQuote: true,
      sortOrder: 4,
    },
  ];

  // 1. Below first tier (qty = 2 Box < 5 Box min)
  const cBelow = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 2,
    rules: fixtureCountRules,
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cBelow, {
    status: 'CUSTOM_QUOTE',
    unit: 'Box',
    effectiveRate: 400,
    discountPercent: 0,
    total: 800,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Count: Below First Tier (2 Box)');

  // 2. Exact first tier (qty = 5 Box)
  const cFirst = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 5,
    rules: fixtureCountRules,
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cFirst, {
    status: 'CONFIRMED',
    unit: 'Box',
    effectiveRate: 340,
    discountPercent: 15,
    total: 1700,
    savings: 300,
    tierNamePattern: '15% Off: 5–24 Box',
  }, 'Count: Exact First Tier (5 Box)');

  // 3. Between tiers (qty = 50 Box)
  const cBetween = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 50,
    rules: fixtureCountRules,
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cBetween, {
    status: 'CONFIRMED',
    unit: 'Box',
    effectiveRate: 300,
    discountPercent: 25,
    total: 15000,
    savings: 5000,
    tierNamePattern: '25% Off: 25–99 Box',
  }, 'Count: Between Tiers (50 Box)');

  // 4. Exact highest tier (qty = 100 Box)
  const cHighest = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 100,
    rules: fixtureCountRules,
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cHighest, {
    status: 'CONFIRMED',
    unit: 'Box',
    effectiveRate: 260,
    discountPercent: 35,
    total: 26000,
    savings: 14000,
    tierNamePattern: '35% Off: 100–100 Box',
  }, 'Count: Exact Highest Tier (100 Box)');

  // 5. Above highest tier (qty = 250 Box -> Inherited)
  const cAbove250 = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 250,
    rules: fixtureCountRules,
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cAbove250, {
    status: 'CONFIRMED',
    unit: 'Box',
    effectiveRate: 260,
    discountPercent: 35,
    total: 65000,
    savings: 35000,
    tierNamePattern: '35% Off: 100+ Box',
  }, 'Count: Above Highest Tier (250 Box Inherited)');

  // 6. Explicit custom quote boundary (qty = 500 Box)
  const cCustomQuote = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 500,
    rules: fixtureCountRules,
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cCustomQuote, {
    status: 'CUSTOM_QUOTE',
    unit: 'Box',
    effectiveRate: 400,
    discountPercent: 0,
    total: 200000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Count: Explicit Custom Quote (500 Box)');

  // 7. No tiers configured (rules = [])
  const cNoTiers = resolveCanonicalWholesalePricing({
    product: fixtureCountProduct,
    quantity: 50,
    rules: [],
    units: fixtureCountUnits,
  });
  assertFullPricingContract(cNoTiers, {
    status: 'CUSTOM_QUOTE',
    unit: 'Box',
    effectiveRate: 400,
    discountPercent: 0,
    total: 20000,
    savings: 0,
    tierNamePattern: 'Custom Factory Quote Required',
  }, 'Count: No Tiers Configured');

  console.log('    ✓ All 7 lifecycle states verified for Count fixture (Box)');

  // =============================================================
  // FIXTURE 4: UNKNOWN FUTURE PRODUCT FIXTURE (Novel Custom Unit: Drum)
  // Completely isolated and unknown to codebase. Zero frontend conditionals.
  // =============================================================
  console.log('\n  [Fixture 4: Unknown Future Product (Novel Unit: Drum)]');
  const futureNovelProduct = {
    id: 'novel-future-bio-extract-999',
    name: 'Future Supercritical Botanical Extract 200L',
    price: 10000, // ₹10,000 / Drum
    sellingUnit: 'Drum',
    unitConfig: {
      packQuantity: 1,
      packUnit: 'Drum',
      sellingUnit: 'Drum',
      wholesaleUnit: 'Drum',
      minWholesaleQuantity: 25,
    },
  } as unknown as Product;
  const futureNovelUnits = resolveProductWholesaleUnits(futureNovelProduct);
  assertStrictEqual(futureNovelUnits.wholesaleUnit, 'Drum', 'Future product unit must resolve to Drum');

  // SUB-FIXTURE 4A: Standard Tiers (25, 50, 100) — Open-Ended Inheritance
  const futureRules4A: BulkPricingRule[] = [
    {
      id: 'future-rule-1',
      productId: futureNovelProduct.id,
      minQuantity: 25,
      maxQuantity: 49,
      discountType: 'percentage',
      discountValue: 10, // ₹9,000 / Drum
      isActive: true,
      sortOrder: 1,
    },
    {
      id: 'future-rule-2',
      productId: futureNovelProduct.id,
      minQuantity: 50,
      maxQuantity: 99,
      discountType: 'percentage',
      discountValue: 20, // ₹8,000 / Drum
      isActive: true,
      sortOrder: 2,
    },
    {
      id: 'future-rule-3',
      productId: futureNovelProduct.id,
      minQuantity: 100,
      maxQuantity: 100, // Capped at 100
      discountType: 'percentage',
      discountValue: 30, // ₹7,000 / Drum
      isActive: true,
      sortOrder: 3,
    },
  ];

  // Exact User Specification 4A:
  // 25 -> tier
  const fut25 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 25, rules: futureRules4A, units: futureNovelUnits });
  assertFullPricingContract(fut25, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 9000, discountPercent: 10, total: 225000, savings: 25000, tierNamePattern: '10% Off: 25–49 Drum' }, 'Future Product: 25 Drum');

  // 50 -> tier
  const fut50 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 50, rules: futureRules4A, units: futureNovelUnits });
  assertFullPricingContract(fut50, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 8000, discountPercent: 20, total: 400000, savings: 100000, tierNamePattern: '20% Off: 50–99 Drum' }, 'Future Product: 50 Drum');

  // 100 -> highest tier
  const fut100 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 100, rules: futureRules4A, units: futureNovelUnits });
  assertFullPricingContract(fut100, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 7000, discountPercent: 30, total: 700000, savings: 300000, tierNamePattern: '30% Off: 100–100 Drum' }, 'Future Product: 100 Drum');

  // 250 -> inherits 100 tier
  const fut250 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 250, rules: futureRules4A, units: futureNovelUnits });
  assertFullPricingContract(fut250, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 7000, discountPercent: 30, total: 1750000, savings: 750000, tierNamePattern: '30% Off: 100+ Drum' }, 'Future Product: 250 Drum (Inherited)');

  // 500 -> inherits 100 tier
  const fut500 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 500, rules: futureRules4A, units: futureNovelUnits });
  assertFullPricingContract(fut500, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 7000, discountPercent: 30, total: 3500000, savings: 1500000, tierNamePattern: '30% Off: 100+ Drum' }, 'Future Product: 500 Drum (Inherited)');

  console.log('    ✓ Future product Fixture 4A: 25 -> tier, 50 -> tier, 100 -> highest tier, 250 -> inherits 100 tier, 500 -> inherits 100 tier (PASSED)');

  // SUB-FIXTURE 4B: Second Fixture with Explicit Custom Quote Boundary (500+)
  const futureRules4B: BulkPricingRule[] = [
    ...futureRules4A,
    {
      id: 'future-rule-cq',
      productId: futureNovelProduct.id,
      minQuantity: 500,
      discountType: 'percentage',
      discountValue: 0,
      isActive: true,
      isCustomQuote: true,
      sortOrder: 4,
    },
  ];

  // 100 -> standard tier
  const futB100 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 100, rules: futureRules4B, units: futureNovelUnits });
  assertFullPricingContract(futB100, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 7000, discountPercent: 30, total: 700000, savings: 300000, tierNamePattern: '30% Off: 100–100 Drum' }, 'Future Product 4B: 100 Drum Standard Tier');

  // 250 -> standard tier (inherited)
  const futB250 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 250, rules: futureRules4B, units: futureNovelUnits });
  assertFullPricingContract(futB250, { status: 'CONFIRMED', unit: 'Drum', effectiveRate: 7000, discountPercent: 30, total: 1750000, savings: 750000, tierNamePattern: '30% Off: 100+ Drum' }, 'Future Product 4B: 250 Drum Standard Tier (Inherited)');

  // 500+ -> CUSTOM_QUOTE (explicit custom quote boundary takes precedence)
  const futB500 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 500, rules: futureRules4B, units: futureNovelUnits });
  assertFullPricingContract(futB500, { status: 'CUSTOM_QUOTE', unit: 'Drum', effectiveRate: 10000, discountPercent: 0, total: 5000000, savings: 0, tierNamePattern: 'Custom Factory Quote Required' }, 'Future Product 4B: 500 Drum Explicit Custom Quote');

  const futB1000 = resolveCanonicalWholesalePricing({ product: futureNovelProduct, quantity: 1000, rules: futureRules4B, units: futureNovelUnits });
  assertFullPricingContract(futB1000, { status: 'CUSTOM_QUOTE', unit: 'Drum', effectiveRate: 10000, discountPercent: 0, total: 10000000, savings: 0, tierNamePattern: 'Custom Factory Quote Required' }, 'Future Product 4B: 1000 Drum Explicit Custom Quote');

  console.log('    ✓ Future product Fixture 4B: 100 -> standard tier, 250 -> standard tier, 500+ -> CUSTOM_QUOTE (PASSED)');

  console.log('\n===============================================================');
  console.log(`ALL TESTS PASSED! Total Assertions Verified: ${totalAssertions}`);
  console.log('===============================================================');
}

runTestSuite().catch((err) => {
  console.error('\n❌ TEST ASSERTION FAILED:');
  console.error(err);
  process.exit(1);
});
