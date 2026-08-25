import { cache } from 'react';
import { SiteSettings, PaymentSettings } from '../types';
import { INITIAL_SITE_SETTINGS, INITIAL_PAYMENT_SETTINGS } from '../data-store';
import { getSupabaseAdmin } from '../supabase';
import { sanitizeImageUrl } from '../utils';

let cachedSiteSettingsMemory: SiteSettings | null = null;
let cachedPaymentSettingsMemory: PaymentSettings | null = null;

export function mapRowToSiteSettings(row: any): SiteSettings {
  const base = row.data && typeof row.data === 'object' ? row.data : {};
  const businessName = base.businessName || base.brandName || row.business_name || row.brand_name || INITIAL_SITE_SETTINGS.businessName;
  const displayPhone = base.displayPhone || base.contactNumber || row.display_phone || row.contact_number || INITIAL_SITE_SETTINGS.displayPhone;
  const whatsappNumber = base.whatsappNumber || row.whatsapp_number || row.whatsappNumber || INITIAL_SITE_SETTINGS.whatsappNumber;
  const businessEmail = base.businessEmail || base.email || row.business_email || row.email || INITIAL_SITE_SETTINGS.businessEmail;
  const websiteUrl = base.websiteUrl || base.siteUrl || row.website_url || row.site_url || INITIAL_SITE_SETTINGS.websiteUrl;

  return {
    ...INITIAL_SITE_SETTINGS,
    ...base,
    brandName: base.brandName || row.brand_name || row.brandName || INITIAL_SITE_SETTINGS.brandName,
    businessName,
    tagline: base.tagline || row.tagline || INITIAL_SITE_SETTINGS.tagline,
    logoUrl: (() => {
      const candidate = (base.logoUrl || row.logo_url || row.logoUrl || INITIAL_SITE_SETTINGS.logoUrl || '').trim();
      if (!candidate || candidate.endsWith('.svg') || candidate.includes('logo.svg')) {
        return '/logo.png';
      }
      return sanitizeImageUrl(candidate, '/logo.png');
    })(),
    faviconUrl: sanitizeImageUrl(base.faviconUrl || row.favicon_url || row.faviconUrl || INITIAL_SITE_SETTINGS.faviconUrl, '/favicon.png'),
    heroImageUrl: sanitizeImageUrl(base.heroImageUrl || row.hero_image_url || row.heroImageUrl || INITIAL_SITE_SETTINGS.heroImageUrl),
    aboutImageUrl: sanitizeImageUrl(base.aboutImageUrl || row.about_image_url || row.aboutImageUrl || INITIAL_SITE_SETTINGS.aboutImageUrl),
    factoryImageUrl: sanitizeImageUrl(base.factoryImageUrl || row.factory_image_url || row.factoryImageUrl || INITIAL_SITE_SETTINGS.factoryImageUrl),
    ogImageUrl: sanitizeImageUrl(base.ogImageUrl || row.og_image_url || row.ogImageUrl || INITIAL_SITE_SETTINGS.ogImageUrl),

    // Canonical Business Settings
    displayPhone,
    whatsappNumber,
    businessEmail,
    websiteUrl,

    // Legacy field aliases
    contactNumber: displayPhone,
    email: businessEmail,
    brandEmail: businessEmail,
    brandPhone: displayPhone,
    siteUrl: websiteUrl,

    address: base.address || row.address || INITIAL_SITE_SETTINGS.address,
    socials: base.socials || row.socials || INITIAL_SITE_SETTINGS.socials,
    heroTitle: base.heroTitle || row.hero_title || row.heroTitle || INITIAL_SITE_SETTINGS.heroTitle,
    heroSubtitle: base.heroSubtitle || row.hero_subtitle || row.heroSubtitle || INITIAL_SITE_SETTINGS.heroSubtitle,
    seoTitle: base.seoTitle || row.seo_title || row.seoTitle || INITIAL_SITE_SETTINGS.seoTitle,
    seoDescription: base.seoDescription || row.seo_description || row.seoDescription || INITIAL_SITE_SETTINGS.seoDescription,
    // WhatsApp 3-Step Ordering Guide
    whatsappGuideHeading: base.whatsappGuideHeading || row.whatsapp_guide_heading || INITIAL_SITE_SETTINGS.whatsappGuideHeading,
    whatsappGuideSubheading: base.whatsappGuideSubheading || row.whatsapp_guide_subheading || INITIAL_SITE_SETTINGS.whatsappGuideSubheading,
    whatsappGuideDescription: base.whatsappGuideDescription || row.whatsapp_guide_description || INITIAL_SITE_SETTINGS.whatsappGuideDescription,
    whatsappStep1Title: base.whatsappStep1Title || row.whatsapp_step_1_title || INITIAL_SITE_SETTINGS.whatsappStep1Title,
    whatsappStep1Description: base.whatsappStep1Description || row.whatsapp_step_1_desc || INITIAL_SITE_SETTINGS.whatsappStep1Description,
    whatsappStep2Title: base.whatsappStep2Title || row.whatsapp_step_2_title || INITIAL_SITE_SETTINGS.whatsappStep2Title,
    whatsappStep2Description: base.whatsappStep2Description || row.whatsapp_step_2_desc || INITIAL_SITE_SETTINGS.whatsappStep2Description,
    whatsappStep3Title: base.whatsappStep3Title || row.whatsapp_step_3_title || INITIAL_SITE_SETTINGS.whatsappStep3Title,
    whatsappStep3Description: base.whatsappStep3Description || row.whatsapp_step_3_desc || INITIAL_SITE_SETTINGS.whatsappStep3Description,
    homepageSections: Array.isArray(base.homepageSections) && base.homepageSections.length > 0 ? base.homepageSections : INITIAL_SITE_SETTINGS.homepageSections,
    navItems: Array.isArray(base.navItems) && base.navItems.length > 0 ? base.navItems : INITIAL_SITE_SETTINGS.navItems,
    footerSections: Array.isArray(base.footerSections) && base.footerSections.length > 0 ? base.footerSections : INITIAL_SITE_SETTINGS.footerSections,
    cmsText: {
      ...(INITIAL_SITE_SETTINGS.cmsText || {}),
      ...(base.cmsText || {}),
    },
    layoutControls: {
      ...(INITIAL_SITE_SETTINGS.layoutControls || {}),
      ...(base.layoutControls || {}),
    },
  };
}

