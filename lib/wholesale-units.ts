/**
 * MUSKY DOSE — CANONICAL PRODUCT WHOLESALE UNIT RESOLVER
 * Eliminates all legacy universal-KG assumptions and resolves dynamic units
 * (kg, Litre, Box, Piece, Bottle, Pouch) directly from product records and the
 * canonical Unit & Pricing Engine (lib/unit-pricing.ts).
 */

import { Product } from './types';
import { deriveProductUnitIntelligence } from './growth/product-autofill-engine';
import {
  deriveDualProductRates,
  deriveCanonicalRate,
  normalizeUnitString,
  DualProductRates,
} from './unit-pricing';

export interface ResolvedWholesaleUnits {
  sellingUnit: string; // e.g. 'Pouch', 'Bottle', 'Cone', 'Jar', 'Piece'
  packUnit: string; // e.g. 'g', 'ml', 'Piece', 'Litre'
  packQuantity: number; // e.g. 250, 100, 12, 10
  pricingUnit: string; // e.g. 'g', 'kg', 'ml', 'Litre', 'Piece', 'Box'
  wholesaleUnit: string; // e.g. 'kg', 'Litre', 'Box', 'Piece'
  minWholesaleQuantity: number;
  maxWholesaleQuantity: number;
  conversionRule: string; // e.g. '1000g = 1kg', '1000ml = 1 Litre', '12 Cones = 1 Box'
  presetQuantities: number[];
  targetQuantityLabel: string; // e.g. "Target Quantity in Kilograms (kg)" or "Target Quantity in Litres (L)" or "Target Quantity in Boxes (Box)"
  inputUnitBadge: string; // e.g. "kg", "Litre", "Box", "Piece"
  pricePerUnitLabel: string; // e.g. "/ kg", "/ Litre", "/ Box"
  rates: DualProductRates; // Canonical retail & wholesale rates
  equivalentPackagesText: (qty: number) => string;
  confidence: 'VERIFIED' | 'ADMIN_DEFINED' | 'DERIVED' | 'NEEDS_REVIEW';
}

/**
 * Resolves full wholesale unit metadata and canonical pricing rates for any product.
 */
