import { Product } from '@/lib/types';
import { AutoSeoResult, SearchIntentType, SeoCompletenessStatus } from './types';
import {
  CANONICAL_ENTITIES,
  VERIFIED_ATTRIBUTE_SPECS,
  deriveSafeIntelligenceDefaults,
} from './intelligence-validator';
import {
  ProductScope,
  VerifiedAttribute,
} from './universal-product-contract';

/**
 * ============================================================================
 * DETERMINISTIC INTELLIGENCE-AWARE SEO COMPOSER (PHASE 3)
 * Project: Musky Dose (https://muskydose.in)
 * 
 * CORE GOVERNANCE:
 * 1. MANUAL: Manual SEO overrides always win. Intelligence only enriches missing fields.
 * 2. LOCKED: Do not automatically rewrite existing SEO title/description.
 * 3. NEEDS_REVIEW: Suppress unsupported intelligence claims. Minimal safe factual SEO only.
 * 4. AUTO: Safely derive eligible terms from canonical entity + scopes + verified attributes.
 * 5. ATTRIBUTE CLAIM RULE: Only attributes with valid verification source AND allowInSeoTitle === true
 *    may be promoted into SEO titles. Never promote an attribute merely from commercial text.
 * 6. HENNA_MEHNDI: Unified entity handling across all spelling variants without duplication.
 * 7. CROSS-CATEGORY ISOLATION: Scopes strictly isolate terms (e.g. no body art terms in hair/skin).
 * 8. LIMITS: SEO title <= 60 chars. Meta description factual and around 140-160 chars.
 * 9. CANONICAL: Strictly https://muskydose.in/products/<slug>.
 * ============================================================================
 */

export interface IntelligenceSeoOptions {
  forceRegenerate?: boolean;
}

/**
 * Normalizes keyword string (lowercase, trimmed, collapsed whitespace)
 */
