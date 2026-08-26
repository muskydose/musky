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
import { GrowthKeyword } from '@/lib/growth/types';
import {
  executeUniversalGrowthSearch,
  CatalogSearchMatch,
  EnrichedProductKeywordMatch,
  EnrichedVerifiedGrowthKeyword,
} from '@/lib/growth/universal-search-engine';

export type { CatalogSearchMatch, EnrichedProductKeywordMatch, EnrichedVerifiedGrowthKeyword };

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const rawSearch = (searchParams.get('search') || searchParams.get('q') || '').trim();

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

    // Execute 3-layer Universal Search Engine
    const searchResult = executeUniversalGrowthSearch({
      rawQuery: rawSearch,
      products,
      categories,
      verifiedKeywords: keywords,
      gscQueries,
      trendsData,
      orders,
      wholesale,
    });

    let filteredKeywords = searchResult.verifiedKeywords;
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

    // Regional summaries
    const stateMap = new Map<string, number>();
    const districtMap = new Map<string, number>();
    const cityMap = new Map<string, number>();

    for (const k of filteredKeywords) {
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
          queries: searchResult.gscQueries,
          totalQueries: searchResult.gscQueries.length,
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
          keywords: filteredKeywords,
          totalKeywords: filteredKeywords.length,
          label: 'Verified CSV Dataset & Regional Demand',
        },
        firstPartyStore: {
          enabled: true,
          businessSignals: searchResult.businessSignals,
          label: 'Musky Dose Business Signals (Orders & Wholesale)',
        },
        productKeywords: {
          enabled: true,
          totalKeywords: searchResult.generatedKeywords.length,
          keywords: searchResult.generatedKeywords,
          label: 'Autonomous Product Keyword Universe (Zero Synthetic Metrics)',
        },
      },
      overallQueryOpportunity: {
        score: filteredKeywords[0]?.muskyOpportunityScore ?? (searchResult.generatedKeywords.length > 0 ? 65 : null),
        explanation: filteredKeywords[0]?.opportunityScoreExplanation || (searchResult.generatedKeywords.length > 0 ? 'Catalog target discovered' : 'Demand data unavailable yet'),
      },
      catalogMatches: searchResult.catalogMatches,
      keywordMatches: filteredKeywords,
      generatedKeywords: searchResult.generatedKeywords,
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
      totalCatalogMatches: searchResult.catalogMatches.length,
      totalKeywordMatches: filteredKeywords.length,
      totalGeneratedKeywords: searchResult.generatedKeywords.length,
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
