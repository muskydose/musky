import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getKeywords, saveKeywordRecord } from '@/lib/growth/growth-db';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getSearchConsoleQueries } from '@/lib/growth/sources/search-console-adapter';
import { getGoogleTrendsData } from '@/lib/growth/sources/trends-adapter';
import { getOrdersForAnalytics } from '@/lib/db/orders';
import { getWholesaleEnquiries } from '@/lib/db/wholesale';
import { GrowthKeyword, SearchConsoleQuery, GoogleTrendsQuery, BusinessDemandSignal, ProductKeywordTarget } from '@/lib/growth/types';
import { generateProductKeywordUniverse } from '@/lib/growth/product-keyword-engine';

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

export interface EnrichedGrowthKeyword extends GrowthKeyword {
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

function calculateFreeOpportunityScore(params: {
  searchVolume?: number | null;
  gscImpressions?: number | null;
  gscCtr?: number | null;
  trendsInterest?: number | null;
  trendDirection?: 'RISING' | 'STABLE' | 'DECLINING' | null;
  ordersCount?: number;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
}): { score: number | null; explanation: string } {
  let demandPoints = 0;
  let demandExpl = '';

  if (typeof params.searchVolume === 'number' && params.searchVolume > 0) {
    demandPoints = Math.min(40, Math.max(5, (Math.log10(params.searchVolume) / 5) * 40));
    demandExpl = 'CSV Vol (' + Math.round(demandPoints) + '/40)';
  } else if (typeof params.gscImpressions === 'number' && params.gscImpressions > 0) {
    const impScore = Math.min(30, Math.log10(params.gscImpressions) * 7.5);
    const ctrScore = Math.min(10, (params.gscCtr || 0) * 200);
    demandPoints = Math.min(40, impScore + ctrScore);
    demandExpl = 'GSC Impressions (' + Math.round(demandPoints) + '/40)';
  } else if (typeof params.trendsInterest === 'number' && params.trendsInterest > 0) {
    demandPoints = (params.trendsInterest / 100) * 35;
    demandExpl = 'Trends Index (' + Math.round(demandPoints) + '/40)';
  }

  let trendPoints = 12;
  if (params.trendDirection === 'RISING') trendPoints = 25;
  else if (params.trendDirection === 'STABLE') trendPoints = 15;
  else if (params.trendDirection === 'DECLINING') trendPoints = 5;

  let storePoints = 0;
  if (params.ordersCount && params.ordersCount > 0) {
    storePoints = Math.min(20, 10 + params.ordersCount * 2);
  }

  let compPoints = 10;
  if (params.competition === 'LOW') compPoints = 15;
  else if (params.competition === 'MEDIUM') compPoints = 10;
  else if (params.competition === 'HIGH') compPoints = 4;

  if (demandPoints === 0) {
    return { score: null, explanation: 'Opportunity score unavailable — verified demand data not available.' };
  }

  const total = Math.round(Math.min(100, demandPoints + trendPoints + storePoints + compPoints));
  const explanation = (demandExpl || 'Demand (0)') + ' + Trend (' + trendPoints + '/25) + Store Sales (' + storePoints + '/20) + Competition (' + compPoints + '/15)';
  return { score: total, explanation };
}

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();
    const q = rawSearch.toLowerCase();
    const rawTokens = q.split(/\s+/).filter(Boolean);

    const GENERIC_TOKENS = new Set([
      'water', 'powder', 'pack', 'herbal', 'natural', 'pure', 'hair', 'care', 'product', 'extract', 'oil', 'organic', 'best', 'leaves', 'spray', 'cones'
    ]);

    const TRANSLITERATION_MAP: Record<string, string[]> = {
      mehndi: ['mehendi', 'heena'],
      mehendi: ['mehndi', 'heena'],
      cone: ['cones'],
      cones: ['cone'],
      amla: ['amalaki', 'emblica'],
      shikakai: ['seekakai', 'acacia'],
      reetha: ['aritha', 'soapnut'],
      rosewater: ['rose water', 'gulab jal'],
      'rose water': ['rosewater', 'gulab jal'],
      indigo: ['indigofera', 'neel'],
      henna: ['lawsonia', 'heena'],
    };

    const meaningfulTokens = rawTokens.filter((t) => !GENERIC_TOKENS.has(t));
    const effectiveTokens = meaningfulTokens.length > 0 ? meaningfulTokens : rawTokens;

    const aliasSet = new Set<string>();
    for (const [key, aliases] of Object.entries(TRANSLITERATION_MAP)) {
      if (q === key || rawTokens.includes(key)) {
        aliases.forEach((a) => aliasSet.add(a));
      }
    }

