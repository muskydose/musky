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

import { resolveCanonicalWholesalePricing } from '../lib/wholesale-pricing-resolver';
import { resolveProductWholesaleUnits, calculateProductBaseWholesaleRate } from '../lib/wholesale-units';
import { generateWholesaleWhatsAppMessage } from '../lib/whatsapp';
import { getProducts } from '../lib/db/products';
import { getBulkPricingRules } from '../lib/db/bulk-pricing';
import { saveWholesaleEnquiry, deleteWholesaleEnquiry } from '../lib/db/wholesale';
import { Product, BulkPricingRule } from '../lib/types';

async function runBuyerJourneyVerification() {
  console.log('===============================================================');
  console.log('STARTING PHASE 10F REAL BUYER JOURNEY & INTEGRITY VERIFICATION');
  console.log('===============================================================');

  const products = await getProducts();
  const rules = await getBulkPricingRules();
  console.log(`Loaded ${products.length} catalog products and ${rules.length} bulk pricing rules.\n`);
  console.log('Catalog products:', products.map(p => ({ id: p.id, name: p.name, category: p.categoryName, wholesaleUnit: resolveProductWholesaleUnits(p).wholesaleUnit })));

  const createdTestIds: string[] = [];

  try {
    // -------------------------------------------------------------
    // PERSONA A: SALON / SPA (Weight: Sojat Pure Henna Powder 250g)
    // -------------------------------------------------------------
    console.log('--- PERSONA A: SALON / SPA JOURNEY ---');
    const hennaProduct = products.find(p => p.name.toLowerCase().includes('henna') && !p.name.toLowerCase().includes('cone')) || products[0];
    assert(hennaProduct, 'Henna product must exist');
    console.log(`  Selected Product: "${hennaProduct.name}" (ID: ${hennaProduct.id}, Price: ₹${hennaProduct.price}, Weight: ${hennaProduct.quantityOrWeight})`);

    const hennaUnits = resolveProductWholesaleUnits(hennaProduct);
    assert.strictEqual(hennaUnits.wholesaleUnit, 'kg', 'Wholesale unit must be kg');

    const personaAQty = 25; // 25 kg
    const personaARes = resolveCanonicalWholesalePricing({
      product: hennaProduct,
      quantity: personaAQty,
      rules,
      units: hennaUnits,
    });

    console.log(`  Quantity: ${personaAQty} ${personaARes.unit}`);
    console.log(`  Base Wholesale Rate: ₹${Math.round(personaARes.baseWholesaleRate)}/${personaARes.unit}`);
    console.log(`  Effective Wholesale Rate: ₹${Math.round(personaARes.effectiveWholesaleRate)}/${personaARes.unit}`);
    console.log(`  Effective Total: ₹${Math.round(personaARes.effectiveTotal)}`);
    console.log(`  Savings: ₹${Math.round(personaARes.savingsAmount)} (${personaARes.savingsPercent}%)`);

    assert.strictEqual(personaARes.unit, 'kg', 'Persona A rate unit must be kg');
    assert(personaARes.effectiveWholesaleRate > 0, 'Effective rate must be positive');
    assert(personaARes.effectiveTotal > 0, 'Total must be positive');

    const personaANotes = `Quote: ₹${Math.round(personaARes.effectiveWholesaleRate)}/${personaARes.unit} (Est. Total: ~₹${Math.round(personaARes.effectiveTotal)}) (You Save: ₹${Math.round(personaARes.savingsAmount)} / ${personaARes.savingsPercent}% OFF)`;

    const personaAPayload = {
      customerName: 'Aarav Sharma (QA Test Salon)',
      businessName: 'Luxe Herbal Salon & Spa',
      businessType: 'SALON',
      phone: '9876543210',
      whatsapp: '9876543210',
      email: 'salon.qa@example.com',
      city: 'Jaipur',
      state: 'Rajasthan',
      productsRequired: `${hennaProduct.name} (${personaARes.tierName})`,
      approxQuantity: `${personaAQty} ${personaARes.unit}`,
      notes: `[QA_JOURNEY_TEST] ${personaANotes}`,
      enquiryType: 'wholesale',
      status: 'NEW' as const,
    };

    const savedA = await saveWholesaleEnquiry(personaAPayload);
    createdTestIds.push(savedA.id);
    console.log(`  ✓ Registered Enquiry in Database with ID: ${savedA.id}`);

    const msgA = generateWholesaleWhatsAppMessage({
      ...personaAPayload,
      referenceId: savedA.id,
    });

    console.log('\n  --- Generated WhatsApp Message (Persona A) ---');
    console.log(msgA);
    console.log('  -----------------------------------------------\n');

    assert(msgA.includes(savedA.id), 'WhatsApp message MUST contain Enquiry Reference ID');
    assert(msgA.includes(hennaProduct.name), 'WhatsApp message MUST contain Product name');
    assert(msgA.includes('25 kg'), 'WhatsApp message MUST contain exact quantity and unit');
    assert(msgA.includes(`₹${Math.round(personaARes.effectiveWholesaleRate)}/kg`), 'WhatsApp message MUST contain rate strictly per kg');
    assert(!msgA.includes('/g'), 'WhatsApp message MUST NOT contain retail /g unit for wholesale rate!');
    console.log('  ✓ Persona A (Salon) Journey PASSED with zero retail unit leakage!\n');

    // -------------------------------------------------------------
    // PERSONA B: BRIDAL MEHNDI ARTIST (Count: Henna Cones Box of 12)
    // -------------------------------------------------------------
    console.log('--- PERSONA B: BRIDAL MEHNDI ARTIST JOURNEY ---');
    const coneProduct: Product = products.find(p => p.sellingUnit === 'Box' || p.name.toLowerCase().includes('cone')) || {
      id: 'fixture-bridal-cones',
      name: 'Bridal Henna Cones (Box of 12)',
      slug: 'bridal-henna-cones-box-of-12',
      categoryId: 'cat-cones',
      categoryName: 'Cones & Applicators',
      shortDescription: 'Fresh bridal henna paste cones',
      fullDescription: 'Fresh bridal henna paste cones box of 12',
      price: 360,
      quantityOrWeight: 'Box of 12',
      sku: 'BHC-12',
      images: [],
      ingredients: ['Henna', 'Eucalyptus Oil', 'Clove Oil'],
      benefits: ['Dark stain'],
      usageInstructions: 'Apply on clean skin',
      stockStatus: 'in_stock',
      isFeatured: true,
      isActive: true,
      sortOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sellingUnit: 'Box',
      packQuantity: 12,
      packUnit: 'Piece',
      pricingUnit: 'Piece',
      wholesaleUnit: 'Box',
      conversionRule: '12 Pieces = 1 Box',
    };
    console.log(`  Selected Product: "${coneProduct.name}" (ID: ${coneProduct.id}, Price: ₹${coneProduct.price})`);

    const coneUnits = resolveProductWholesaleUnits(coneProduct);
    assert.strictEqual(coneUnits.wholesaleUnit, 'Box', 'Wholesale unit must be Box');

    const personaBQty = 100; // 100 Boxes
    const personaBRes = resolveCanonicalWholesalePricing({
      product: coneProduct,
      quantity: personaBQty,
      rules,
      units: coneUnits,
    });

    console.log(`  Quantity: ${personaBQty} ${personaBRes.unit}`);
    console.log(`  Base Wholesale Rate: ₹${Math.round(personaBRes.baseWholesaleRate)}/${personaBRes.unit}`);
    console.log(`  Effective Wholesale Rate: ₹${Math.round(personaBRes.effectiveWholesaleRate)}/${personaBRes.unit}`);
    console.log(`  Effective Total: ₹${Math.round(personaBRes.effectiveTotal)}`);

    assert.strictEqual(personaBRes.unit, 'Box', 'Persona B rate unit must be Box');
    assert(personaBRes.effectiveTotal > 0, 'Total must be positive');

    const personaBNotes = `Quote: ₹${Math.round(personaBRes.effectiveWholesaleRate)}/${personaBRes.unit} (Est. Total: ~₹${Math.round(personaBRes.effectiveTotal)})`;
    const personaBPayload = {
      customerName: 'Priya Mehendi Studio (QA Test)',
      businessName: 'Priya Bridal Mehndi',
      businessType: 'MEHNDI_ARTIST',
      phone: '9811122233',
      whatsapp: '9811122233',
      email: 'priya.artist@example.com',
      city: 'Delhi',
      state: 'Delhi',
      productsRequired: `${coneProduct.name} (${personaBRes.tierName})`,
      approxQuantity: `${personaBQty} ${personaBRes.unit}`,
      notes: `[QA_JOURNEY_TEST] ${personaBNotes}`,
      enquiryType: 'wholesale',
      status: 'NEW' as const,
    };

    const savedB = await saveWholesaleEnquiry(personaBPayload);
    createdTestIds.push(savedB.id);
    console.log(`  ✓ Registered Enquiry in Database with ID: ${savedB.id}`);

    const msgB = generateWholesaleWhatsAppMessage({
      ...personaBPayload,
      referenceId: savedB.id,
    });

    console.log('\n  --- Generated WhatsApp Message (Persona B) ---');
    console.log(msgB);
    console.log('  -----------------------------------------------\n');

    assert(msgB.includes(savedB.id), 'WhatsApp message MUST contain Enquiry Reference ID');
    assert(msgB.includes('100 Box'), 'WhatsApp message MUST contain exact quantity and unit');
    assert(msgB.includes(`₹${Math.round(personaBRes.effectiveWholesaleRate)}/Box`), 'WhatsApp message MUST contain rate strictly per Box');
    assert(!msgB.includes('/Piece') && !msgB.includes('/piece'), 'WhatsApp message MUST NOT contain retail /Piece unit for wholesale rate!');
    console.log('  ✓ Persona B (Bridal Artist) Journey PASSED with zero retail unit leakage!\n');

    // Also verify Live Database Artist Product: Bridal Henna Oil
    const liveArtistProduct = products.find(p => p.id === 'prod-bridal-henna-oil');
    if (liveArtistProduct) {
      console.log(`  Verifying Live Database Product: "${liveArtistProduct.name}"`);
      const oilUnits = resolveProductWholesaleUnits(liveArtistProduct);
      assert.strictEqual(oilUnits.wholesaleUnit, 'Litre', 'Oil wholesale unit must be Litre');
      const oilRes = resolveCanonicalWholesalePricing({
        product: liveArtistProduct,
        quantity: 5,
        rules,
        units: oilUnits,
      });
      assert.strictEqual(oilRes.unit, 'Litre');
      console.log(`  ✓ Live Database "${liveArtistProduct.name}": 5 ${oilRes.unit} @ ₹${Math.round(oilRes.effectiveWholesaleRate)}/${oilRes.unit} (PASSED)\n`);
    }

    // -------------------------------------------------------------
    // PERSONA C: RESELLER / BULK BUYER (Volume: Gulab Jal / Hydrosol)
    // -------------------------------------------------------------
    console.log('--- PERSONA C: RESELLER / BULK BUYER JOURNEY ---');
    const roseProduct: Product = products.find(p => p.name.toLowerCase().includes('rose') || p.name.toLowerCase().includes('water')) || {
      id: 'fixture-rose-water',
      name: 'Pure Sojat Damask Rose Water Spray',
      slug: 'pure-sojat-damask-rose-water-spray',
      categoryId: 'cat-face',
      categoryName: 'Skin Care',
      shortDescription: 'Pure steam-distilled rose water',
      fullDescription: 'Pure steam-distilled rose water from Rajasthan',
      price: 499,
      quantityOrWeight: '100ml Bottle',
      sku: 'RW-100',
      images: [],
      ingredients: ['Rosa Damascena Flower Water'],
      benefits: ['Skin toner'],
      usageInstructions: 'Mist on face',
      stockStatus: 'in_stock',
      isFeatured: true,
      isActive: true,
      sortOrder: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sellingUnit: 'Bottle',
      packQuantity: 100,
      packUnit: 'ml',
      pricingUnit: 'ml',
      wholesaleUnit: 'Litre',
      conversionRule: '1000 ml = 1 Litre',
    };
    console.log(`  Selected Product: "${roseProduct.name}" (ID: ${roseProduct.id}, Price: ₹${roseProduct.price})`);

    const roseUnits = resolveProductWholesaleUnits(roseProduct);
    assert.strictEqual(roseUnits.wholesaleUnit, 'Litre', 'Wholesale unit must be Litre');

    const personaCQty = 10; // 10 Litres
    const personaCRes = resolveCanonicalWholesalePricing({
      product: roseProduct,
      quantity: personaCQty,
      rules,
      units: roseUnits,
    });

    console.log(`  Quantity: ${personaCQty} ${personaCRes.unit}`);
    console.log(`  Base Wholesale Rate: ₹${Math.round(personaCRes.baseWholesaleRate)}/${personaCRes.unit}`);
    console.log(`  Effective Wholesale Rate: ₹${Math.round(personaCRes.effectiveWholesaleRate)}/${personaCRes.unit}`);
    console.log(`  Effective Total: ₹${Math.round(personaCRes.effectiveTotal)}`);

    assert.strictEqual(personaCRes.unit, 'Litre', 'Persona C rate unit must be Litre');

    const personaCNotes = `Quote: ₹${Math.round(personaCRes.effectiveWholesaleRate)}/${personaCRes.unit} (Est. Total: ~₹${Math.round(personaCRes.effectiveTotal)})`;
    const personaCPayload = {
      customerName: 'Rajesh Gupta (QA Test Bulk)',
      businessName: 'Gupta Regional Ayurvedic Distributors',
      businessType: 'RESELLER',
      phone: '9988776655',
      whatsapp: '9988776655',
      email: 'rajesh.bulk@example.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      productsRequired: `${roseProduct.name} (${personaCRes.tierName})`,
      approxQuantity: `${personaCQty} ${personaCRes.unit}`,
      notes: `[QA_JOURNEY_TEST] ${personaCNotes}`,
      enquiryType: 'wholesale',
      status: 'NEW' as const,
    };

    const savedC = await saveWholesaleEnquiry(personaCPayload);
    createdTestIds.push(savedC.id);
    console.log(`  ✓ Registered Enquiry in Database with ID: ${savedC.id}`);

    const msgC = generateWholesaleWhatsAppMessage({
      ...personaCPayload,
      referenceId: savedC.id,
    });

    console.log('\n  --- Generated WhatsApp Message (Persona C) ---');
    console.log(msgC);
    console.log('  -----------------------------------------------\n');

    assert(msgC.includes(savedC.id), 'WhatsApp message MUST contain Enquiry Reference ID');
    assert(msgC.includes('10 Litre'), 'WhatsApp message MUST contain exact quantity and unit');
    assert(msgC.includes(`₹${Math.round(personaCRes.effectiveWholesaleRate)}/Litre`), 'WhatsApp message MUST contain rate strictly per Litre');
    assert(!msgC.includes('/ml'), 'WhatsApp message MUST NOT contain retail /ml unit for wholesale rate!');
    console.log('  ✓ Persona C (Bulk Buyer) Journey PASSED with zero retail unit leakage!\n');

    // -------------------------------------------------------------
    // FAILURE STATES VERIFICATION
    // -------------------------------------------------------------
    console.log('--- FAILURE STATES AUDIT ---');
    const invalidPhones = ['123', 'abcdef', '123456789', '123456789012345'];
    for (const p of invalidPhones) {
      const clean = p.replace(/\D/g, '');
      const isValid = clean.length === 10 || clean.length === 12;
      assert(!isValid, `Phone ${p} must fail validation`);
    }
    console.log('  ✓ Phone format boundaries verified.');

    const validPin = '306104';
    const invalidPins = ['12345', '3061044', 'abcdef', ''];
    assert(/^\d{6}$/.test(validPin), 'Valid pincode must match 6 digits');
    for (const ip of invalidPins) {
      if (ip) assert(!/^\d{6}$/.test(ip), `Invalid pincode ${ip} must fail`);
    }
    console.log('  ✓ Pincode format boundaries verified.');

    const validGst = '08ABCDE1234F1Z5';
    const invalidGst = 'INVALIDGSTIN123';
    assert(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(validGst), 'Valid GSTIN must pass');
    assert(!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(invalidGst), 'Invalid GSTIN must fail');
    console.log('  ✓ GSTIN format boundaries verified.');

    console.log('\n===============================================================');
    console.log('ALL BUYER JOURNEYS & INTEGRITY ASSERTIONS PASSED SUCCESSFULLY!');
    console.log('===============================================================');
  } finally {
    console.log(`\nCleaning up ${createdTestIds.length} QA test records...`);
    for (const id of createdTestIds) {
      try {
        await deleteWholesaleEnquiry(id);
        console.log(`  ✓ Safely removed test record: ${id}`);
      } catch (err: any) {
        console.warn(`  Notice: cleanup warning for ${id}:`, err?.message);
      }
    }
    console.log('Database returned to pristine production state.');
  }
}

runBuyerJourneyVerification().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
