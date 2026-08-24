import { getSupabaseAdmin } from '@/lib/supabase';
import { Campaign, CampaignStatus, DiscountType, CampaignTargetType } from '@/lib/types';
import { getProducts } from './products';
import { getCategories } from './categories';
import { getSiteSettings, updateSiteSettings } from './settings';
import { sanitizeImageUrl } from '@/lib/utils';

let memoryCampaignsStore: Campaign[] = [];
let campaignsStoreInitialized = false;

export function computeCampaignStatus(c: Partial<Campaign>): CampaignStatus {
  if (c.isManuallyDisabled || c.status === 'disabled') {
    return 'disabled';
  }
  if (c.status === 'draft') {
    return 'draft';
  }

  const now = new Date().getTime();
  const start = c.startDate ? new Date(c.startDate).getTime() : 0;
  const end = c.endDate ? new Date(c.endDate).getTime() : 0;

  if (start && now < start) {
    return 'scheduled';
  }
  if (end && now > end) {
    return 'expired';
  }
  return 'active';
}

export function mapRowToCampaign(row: any): Campaign {
  const baseCampaign: Campaign = {
    id: row.id,
    name: row.name || row.public_heading || 'Special Campaign',
    festivalName: row.festival_name || row.festivalName || 'Festival',
    internalDescription: row.internal_description || row.internalDescription || '',
    publicHeading: row.public_heading || row.publicHeading || row.name || 'Special Offer',
    publicSubtitle: row.public_subtitle || row.publicSubtitle || '',
    publicDescription: row.public_description || row.publicDescription || '',
    status: row.status || 'draft',
    isManuallyDisabled: row.is_manually_disabled ?? row.isManuallyDisabled ?? false,
    startDate: row.start_date || row.startDate || new Date().toISOString(),
    endDate: row.end_date || row.endDate || new Date(Date.now() + 7 * 86400000).toISOString(),
    timezone: row.timezone || 'Asia/Kolkata',
    discountType: row.discount_type || row.discountType || 'percentage',
    discountValue: Number(row.discount_value ?? row.discountValue ?? 10),
    minOrderValue: Number(row.min_order_value ?? row.minOrderValue ?? 0),
    maxDiscountAmount: row.max_discount_amount ? Number(row.max_discount_amount) : undefined,
    allowStackWithBulkPricing: row.allow_stack_with_bulk_pricing ?? row.allowStackWithBulkPricing ?? false,
    priority: Number(row.priority ?? 0),
    targetType: row.target_type || row.targetType || 'storewide',
    targetCategoryIds: Array.isArray(row.target_category_ids) ? row.target_category_ids : Array.isArray(row.targetCategoryIds) ? row.targetCategoryIds : [],
    targetProductIds: Array.isArray(row.target_product_ids) ? row.target_product_ids : Array.isArray(row.targetProductIds) ? row.targetProductIds : [],
    excludedProductIds: Array.isArray(row.excluded_product_ids) ? row.excluded_product_ids : Array.isArray(row.excludedProductIds) ? row.excludedProductIds : [],
    couponRequired: row.coupon_required ?? row.couponRequired ?? false,
    couponCode: row.coupon_code || row.couponCode || '',
    usageLimit: row.usage_limit ? Number(row.usage_limit) : undefined,
    perCustomerLimit: row.per_customer_limit ? Number(row.per_customer_limit) : undefined,
    currentUsageCount: Number(row.current_usage_count ?? row.currentUsageCount ?? 0),
    showBanner: row.show_banner ?? row.showBanner ?? false,
    bannerHeading: row.banner_heading || row.bannerHeading || '',
    bannerSubtitle: row.banner_subtitle || row.bannerSubtitle || '',
    bannerDescription: row.banner_description || row.bannerDescription || '',
    bannerImageUrl: sanitizeImageUrl(row.banner_image_url || row.bannerImageUrl || ''),
    bannerCtaText: row.banner_cta_text || row.bannerCtaText || 'Shop Offer',
    bannerCtaLink: row.banner_cta_link || row.bannerCtaLink || '/offers',
    bannerPosition: row.banner_position || row.bannerPosition || 'announcement_bar',
    showCountdown: row.show_countdown ?? row.showCountdown ?? false,
    badgeText: row.badge_text || row.badgeText || '',
    badgeEnabled: row.badge_enabled ?? row.badgeEnabled ?? false,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || new Date().toISOString(),
  };

  return {
    ...baseCampaign,
    status: computeCampaignStatus(baseCampaign),
  };
}