    const [
      keywords,
      products,
      categories,
      gscResult,
      trendsData,
      orders,
      wholesale
    ] = await Promise.all([
      getKeywords(),
      getAllProductsAdmin(),
      getCategories(),
      getSearchConsoleQueries(rawSearch),
      getGoogleTrendsData(rawSearch),
      getOrdersForAnalytics(90),
      getWholesaleEnquiries()
    ]);

    const gscQueries = gscResult.queries;
    const gscStatus = gscResult.status;
    const gscMessage = gscResult.message;

    const categoryMap = new Map<string, string>();
    for (const c of categories) {
      categoryMap.set(c.id, c.name);
    }

    let catalogMatches: CatalogSearchMatch[] = [];
    if (!q) {
      catalogMatches = products.map((p) => ({
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
        matchedFields: ['Catalog Entry'],
        relevanceScore: 0,
        sourceBadge: 'CATALOG MATCH' as const,
      }));
    } else {
      for (const p of products) {
        const catName = (p.categoryName || categoryMap.get(p.categoryId) || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();
        const pSlug = (p.slug || '').toLowerCase();
        const pShortDesc = (p.shortDescription || '').toLowerCase();
        const pFullDesc = (p.fullDescription || '').toLowerCase();
        const pIngredientsList = (Array.isArray(p.ingredients) ? p.ingredients : [String(p.ingredients || '')]).map(i => String(i).toLowerCase());
        const pIngredientsStr = pIngredientsList.join(' ');
        const pBenefitsStr = (Array.isArray(p.benefits) ? p.benefits.join(' ') : String(p.benefits || '')).toLowerCase();
        const pUsage = (p.usageInstructions || '').toLowerCase();
        const pType = (p.productType || '').toLowerCase();

        const matchedFields: string[] = [];
        let score = 0;

        if (pName === q) {
          matchedFields.push('Exact Name Match');
          score += 1000;
        } else if (pName.includes(q)) {
          matchedFields.push('Product Name (Full Phrase)');
          score += 500;
        } else {
          let nameTokensMatched = 0;
          for (const token of effectiveTokens) {
            if (pName.includes(token)) nameTokensMatched++;
          }
          if (nameTokensMatched > 0) {
            matchedFields.push('Product Name');
            score += nameTokensMatched * 200;
          }
        }

        if (pSlug === q || pSlug === q.replace(/\s+/g, '-')) {
          matchedFields.push('Exact Slug Match');
          score += 300;
        } else if (pSlug.includes(q.replace(/\s+/g, '-'))) {
          matchedFields.push('Slug Match');
          score += 150;
        }

        if (catName === q) {
          matchedFields.push('Exact Category Match');
          score += 250;
        } else if (catName.includes(q)) {
          matchedFields.push('Category Match');
          score += 150;
        }

        if (pType && (pType === q || pType.includes(q))) {
          matchedFields.push('Product Type');
          score += 120;
        }

        let matchedIngredientName = '';
        for (const ing of pIngredientsList) {
          if (ing.includes(q)) {
            matchedFields.push('Ingredient (Full Phrase)');
            score += 150;
            matchedIngredientName = ing;
            break;
          } else {
            for (const token of effectiveTokens) {
              if (ing.includes(token)) {
                matchedFields.push('Ingredient Match');
                score += 100;
                matchedIngredientName = ing;
                break;
              }
            }
            if (matchedIngredientName) break;
          }
        }

        if (pShortDesc.includes(q) || pFullDesc.includes(q)) {
          matchedFields.push('Description (Full Phrase)');
          score += 80;
        }

        if (pBenefitsStr.includes(q) || pUsage.includes(q)) {
          matchedFields.push('Benefits / Usage');
          score += 30;
        }

        if (aliasSet.size > 0) {
          for (const alias of Array.from(aliasSet)) {
            if (pName.includes(alias)) {
              matchedFields.push('Botanical Alias (' + alias + ')');
              score += 200;
              break;
            } else if (pIngredientsStr.includes(alias)) {
              matchedFields.push('Ingredient Alias (' + alias + ')');
              score += 120;
              break;
            }
          }
        }

        if (score >= 40 && matchedFields.length > 0) {
          let highlight = '';
          if (matchedIngredientName) {
            highlight = 'Ingredient: "' + matchedIngredientName + '"';
          } else if (pShortDesc.includes(q)) {
            highlight = p.shortDescription.length > 90 ? p.shortDescription.substring(0, 90) + '...' : p.shortDescription;
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
            sourceBadge: 'CATALOG MATCH' as const,
          });
        }
      }
      catalogMatches.sort((a, b) => b.relevanceScore - a.relevanceScore);
    }

    // 1.5. AUTONOMOUS PRODUCT KEYWORD UNIVERSE TARGETS
    const generatedKeywords: (ProductKeywordTarget & { sourceBadge: 'GENERATED KEYWORD' })[] = [];
    const productsToInspect = catalogMatches.length > 0 ? catalogMatches.slice(0, 3) : (q ? [] : products.slice(0, 3));