export function mapSiteSettingsToRow(s: SiteSettings) {
  const displayPhone = s.displayPhone || s.contactNumber || INITIAL_SITE_SETTINGS.displayPhone;
  const businessEmail = s.businessEmail || s.email || INITIAL_SITE_SETTINGS.businessEmail;
  const websiteUrl = s.websiteUrl || s.siteUrl || INITIAL_SITE_SETTINGS.websiteUrl;
  const brandName = s.brandName || INITIAL_SITE_SETTINGS.brandName;
  const tagline = s.tagline || INITIAL_SITE_SETTINGS.tagline;
  const whatsappNumber = s.whatsappNumber || INITIAL_SITE_SETTINGS.whatsappNumber;
  const heroTitle = s.heroTitle || INITIAL_SITE_SETTINGS.heroTitle;
  const heroSubtitle = s.heroSubtitle || INITIAL_SITE_SETTINGS.heroSubtitle;
  const seoTitle = s.seoTitle || INITIAL_SITE_SETTINGS.seoTitle;
  const seoDescription = s.seoDescription || INITIAL_SITE_SETTINGS.seoDescription;
  const address = s.address || INITIAL_SITE_SETTINGS.address;
  const socials = s.socials || INITIAL_SITE_SETTINGS.socials;

  return {
    id: 'default',
    brand_name: brandName,
    tagline: tagline,
    whatsapp_number: whatsappNumber,
    contact_number: displayPhone,
    email: businessEmail,
    address: address,
    socials: socials,
    hero_title: heroTitle,
    hero_subtitle: heroSubtitle,
    seo_title: seoTitle,
    seo_description: seoDescription,
    data: {
      ...s,
      brandName,
      tagline,
      whatsappNumber,
      displayPhone,
      businessEmail,
      websiteUrl,
      contactNumber: displayPhone,
      email: businessEmail,
      brandEmail: businessEmail,
      brandPhone: displayPhone,
      siteUrl: websiteUrl,
      heroTitle,
      heroSubtitle,
      seoTitle,
      seoDescription,
      address,
      socials,
    },
    updated_at: new Date().toISOString(),
  };
}

