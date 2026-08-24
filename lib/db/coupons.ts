import { getSupabaseAdmin } from '@/lib/supabase';
import { Campaign, CouponValidationResult, Product } from '@/lib/types';
import { getProducts, getAllProductsAdmin } from './products';
import { calculateBulkDiscount } from './bulk-pricing';
import { getCategories } from './categories';
import { getCampaigns, getCampaignsAdmin, computeCampaignStatus } from './campaigns-db';

export async function validateCouponCode(
  couponCode: string,
  items: Array<{ productId: string; quantity: number }>,
  customerPhone?: string
): Promise<CouponValidationResult> {
  if (!couponCode || !couponCode.trim()) {
    return { valid: false, message: 'Please enter a coupon code.' };
  }

  const cleanCode = couponCode.trim().toUpperCase();
  const activeCampaigns = await getCampaigns();

  const campaign = activeCampaigns.find(
    (c) => c.couponCode && c.couponCode.toUpperCase() === cleanCode
  );

  if (!campaign) {
    return { valid: false, message: `Coupon code "${cleanCode}" is invalid or expired.` };
  }

  if (campaign.status !== 'active') {
    return { valid: false, message: `Campaign "${campaign.publicHeading}" is not active currently.` };
  }

  const now = new Date();
  if (campaign.startDate && new Date(campaign.startDate) > now) {
    return { valid: false, message: `Coupon code "${cleanCode}" is not active yet.` };
  }

  if (campaign.endDate && new Date(campaign.endDate) < now) {
    return { valid: false, message: `Coupon code "${cleanCode}" has expired.` };
  }

  // Calculate regular subtotal for min order value check
  const products = await getAllProductsAdmin();
  let subtotal = 0;
  for (const item of items) {
    const p = products.find((prod) => prod.id === item.productId || prod.name === item.productId);
    if (p) {
      subtotal += Number(p.price) * (Number(item.quantity) || 1);
    }
  }

  if (campaign.minOrderValue && subtotal < campaign.minOrderValue) {
    return {
      valid: false,
      message: `Minimum order amount of ₹${campaign.minOrderValue} required for coupon "${cleanCode}". (Current subtotal: ₹${subtotal})`,
      campaign,
    };
  }

  // Check total usage limit
  if (campaign.usageLimit && (campaign.currentUsageCount || 0) >= campaign.usageLimit) {
    return {
      valid: false,
      message: `Coupon "${cleanCode}" has reached its maximum total usage limit.`,
      campaign,
    };
  }

  // Check per-customer usage limit
  if (campaign.perCustomerLimit && customerPhone && customerPhone.trim()) {
    const cleanPhone = customerPhone.replace(/\D/g, '');
    const supabase = getSupabaseAdmin();
    if (supabase && cleanPhone) {
      const { count } = await supabase
        .from('campaign_usage')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaign.id)
        .eq('customer_phone', cleanPhone);

      if (count !== null && count >= campaign.perCustomerLimit) {
        return {
          valid: false,
          message: `You have reached your maximum uses (${campaign.perCustomerLimit}) for coupon "${cleanCode}".`,
          campaign,
        };
      }
    }
  }

  // Calculate discount amount for this coupon campaign
  const calcResult = await calculateCampaignDiscount(items, cleanCode, customerPhone);

  if (calcResult.campaignDiscount <= 0 && !calcResult.isFreeShipping) {
    return {
      valid: false,
      message: `Coupon "${cleanCode}" is valid, but none of the items in your cart match the coupon criteria.`,
      campaign,
    };
  }

  return {
    valid: true,
    message: `Coupon "${cleanCode}" applied! You save ₹${calcResult.campaignDiscount}${calcResult.isFreeShipping ? ' + Free Shipping' : ''}.`,
    campaign,
    calculatedDiscount: calcResult.campaignDiscount,
    shippingDiscount: calcResult.isFreeShipping,
  };
}

