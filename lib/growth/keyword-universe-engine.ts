/**
 * MUSKY DOSE — UNIVERSAL KEYWORD UNIVERSE ENGINE V2
 * 
 * Generates a structured 20-category keyword ecosystem for any product.
 * 
 * Categories:
 * A. PRIMARY
 * B. SECONDARY
 * C. LONG_TAIL
 * D. SPELLING_VARIANTS
 * E. HINGLISH / COMMON_SEARCH_VARIANTS
 * F. PRODUCT
 * G. CATEGORY
 * H. USE_CASE
 * I. HOW_TO
 * J. FAQ
 * K. COMMERCIAL
 * L. BUYING
 * M. PACK_SIZE
 * N. WHOLESALE
 * O. B2B
 * P. LOCAL
 * Q. ORIGIN
 * R. COMPARISON
 * S. RELATED_PRODUCT
 * T. INFORMATIONAL
 * 
 * Safety & Evidence:
 * - Real GSC data takes precedence over generated terms.
 * - No fabricated search volume or ranks.
 * - Strict entity isolation (Indigo never inherits Henna terms).
 */

import { UniversalProductIntelligence } from './product-intelligence';
import { SearchConsoleQuery } from './types';

export type KeywordUniverseCategory =
  | 'PRIMARY'
  | 'SECONDARY'
  | 'LONG_TAIL'
  | 'SPELLING_VARIANTS'
  | 'HINGLISH_COMMON_VARIANTS'
  | 'PRODUCT'
  | 'CATEGORY'
  | 'USE_CASE'
  | 'HOW_TO'
  | 'FAQ'
  | 'COMMERCIAL'
  | 'BUYING'
  | 'PACK_SIZE'
  | 'WHOLESALE'
  | 'B2B'
  | 'LOCAL'
  | 'ORIGIN'
  | 'COMPARISON'
  | 'RELATED_PRODUCT'
  | 'INFORMATIONAL';

export type KeywordSourceType =
  | 'GENERATED'
  | 'REAL_GSC'
  | 'ADMIN_DEFINED'
  | 'VERIFIED'
  | 'NEEDS_REVIEW';

export interface KeywordUniverseItem {
  term: string;
  category: KeywordUniverseCategory;
  source: KeywordSourceType;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  intent: 'RETAIL' | 'B2B' | 'LOCAL' | 'INFORMATIONAL';
  gscMetrics?: {
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  };
}

export interface ProductKeywordUniverseV2 {
  productName: string;
  entity: string;
  totalKeywords: number;
  realGscKeywordsCount: number;
  generatedKeywordsCount: number;
  categories: Record<KeywordUniverseCategory, KeywordUniverseItem[]>;
  allKeywords: KeywordUniverseItem[];
}