export function mapRowToPaymentSettings(row: any): PaymentSettings {
  const base = row.data && typeof row.data === 'object' ? row.data : {};
  return {
    ...INITIAL_PAYMENT_SETTINGS,
    ...base,
    onlinePaymentEnabled: false, // CRITICAL RULE: ALWAYS OFF
    whatsappOrderEnabled: row.whatsapp_order_enabled ?? row.whatsappOrderEnabled ?? base.whatsappOrderEnabled ?? true,
    upiEnabled: row.upi_enabled ?? row.upiEnabled ?? base.upiEnabled ?? false,
    cardEnabled: row.card_enabled ?? row.cardEnabled ?? base.cardEnabled ?? false,
    netbankingEnabled: row.netbanking_enabled ?? row.netbankingEnabled ?? base.netbankingEnabled ?? false,
  };
}

export function mapPaymentSettingsToRow(s: PaymentSettings) {
  return {
    id: 'default',
    online_payment_enabled: false, // CRITICAL RULE: ALWAYS OFF
    whatsapp_order_enabled: s.whatsappOrderEnabled ?? true,
    upi_enabled: s.upiEnabled ?? false,
    card_enabled: s.cardEnabled ?? false,
    netbanking_enabled: s.netbankingEnabled ?? false,
    data: s,
    updated_at: new Date().toISOString(),
  };
}

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return cachedSiteSettingsMemory || INITIAL_SITE_SETTINGS;
  }

  try {
    const { data, error } = await supabase.from('site_settings').select('*').eq('id', 'default').limit(1).maybeSingle();

    if (error || !data) {
      if (error) console.warn(`Supabase site_settings fetch warning: ${error.message}`);
      return cachedSiteSettingsMemory || INITIAL_SITE_SETTINGS;
    }

    const mapped = mapRowToSiteSettings(data);
    cachedSiteSettingsMemory = mapped;
    return mapped;
  } catch (err: any) {
    console.warn('getSiteSettings fallback to memory/initial:', err.message);
    return cachedSiteSettingsMemory || INITIAL_SITE_SETTINGS;
  }
});

