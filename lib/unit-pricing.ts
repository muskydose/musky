/**
 * MUSKY DOSE — CANONICAL GLOBAL UNIT & PRICING NORMALIZATION ENGINE
 * 
 * CORE GOVERNANCE RULE:
 * Every product commerce rate must ALWAYS be mathematically bound to its explicit unit.
 * 
 * Formula:
 * canonicalRate = packPrice / packQuantityInTargetUnit
 * 
 * Examples:
 * ₹199 / 250g = ₹0.796/g
 * ₹199 / 0.25kg = ₹796/kg
 * ₹199 / 100ml = ₹1.99/ml
 * ₹199 / 0.1L = ₹1990/L
 * ₹299 / 12 cones = ₹24.9167/cone
 * ₹299 / 1 box = ₹299/box
 * 
 * NEVER calculate a rate in wholesaleUnit (e.g. kg) and label it as pricingUnit (e.g. g).
 */

export type UnitFamily = 'weight' | 'volume' | 'count' | 'container' | 'custom';

export interface CanonicalUnitRate {
  targetUnit: string;
  rate: number;
  formattedRate: string;
  unitLabel: string;
  isExact: boolean;
}

export interface DualProductRates {
  retailRate: CanonicalUnitRate;
  wholesaleRate: CanonicalUnitRate;
  packPrice: number;
  packQuantity: number;
  packUnit: string;
  wholesaleUnit: string;
  pricingUnit: string;
}

/**
 * Standardizes raw unit strings to canonical representations.
 */
export function normalizeUnitString(rawUnit: string): string {
  if (!rawUnit) return 'Unit';
  const u = rawUnit.trim().toLowerCase();

  // Weight
  if (u === 'g' || u === 'gram' || u === 'grams' || u === 'gm' || u === 'gms') return 'g';
  if (u === 'kg' || u === 'kilo' || u === 'kilogram' || u === 'kilograms' || u === 'kgs') return 'kg';
  if (u === 'mg' || u === 'milligram' || u === 'milligrams') return 'mg';
  if (u === 'quintal' || u === 'quintals') return 'quintal';
  if (u === 'ton' || u === 'tons' || u === 'tonne' || u === 'tonnes') return 'ton';

  // Volume
  if (u === 'ml' || u === 'millilitre' || u === 'milliliter' || u === 'millilitres' || u === 'milliliters') return 'ml';
  if (u === 'l' || u === 'litre' || u === 'liter' || u === 'litres' || u === 'liters') return 'Litre';

  // Count
  if (u === 'cone' || u === 'cones') return 'cone';
  if (u === 'box' || u === 'boxes') return 'Box';
  if (u === 'piece' || u === 'pieces' || u === 'pc' || u === 'pcs') return 'Piece';

  // Containers
  if (u === 'bottle' || u === 'bottles') return 'Bottle';
  if (u === 'pouch' || u === 'pouches') return 'Pouch';
  if (u === 'jar' || u === 'jars') return 'Jar';
  if (u === 'can' || u === 'cans') return 'Can';
  if (u === 'pack' || u === 'packs' || u === 'packet' || u === 'packets') return 'Pack';

  // Retain capitalized initial
  return rawUnit.trim().charAt(0).toUpperCase() + rawUnit.trim().slice(1);
}

/**
 * Detects the measurement family for a given unit.
 */
export function getUnitFamily(unit: string): UnitFamily {
  const norm = normalizeUnitString(unit).toLowerCase();
  if (['mg', 'g', 'kg', 'quintal', 'ton'].includes(norm)) return 'weight';
  if (['ml', 'litre'].includes(norm)) return 'volume';
  if (['piece', 'cone', 'box'].includes(norm)) return 'count';
  if (['bottle', 'pouch', 'jar', 'can', 'pack'].includes(norm)) return 'container';
  return 'custom';
}

/**
 * Standard weight conversion factors to Grams (base unit).
 */
const WEIGHT_TO_GRAMS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  quintal: 100000,
  ton: 1000000,
};

/**
 * Standard volume conversion factors to Millilitres (base unit).
 */
const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  litre: 1000,
};

/**
 * Converts a quantity from one unit to another within the same measurement family,
 * or using an explicit product conversion rule.
 */
export function convertQuantity(
  qty: number,
  fromUnitRaw: string,
  toUnitRaw: string,
  conversionRule?: string
): number | null {
  if (qty <= 0) return null;

  const fromUnit = normalizeUnitString(fromUnitRaw);
  const toUnit = normalizeUnitString(toUnitRaw);

  if (fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return qty;
  }

  const fromFamily = getUnitFamily(fromUnit);
  const toFamily = getUnitFamily(toUnit);

  // 1. Same-family Weight conversion
  if (fromFamily === 'weight' && toFamily === 'weight') {
    const fromFactor = WEIGHT_TO_GRAMS[fromUnit.toLowerCase()];
    const toFactor = WEIGHT_TO_GRAMS[toUnit.toLowerCase()];
    if (fromFactor && toFactor) {
      const grams = qty * fromFactor;
      return grams / toFactor;
    }
  }

  // 2. Same-family Volume conversion
  if (fromFamily === 'volume' && toFamily === 'volume') {
    const fromFactor = VOLUME_TO_ML[fromUnit.toLowerCase()];
    const toFactor = VOLUME_TO_ML[toUnit.toLowerCase()];
    if (fromFactor && toFactor) {
      const mls = qty * fromFactor;
      return mls / toFactor;
    }
  }

  // 3. Product-specific conversion rule (e.g. "12 cones = 1 box" or "100ml = 1 bottle")
  if (conversionRule) {
    const ruleMatch = parseConversionRule(conversionRule);
    if (ruleMatch) {
      const { unitA, factorA, unitB, factorB } = ruleMatch;
      const uALower = unitA.toLowerCase();
      const uBLower = unitB.toLowerCase();
      const fromLower = fromUnit.toLowerCase();
      const toLower = toUnit.toLowerCase();

      if (fromLower === uALower && toLower === uBLower) {
        return (qty / factorA) * factorB;
      }
      if (fromLower === uBLower && toLower === uALower) {
        return (qty / factorB) * factorA;
      }
    }
  }

  return null;
}