export function resolveProductWholesaleUnits(product: Product): ResolvedWholesaleUnits {
  const retailPrice = Number(product?.price) || 199;

  if (!product) {
    const fallbackRates = deriveDualProductRates(199, 1, 'Unit', 'Unit', 'Unit');
    return {
      sellingUnit: 'Unit',
      packUnit: 'Unit',
      packQuantity: 1,
      pricingUnit: 'Unit',
      wholesaleUnit: 'Unit',
      minWholesaleQuantity: 1,
      maxWholesaleQuantity: 1000,
      conversionRule: '1 Unit = 1 Item',
      presetQuantities: [5, 10, 25, 50, 100],
      targetQuantityLabel: 'Target Quantity',
      inputUnitBadge: 'Units',
      pricePerUnitLabel: '/ Unit',
      rates: fallbackRates,
      equivalentPackagesText: (qty: number) => `${qty} units`,
      confidence: 'NEEDS_REVIEW',
    };
  }

  // 1. Check explicit Admin configuration
  if (product.unitConfig && product.unitConfig.wholesaleUnit && product.unitConfig.sellingUnit) {
    const uc = product.unitConfig;
    const wUnit = normalizeUnitString(uc.wholesaleUnit);
    const pUnit = normalizeUnitString(uc.pricingUnit || wUnit);
    const packU = normalizeUnitString(uc.packUnit || 'Unit');
    const isBox = wUnit.toLowerCase() === 'box';
    const isLitre = wUnit.toLowerCase() === 'litre';
    const isKg = wUnit.toLowerCase() === 'kg';

    const presets = isBox
      ? [1, 2, 5, 10, 25, 50, 100, 200]
      : isLitre
      ? [1, 2, 5, 10, 25, 50, 100, 250]
      : [5, 10, 25, 50, 100, 250, 500, 1000];

    const conversionRule = uc.conversionRule || `${uc.packQuantity} ${packU} = 1 ${uc.sellingUnit}`;
    const rates = deriveDualProductRates(
      retailPrice,
      uc.packQuantity || 1,
      packU,
      wUnit,
      pUnit,
      conversionRule
    );

    return {
      sellingUnit: uc.sellingUnit,
      packUnit: packU,
      packQuantity: uc.packQuantity,
      pricingUnit: pUnit,
      wholesaleUnit: wUnit,
      minWholesaleQuantity: uc.minWholesaleQuantity ?? (isBox ? 1 : isLitre ? 1 : 5),
      maxWholesaleQuantity: uc.maxWholesaleQuantity ?? 10000,
      conversionRule,
      presetQuantities: presets,
      targetQuantityLabel: `Target Quantity in ${wUnit}s (${wUnit})`,
      inputUnitBadge: wUnit,
      pricePerUnitLabel: `/ ${wUnit}`,
      rates,
      equivalentPackagesText: (qty: number) => {
        if (isBox) return `${qty * (uc.packQuantity || 12)} individual ${uc.sellingUnit.toLowerCase()}s (${uc.packQuantity || 12}/box)`;
        if (isLitre) return `${Math.floor((qty * 1000) / (uc.packQuantity || 100))} bottles (${uc.packQuantity || 100}ml) or ${qty} Litre cans`;
        return `${Math.floor((qty * 1000) / (uc.packQuantity || 250))} pouches (${uc.packQuantity || 250}g) or ${(qty / 25).toFixed(1)} sacks (25kg)`;
      },
      confidence: uc.confidence || 'ADMIN_DEFINED',
    };
  }

  // 2. Derive unit intelligence dynamically from product taxonomy and pack info
  const derived = deriveProductUnitIntelligence(
    product.name,
    product.quantityOrWeight,
    product.categoryName,
    product.productType
  );

  const wUnit = normalizeUnitString(derived.wholesaleUnit);
  const pUnit = normalizeUnitString(derived.pricingUnit || wUnit);
  const packU = normalizeUnitString(derived.packUnit || 'Unit');
  const isBox = wUnit.toLowerCase() === 'box';
  const isLitre = wUnit.toLowerCase() === 'litre';
  const isKg = wUnit.toLowerCase() === 'kg';

  let presets = [5, 10, 25, 50, 100, 250, 500, 1000];
  let minQty = 5;

  if (isBox) {
    presets = [1, 2, 5, 10, 25, 50, 100, 200];
    minQty = 1;
  } else if (isLitre) {
    presets = [1, 2, 5, 10, 25, 50, 100, 250];
    minQty = 1;
  }

  const targetLabel = isBox
    ? 'Target Quantity in Master Boxes'
    : isLitre
    ? 'Target Quantity in Litres (L)'
    : isKg
    ? 'Target Quantity in Kilograms (kg)'
    : `Target Quantity in ${wUnit}s`;

  const conversionRule = derived.conversionRule || '';
  const rates = deriveDualProductRates(
    retailPrice,
    derived.packQuantity || 1,
    packU,
    wUnit,
    pUnit,
    conversionRule
  );

  return {
    sellingUnit: derived.sellingUnit,
    packUnit: packU,
    packQuantity: derived.packQuantity,
    pricingUnit: pUnit,
    wholesaleUnit: wUnit,
    minWholesaleQuantity: derived.minWholesaleQuantity ?? minQty,
    maxWholesaleQuantity: derived.maxWholesaleQuantity ?? 10000,
    conversionRule,
    presetQuantities: presets,
    targetQuantityLabel: targetLabel,
    inputUnitBadge: wUnit,
    pricePerUnitLabel: `/ ${wUnit}`,
    rates,
    equivalentPackagesText: (qty: number) => {
      if (isBox) {
        return `${qty * (derived.packQuantity || 12)} individual cones (${derived.packQuantity || 12} cones/box)`;
      }
      if (isLitre) {
        return `${Math.floor((qty * 1000) / (derived.packQuantity || 100))} bottles (${derived.packQuantity || 100}ml) or ${qty} Litre master cans`;
      }
      if (isKg) {
        return `${Math.floor((qty * 1000) / (derived.packQuantity || 250))} pouches (${derived.packQuantity || 250}g) or ${(qty / 25).toFixed(1)} bags (25kg)`;
      }
      return `${qty} ${wUnit}s`;
    },
    confidence: derived.confidence || 'DERIVED',
  };
}

/**
 * Calculates normalized base rate per wholesale unit from retail pack price.
 * Strictly delegates to canonical unit pricing engine.
 */
export function calculateProductBaseWholesaleRate(product: Product, units: ResolvedWholesaleUnits): number {
  if (units?.rates?.wholesaleRate?.rate != null && units.rates.wholesaleRate.rate > 0) {
    return Math.round(units.rates.wholesaleRate.rate);
  }
  const retailPrice = Number(product?.price) || 199;
  const canonical = deriveCanonicalRate(
    retailPrice,
    units.packQuantity || 1,
    units.packUnit || 'Unit',
    units.wholesaleUnit || 'Unit',
    units.conversionRule
  );
  return Math.round(canonical.rate);
}