export function getPublicSiteSettingsProjection(settings: SiteSettings): Partial<SiteSettings> {
  if (!settings) return {};

  return {
    cmsText: settings.cmsText,
    layoutControls: settings.layoutControls,
    brandName: settings.brandName,
    businessName: settings.businessName || settings.brandName,
    tagline: settings.tagline,
    shortDescription: settings.shortDescription,
    logoUrl: settings.logoUrl,
    faviconUrl: settings.faviconUrl,
    brandEmail: settings.businessEmail,
    brandPhone: settings.displayPhone,

    displayPhone: settings.displayPhone,
    whatsappNumber: settings.whatsappNumber,
    whatsappMessageTemplate: settings.whatsappMessageTemplate,
    whatsappWholesaleMessageTemplate: settings.whatsappWholesaleMessageTemplate,
    whatsappGreeting: settings.whatsappGreeting,
whatsappGuideHeading: settings.whatsappGuideHeading,
    whatsappGuideSubheading: settings.whatsappGuideSubheading,
    whatsappGuideDescription: settings.whatsappGuideDescription,
    whatsappStep1Title: settings.whatsappStep1Title,
    whatsappStep1Description: settings.whatsappStep1Description,
    whatsappStep2Title: settings.whatsappStep2Title,
    whatsappStep2Description: settings.whatsappStep2Description,
    whatsappStep3Title: settings.whatsappStep3Title,
    whatsappStep3Description: settings.whatsappStep3Description,
    contactNumber: settings.displayPhone,
    email: settings.businessEmail,
    businessEmail: settings.businessEmail,
    websiteUrl: settings.websiteUrl,
    siteUrl: settings.websiteUrl,
    address: settings.address,
    city: settings.city,
    state: settings.state,
    pincode: settings.pincode,
    country: settings.country,
    businessHours: settings.businessHours,
    deliveryDisclaimer: settings.deliveryDisclaimer,
    shippingDisclaimer: settings.shippingDisclaimer,

    socials: settings.socials || {},

    heroEyebrow: settings.heroEyebrow,
    heroTitle: settings.heroTitle,
    heroSubtitle: settings.heroSubtitle,
    heroPrimaryCtaText: settings.heroPrimaryCtaText,
    heroPrimaryCtaLink: settings.heroPrimaryCtaLink,
    heroSecondaryCtaText: settings.heroSecondaryCtaText,
    heroSecondaryCtaLink: settings.heroSecondaryCtaLink,
    heroImageUrl: settings.heroImageUrl,
    homepageHero: settings.homepageHero,

    homepageSections: settings.homepageSections,

    announcementEnabled: settings.announcementEnabled,
    announcementText: settings.announcementText,
    announcementLink: settings.announcementLink,

    featuredSectionTitle: settings.featuredSectionTitle,
    featuredSectionDescription: settings.featuredSectionDescription,
    featuredSectionEnabled: settings.featuredSectionEnabled,

    categorySectionTitle: settings.categorySectionTitle,
    categorySectionDescription: settings.categorySectionDescription,
    categorySectionEnabled: settings.categorySectionEnabled,
    homepageCategoryCount: settings.homepageCategoryCount,

    whyMuskyDoseTitle: settings.whyMuskyDoseTitle,
    whyMuskyDoseDescription: settings.whyMuskyDoseDescription,
    whyMuskyDoseEnabled: settings.whyMuskyDoseEnabled,
    whyCards: settings.whyCards,
    testimonials: settings.testimonials,

    wholesaleHeroTitle: settings.wholesaleHeroTitle,
    wholesaleHeroSubtitle: settings.wholesaleHeroSubtitle,
    wholesaleSectionHeading: settings.wholesaleSectionHeading,
    wholesaleSectionDescription: settings.wholesaleSectionDescription,

    trustSectionHeading: settings.trustSectionHeading,
    trustSectionDescription: settings.trustSectionDescription,
    trustSectionEnabled: settings.trustSectionEnabled,

    aboutText: settings.aboutText,
    aboutHeroEyebrow: settings.aboutHeroEyebrow,
    aboutHeroTitle: settings.aboutHeroTitle,
    aboutHeroSubtitle: settings.aboutHeroSubtitle,
    aboutSectionEyebrow: settings.aboutSectionEyebrow,
    aboutSectionHeading: settings.aboutSectionHeading,
    aboutParagraph2: settings.aboutParagraph2,
    aboutImageUrl: settings.aboutImageUrl,
    aboutPillar1Title: settings.aboutPillar1Title,
    aboutPillar1Description: settings.aboutPillar1Description,
    aboutPillar2Title: settings.aboutPillar2Title,
    aboutPillar2Description: settings.aboutPillar2Description,
    aboutPillar3Title: settings.aboutPillar3Title,
    aboutPillar3Description: settings.aboutPillar3Description,

    factoryStory: settings.factoryStory,
    factoryImageUrl: settings.factoryImageUrl,
    factorySectionHeading: settings.factorySectionHeading,
    factorySectionDescription: settings.factorySectionDescription,
    factorySectionEnabled: settings.factorySectionEnabled,
    factoryHeroEyebrow: settings.factoryHeroEyebrow,
    factoryHeroTitle: settings.factoryHeroTitle,
    factoryHeroSubtitle: settings.factoryHeroSubtitle,
    factoryStep1Title: settings.factoryStep1Title,
    factoryStep1Description: settings.factoryStep1Description,
    factoryStep2Title: settings.factoryStep2Title,
    factoryStep2Description: settings.factoryStep2Description,
    factoryStep3Title: settings.factoryStep3Title,
    factoryStep3Description: settings.factoryStep3Description,
    factoryStep4Title: settings.factoryStep4Title,
    factoryStep4Description: settings.factoryStep4Description,

    finalCtaHeading: settings.finalCtaHeading,
    finalCtaDescription: settings.finalCtaDescription,
    finalCtaButtonText: settings.finalCtaButtonText,
    finalCtaEnabled: settings.finalCtaEnabled,

    checkoutFieldConfig: settings.checkoutFieldConfig,

    minOrderAmount: settings.minOrderAmount,
    shippingFee: settings.shippingFee,
    freeShippingThreshold: settings.freeShippingThreshold,
    deliveryMessage: settings.deliveryMessage,

    footerDescription: settings.footerDescription,
    copyrightText: settings.copyrightText,

    navItems: settings.navItems,
    footerSections: settings.footerSections,

    faqItems: settings.faqItems,
    shippingPolicy: settings.shippingPolicy,
    returnRefundPolicy: settings.returnRefundPolicy,
    privacyPolicy: settings.privacyPolicy,
    termsConditions: settings.termsConditions,
    cancellationPolicy: settings.cancellationPolicy,

    mediaLibrary: settings.mediaLibrary,

    seoTitle: settings.seoTitle,
    seoDescription: settings.seoDescription,
    seoKeywords: settings.seoKeywords,
    ogTitle: settings.ogTitle,
    ogDescription: settings.ogDescription,
    ogImageUrl: settings.ogImageUrl,
    canonicalUrl: settings.canonicalUrl,
    googleSearchConsoleVerification: settings.googleSearchConsoleVerification,

    customPages: Array.isArray(settings.customPages)
      ? settings.customPages.filter((p) => p.published !== false)
      : [],

    businessContentItems: Array.isArray(settings.businessContentItems)
      ? settings.businessContentItems.filter((b) => b.published !== false)
      : [],

    campaigns: Array.isArray(settings.campaigns)
      ? settings.campaigns.filter((c) => c.status !== 'disabled' && c.isManuallyDisabled !== true)
      : [],
  };
}