    for (const p of productsToInspect) {
      const fullProd = products.find((prod) => prod.id === p.id);
      if (fullProd) {
        const universe = generateProductKeywordUniverse(fullProd, keywords);
        universe.keywords.forEach((kw) => {
          generatedKeywords.push({
            ...kw,
            sourceBadge: 'GENERATED KEYWORD' as const,
          });
        });
      }
    }

    // 2. FIRST-PARTY STORE BUSINESS SIGNALS
    const matchingProductIds = new Set(catalogMatches.map(p => p.id));
    let matchingOrdersCount = 0;
    let matchingRevenue = 0;
    let matchingUnits = 0;
    const orderStateMap = new Map<string, { orders: number; revenue: number }>();

    for (const ord of orders) {
      let orderMatched = false;
      const stateName = (ord.customerState || (ord as any).state || 'Rajasthan').trim();

      for (const item of (ord.items || [])) {
        if (matchingProductIds.has(item.productId) || (q && item.productName?.toLowerCase().includes(q))) {
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
      const prodReq = (w.productsRequired || '').toLowerCase();
      const bName = (w.businessName || '').toLowerCase();
      if (!q || prodReq.includes(q) || bName.includes(q)) {
        matchingWholesaleCount++;
      }
    }

    const businessSignals: BusinessDemandSignal = {
      matchedQuery: rawSearch,
      ordersCount: matchingOrdersCount,
      totalRevenue: matchingRevenue,
      unitsSold: matchingUnits,
      wholesaleInquiriesCount: matchingWholesaleCount,
      topStates: Array.from(orderStateMap.entries())
        .map(([state, stat]) => ({ state, orders: stat.orders, revenue: stat.revenue }))
        .sort((a, b) => b.orders - a.orders),
      sourceBadge: 'FIRST-PARTY STORE' as const,
    };

    // 3. VERIFIED CSV KEYWORD DEMAND RECORDS
    let filteredKeywords = keywords;
    if (q) {
      filteredKeywords = filteredKeywords.filter((k) => {
        const kw = (k.keyword || '').toLowerCase();
        const kwCat = (k.category || '').toLowerCase();
        const kwState = (k.state || '').toLowerCase();
        const kwCity = (k.city || '').toLowerCase();

        return (
          kw.includes(q) ||
          kwCat.includes(q) ||
          kwState.includes(q) ||
          kwCity.includes(q) ||
          (effectiveTokens.length > 1 && effectiveTokens.every((t) => kw.includes(t) || kwState.includes(t) || kwCity.includes(t)))
        );
      });
    }

    const filterState = searchParams.get('state')?.trim().toLowerCase() || '';
    const filterCity = searchParams.get('city')?.trim().toLowerCase() || '';
    const filterCategory = searchParams.get('category')?.trim().toLowerCase() || '';

    if (filterState) {
      filteredKeywords = filteredKeywords.filter((k) => (k.state || '').toLowerCase().includes(filterState));
    }
    if (filterCity) {
      filteredKeywords = filteredKeywords.filter((k) => (k.city || '').toLowerCase().includes(filterCity));
    }
    if (filterCategory) {
      filteredKeywords = filteredKeywords.filter((k) => (k.category || '').toLowerCase().includes(filterCategory));
    }

    const enrichedKeywords: EnrichedGrowthKeyword[] = filteredKeywords.map((k) => {
      const opp = calculateFreeOpportunityScore({
        searchVolume: k.searchVolume,
        trendDirection: k.trend,
        ordersCount: matchingOrdersCount,
        competition: k.competition,
      });
      const locTarget = [k.city, k.district, k.state, k.country].filter(Boolean).join(', ') || 'India (National)';
      const safeKw = k.keyword.replace(/[^a-zA-Z0-9]/g, '_');
      return {
        ...k,
        muskyOpportunityScore: opp.score,
        opportunityScoreExplanation: opp.explanation,
        suggestedGoogleAdsTarget: {
          keyword: k.keyword,
          matchType: 'PHRASE',
          locationTarget: locTarget,
          suggestedCampaign: 'Search_Growth_' + (k.category || 'Herbal').replace(/\s+/g, '_') + '_' + (k.state || 'National').replace(/\s+/g, '_'),
          suggestedAdGroup: 'AG_' + safeKw,
          requiresAdminConfirmation: true,
          autoSpendAllowed: false,
        },
      };
    });

    enrichedKeywords.sort((a, b) => {
      const volA = a.searchVolume || 0;
      const volB = b.searchVolume || 0;
      if (volB !== volA) return volB - volA;
      return (b.muskyOpportunityScore || 0) - (a.muskyOpportunityScore || 0);
    });

    // 4. REGIONAL SUMMARIES
    const stateMap = new Map<string, number>();
    const districtMap = new Map<string, number>();
    const cityMap = new Map<string, number>();

    for (const k of enrichedKeywords) {
      if (typeof k.searchVolume === 'number' && k.searchVolume > 0) {
        if (k.state) stateMap.set(k.state, (stateMap.get(k.state) || 0) + k.searchVolume);
        if (k.district) districtMap.set(k.district, (districtMap.get(k.district) || 0) + k.searchVolume);
        if (k.city) cityMap.set(k.city, (cityMap.get(k.city) || 0) + k.searchVolume);
      }
    }

    const regionalSummary = {
      topStates: Array.from(stateMap.entries()).map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume),
      topDistricts: Array.from(districtMap.entries()).map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume),
      topCities: Array.from(cityMap.entries()).map(([name, volume]) => ({ name, volume })).sort((a, b) => b.volume - a.volume),
    };

