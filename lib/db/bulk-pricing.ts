import { getSupabaseAdmin } from '@/lib/supabase';
import { SupabaseClient } from '@supabase/supabase-js';
import { BulkPricingRule, Product } from '@/lib/types';
import { getProducts, getAllProductsAdmin } from './products';
import { getSiteSettings } from './settings';

let memoryBulkPricingStore: BulkPricingRule[] = [];
let bulkStoreInitialized = false;

function requireSupabaseAdmin(): SupabaseClient {
  const client = getSupabaseAdmin();
  if (!client) {
    throw new Error(
      'Supabase Database connection is unavailable. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are properly configured.'
    );
  }
  return client;
}

// ============================================================
// BULK PRICING OPERATIONS
// ============================================================

export function mapRowToBulkPricingRule(row: any, products: Product[] = []): BulkPricingRule {
  const rawId = row.product_id || row.productId;
  const pId = !rawId || rawId === 'global' ? 'global' : rawId;
  let pName = 'Global / All Products';
  if (pId !== 'global') {
    const matched = products.find((p) => p.id === pId);
    if (matched) {
      pName = matched.name;
    } else if (row.product_name || row.productName) {
      pName = row.product_name || row.productName;
    } else {
      pName = `Product (${pId})`;
    }
  }

  return {
    id: row.id,
    productId: pId,
    productName: pName,
    minQuantity: Number(row.min_quantity ?? row.minQuantity ?? 1),
    maxQuantity: row.max_quantity !== null && row.max_quantity !== undefined && row.max_quantity !== '' ? Number(row.max_quantity) : undefined,
    discountType: row.discount_type || row.discountType || 'percentage',
    discountValue: Number(row.discount_value ?? row.discountValue ?? 0),
    isActive: row.is_active ?? row.isActive ?? true,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 1),
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };
}