export function generateProductKeywordUniverseV2(params: {
  intelligence: UniversalProductIntelligence;
  gscQueries?: SearchConsoleQuery[];
  adminKeywords?: string[];
}): ProductKeywordUniverseV2 {
  const { intelligence, gscQueries = [], adminKeywords = [] } = params;
  const name = intelligence.canonicalProductName;
  const baseEntity = intelligence.botanicalEntity.split('/')[0].trim().toLowerCase();
  const form = intelligence.form.replace(/_/g, ' ');
  const pack = `${intelligence.packQuantity}${intelligence.packUnit}`;

  const categoryMap: Record<KeywordUniverseCategory, KeywordUniverseItem[]> = {
    PRIMARY: [],
    SECONDARY: [],
    LONG_TAIL: [],
    SPELLING_VARIANTS: [],
    HINGLISH_COMMON_VARIANTS: [],
    PRODUCT: [],
    CATEGORY: [],
    USE_CASE: [],
    HOW_TO: [],
    FAQ: [],
    COMMERCIAL: [],
    BUYING: [],
    PACK_SIZE: [],
    WHOLESALE: [],
    B2B: [],
    LOCAL: [],
    ORIGIN: [],
    COMPARISON: [],
    RELATED_PRODUCT: [],
    INFORMATIONAL: [],
  };

  const seenTerms = new Set<string>();

  const addItem = (
    term: string,
    category: KeywordUniverseCategory,
    source: KeywordSourceType = 'GENERATED',
    intent: 'RETAIL' | 'B2B' | 'LOCAL' | 'INFORMATIONAL' = 'RETAIL',
    gscMetrics?: KeywordUniverseItem['gscMetrics']
  ) => {
    const clean = term.toLowerCase().replace(/\s+/g, ' ').trim();
    if (!clean || seenTerms.has(clean)) return;
    seenTerms.add(clean);

    const item: KeywordUniverseItem = {
      term: clean,
      category,
      source,
      confidence: source === 'REAL_GSC' || source === 'ADMIN_DEFINED' ? 'HIGH' : 'MEDIUM',
      intent,
      gscMetrics,
    };
    categoryMap[category].push(item);
  };

  // 1. Incorporate Real GSC Queries First
  for (const g of gscQueries) {
    const q = g.query.toLowerCase().trim();
    const hasEntityMatch =
      q.includes(baseEntity) ||
      q.includes(name.toLowerCase()) ||
      (intelligence.blendComponents && intelligence.blendComponents.some((c) => q.includes(c.toLowerCase())));

    if (hasEntityMatch) {
      let cat: KeywordUniverseCategory = 'PRODUCT';
      let intent: 'RETAIL' | 'B2B' | 'LOCAL' | 'INFORMATIONAL' = 'RETAIL';

      if (q.includes('wholesale') || q.includes('bulk') || q.includes('supplier')) {
        cat = 'B2B';
        intent = 'B2B';
      } else if (q.includes('sojat') || q.includes('rajasthan')) {
        cat = 'LOCAL';
        intent = 'LOCAL';
      } else if (q.includes('how to') || q.includes('guide')) {
        cat = 'HOW_TO';
        intent = 'INFORMATIONAL';
      } else if (q.includes('price') || q.includes('buy') || q.includes('order')) {
        cat = 'COMMERCIAL';
      }

      addItem(q, cat, 'REAL_GSC', intent, {
        impressions: g.impressions,
        clicks: g.clicks,
        ctr: g.ctr,
        position: g.position,
      });
    }
  }

  // 2. Admin Defined Keywords
  for (const kw of adminKeywords) {
    addItem(kw, 'PRIMARY', 'ADMIN_DEFINED');
  }

  // 3. A. PRIMARY KEYWORDS
  addItem(name, 'PRIMARY');
  addItem(`${baseEntity} ${form}`, 'PRIMARY');
  addItem(`pure ${baseEntity} ${form}`, 'PRIMARY');

  // 4. B. SECONDARY KEYWORDS
  addItem(`natural ${baseEntity} ${form}`, 'SECONDARY');
  addItem(`organic ${baseEntity} ${form}`, 'SECONDARY');
  addItem(`unadulterated ${baseEntity}`, 'SECONDARY');

  // 5. C. LONG TAIL KEYWORDS
  addItem(`100% natural pure ${baseEntity} ${form} online`, 'LONG_TAIL');
  addItem(`chemical free ${baseEntity} for natural care`, 'LONG_TAIL');
  addItem(`fresh single origin ${baseEntity} powder from rajasthan`, 'LONG_TAIL');

  // 6. D. SPELLING VARIANTS (Strictly for unified entities like Henna/Mehndi)
  if (intelligence.entity === 'HENNA_MEHNDI') {
    addItem('mehndi powder', 'SPELLING_VARIANTS');
    addItem('mehendi powder', 'SPELLING_VARIANTS');
    addItem('mehandi powder', 'SPELLING_VARIANTS');
    addItem('heena powder', 'SPELLING_VARIANTS');
    addItem('lawsonia inermis powder', 'SPELLING_VARIANTS');
  }

  // 7. E. HINGLISH / COMMON SEARCH VARIANTS
  if (intelligence.entity === 'HENNA_MEHNDI') {
    addItem('asli sojat ki mehndi', 'HINGLISH_COMMON_VARIANTS');
    addItem('baalon ke liye natural mehndi', 'HINGLISH_COMMON_VARIANTS');
    addItem('shuddh mehndi powder rate', 'HINGLISH_COMMON_VARIANTS');
  } else {
    addItem(`asli ${baseEntity} powder`, 'HINGLISH_COMMON_VARIANTS');
    addItem(`baalon ke liye ${baseEntity}`, 'HINGLISH_COMMON_VARIANTS');
  }

  // 8. F. PRODUCT KEYWORDS
  addItem(`${name} online`, 'PRODUCT');
  addItem(`${name} price`, 'PRODUCT');
  addItem(`${name} reviews`, 'PRODUCT');

  // 9. G. CATEGORY KEYWORDS
  addItem(intelligence.categoryName.toLowerCase(), 'CATEGORY');
  addItem(`pure botanical ${intelligence.categoryName.toLowerCase()}`, 'CATEGORY');

  // 10. H. USE CASE KEYWORDS
  for (const uc of intelligence.useCases) {
    addItem(`${baseEntity} for ${uc.toLowerCase()}`, 'USE_CASE');
  }

  // 11. I. HOW TO KEYWORDS
  addItem(`how to use ${baseEntity} ${form}`, 'HOW_TO', 'GENERATED', 'INFORMATIONAL');
  addItem(`how to apply ${baseEntity} at home`, 'HOW_TO', 'GENERATED', 'INFORMATIONAL');
  addItem(`how to prepare ${baseEntity} paste`, 'HOW_TO', 'GENERATED', 'INFORMATIONAL');

  // 12. J. FAQ KEYWORDS
  addItem(`is ${baseEntity} chemical free`, 'FAQ', 'GENERATED', 'INFORMATIONAL');
  addItem(`how long does ${baseEntity} last`, 'FAQ', 'GENERATED', 'INFORMATIONAL');
  addItem(`what are the benefits of ${baseEntity}`, 'FAQ', 'GENERATED', 'INFORMATIONAL');

  // 13. K. COMMERCIAL KEYWORDS
  addItem(`buy ${baseEntity} ${form} online`, 'COMMERCIAL');
  addItem(`${baseEntity} online store india`, 'COMMERCIAL');

  // 14. L. BUYING KEYWORDS
  addItem(`best ${baseEntity} brand in india`, 'BUYING');
  addItem(`where to buy authentic ${baseEntity}`, 'BUYING');

  // 15. M. PACK SIZE KEYWORDS
  addItem(`${baseEntity} ${pack}`, 'PACK_SIZE');
  addItem(`${baseEntity} ${pack} price`, 'PACK_SIZE');

  // 16. N. WHOLESALE KEYWORDS (Only if wholesale eligible)
  if (intelligence.wholesaleEligible) {
    addItem(`${baseEntity} wholesale`, 'WHOLESALE', 'GENERATED', 'B2B');
    addItem(`bulk ${baseEntity} powder`, 'WHOLESALE', 'GENERATED', 'B2B');
    addItem(`${baseEntity} supplier`, 'WHOLESALE', 'GENERATED', 'B2B');
  }

  // 17. O. B2B KEYWORDS (Only if wholesale eligible)
  if (intelligence.wholesaleEligible) {
    addItem(`${baseEntity} manufacturer in india`, 'B2B', 'GENERATED', 'B2B');
    addItem(`${baseEntity} salon supply in bulk`, 'B2B', 'GENERATED', 'B2B');
    addItem(`${baseEntity} b2b rate card`, 'B2B', 'GENERATED', 'B2B');
  }

  // 18. P. LOCAL KEYWORDS (Only if Sojat or Rajasthan verified)
  if (intelligence.localIntent === 'SOJAT_ORIGIN') {
    addItem(`sojat ${baseEntity}`, 'LOCAL', 'GENERATED', 'LOCAL');
    addItem(`sojat city ${baseEntity} mandi`, 'LOCAL', 'GENERATED', 'LOCAL');
    addItem(`${baseEntity} manufacturer in sojat`, 'LOCAL', 'GENERATED', 'LOCAL');
  } else if (intelligence.localIntent === 'RAJASTHAN_ORIGIN') {
    addItem(`rajasthan ${baseEntity}`, 'LOCAL', 'GENERATED', 'LOCAL');
  }

  // 19. Q. ORIGIN KEYWORDS
  if (intelligence.localIntent === 'SOJAT_ORIGIN') {
    addItem(`authentic sojat rajasthan ${baseEntity}`, 'ORIGIN', 'GENERATED', 'LOCAL');
    addItem(`single origin sojat ${baseEntity}`, 'ORIGIN', 'GENERATED', 'LOCAL');
  }

  // 20. R. COMPARISON KEYWORDS
  if (intelligence.entity === 'HENNA_MEHNDI') {
    addItem('henna vs chemical hair dye', 'COMPARISON', 'GENERATED', 'INFORMATIONAL');
    addItem('natural henna vs synthetic black mehndi', 'COMPARISON', 'GENERATED', 'INFORMATIONAL');
    addItem('difference between henna and mehendi', 'COMPARISON', 'GENERATED', 'INFORMATIONAL');
  } else if (intelligence.entity === 'INDIGO') {
    addItem('henna vs indigo difference', 'COMPARISON', 'GENERATED', 'INFORMATIONAL');
    addItem('indigo powder vs chemical black dye', 'COMPARISON', 'GENERATED', 'INFORMATIONAL');
  }

  // 21. S. RELATED PRODUCT KEYWORDS
  for (const rel of intelligence.relatedEntities) {
    addItem(`${baseEntity} and ${rel.toLowerCase()} combo`, 'RELATED_PRODUCT');
  }
  if (intelligence.blendComponents && intelligence.blendComponents.length > 1) {
    for (const comp of intelligence.blendComponents) {
      const compName = comp.toLowerCase().replace(/_/g, ' ');
      addItem(`${compName} powder for hair care`, 'RELATED_PRODUCT');
      addItem(`pure ${compName} component in blend`, 'RELATED_PRODUCT');
    }
  }

  // 22. T. INFORMATIONAL KEYWORDS
  addItem(`${baseEntity} botanical overview`, 'INFORMATIONAL', 'GENERATED', 'INFORMATIONAL');
  addItem(`storage instructions for ${baseEntity} ${form}`, 'INFORMATIONAL', 'GENERATED', 'INFORMATIONAL');

  const allKeywords = Object.values(categoryMap).flat();
  const realGscCount = allKeywords.filter((k) => k.source === 'REAL_GSC').length;
  const genCount = allKeywords.filter((k) => k.source === 'GENERATED').length;

  return {
    productName: name,
    entity: intelligence.entity,
    totalKeywords: allKeywords.length,
    realGscKeywordsCount: realGscCount,
    generatedKeywordsCount: genCount,
    categories: categoryMap,
    allKeywords,
  };
}