    const gscTop = gscQueries[0];
    const trendsTop = trendsData[0];
    const topCsv = enrichedKeywords[0];

    const overallQueryOpportunity = calculateFreeOpportunityScore({
      searchVolume: topCsv?.searchVolume,
      gscImpressions: gscTop?.impressions,
      gscCtr: gscTop?.ctr,
      trendsInterest: trendsTop?.relativeInterest,
      trendDirection: trendsTop?.trendDirection || topCsv?.trend,
      ordersCount: matchingOrdersCount,
      competition: topCsv?.competition || 'MEDIUM',
    });

    const isGoogleConfigured = Boolean(
      process.env.GOOGLE_ADS_ENABLED === 'true' &&
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      process.env.GOOGLE_ADS_CUSTOMER_ID
    );

    return NextResponse.json({
      success: true,
      search: rawSearch,
      filters: {
        state: filterState || undefined,
        city: filterCity || undefined,
        category: filterCategory || undefined,
      },
      sources: {
        searchConsole: {
          enabled: gscStatus === 'CONNECTED',
          status: gscStatus,
          message: gscMessage,
          queries: gscQueries,
          totalQueries: gscQueries.length,
          label: 'Musky Dose Search Console Data (Site Performance)',
        },
        googleTrends: {
          enabled: true,
          queries: trendsData,
          totalTrends: trendsData.length,
          label: 'Google Trends Relative Interest (0-100 Index)',
        },
        verifiedCsv: {
          enabled: true,
          keywords: enrichedKeywords,
          totalKeywords: enrichedKeywords.length,
          label: 'Verified CSV Dataset & Regional Demand',
        },
        firstPartyStore: {
          enabled: true,
          businessSignals,
          label: 'Musky Dose Business Signals (Orders & Wholesale)',
        },
        productKeywords: {
          enabled: true,
          totalKeywords: generatedKeywords.length,
          keywords: generatedKeywords,
          label: 'Autonomous Product Keyword Universe (Zero Synthetic Metrics)',
        },
      },
      overallQueryOpportunity,
      catalogMatches,
      keywordMatches: enrichedKeywords,
      generatedKeywords,
      regionalSummary,
      googleAdsConnector: {
        configured: isGoogleConfigured,
        enabled: process.env.GOOGLE_ADS_ENABLED === 'true',
        optional: true,
        message: isGoogleConfigured
          ? 'Google Ads Keyword Planner connector is active.'
          : 'Optional Google Ads connector is disabled. Growth AI is powered by free Google Search Console, Google Trends, Verified CSVs, and First-Party Store Signals.',
      },
      keywords,
      totalCatalogMatches: catalogMatches.length,
      totalKeywordMatches: enrichedKeywords.length,
      totalGeneratedKeywords: generatedKeywords.length,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch Growth AI search intelligence.');
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }
    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden: CSRF / Origin mismatch' }, { status: 403 });
    }

    const body = await req.json();
    if (!body || !body.keyword) {
      return NextResponse.json({ success: false, error: 'Keyword is required' }, { status: 400 });
    }

    const id = body.id || 'kw_' + body.keyword.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    const kwRecord: GrowthKeyword = {
      id,
      keyword: String(body.keyword).trim(),
      language: body.language || 'en',
      country: body.country || 'India',
      state: body.state || undefined,
      district: body.district || undefined,
      city: body.city || undefined,
      category: body.category || undefined,
      productId: body.productId || undefined,
      searchVolume: typeof body.searchVolume === 'number' ? body.searchVolume : null,
      competition: body.competition || 'MEDIUM',
      cpc: typeof body.cpc === 'number' ? body.cpc : null,
      trend: body.trend || 'STABLE',
      sourceTier: body.sourceTier || 'IMPORTED',
      sourceName: body.sourceName || 'Manual Entry',
      collectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveKeywordRecord(kwRecord);
    return NextResponse.json({ success: true, keyword: kwRecord });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save keyword record.');
  }
}