export async function calculateCampaignDiscount(
  items: Array<{ productId: string; quantity: number }>,
  couponCode?: string,
  customerPhone?: string
) {
  const products = await getAllProductsAdmin();
  const activeCampaigns = await getCampaigns();

  let regularSubtotal = 0;
  for (const item of items) {
    const p = products.find((prod) => prod.id === item.productId || prod.name === item.productId);
    if (p) {
      regularSubtotal += Number(p.price) * Math.max(1, Math.floor(Number(item.quantity) || 1));
    }
  }

  // First calculate Bulk Discount
  const bulkResult = await calculateBulkDiscount(items);
  const bulkDiscount = bulkResult.totalDiscountAmount;

  // Identify eligible active campaigns
  const eligibleCampaigns: Campaign[] = [];

  // 1. Automatic active campaigns (no coupon required)
  const automaticCampaigns = activeCampaigns.filter(
    (c) => !c.couponRequired && (!c.minOrderValue || regularSubtotal >= c.minOrderValue)
  );
  eligibleCampaigns.push(...automaticCampaigns);

  // 2. Coupon campaign if couponCode passed
  if (couponCode && couponCode.trim()) {
    const cleanCoupon = couponCode.trim().toUpperCase();
    const couponCamp = activeCampaigns.find(
      (c) => c.couponCode && c.couponCode.toUpperCase() === cleanCoupon
    );
    if (couponCamp && (!couponCamp.minOrderValue || regularSubtotal >= couponCamp.minOrderValue)) {
      if (!eligibleCampaigns.some((c) => c.id === couponCamp.id)) {
        eligibleCampaigns.push(couponCamp);
      }
    }
  }

  let bestCampaign: Campaign | null = null;
  let bestCampaignDiscount = 0;
  let isFreeShipping = false;

  for (const camp of eligibleCampaigns) {
    let currentCampDiscount = 0;
    let campFreeShipping = false;

    if (camp.discountType === 'free_shipping') {
      campFreeShipping = true;
    }

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId || p.name === item.productId);
      if (!prod) continue;

      // Check target eligibility
      let isTargeted = false;
      const isExcluded = camp.excludedProductIds && camp.excludedProductIds.includes(prod.id);
      if (isExcluded) continue;

      if (camp.targetType === 'storewide') {
        isTargeted = true;
      } else if (camp.targetType === 'categories') {
        isTargeted = camp.targetCategoryIds ? camp.targetCategoryIds.includes(prod.categoryId) : false;
      } else if (camp.targetType === 'products') {
        isTargeted = camp.targetProductIds ? camp.targetProductIds.includes(prod.id) : false;
      }

      if (!isTargeted) continue;

      const unitPrice = Number(prod.price);
      const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
      const lineTotal = unitPrice * qty;

      if (camp.discountType === 'percentage') {
        currentCampDiscount += (lineTotal * camp.discountValue) / 100;
      } else if (camp.discountType === 'fixed_amount') {
        currentCampDiscount += Math.min(lineTotal, camp.discountValue);
      } else if (camp.discountType === 'fixed_price') {
        const diff = Math.max(0, unitPrice - camp.discountValue);
        currentCampDiscount += diff * qty;
      }
    }

    if (camp.maxDiscountAmount && currentCampDiscount > camp.maxDiscountAmount) {
      currentCampDiscount = camp.maxDiscountAmount;
    }

    currentCampDiscount = Math.round(currentCampDiscount * 100) / 100;

    if (currentCampDiscount > bestCampaignDiscount || (!bestCampaign && campFreeShipping)) {
      bestCampaignDiscount = currentCampDiscount;
      bestCampaign = camp;
      isFreeShipping = campFreeShipping;
    }
  }

  // Stacking logic
  let finalCampaignDiscount = 0;
  let finalBulkDiscount = bulkDiscount;
  const allowStacking = bestCampaign ? bestCampaign.allowStackWithBulkPricing : false;

  if (allowStacking) {
    finalCampaignDiscount = bestCampaignDiscount;
  } else {
    // Non-stacking: customer gets whichever is higher (bulk pricing vs campaign)
    if (bestCampaignDiscount > bulkDiscount) {
      finalCampaignDiscount = bestCampaignDiscount;
      finalBulkDiscount = 0; // Replace bulk discount
    } else {
      finalCampaignDiscount = 0;
    }
  }

  const netSubtotal = Math.max(0, regularSubtotal - finalBulkDiscount - finalCampaignDiscount);

  return {
    regularSubtotal,
    bulkDiscount: finalBulkDiscount,
    campaignDiscount: finalCampaignDiscount,
    totalDiscount: finalBulkDiscount + finalCampaignDiscount,
    netSubtotal,
    isFreeShipping,
    appliedCampaign: bestCampaign,
    couponCode: bestCampaign && bestCampaign.couponCode ? bestCampaign.couponCode : couponCode || '',
  };
}
