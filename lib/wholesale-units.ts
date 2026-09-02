/**
 * MUSKY DOSE — CANONICAL PRODUCT WHOLESALE UNIT RESOLVER
 * Eliminates all legacy universal-KG assumptions and resolves dynamic units
 * (kg, Litre, Box, Piece, Bottle, Pouch) directly from product records.
 */

import { Product } from './types';
import { deriveProductUnitIntelligence } from './growth/product-autofill-engine';

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
  pricePerUnitLabel: string; // e.g. "₹X / kg", "₹X / Litre", "₹X / Box"
  equivalentPackagesText: (qty: number) => string;
  confidence: 'VERIFIED' | 'ADMIN_DEFINED' | 'DERIVED' | 'NEEDS_REVIEW';
}

/**
 * Resolves full wholesale unit metadata for any product dynamically.
 */
export function resolveProductWholesaleUnits(product: Product): ResolvedWholesaleUnits {
  if (!product) {
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
      pricePerUnitLabel: '/ unit',
      equivalentPackagesText: (qty: number) => `${qty} units`,
      confidence: 'NEEDS_REVIEW',
    };
  }

  // 1. Check explicit Admin configuration
  if (product.unitConfig && product.unitConfig.wholesaleUnit && product.unitConfig.sellingUnit) {
    const uc = product.unitConfig;
    const wUnit = uc.wholesaleUnit;
    const pUnit = uc.pricingUnit || wUnit;
    const isBox = wUnit.toLowerCase() === 'box';
    const isLitre = wUnit.toLowerCase() === 'litre' || wUnit.toLowerCase() === 'liter' || wUnit.toLowerCase() === 'l';
    const isKg = wUnit.toLowerCase() === 'kg';

    const presets = isBox
      ? [1, 2, 5, 10, 25, 50, 100, 200]
      : isLitre
      ? [1, 2, 5, 10, 25, 50, 100, 250]
      : [5, 10, 25, 50, 100, 250, 500, 1000];

    return {
      sellingUnit: uc.sellingUnit,
      packUnit: uc.packUnit,
      packQuantity: uc.packQuantity,
      pricingUnit: pUnit,
      wholesaleUnit: wUnit,
      minWholesaleQuantity: uc.minWholesaleQuantity ?? (isBox ? 1 : isLitre ? 1 : 5),
      maxWholesaleQuantity: uc.maxWholesaleQuantity ?? 10000,
      conversionRule: uc.conversionRule || `${uc.packQuantity} ${uc.packUnit} = 1 ${uc.sellingUnit}`,
      presetQuantities: presets,
      targetQuantityLabel: `Target Quantity in ${wUnit}s (${wUnit})`,
      inputUnitBadge: wUnit,
      pricePerUnitLabel: `/ ${wUnit}`,
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

  const wUnit = derived.wholesaleUnit;
  const pUnit = derived.pricingUnit || wUnit;
  const isBox = wUnit.toLowerCase() === 'box';
  const isLitre = wUnit.toLowerCase() === 'litre' || wUnit.toLowerCase() === 'liter' || wUnit.toLowerCase() === 'l';
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

  return {
    sellingUnit: derived.sellingUnit,
    packUnit: derived.packUnit,
    packQuantity: derived.packQuantity,
    pricingUnit: pUnit,
    wholesaleUnit: wUnit,
    minWholesaleQuantity: derived.minWholesaleQuantity ?? minQty,
    maxWholesaleQuantity: derived.maxWholesaleQuantity ?? 10000,
    conversionRule: derived.conversionRule || '',
    presetQuantities: presets,
    targetQuantityLabel: targetLabel,
    inputUnitBadge: wUnit,
    pricePerUnitLabel: `/ ${wUnit}`,
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
 */
export function calculateProductBaseWholesaleRate(product: Product, units: ResolvedWholesaleUnits): number {
  const retailPrice = Number(product.price) || 199;
  const pQty = units.packQuantity || 1;
  const pUnit = (units.packUnit || '').toLowerCase();
  const wUnit = (units.wholesaleUnit || '').toLowerCase();

  // If wholesale unit is count-based (e.g. Box of 12 cones, Bottle, Jar)
  if (wUnit === 'box' || wUnit === 'piece' || wUnit === 'bottle' || wUnit === 'jar' || wUnit === 'set') {
    return retailPrice;
  }

  // Weight normalization to rate per kg
  if (wUnit === 'kg') {
    if (pUnit === 'g' && pQty > 0) {
      return Math.round((retailPrice / pQty) * 1000);
    }
    if ((pUnit === 'kg' || pUnit === 'kilogram') && pQty > 0) {
      return Math.round(retailPrice / pQty);
    }
    return retailPrice;
  }

  // Volume normalization to rate per Litre
  if (wUnit === 'litre' || wUnit === 'liter' || wUnit === 'l') {
    if (pUnit === 'ml' && pQty > 0) {
      return Math.round((retailPrice / pQty) * 1000);
    }
    if ((pUnit === 'litre' || pUnit === 'liter' || pUnit === 'l') && pQty > 0) {
      return Math.round(retailPrice / pQty);
    }
    return retailPrice;
  }

  return retailPrice;
}
