import { Product, Category, Order } from '@/lib/types';
import {
  GrowthKeyword,
  ProductKeywordTarget,
  SearchConsoleQuery,
  GoogleTrendsQuery,
  BusinessDemandSignal,
} from './types';
import { generateProductKeywordUniverse, normalizeKeywordTerm } from './product-keyword-engine';

export interface CatalogSearchMatch {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName: string;
  productType?: string;
  price: number;
  compareAtPrice?: number;
  quantityOrWeight: string;
  sku: string;
  stockStatus: string;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  matchedFields: string[];
  highlight?: string;
  relevanceScore: number;
  sourceBadge: 'CATALOG MATCH';
}

export interface EnrichedProductKeywordMatch extends ProductKeywordTarget {
  sourceBadge: 'GENERATED KEYWORD';
  verifiedDemandAvailable: boolean;
  noDataExplanation?: string;
  matchedFields: string[];
}

export interface EnrichedVerifiedGrowthKeyword extends GrowthKeyword {
  sourceBadge: 'VERIFIED DEMAND';
  muskyOpportunityScore: number | null;
  opportunityScoreExplanation?: string;
  suggestedGoogleAdsTarget?: {
    keyword: string;
    matchType: 'PHRASE' | 'EXACT' | 'BROAD';
    locationTarget: string;
    suggestedCampaign: string;
    suggestedAdGroup: string;
    requiresAdminConfirmation: boolean;
    autoSpendAllowed: boolean;
  };
}

export interface UniversalSearchResult {
  query: string;
  normalizedQuery: string;
  tokens: string[];
  totalMatches: number;
  catalogMatches: CatalogSearchMatch[];
  generatedKeywords: EnrichedProductKeywordMatch[];
  verifiedKeywords: EnrichedVerifiedGrowthKeyword[];
  gscQueries: (SearchConsoleQuery & { sourceBadge: 'SEARCH CONSOLE' })[];
  trendsQueries: GoogleTrendsQuery[];
  businessSignals: BusinessDemandSignal;
  summary: {
    totalCatalogMatches: number;
    totalGeneratedKeywords: number;
    totalVerifiedKeywords: number;
    totalGscQueries: number;
    verifiedDemandRatio: string;
  };
}

const SYNONYM_DICTIONARY: Record<string, string[]> = {
  baq: ['body art quality', 'triple shifted', 'cloth sifted', 'micro sifted', 'bridal'],
  'baq henna': ['body art quality henna', 'triple shifted henna', 'pure sojat henna'],
  'body art quality': ['baq', 'triple shifted', 'mehendi powder'],
  henna: ['mehndi', 'mehendi', 'heena', 'lawsonia', 'madayantika'],
  mehndi: ['henna', 'mehendi', 'heena', 'cones'],
  mehendi: ['henna', 'mehndi', 'heena', 'cones'],
  indigo: ['neel', 'nili', 'black hair dye', 'indigofera'],
  amla: ['amalaki', 'indian gooseberry', 'usirikaya', 'emblica'],
  shikakai: ['acacia', 'seeyakkai', 'soap pod'],
  reetha: ['soapnut', 'aritha', 'arishta'],
  rosewater: ['rose water', 'gulab jal', 'damask rose'],
  'rose water': ['rosewater', 'gulab jal', 'damask rose'],
  neem: ['margosa', 'nimba', 'veppilai'],
  hibiscus: ['jaswand', 'gudhul'],
  bhringraj: ['eclipta alba', 'keshraj'],
  brahmi: ['bacopa monnieri', 'gotu kola'],
};

function extractSearchTokens(rawQuery: string): { cleanQuery: string; tokens: string[]; synonyms: Set<string> } {
  const cleanQuery = normalizeKeywordTerm(rawQuery);
  const tokens = cleanQuery.split(/\s+/).filter(Boolean);
  const synonyms = new Set<string>();

  if (cleanQuery) {
    if (SYNONYM_DICTIONARY[cleanQuery]) {
      SYNONYM_DICTIONARY[cleanQuery].forEach(s => synonyms.add(s));
    }
    for (const t of tokens) {
      if (SYNONYM_DICTIONARY[t]) {
        SYNONYM_DICTIONARY[t].forEach(s => synonyms.add(s));
      }
    }
  }

  return { cleanQuery, tokens, synonyms };
}