function normalizeKeyword(term: string): string {
  return term
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts verified attributes eligible for promotion into SEO titles.
 */
export function getPromotableAttributes(attributes: VerifiedAttribute[]): VerifiedAttribute[] {
  if (!Array.isArray(attributes)) return [];

  return attributes.filter((attr) => {
    if (!attr || !attr.allowInSeoTitle) return false;

    const normalizedSlug = attr.slug === 'body-art-quality' ? 'baq' : attr.slug;
    const spec = VERIFIED_ATTRIBUTE_SPECS[normalizedSlug];
    if (!spec) return false;

    if (!spec.allowedSources.includes(attr.verificationSource)) return false;

    // Organic strictly requires legal registration or lab cert
    if (
      attr.slug === 'organic' &&
      attr.verificationSource !== 'LEGAL_REGISTRATION' &&
      attr.verificationSource !== 'LAB_CERTIFICATE'
    ) {
      return false;
    }

    // Lab tested strictly requires lab certificate
    if (attr.slug === 'lab-tested' && attr.verificationSource !== 'LAB_CERTIFICATE') {
      return false;
    }

    // If requires reference, reference must be provided
    if (spec.requiresReference && (!attr.verificationRef || !attr.verificationRef.trim())) {
      return false;
    }

    return true;
  });
}

/**
 * Deterministically composes intelligence-aware SEO metadata for any product.
 */
export function composeIntelligenceSeo(
  product: Partial<Product>,
  options?: IntelligenceSeoOptions
): AutoSeoResult {
  const name = (product.name || '').trim();
  const rawSlug = (product.slug || '').trim();
  const cleanSlug =
    rawSlug ||
    (name ? normalizeKeyword(name).replace(/\s+/g, '-') : `product-${Date.now()}`);
  const canonicalUrl = `https://muskydose.in/products/${cleanSlug}`;

  // 1. Resolve Intelligence Profile (from product or safe default)
  const intelligence =
    product.intelligence ||
    deriveSafeIntelligenceDefaults({
      name: product.name,
      categoryName: product.categoryName,
    });

  const status = intelligence.status || 'AUTO';
  const entityKey = intelligence.entityKey || 'UNKNOWN';
  const scopes: ProductScope[] = intelligence.scopes || ['HERBAL'];
  const promotableAttrs = getPromotableAttributes(intelligence.verifiedAttributes || []);
  const entityDef = CANONICAL_ENTITIES[entityKey] || CANONICAL_ENTITIES.UNKNOWN;

  // 2. Check Manual & Locked Overrides
  const manualTitle = (product.seoTitle || '').trim();
  const manualDesc = (product.seoDescription || '').trim();
  const manualKeywords = Array.isArray(product.seoKeywords) ? product.seoKeywords.filter(Boolean) : [];

  // LOCKED Governance: If fields are locked and already set, preserve them untouched
  if (status === 'LOCKED' && manualTitle && manualDesc && !options?.forceRegenerate) {
    return {
      primaryKeyword: manualKeywords[0] || normalizeKeyword(name),
      secondaryKeywords: manualKeywords.slice(1),
      longTailKeywords: [],
      searchIntent: 'COMMERCIAL',
      seoTitle: manualTitle.slice(0, 60),
      metaDescription: manualDesc,
      h1: name,
      semanticTerms: [entityDef.displayName.toLowerCase()],
      canonicalUrl,
      robotsIndex: product.robotsIndex ?? true,
      robotsFollow: product.robotsFollow ?? true,
      status: 'SEO_READY',
      statusMessage: 'Locked SEO configuration preserved against automated modification.',
      isAutoGenerated: false,
    };
  }

  // 3. Search Intent Resolution
  let searchIntent: SearchIntentType = 'COMMERCIAL';
  if (scopes.includes('BODY_ART')) {
    searchIntent = 'TRANSACTIONAL';
  } else if (name.toLowerCase().includes('wholesale') || name.toLowerCase().includes('bulk')) {
    searchIntent = 'COMMERCIAL';
  }

  // 4. Primary Keyword Composition
  let primaryKeyword = '';
  if (manualKeywords.length > 0 && status === 'MANUAL') {
    primaryKeyword = normalizeKeyword(manualKeywords[0]);
  } else if (entityKey === 'UNKNOWN' || status === 'NEEDS_REVIEW') {
    primaryKeyword = normalizeKeyword(name);
  } else if (entityKey === 'HENNA_MEHNDI') {
    const hasBaq = promotableAttrs.some((a) => a.slug === 'baq');
    if (hasBaq) {
      primaryKeyword = 'BAQ henna powder';
    } else if (scopes.includes('BODY_ART') && !scopes.includes('HAIR')) {
      primaryKeyword = 'natural henna powder for mehndi';
    } else if (scopes.includes('HAIR') && !scopes.includes('BODY_ART')) {
      primaryKeyword = 'pure henna powder for hair';
    } else {
      primaryKeyword = 'BAQ henna powder';
    }
  } else if (entityKey === 'INDIGO') {
    primaryKeyword = 'natural indigo powder for hair';
  } else if (entityKey === 'AMLA') {
    primaryKeyword = 'pure amla powder for hair';
  } else if (entityKey === 'HIBISCUS') {
    primaryKeyword = 'hibiscus flower powder for hair';
  } else if (entityKey === 'ROSE') {
    primaryKeyword = 'pure damask rose petal powder';
  } else if (entityKey === 'MORINGA') {
    primaryKeyword = 'moringa leaf powder';
  } else if (entityKey === 'BEETROOT') {
    primaryKeyword = 'natural beetroot powder';
  } else if (scopes.includes('HAIR')) {
    primaryKeyword = `${entityDef.displayName.toLowerCase()} powder for hair`;
  } else if (scopes.includes('SKIN')) {
    primaryKeyword = `${entityDef.displayName.toLowerCase()} powder for face`;
  } else {
    primaryKeyword = `${entityDef.displayName.toLowerCase()} powder`;
  }

  // 5. Secondary Keywords (Scope Isolated)
  const secondarySet = new Set<string>();
  if (status === 'MANUAL' && manualKeywords.length > 1) {
    manualKeywords.slice(1).forEach((k) => secondarySet.add(k.toLowerCase().trim()));
  }

  if (entityKey !== 'UNKNOWN' && status !== 'NEEDS_REVIEW') {
    // Add entity aliases without creating duplicate concepts
    entityDef.aliases.slice(0, 3).forEach((al) => {
      if (al !== primaryKeyword && al.length > 2) {
        secondarySet.add(`${al.toLowerCase()} powder`);
      }
    });

    // Cross-category isolated keywords
    if (scopes.includes('HAIR')) {
      secondarySet.add(`herbal ${entityDef.displayName.toLowerCase()} hair pack`);
      secondarySet.add(`natural ${entityDef.displayName.toLowerCase()} for hair`);
    }
    if (scopes.includes('SKIN')) {
      secondarySet.add(`natural ${entityDef.displayName.toLowerCase()} face pack`);
      secondarySet.add(`botanical ${entityDef.displayName.toLowerCase()} skincare`);
    }
    if (scopes.includes('BODY_ART')) {
      secondarySet.add('henna powder for cones');
      secondarySet.add('sojat henna powder');
      secondarySet.add('natural henna powder');
    }
  } else {
    secondarySet.add(`natural ${normalizeKeyword(name)}`);
    secondarySet.add(`pure ${normalizeKeyword(name)}`);
  }

  const secondaryKeywords = Array.from(secondarySet)
    .filter((k) => k !== primaryKeyword && k.length > 3)
    .slice(0, 5);

  // 6. Long-Tail Keywords (Factual & Scope Isolated)
  const longTailSet = new Set<string>();
  if (entityKey !== 'UNKNOWN' && status !== 'NEEDS_REVIEW') {
    if (scopes.includes('BODY_ART')) {
      longTailSet.add('baq henna powder for mehndi cones');
      longTailSet.add('sojat henna powder for body art');
    }
    if (scopes.includes('HAIR')) {
      longTailSet.add(`pure shade dried ${entityDef.displayName.toLowerCase()} powder for hair conditioning`);
      longTailSet.add(`ayurvedic ${entityDef.displayName.toLowerCase()} hair pack with zero additives`);
    }
    if (scopes.includes('SKIN')) {
      longTailSet.add(`shade dried botanical ${entityDef.displayName.toLowerCase()} facial treatment`);
    }
  } else {
    longTailSet.add(`authentic botanical ${normalizeKeyword(name)} direct from sojat rajasthan`);
  }
  const longTailKeywords = Array.from(longTailSet).slice(0, 4);

  // 7. Deterministic Title Construction (Strict Hard Limit <= 60 chars)
  let composedTitle = '';
  if (status === 'MANUAL' && manualTitle) {
    composedTitle = manualTitle;
  } else if (entityKey === 'UNKNOWN' || status === 'NEEDS_REVIEW') {
    // Strictly preserve commercial display name
    composedTitle = name ? `${name} | Musky Dose` : 'Botanical Care Product | Musky Dose';
  } else {
    // Auto composition with verified attribute promotion
    let scopeSuffix = '— Pure Botanical Care';
    if (scopes.includes('BODY_ART') && scopes.includes('HAIR')) {
      scopeSuffix = '— Mehndi & Body Art Use';
    } else if (scopes.includes('BODY_ART')) {
      scopeSuffix = '— Mehndi & Body Art Use';
    } else if (scopes.includes('HAIR')) {
      scopeSuffix = '— Natural Hair Care & Conditioning';
    } else if (scopes.includes('SKIN')) {
      scopeSuffix = '— Natural Skincare & Face Pack';
    }

    // Build candidate: [Name] [ScopeSuffix]
    composedTitle = `${name} ${scopeSuffix}`;

    // Clean brand duplicate if present
    composedTitle = composedTitle.replace(/\s*\|\s*Musky\s*Dose.*$/i, '').trim();
  }

  // Ensure strict <= 60 characters limit
  if (composedTitle.length > 60) {
    composedTitle = composedTitle.slice(0, 57).replace(/\s+[^\s]*$/, '') + '...';
  }
  if (composedTitle.length > 60) {
    composedTitle = composedTitle.slice(0, 60);
  }

  // 8. Deterministic Meta Description Construction (Target: ~140–160 chars)
  let composedMetaDesc = '';
  if (status === 'MANUAL' && manualDesc) {
    composedMetaDesc = manualDesc;
  } else if (entityKey === 'UNKNOWN' || status === 'NEEDS_REVIEW') {
    composedMetaDesc = `${name || 'Natural botanical product'} by Musky Dose. Authentic single-origin batch crafted in Sojat, Rajasthan with direct Pan-India shipping.`;
  } else {
    const originStr = 'Sojat, Rajasthan';
    const formStr = product.quantityOrWeight || 'standard pack';

    if (scopes.includes('BODY_ART')) {
      composedMetaDesc = `Authentic Sojat henna powder from Rajasthan. High-grade purity suitable for fine mehndi cone paste preparation and natural hair application. ${formStr}.`;
    } else if (scopes.includes('HAIR')) {
      composedMetaDesc = `Pure single-origin ${entityDef.displayName.toLowerCase()} powder from ${originStr}. Natural traditional hair care formulation with zero chemical additives. ${formStr}.`;
    } else if (scopes.includes('SKIN')) {
      composedMetaDesc = `Pure shade-dried ${entityDef.displayName.toLowerCase()} from ${originStr}. Gentle botanical skincare formulation without synthetic fragrance or artificial dyes.`;
    } else {
      composedMetaDesc = `100% pure botanical ${entityDef.displayName.toLowerCase()} harvested in ${originStr}. Unadulterated traditional herbal formulation with direct dispatch.`;
    }
  }

  // Sanitize meta description length to clean boundary
  if (composedMetaDesc.length > 165) {
    composedMetaDesc = composedMetaDesc.slice(0, 157).replace(/\s+[^\s]*$/, '') + '.';
  }

  // 9. Semantic Terms
  const semanticTerms = [
    entityDef.displayName.toLowerCase(),
    ...(entityDef.scientificName ? [entityDef.scientificName.toLowerCase()] : []),
    'sojat',
    'rajasthan',
    ...scopes.map((s) => s.toLowerCase()),
  ];

  // 10. Completeness Status
  const completenessStatus: SeoCompletenessStatus =
    status === 'NEEDS_REVIEW' || entityKey === 'UNKNOWN' ? 'SEO_NEEDS_REVIEW' : 'SEO_READY';
  const statusMessage =
    status === 'NEEDS_REVIEW' || entityKey === 'UNKNOWN'
      ? 'Product classification is under review. Public SEO claims are conservative.'
      : 'SEO fully optimized with high-relevance botanical keywords.';

  return {
    primaryKeyword,
    secondaryKeywords,
    longTailKeywords,
    searchIntent,
    seoTitle: composedTitle,
    metaDescription: composedMetaDesc,
    h1: name,
    semanticTerms,
    canonicalUrl,
    robotsIndex: product.robotsIndex ?? true,
    robotsFollow: product.robotsFollow ?? true,
    status: completenessStatus,
    statusMessage,
    suggestedCategory: product.categoryName,
    isAutoGenerated: status !== 'MANUAL',
  };
}