/**
 * Parses simple conversion rules like "12 cones = 1 box" or "1 box = 12 cones".
 */
export function parseConversionRule(ruleStr: string): {
  unitA: string;
  factorA: number;
  unitB: string;
  factorB: number;
} | null {
  if (!ruleStr) return null;
  // e.g. "12 cones = 1 box" or "12 cones per box"
  const regex = /(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s*(?:=|per|in)\s*(\d+(?:\.\d+)?)\s*([a-zA-Z]+)/i;
  const match = ruleStr.match(regex);
  if (!match) return null;

  const factorA = parseFloat(match[1]);
  const unitA = normalizeUnitString(match[2]);
  const factorB = parseFloat(match[3]);
  const unitB = normalizeUnitString(match[4]);

  if (factorA > 0 && factorB > 0) {
    return { factorA, unitA, factorB, unitB };
  }
  return null;
}

/**
 * Formats a currency rate per unit with appropriate precision.
 * e.g.
 * ₹0.796 -> ₹0.80 (or ₹0.796 if sub-rupee precision needed)
 * ₹796 -> ₹796
 * ₹24.9167 -> ₹24.92
 */
export function formatRatePerUnit(rate: number, unit: string): string {
  const normUnit = normalizeUnitString(unit);
  let formattedNumber: string;

  if (rate >= 100) {
    // Large integer rates like ₹796/kg, ₹1990/Litre
    formattedNumber = Math.round(rate).toLocaleString('en-IN');
  } else if (rate >= 1) {
    // Moderate rates like ₹24.92/cone, ₹1.99/ml
    formattedNumber = (Math.round(rate * 100) / 100).toFixed(2);
  } else {
    // Small rates like ₹0.796/g
    // Show 3 decimals if 3rd decimal is non-zero, otherwise 2 decimals
    const rounded3 = Math.round(rate * 1000) / 1000;
    formattedNumber = rounded3.toFixed(3);
  }

  return `₹${formattedNumber} / ${normUnit}`;
}

/**
 * Derives canonical rate per target unit strictly adhering to:
 * canonicalRate = packPrice / packQuantityInTargetUnit
 */
export function deriveCanonicalRate(
  packPrice: number,
  packQuantity: number,
  packUnitRaw: string,
  targetUnitRaw: string,
  conversionRule?: string
): CanonicalUnitRate {
  const targetUnit = normalizeUnitString(targetUnitRaw);
  const packUnit = normalizeUnitString(packUnitRaw);

  if (packPrice <= 0 || packQuantity <= 0) {
    return {
      targetUnit,
      rate: 0,
      formattedRate: `₹0 / ${targetUnit}`,
      unitLabel: `/ ${targetUnit}`,
      isExact: true,
    };
  }

  // Convert pack quantity to target unit
  const qtyInTargetUnit = convertQuantity(packQuantity, packUnit, targetUnit, conversionRule);

  if (qtyInTargetUnit === null || qtyInTargetUnit <= 0) {
    // If conversion is not possible mathematically (e.g. piece to kg without conversion rule),
    // fall back to base pack price / pack unit
    return {
      targetUnit: packUnit,
      rate: packPrice / packQuantity,
      formattedRate: formatRatePerUnit(packPrice / packQuantity, packUnit),
      unitLabel: `/ ${packUnit}`,
      isExact: false,
    };
  }

  const rate = packPrice / qtyInTargetUnit;

  return {
    targetUnit,
    rate,
    formattedRate: formatRatePerUnit(rate, targetUnit),
    unitLabel: `/ ${targetUnit}`,
    isExact: true,
  };
}

/**
 * Resolves both Retail Base Rate and Wholesale Base Rate for any product.
 * Guarantees that:
 * - retailRate is in packUnit (or canonical pricingUnit)
 * - wholesaleRate is in wholesaleUnit
 * - Both are mathematically derived from packPrice and packQuantity
 */
export function deriveDualProductRates(
  packPrice: number,
  packQuantity: number,
  packUnitRaw: string,
  wholesaleUnitRaw: string,
  pricingUnitRaw?: string,
  conversionRule?: string
): DualProductRates {
  const packUnit = normalizeUnitString(packUnitRaw);
  const wholesaleUnit = normalizeUnitString(wholesaleUnitRaw);
  const pricingUnit = normalizeUnitString(pricingUnitRaw || packUnit);

  // If conversionRule is not provided but pack is count-based (e.g. 12 cones = 1 box),
  // derive it if packUnit is cone and wholesaleUnit is Box
  let effectiveRule = conversionRule;
  if (!effectiveRule && packUnit.toLowerCase() === 'cone' && wholesaleUnit.toLowerCase() === 'box' && packQuantity > 0) {
    effectiveRule = `${packQuantity} cones = 1 box`;
  }

  const retailRate = deriveCanonicalRate(
    packPrice,
    packQuantity,
    packUnit,
    pricingUnit,
    effectiveRule
  );

  const wholesaleRate = deriveCanonicalRate(
    packPrice,
    packQuantity,
    packUnit,
    wholesaleUnit,
    effectiveRule
  );

  return {
    retailRate,
    wholesaleRate,
    packPrice,
    packQuantity,
    packUnit,
    wholesaleUnit,
    pricingUnit,
  };
}