export function mapCampaignToRow(c: Campaign) {
  return {
    id: c.id,
    name: c.name,
    festival_name: c.festivalName || null,
    internal_description: c.internalDescription || null,
    public_heading: c.publicHeading,
    public_subtitle: c.publicSubtitle || null,
    public_description: c.publicDescription || null,
    status: c.status,
    is_manually_disabled: c.isManuallyDisabled ?? false,
    start_date: c.startDate,
    end_date: c.endDate,
    timezone: c.timezone || 'Asia/Kolkata',
    discount_type: c.discountType,
    discount_value: c.discountValue,
    min_order_value: c.minOrderValue || 0,
    max_discount_amount: c.maxDiscountAmount ?? null,
    allow_stack_with_bulk_pricing: c.allowStackWithBulkPricing ?? false,
    priority: c.priority || 0,
    target_type: c.targetType,
    target_category_ids: c.targetCategoryIds || [],
    target_product_ids: c.targetProductIds || [],
    excluded_product_ids: c.excludedProductIds || [],
    coupon_required: c.couponRequired ?? false,
    coupon_code: c.couponCode ? c.couponCode.trim().toUpperCase() : null,
    usage_limit: c.usageLimit ?? null,
    per_customer_limit: c.perCustomerLimit ?? null,
    current_usage_count: c.currentUsageCount || 0,
    show_banner: c.showBanner ?? false,
    banner_heading: c.bannerHeading || null,
    banner_subtitle: c.bannerSubtitle || null,
    banner_description: c.bannerDescription || null,
    banner_image_url: c.bannerImageUrl || null,
    banner_cta_text: c.bannerCtaText || null,
    banner_cta_link: c.bannerCtaLink || null,
    banner_position: c.bannerPosition || 'announcement_bar',
    show_countdown: c.showCountdown ?? false,
    badge_text: c.badgeText || null,
    badge_enabled: c.badgeEnabled ?? false,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

export async function getCampaignsAdmin(): Promise<Campaign[]> {
  const supabase = getSupabaseAdmin();
  let campaigns: Campaign[] = [];

  if (supabase) {
    const { data, error } = await supabase.from('campaigns').select('*');
    if (!error && data && data.length > 0) {
      campaigns = data.map(mapRowToCampaign);
    }
  }

  // Fallback / merge with site_settings.data.campaigns if DB table empty
  if (campaigns.length === 0) {
    const siteSettings = await getSiteSettings();
    if (siteSettings.campaigns && Array.isArray(siteSettings.campaigns)) {
      campaigns = siteSettings.campaigns.map((c) => ({
        ...c,
        status: computeCampaignStatus(c),
      }));
    }
  }

  return campaigns.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getCampaigns(): Promise<Campaign[]> {
  const all = await getCampaignsAdmin();
  return all.filter((c) => c.status === 'active');
}

export async function getCampaignById(id: string): Promise<Campaign | null> {
  const all = await getCampaignsAdmin();
  return all.find((c) => c.id === id) || null;
}

export async function saveCampaign(data: Partial<Campaign>): Promise<Campaign> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  if (!data.name || !data.name.trim()) {
    throw new Error('Campaign internal name is required.');
  }
  if (!data.publicHeading || !data.publicHeading.trim()) {
    throw new Error('Public offer heading is required.');
  }
  if (!data.startDate || !data.endDate) {
    throw new Error('Campaign start date and end date are required.');
  }

  const startTime = new Date(data.startDate).getTime();
  const endTime = new Date(data.endDate).getTime();
  if (isNaN(startTime) || isNaN(endTime)) {
    throw new Error('Invalid start or end date format.');
  }
  if (endTime <= startTime) {
    throw new Error('Campaign end date & time must be after the start date & time.');
  }

  const discVal = Number(data.discountValue);
  if (isNaN(discVal) || discVal < 0) {
    throw new Error('Discount value must be a non-negative number.');
  }
  if (data.discountType === 'percentage' && discVal > 100) {
    throw new Error('Percentage discount cannot exceed 100%.');
  }

  const campaignId = data.id || `camp-${Date.now()}`;
  const allCampaigns = await getCampaignsAdmin();

  const cleanCoupon = data.couponCode ? data.couponCode.trim().toUpperCase() : '';
  if (data.couponRequired && !cleanCoupon) {
    throw new Error('A coupon code is required when "Coupon Required" is enabled.');
  }

  if (cleanCoupon) {
    const existingCoupon = allCampaigns.find(
      (c) => c.couponCode && c.couponCode.toUpperCase() === cleanCoupon && c.id !== campaignId
    );
    if (existingCoupon) {
      throw new Error(`Coupon code "${cleanCoupon}" is already assigned to another campaign ("${existingCoupon.name}")`);
    }
  }

  const fullCampaign: Campaign = {
    id: campaignId,
    name: data.name.trim(),
    festivalName: data.festivalName ? data.festivalName.trim() : 'Special Event',
    internalDescription: data.internalDescription ? data.internalDescription.trim() : '',
    publicHeading: data.publicHeading.trim(),
    publicSubtitle: data.publicSubtitle ? data.publicSubtitle.trim() : '',
    publicDescription: data.publicDescription ? data.publicDescription.trim() : '',
    status: data.status || 'draft',
    isManuallyDisabled: data.isManuallyDisabled ?? false,
    startDate: data.startDate,
    endDate: data.endDate,
    timezone: data.timezone || 'Asia/Kolkata',
    discountType: data.discountType || 'percentage',
    discountValue: discVal,
    minOrderValue: Number(data.minOrderValue || 0),
    maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : undefined,
    allowStackWithBulkPricing: data.allowStackWithBulkPricing ?? false,
    priority: Number(data.priority || 0),
    targetType: data.targetType || 'storewide',
    targetCategoryIds: data.targetCategoryIds || [],
    targetProductIds: data.targetProductIds || [],
    excludedProductIds: data.excludedProductIds || [],
    couponRequired: data.couponRequired ?? false,
    couponCode: cleanCoupon,
    usageLimit: data.usageLimit ? Number(data.usageLimit) : undefined,
    perCustomerLimit: data.perCustomerLimit ? Number(data.perCustomerLimit) : undefined,
    currentUsageCount: data.currentUsageCount || 0,
    showBanner: data.showBanner ?? false,
    bannerHeading: data.bannerHeading ? data.bannerHeading.trim() : '',
    bannerSubtitle: data.bannerSubtitle ? data.bannerSubtitle.trim() : '',
    bannerDescription: data.bannerDescription ? data.bannerDescription.trim() : '',
    bannerImageUrl: data.bannerImageUrl || '',
    bannerCtaText: data.bannerCtaText || 'Shop Offer',
    bannerCtaLink: data.bannerCtaLink || '/offers',
    bannerPosition: data.bannerPosition || 'announcement_bar',
    showCountdown: data.showCountdown ?? false,
    badgeText: data.badgeText ? data.badgeText.trim() : '',
    badgeEnabled: data.badgeEnabled ?? false,
    createdAt: data.createdAt || now,
    updatedAt: now,
  };

  fullCampaign.status = computeCampaignStatus(fullCampaign);

  // Upsert to campaigns table
  if (supabase) {
    const row = mapCampaignToRow(fullCampaign);
    const { error } = await supabase.from('campaigns').upsert([row]);
    if (error) {
      console.warn(`Supabase campaigns upsert warning: ${error.message}. Saving to site_settings.`);
    }
  }

  // Also sync to site_settings.data.campaigns for site-wide consistency
  try {
    const siteSettings = await getSiteSettings();
    const existingArr = siteSettings.campaigns || [];
    const idx = existingArr.findIndex((c) => c.id === fullCampaign.id);
    const updatedArr = [...existingArr];
    if (idx >= 0) {
      updatedArr[idx] = fullCampaign;
    } else {
      updatedArr.push(fullCampaign);
    }
    await updateSiteSettings({ campaigns: updatedArr });
  } catch (err) {
    console.warn('Sync campaigns to site_settings warning:', err);
  }

  return fullCampaign;
}

export async function deleteCampaign(id: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) {
      console.warn(`Supabase delete campaign error: ${error.message}`);
    }
  }

  // Also update site_settings.data.campaigns
  try {
    const siteSettings = await getSiteSettings();
    const updatedArr = (siteSettings.campaigns || []).filter((c) => c.id !== id);
    await updateSiteSettings({ campaigns: updatedArr });
  } catch (err) {
    console.warn('Sync delete campaign to site_settings warning:', err);
  }

  return true;
}

export async function duplicateCampaign(id: string): Promise<Campaign> {
  const existing = await getCampaignById(id);
  if (!existing) {
    throw new Error(`Campaign "${id}" not found.`);
  }

  const duplicated: Partial<Campaign> = {
    ...existing,
    id: undefined,
    name: `${existing.name} (Copy)`,
    publicHeading: `${existing.publicHeading} (Copy)`,
    couponCode: existing.couponCode ? `${existing.couponCode}_COPY` : '',
    status: 'draft',
    currentUsageCount: 0,
    createdAt: undefined,
    updatedAt: undefined,
  };

  return await saveCampaign(duplicated);
}
