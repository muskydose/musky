/**
 * MUSKY DOSE — GLOBAL SEO & MULTILINGUAL INTELLIGENCE ENGINE (PHASE 8)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Mandates:
 * 1. INTERNATIONAL GROWTH FRAMEWORK: Support multi-region B2B wholesale and retail export
 *    inquiries across verified high-relevance destination markets (India, GCC/UAE, USA, UK, EU, Canada).
 * 2. REGIONAL BOTANICAL TAXONOMY: Deterministic normalization of regional Indian vernacular
 *    names (Maruthani, Gorintaku, Mailanchi, Madayantika) ensuring they map cleanly to canonical knowledge.
 * 3. CURRENCY READINESS: Authoritative currency metadata (INR primary, USD/AED/GBP/EUR ready).
 * 4. STRICT ANTI-DOORWAY RULE:
 *    Zero doorway pages. We DO NOT generate empty or spun "country pages" solely for search volume.
 *    International discovery routes through canonical knowledge and wholesale quotation portals.
 */

export interface InternationalMarketProfile {
  countryCode: string;
  countryName: string;
  primaryLanguage: string;
  currency: string;
  currencySymbol: string;
  shippingReadiness: 'DOMESTIC_STANDARD' | 'EXPORT_WHOLESALE_READY' | 'EXPORT_ON_DEMAND';
  primaryTargetKeywords: string[];
  aliases?: string[];
}

export const SUPPORTED_INTERNATIONAL_MARKETS: Record<string, InternationalMarketProfile> = {
  IN: {
    countryCode: 'IN',
    countryName: 'India',
    primaryLanguage: 'en-IN',
    currency: 'INR',
    currencySymbol: '₹',
    shippingReadiness: 'DOMESTIC_STANDARD',
    primaryTargetKeywords: ['pure sojat henna powder', 'natural mehendi powder', 'indigo powder for hair'],
    aliases: ['bharat', 'hindustan'],
  },
  AE: {
    countryCode: 'AE',
    countryName: 'United Arab Emirates',
    primaryLanguage: 'en-AE',
    currency: 'AED',
    currencySymbol: 'AED',
    shippingReadiness: 'EXPORT_WHOLESALE_READY',
    primaryTargetKeywords: ['organic henna powder dubai', 'pure rajasthani mehndi bulk uae'],
    aliases: ['uae', 'dubai', 'abu dhabi', 'sharjah', 'emirates'],
  },
  US: {
    countryCode: 'US',
    countryName: 'United States',
    primaryLanguage: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    shippingReadiness: 'EXPORT_WHOLESALE_READY',
    primaryTargetKeywords: ['pure sojat henna powder usa', 'bulk organic indigo hair dye wholesale'],
    aliases: ['usa', 'us', 'america'],
  },
  GB: {
    countryCode: 'GB',
    countryName: 'United Kingdom',
    primaryLanguage: 'en-GB',
    currency: 'GBP',
    currencySymbol: '£',
    shippingReadiness: 'EXPORT_WHOLESALE_READY',
    primaryTargetKeywords: ['natural chemical free henna uk', 'body art quality henna wholesale uk'],
    aliases: ['uk', 'britain', 'england', 'london', 'scotland'],
  },
  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    primaryLanguage: 'en-CA',
    currency: 'CAD',
    currencySymbol: 'C$',
    shippingReadiness: 'EXPORT_WHOLESALE_READY',
    primaryTargetKeywords: ['natural henna powder canada', 'pure indigo powder hair color'],
    aliases: ['canada', 'toronto', 'vancouver'],
  },
  EU: {
    countryCode: 'EU',
    countryName: 'European Union',
    primaryLanguage: 'en-EU',
    currency: 'EUR',
    currencySymbol: '€',
    shippingReadiness: 'EXPORT_ON_DEMAND',
    primaryTargetKeywords: ['organic henna powder europe bulk', 'lawsone content tested henna'],
    aliases: ['europe', 'germany', 'france', 'spain', 'italy', 'netherlands'],
  },
};

export interface VernacularTermMatch {
  term: string;
  language: string;
  canonicalEntityKey: string;
  canonicalUrl: string;
}

export const VERNACULAR_BOTANICAL_MAP: Record<string, { language: string; entityKey: string; slug: string }> = {
  // Henna
  maruthani: { language: 'ta', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },
  gorintaku: { language: 'te', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },
  mailanchi: { language: 'ml', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },
  madayantika: { language: 'sa', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },
  mehendi: { language: 'hi', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },
  mehndi: { language: 'hi', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },
  heena: { language: 'hi', entityKey: 'HENNA_MEHNDI', slug: 'henna-mehndi' },

  // Indigo
  avuri: { language: 'ta', entityKey: 'INDIGO', slug: 'indigo' },
  'neeli aku': { language: 'te', entityKey: 'INDIGO', slug: 'indigo' },
  neelayamari: { language: 'ml', entityKey: 'INDIGO', slug: 'indigo' },
  neelini: { language: 'sa', entityKey: 'INDIGO', slug: 'indigo' },
  neel: { language: 'hi', entityKey: 'INDIGO', slug: 'indigo' },

  // Amla
  nellikai: { language: 'ta', entityKey: 'AMLA', slug: 'amla' },
  usiri: { language: 'te', entityKey: 'AMLA', slug: 'amla' },
  amalaki: { language: 'sa', entityKey: 'AMLA', slug: 'amla' },

  // Bhringraj
  keshraja: { language: 'sa', entityKey: 'BHRINGRAJ', slug: 'bhringraj' },
  karisalankanni: { language: 'ta', entityKey: 'BHRINGRAJ', slug: 'bhringraj' },
  gununta: { language: 'te', entityKey: 'BHRINGRAJ', slug: 'bhringraj' },
};

/**
 * Resolves a vernacular search term to its canonical knowledge entity and language.
 */
export function resolveVernacularTerm(
  rawTerm: string,
  baseUrl: string = 'https://muskydose.in'
): VernacularTermMatch | null {
  const clean = (rawTerm || '').toLowerCase().trim();
  for (const [vTerm, data] of Object.entries(VERNACULAR_BOTANICAL_MAP)) {
    if (clean.includes(vTerm)) {
      return {
        term: vTerm,
        language: data.language,
        canonicalEntityKey: data.entityKey,
        canonicalUrl: `${baseUrl}/knowledge/${data.slug}`,
      };
    }
  }
  return null;
}

/**
 * Evaluates international search intent and provides export wholesale routing.
 */
export function evaluateInternationalIntent(
  query: string,
  baseUrl: string = 'https://muskydose.in'
): { isInternational: boolean; countryCode?: string; destinationUrl: string; reason: string } {
  const qLower = (query || '').toLowerCase();

  for (const [code, profile] of Object.entries(SUPPORTED_INTERNATIONAL_MARKETS)) {
    if (code === 'IN') continue;
    const nameMatch = qLower.includes(profile.countryName.toLowerCase());
    const codeMatch = qLower.includes(code.toLowerCase()) && qLower.split(/\s+/).includes(code.toLowerCase());
    const aliasMatch = (profile.aliases || []).some((alias) => qLower.includes(alias.toLowerCase()));

    if (nameMatch || codeMatch || aliasMatch) {
      return {
        isInternational: true,
        countryCode: code,
        destinationUrl: `${baseUrl}/wholesale`,
        reason: `International export demand detected for [${profile.countryName}]. Routed to B2B Wholesale & Export portal.`,
      };
    }
  }

  return {
    isInternational: false,
    destinationUrl: `${baseUrl}/products`,
    reason: 'Domestic search intent.',
  };
}