export async function updateSiteSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
  const current = await getSiteSettings();
  const merged: SiteSettings = {
    ...current,
    ...settings,
    cmsText: {
      ...(current.cmsText || INITIAL_SITE_SETTINGS.cmsText || {}),
      ...(settings.cmsText || {}),
    },
    layoutControls: {
      ...(current.layoutControls || INITIAL_SITE_SETTINGS.layoutControls || {}),
      ...(settings.layoutControls || {}),
      lastUpdated: new Date().toISOString(),
    },
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const row = mapSiteSettingsToRow(merged);
    const { error } = await supabase.from('site_settings').upsert([row]);

    if (error) {
      console.error(`Supabase site_settings upsert error: ${error.message}`);
      throw new Error(`Failed to save site settings to database: ${error.message}`);
    }
  }

  cachedSiteSettingsMemory = merged;
  return merged;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return cachedPaymentSettingsMemory || { ...INITIAL_PAYMENT_SETTINGS, onlinePaymentEnabled: false };
  }

  try {
    const { data, error } = await supabase.from('payment_settings').select('*').eq('id', 'default').limit(1).maybeSingle();

    if (error || !data) {
      if (error) console.warn(`Supabase payment_settings fetch warning: ${error.message}`);
      return cachedPaymentSettingsMemory || { ...INITIAL_PAYMENT_SETTINGS, onlinePaymentEnabled: false };
    }

    const mapped = mapRowToPaymentSettings(data);
    cachedPaymentSettingsMemory = mapped;
    return mapped;
  } catch (err: any) {
    console.warn('getPaymentSettings fallback to memory/initial:', err.message);
    return cachedPaymentSettingsMemory || { ...INITIAL_PAYMENT_SETTINGS, onlinePaymentEnabled: false };
  }
}

export async function updatePaymentSettings(settings: Partial<PaymentSettings>): Promise<PaymentSettings> {
  const current = await getPaymentSettings();
  const merged: PaymentSettings = {
    ...current,
    ...settings,
    onlinePaymentEnabled: false, // CRITICAL: ALWAYS OFF BY ARCHITECTURE
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const row = mapPaymentSettingsToRow(merged);
    const { error } = await supabase.from('payment_settings').upsert([row]);

    if (error) {
      console.error(`Supabase payment_settings upsert error: ${error.message}`);
      throw new Error(`Failed to save payment settings to database: ${error.message}`);
    }
  }

  cachedPaymentSettingsMemory = merged;
  return merged;
}