/**
 * Executes Universal 3-Layer Growth Search:
 * Layer A: Live Catalog (Products & Categories)
 * Layer B: Autonomous Product Keyword Universes (All active products)
 * Layer C: Verified External Demand (Google Keyword Planner CSV / DB)
 */
export function executeUniversalGrowthSearch(params: {
  rawQuery: string;
  products: Product[];
  categories: Category[];
  verifiedKeywords: GrowthKeyword[];
  gscQueries?: SearchConsoleQuery[];
  trendsData?: GoogleTrendsQuery[];
  orders?: Order[];
  wholesale?: any[];
}): UniversalSearchResult {
  const { rawQuery, products, categories, verifiedKeywords, gscQueries = [], trendsData = [], orders = [], wholesale = [] } = params;
  const { cleanQuery: q, tokens, synonyms } = extractSearchTokens(rawQuery);

  const categoryMap = new Map<string, string>();
  categories.forEach(c => categoryMap.set(c.id, c.name));

  // -------------------------------------------------------------
  // LAYER A: LIVE CATALOG SEARCH
  // -------------------------------------------------------------
  const catalogMatches: CatalogSearchMatch[] = [];

  for (const p of products) {
    if (!p) continue;
    const pName = normalizeKeywordTerm(p.name || '');
    const pSlug = (p.slug || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const catName = normalizeKeywordTerm(p.categoryName || categoryMap.get(p.categoryId) || '');
    const pShortDesc = normalizeKeywordTerm(p.shortDescription || '');
    const pFullDesc = normalizeKeywordTerm(p.fullDescription || '');
    const pSku = (p.sku || '').toLowerCase();
    const pIngredients = (Array.isArray(p.ingredients) ? p.ingredients : [String(p.ingredients || '')]).map(i => normalizeKeywordTerm(i));
    const pBenefits = (Array.isArray(p.benefits) ? p.benefits : [String(p.benefits || '')]).map(b => normalizeKeywordTerm(b));
    const pUsage = normalizeKeywordTerm(p.usageInstructions || '');

    if (!q) {
      // Empty query returns full catalog baseline
      catalogMatches.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryId: p.categoryId,
        categoryName: p.categoryName || categoryMap.get(p.categoryId) || 'General',
        productType: p.productType,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        quantityOrWeight: p.quantityOrWeight || '',
        sku: p.sku || '',
        stockStatus: p.stockStatus || 'in_stock',
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        images: p.images || [],
        matchedFields: ['Catalog Baseline'],
        relevanceScore: 10,
        sourceBadge: 'CATALOG MATCH',
      });
      continue;
    }

    const matchedFields: string[] = [];
    let score = 0;

    // 1. Exact Name Match
    if (pName === q) {
      matchedFields.push('Exact Name Match');
      score += 1000;
    } else if (pName.includes(q)) {
      matchedFields.push('Product Name (Full Phrase)');
      score += 650;
    } else {
      // Token overlap in product name
      const matchedTokens = tokens.filter(t => pName.includes(t));
      if (matchedTokens.length === tokens.length && tokens.length > 0) {
        matchedFields.push('Product Name (All Tokens)');
        score += 500;
      } else if (matchedTokens.length > 0) {
        matchedFields.push(`Product Name (${matchedTokens.length}/${tokens.length} tokens)`);
        score += matchedTokens.length * 150;
      }
    }

    // 2. Slug Match
    if (pSlug === q || pSlug.replace(/\s+/g, '-') === q.replace(/\s+/g, '-')) {
      matchedFields.push('Exact Slug Match');
      score += 400;
    } else if (pSlug.includes(q)) {
      matchedFields.push('Slug Partial');
      score += 200;
    }

    // 3. Category Match
    if (catName === q) {
      matchedFields.push('Exact Category Match');
      score += 300;
    } else if (catName.includes(q)) {
      matchedFields.push('Category Partial');
      score += 150;
    }

    // 4. SKU Match
    if (pSku && (pSku === q || pSku.includes(q))) {
      matchedFields.push('SKU Match');
      score += 350;
    }

    // 5. Ingredients Match
    let matchedIngredientName = '';
    for (const ing of pIngredients) {
      if (ing === q || ing.includes(q)) {
        matchedFields.push(`Ingredient Match (${ing})`);
        score += 250;
        matchedIngredientName = ing;
        break;
      }
      const ingTokens = tokens.filter(t => ing.includes(t));
      if (ingTokens.length === tokens.length && tokens.length > 0) {
        matchedFields.push(`Ingredient Token Match (${ing})`);
        score += 180;
        matchedIngredientName = ing;
        break;
      }
    }

    // 6. Benefits & Usage
    if (pBenefits.some(b => b.includes(q))) {
      matchedFields.push('Product Benefits');
      score += 120;
    }
    if (pUsage.includes(q)) {
      matchedFields.push('Usage Instructions');
      score += 100;
    }
    if (pShortDesc.includes(q) || pFullDesc.includes(q)) {
      matchedFields.push('Description Text');
      score += 80;
    }

    // 7. Botanical Synonyms / Aliases
    for (const syn of Array.from(synonyms)) {
      if (pName.includes(syn)) {
        matchedFields.push(`Botanical Synonym (${syn})`);
        score += 300;
        break;
      }
      if (pIngredients.some(i => i.includes(syn))) {
        matchedFields.push(`Ingredient Synonym (${syn})`);
        score += 200;
        break;
      }
    }

    if (score >= 50 && matchedFields.length > 0) {
      let highlight = '';
      if (matchedIngredientName) {
        highlight = `Key Ingredient: "${matchedIngredientName}"`;
      } else if (p.shortDescription) {
        highlight = p.shortDescription.length > 100 ? p.shortDescription.substring(0, 100) + '...' : p.shortDescription;
      }

      catalogMatches.push({
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryId: p.categoryId,
        categoryName: p.categoryName || categoryMap.get(p.categoryId) || 'General',
        productType: p.productType,
        price: p.price,
        compareAtPrice: p.compareAtPrice,
        quantityOrWeight: p.quantityOrWeight || '',
        sku: p.sku || '',
        stockStatus: p.stockStatus || 'in_stock',
        isActive: p.isActive,
        isFeatured: p.isFeatured,
        images: p.images || [],
        matchedFields: Array.from(new Set(matchedFields)),
        highlight,
        relevanceScore: score,
        sourceBadge: 'CATALOG MATCH',
      });
    }
  }

  catalogMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // -------------------------------------------------------------
  // LAYER B: AUTONOMOUS PRODUCT KEYWORD UNIVERSE SEARCH
  // -------------------------------------------------------------
  const generatedKeywordMatches: EnrichedProductKeywordMatch[] = [];
  const seenGeneratedKeywords = new Set<string>();

  // Map verified keywords by normalized text for O(1) enrichment lookup
  const verifiedMap = new Map<string, GrowthKeyword>();
  for (const vk of verifiedKeywords) {
    const norm = normalizeKeywordTerm(vk.keyword);
    if (norm) verifiedMap.set(norm, vk);
  }

  // Search universes across ALL products (batched)
  for (const prod of products) {
    const universe = generateProductKeywordUniverse(prod, verifiedKeywords);

    for (const kw of universe.keywords) {
      const normKw = normalizeKeywordTerm(kw.keyword);
      if (!normKw || seenGeneratedKeywords.has(normKw)) continue;

      let matchesQuery = false;
      const kwMatchedFields: string[] = [];
      let kwRelevance = 0;

      if (!q) {
        // Baseline: top opportunities
        matchesQuery = kw.isOpportunity || kw.relevanceScore >= 80;
        if (matchesQuery) {
          kwMatchedFields.push('High Priority Product Target');
          kwRelevance = kw.relevanceScore;
        }
      } else {
        if (normKw === q) {
          matchesQuery = true;
          kwMatchedFields.push('Exact Generated Keyword Match');
          kwRelevance = 1000;
        } else if (normKw.includes(q)) {
          matchesQuery = true;
          kwMatchedFields.push('Phrase Match in Target Keyword');
          kwRelevance = 750;
        } else if (q.includes(normKw)) {
          matchesQuery = true;
          kwMatchedFields.push('Query Contains Target Keyword');
          kwRelevance = 600;
        } else {
          // Token matching
          const matchedTokens = tokens.filter(t => normKw.includes(t));
          if (matchedTokens.length === tokens.length && tokens.length > 0) {
            matchesQuery = true;
            kwMatchedFields.push('All Query Tokens Matched in Keyword');
            kwRelevance = 450;
          } else if (matchedTokens.length >= Math.ceil(tokens.length / 2) && tokens.length > 1) {
            matchesQuery = true;
            kwMatchedFields.push(`Partial Tokens (${matchedTokens.length}/${tokens.length})`);
            kwRelevance = 250;
          }
        }

        // Check synonyms in generated keywords
        for (const syn of Array.from(synonyms)) {
          if (normKw.includes(syn)) {
            matchesQuery = true;
            kwMatchedFields.push(`Botanical Synonym Match (${syn})`);
            kwRelevance = Math.max(kwRelevance, 400);
            break;
          }
        }
      }

      if (matchesQuery) {
        seenGeneratedKeywords.add(normKw);

        // Check verified demand lookup
        const verifiedRecord = verifiedMap.get(normKw);
        const hasVerifiedDemand = Boolean(
          verifiedRecord &&
          typeof verifiedRecord.searchVolume === 'number' &&
          verifiedRecord.searchVolume > 0
        );

        generatedKeywordMatches.push({
          ...kw,
          relevanceScore: Math.max(kw.relevanceScore, kwRelevance),
          sourceBadge: 'GENERATED KEYWORD',
          verifiedDemandAvailable: hasVerifiedDemand,
          verifiedSearchVolume: verifiedRecord?.searchVolume ?? null,
          verifiedCpc: verifiedRecord?.cpc ?? null,
          verifiedCompetition: verifiedRecord?.competition ?? null,
          verifiedTrend: verifiedRecord?.trend ?? null,
          verifiedSourceName: verifiedRecord?.sourceName ?? null,
          verifiedCollectedAt: verifiedRecord?.collectedAt ?? null,
          noDataExplanation: hasVerifiedDemand
            ? undefined
            : 'Verified search-demand data unavailable yet. Target derived from autonomous botanical universe.',
          matchedFields: kwMatchedFields,
        });
      }
    }
  }

  generatedKeywordMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // -------------------------------------------------------------
  // LAYER C: VERIFIED DEMAND SEARCH (growth_keywords)
  // -------------------------------------------------------------
  const verifiedMatches: EnrichedVerifiedGrowthKeyword[] = [];

  for (const vk of verifiedKeywords) {
    const norm = normalizeKeywordTerm(vk.keyword);
    const cat = normalizeKeywordTerm(vk.category || '');
    const state = normalizeKeywordTerm(vk.state || '');
    const city = normalizeKeywordTerm(vk.city || '');

    let matches = false;
    if (!q) {
      matches = true;
    } else {
      if (norm === q || norm.includes(q) || q.includes(norm)) {
        matches = true;
      } else if (cat.includes(q) || state.includes(q) || city.includes(q)) {
        matches = true;
      } else {
        const matchedTokens = tokens.filter(t => norm.includes(t) || state.includes(t) || city.includes(t));
        if (matchedTokens.length === tokens.length && tokens.length > 0) {
          matches = true;
        }
      }
    }

    if (matches) {
      const locTarget = [vk.city, vk.district, vk.state, vk.country].filter(Boolean).join(', ') || 'India (National)';
      const safeKw = vk.keyword.replace(/[^a-zA-Z0-9]/g, '_');

      verifiedMatches.push({
        ...vk,
        sourceBadge: 'VERIFIED DEMAND',
        muskyOpportunityScore: typeof vk.searchVolume === 'number' && vk.searchVolume > 0 ? Math.min(100, Math.round((Math.log10(vk.searchVolume) / 5) * 60 + 30)) : null,
        opportunityScoreExplanation: typeof vk.searchVolume === 'number' ? `Verified Demand (${vk.searchVolume}/mo)` : undefined,
        suggestedGoogleAdsTarget: {
          keyword: vk.keyword,
          matchType: 'PHRASE',
          locationTarget: locTarget,
          suggestedCampaign: `Search_Growth_${(vk.category || 'Herbal').replace(/\s+/g, '_')}`,
          suggestedAdGroup: `AG_${safeKw}`,
          requiresAdminConfirmation: true,
          autoSpendAllowed: false,
        },
      });
    }
  }

  verifiedMatches.sort((a, b) => (b.searchVolume || 0) - (a.searchVolume || 0));

  // -------------------------------------------------------------
  // LAYER D: SEARCH CONSOLE & BUSINESS SIGNALS
  // -------------------------------------------------------------
  const matchingGsc: (SearchConsoleQuery & { sourceBadge: 'SEARCH CONSOLE' })[] = gscQueries
    .filter(g => !q || normalizeKeywordTerm(g.query).includes(q))
    .map(g => ({ ...g, sourceBadge: 'SEARCH CONSOLE' as const }));

  const matchingProductIds = new Set(catalogMatches.map(p => p.id));
  let matchingOrdersCount = 0;
  let matchingRevenue = 0;
  let matchingUnits = 0;
  const orderStateMap = new Map<string, { orders: number; revenue: number }>();

  for (const ord of orders) {
    let orderMatched = false;
    const stateName = (ord.customerState || (ord as any).state || 'Rajasthan').trim();

    for (const item of (ord.items || [])) {
      if (matchingProductIds.has(item.productId) || (q && normalizeKeywordTerm(item.productName || '').includes(q))) {
        orderMatched = true;
        matchingUnits += Number(item.quantity || 1);
        matchingRevenue += Number(item.price || 0) * Number(item.quantity || 1);
      }
    }

    if (orderMatched) {
      matchingOrdersCount++;
      const cur = orderStateMap.get(stateName) || { orders: 0, revenue: 0 };
      cur.orders++;
      cur.revenue += Number(ord.totalAmount || 0);
      orderStateMap.set(stateName, cur);
    }
  }

  let matchingWholesaleCount = 0;
  for (const w of wholesale) {
    const prodReq = normalizeKeywordTerm(w.productsRequired || '');
    const bName = normalizeKeywordTerm(w.businessName || '');
    if (!q || prodReq.includes(q) || bName.includes(q)) {
      matchingWholesaleCount++;
    }
  }

  const businessSignals: BusinessDemandSignal = {
    matchedQuery: rawQuery,
    ordersCount: matchingOrdersCount,
    totalRevenue: matchingRevenue,
    unitsSold: matchingUnits,
    wholesaleInquiriesCount: matchingWholesaleCount,
    topStates: Array.from(orderStateMap.entries())
      .map(([state, stat]) => ({ state, orders: stat.orders, revenue: stat.revenue }))
      .sort((a, b) => b.orders - a.orders),
    sourceBadge: 'FIRST-PARTY STORE',
  };

  const totalMatches = catalogMatches.length + generatedKeywordMatches.length + verifiedMatches.length;

  return {
    query: rawQuery,
    normalizedQuery: q,
    tokens,
    totalMatches,
    catalogMatches,
    generatedKeywords: generatedKeywordMatches,
    verifiedKeywords: verifiedMatches,
    gscQueries: matchingGsc,
    trendsQueries: trendsData,
    businessSignals,
    summary: {
      totalCatalogMatches: catalogMatches.length,
      totalGeneratedKeywords: generatedKeywordMatches.length,
      totalVerifiedKeywords: verifiedMatches.length,
      totalGscQueries: matchingGsc.length,
      verifiedDemandRatio: `${verifiedMatches.length}/${totalMatches} matches verified`,
    },
  };
}