export function mapBulkPricingRuleToRow(r: BulkPricingRule) {
  const isGlobal = !r.productId || r.productId === 'global';
  return {
    id: r.id,
    product_id: isGlobal ? null : r.productId,
    product_name: r.productName || null,
    min_quantity: r.minQuantity,
    max_quantity: r.maxQuantity !== undefined && r.maxQuantity !== null ? r.maxQuantity : null,
    discount_type: r.discountType,
    discount_value: r.discountValue,
    is_active: r.isActive,
    sort_order: r.sortOrder,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

export async function getAllBulkPricingRulesAdmin(): Promise<BulkPricingRule[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.from('bulk_pricing_rules').select('*');
  if (error) {
    console.warn(`Supabase query warning [bulk_pricing_rules]: ${error.message}`);
    return [];
  }
  if (!data) return [];
  const products = await getAllProductsAdmin();
  return data
    .map((row) => mapRowToBulkPricingRule(row, products))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.minQuantity - b.minQuantity);
}

export async function getBulkPricingRules(): Promise<BulkPricingRule[]> {
  const all = await getAllBulkPricingRulesAdmin();
  return all.filter((r) => r.isActive !== false);
}

export async function saveBulkPricingRule(ruleData: Partial<BulkPricingRule>): Promise<BulkPricingRule> {
  const supabase = requireSupabaseAdmin();
  const now = new Date().toISOString();

  const minQty = Number(ruleData.minQuantity);
  if (isNaN(minQty) || minQty < 1) {
    throw new Error('Minimum quantity must be a positive number (at least 1).');
  }

  let maxQty: number | undefined = undefined;
  if (ruleData.maxQuantity !== undefined && ruleData.maxQuantity !== null && (ruleData.maxQuantity as any) !== '') {
    const parsedMax = Number(ruleData.maxQuantity);
    if (isNaN(parsedMax) || parsedMax < minQty) {
      throw new Error('Maximum quantity must be greater than or equal to minimum quantity.');
    }
    maxQty = parsedMax;
  }

  const discountVal = Number(ruleData.discountValue);
  if (isNaN(discountVal) || discountVal <= 0) {
    throw new Error('Discount value must be greater than 0.');
  }

  if (ruleData.discountType === 'percentage' && discountVal > 100) {
    throw new Error('Percentage discount value cannot exceed 100%.');
  }

  const productIdTarget = ruleData.productId || 'global';
  const allRules = await getAllBulkPricingRulesAdmin();
  const ruleId = ruleData.id || `bpr-${Date.now()}`;

  // Overlap validation check
  const conflictingRule = allRules.find((other) => {
    if (other.id === ruleId || other.isActive === false) return false;
    const otherTarget = other.productId || 'global';
    if (otherTarget !== productIdTarget) return false;

    const minA = minQty;
    const maxA = maxQty ?? Infinity;
    const minB = other.minQuantity;
    const maxB = other.maxQuantity ?? Infinity;

    return minA <= maxB && maxA >= minB;
  });

  if (conflictingRule) {
    throw new Error(
      `Conflicting rule exists for the same target with overlapping quantity range (${conflictingRule.minQuantity}${conflictingRule.maxQuantity ? '-' + conflictingRule.maxQuantity : '+'}). Please adjust quantity tiers.`
    );
  }

  let productName = 'Global / All Products';
  if (productIdTarget !== 'global') {
    const products = await getAllProductsAdmin();
    const matched = products.find((p) => p.id === productIdTarget);
    if (matched) productName = matched.name;
  }

  const newRule: BulkPricingRule = {
    id: ruleId,
    productId: productIdTarget,
    productName: productName,
    minQuantity: minQty,
    maxQuantity: maxQty,
    discountType: ruleData.discountType || 'percentage',
    discountValue: discountVal,
    isActive: ruleData.isActive ?? true,
    sortOrder: ruleData.sortOrder ?? 1,
    createdAt: ruleData.createdAt || now,
    updatedAt: now,
  };

  const row = mapBulkPricingRuleToRow(newRule);
  const { error } = await supabase.from('bulk_pricing_rules').upsert([row]);
  if (error) {
    throw new Error(`Database error saving bulk pricing rule: ${error.message}`);
  }

  return newRule;
}

export async function deleteBulkPricingRule(id: string): Promise<boolean> {
  const supabase = requireSupabaseAdmin();
  const { error } = await supabase.from('bulk_pricing_rules').delete().eq('id', id);
  if (error) {
    throw new Error(`Database error deleting bulk pricing rule: ${error.message}`);
  }
  return true;
}

export async function calculateBulkDiscount(items: { productId: string; quantity: number }[]) {
  const products = await getAllProductsAdmin();
  const activeRules = await getBulkPricingRules();

  let regularSubtotal = 0;
  let totalDiscountAmount = 0;
  const itemBreakdown: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    regularTotal: number;
    appliedRule?: BulkPricingRule;
    unitDiscount: number;
    itemDiscount: number;
    discountedTotal: number;
  }> = [];

  for (const item of items) {
    const prod = products.find((p) => p.id === item.productId || p.name === item.productId);
    if (!prod) continue;

    const unitPrice = Number(prod.price);
    const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const itemRegularTotal = unitPrice * qty;
    regularSubtotal += itemRegularTotal;

    // Check product-specific rules first
    let matchedRule = activeRules.find((r) => {
      if (r.productId !== prod.id) return false;
      const minOk = qty >= r.minQuantity;
      const maxOk = !r.maxQuantity || qty <= r.maxQuantity;
      return minOk && maxOk;
    });

    // If no product-specific rule, check global rules
    if (!matchedRule) {
      matchedRule = activeRules.find((r) => {
        if (r.productId && r.productId !== 'global') return false;
        const minOk = qty >= r.minQuantity;
        const maxOk = !r.maxQuantity || qty <= r.maxQuantity;
        return minOk && maxOk;
      });
    }

    let unitDiscount = 0;
    if (matchedRule) {
      if (matchedRule.discountType === 'percentage') {
        unitDiscount = (unitPrice * matchedRule.discountValue) / 100;
      } else if (matchedRule.discountType === 'fixed_amount') {
        unitDiscount = matchedRule.discountValue;
      } else if (matchedRule.discountType === 'fixed_price') {
        unitDiscount = Math.max(0, unitPrice - matchedRule.discountValue);
      }
    }

    unitDiscount = Math.min(unitPrice, Math.max(0, unitDiscount));
    const itemDiscount = Math.round(unitDiscount * qty * 100) / 100;
    const discountedTotal = Math.max(0, itemRegularTotal - itemDiscount);

    totalDiscountAmount += itemDiscount;

    itemBreakdown.push({
      productId: prod.id,
      productName: prod.name,
      quantity: qty,
      unitPrice,
      regularTotal: itemRegularTotal,
      appliedRule: matchedRule,
      unitDiscount,
      itemDiscount,
      discountedTotal,
    });
  }

  totalDiscountAmount = Math.round(totalDiscountAmount * 100) / 100;
  const netSubtotal = Math.max(0, regularSubtotal - totalDiscountAmount);

  return {
    regularSubtotal,
    totalDiscountAmount,
    netSubtotal,
    itemBreakdown,
  };
}

// ============================================================
// OFFERS & CAMPAIGNS OPERATIONS
// ============================================================
