import {
  GrowthMarket,
  GrowthMarketMetric,
  GrowthKeyword,
  GrowthKeywordSnapshot,
  GrowthLead,
  GrowthCompetitor,
  GrowthCompetitorObservation,
  GrowthDataSource,
  GrowthDataSyncLog,
  GrowthRecommendation,
  GrowthImportJob,
  GrowthSettings,
} from './types';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getOrdersForAnalytics } from '@/lib/db/orders';
import { getWholesaleEnquiries } from '@/lib/db/wholesale';
import { normalizeIndianState } from './geography';
import { calculateMarketOpportunityScore } from './scoring';

// In-memory local stores for fail-safe server fallback if Supabase is disconnected
const memoryMarkets = new Map<string, GrowthMarket>();
const memoryMarketMetrics = new Map<string, GrowthMarketMetric>();
const memoryKeywords = new Map<string, GrowthKeyword>();
const memoryKeywordSnapshots: GrowthKeywordSnapshot[] = [];
const memoryLeads = new Map<string, GrowthLead>();
const memoryCompetitors = new Map<string, GrowthCompetitor>();
const memoryObservations: GrowthCompetitorObservation[] = [];
const memoryDataSources = new Map<string, GrowthDataSource>();
const memorySyncLogs: GrowthDataSyncLog[] = [];
const memoryRecommendations = new Map<string, GrowthRecommendation>();
const memoryImportJobs = new Map<string, GrowthImportJob>();

let memorySettings: GrowthSettings = {
  weights: {
    sales: 30,
    growth: 20,
    leads: 15,
    wholesale: 15,
    productFit: 10,
    campaignResponse: 10,
  },
  minOrdersForScore: 1,
  staleDataDays: 14,
  aiEnabled: true,
  minConfidenceThreshold: 60,
};

// Seed default data sources in memory
memoryDataSources.set('first_party_orders', {
  id: 'ds_first_party',
  providerKey: 'first_party_orders',
  name: 'Musky Dose Store Orders & Enquiries',
  type: 'FirstParty',
  status: 'Fresh',
  lastSyncedAt: new Date().toISOString(),
  recordsCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

import { isGoogleAdsEnabled } from './sources/google-adapter';
import { isSearchConsoleConfigured } from './sources/search-console-adapter';

memoryDataSources.set('google_search_console', {
  id: 'ds_google_search_console',
  providerKey: 'google_search_console',
  name: 'Google Search Console (Musky Dose Performance)',
  type: 'Google',
  status: isSearchConsoleConfigured() ? 'Fresh' : 'Disabled',
  recordsCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

memoryDataSources.set('google_ads_keywords', {
  id: 'ds_google_ads',
  providerKey: 'google_ads_keywords',
  name: 'Google Ads & Keyword Planner',
  type: 'Google',
  status: 'Disabled',
  recordsCount: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ==========================================
// 1. SETTINGS (PERSISTENT IN DB)
// ==========================================
export async function getGrowthSettings(): Promise<GrowthSettings> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_settings').select('*').eq('id', 'default_settings').maybeSingle();
      if (!error && data) {
        memorySettings = {
          weights: data.weights || memorySettings.weights,
          minOrdersForScore: data.min_orders_for_score ?? 1,
          staleDataDays: data.stale_data_days ?? 14,
          aiEnabled: data.ai_enabled ?? true,
          minConfidenceThreshold: data.min_confidence_threshold ?? 60,
        };
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching settings from Supabase:', e);
    }
  }
  return memorySettings;
}

export async function saveGrowthSettings(settings: GrowthSettings): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_settings').upsert({
      id: 'default_settings',
      weights: settings.weights,
      min_orders_for_score: settings.minOrdersForScore,
      stale_data_days: settings.staleDataDays,
      ai_enabled: settings.aiEnabled,
      min_confidence_threshold: settings.minConfidenceThreshold,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('[Growth DB] Error saving settings to Supabase:', error.message);
      throw new Error(`Failed to save growth settings to database: ${error.message}`);
    }
  }
  memorySettings = { ...settings };
}

// ==========================================
// 2. MARKETS & METRICS
// ==========================================
async function deriveMarketMetricsFromOrders(): Promise<GrowthMarketMetric[]> {
  try {
    const orders = await getOrdersForAnalytics();
    let wholesale: any[] = [];
    try {
      wholesale = await getWholesaleEnquiries();
    } catch {
      wholesale = [];
    }

    // Pre-pass: Normalize customer identifiers across all orders
    const customerTotalOrdersMap = new Map<string, number>();
    for (const order of orders) {
      const phone = order.customerPhone || (order as any).phone;
      const email = order.customerEmail || (order as any).email;
      let cKey: string | null = null;
      if (phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.length >= 10) cKey = `phone_${clean.slice(-10)}`;
      } else if (email && typeof email === 'string' && email.includes('@')) {
        cKey = `email_${email.trim().toLowerCase()}`;
      }
      if (cKey) {
        customerTotalOrdersMap.set(cKey, (customerTotalOrdersMap.get(cKey) || 0) + 1);
      }
    }

    const marketGroups = new Map<string, {
      state: string;
      stateCode?: string;
      district?: string;
      city?: string;
      pincode?: string;
      ordersCount: number;
      revenue: number;
      customerKeysSet: Set<string>;
      wholesaleLeadsCount: number;
      unitsSold: number;
      campaignOrdersCount: number;
      campaignRevenue: number;
    }>();

    for (const order of orders) {
      const rawState = order.customerState || (order as any).state || null;
      const normalizedSt = normalizeIndianState(rawState);
      const state = normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : 'Unknown State');
      const district = (order as any).district || (order as any).customerDistrict || 'General';
      const city = order.customerCity || (order as any).city || 'General';
      const pincode = order.customerPincode || (order as any).pincode || '';
      const key = `${state.toLowerCase()}:${district.toLowerCase()}:${city.toLowerCase()}`;

      if (!marketGroups.has(key)) {
        marketGroups.set(key, {
          state,
          stateCode: normalizedSt?.code,
          district,
          city,
          pincode,
          ordersCount: 0,
          revenue: 0,
          customerKeysSet: new Set<string>(),
          wholesaleLeadsCount: 0,
          unitsSold: 0,
          campaignOrdersCount: 0,
          campaignRevenue: 0,
        });
      }

      const group = marketGroups.get(key)!;
      group.ordersCount += 1;
      group.revenue += Number(order.totalAmount || 0);

      const phone = order.customerPhone || (order as any).phone;
      const email = order.customerEmail || (order as any).email;
      let cKey: string | null = null;
      if (phone) {
        const clean = phone.replace(/\D/g, '');
        if (clean.length >= 10) cKey = `phone_${clean.slice(-10)}`;
      } else if (email && typeof email === 'string' && email.includes('@')) {
        cKey = `email_${email.trim().toLowerCase()}`;
      }
      if (cKey) {
        group.customerKeysSet.add(cKey);
      }

      let totalUnits = 0;
      if (Array.isArray(order.items)) {
        totalUnits = order.items.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);
      }
      group.unitsSold += totalUnits;

      if (order.campaignId || order.campaignName) {
        group.campaignOrdersCount += 1;
        group.campaignRevenue += Number(order.totalAmount || 0);
      }
    }

    if (Array.isArray(wholesale)) {
      for (const enquiry of wholesale) {
        const rawState = enquiry.state || null;
        const normalizedSt = normalizeIndianState(rawState);
        const state = normalizedSt ? normalizedSt.name : (rawState && rawState.trim() ? rawState.trim() : 'Unknown State');
        const district = (enquiry as any).district || 'General';
        const city = enquiry.city || 'General';
        const key = `${state.toLowerCase()}:${district.toLowerCase()}:${city.toLowerCase()}`;

        if (marketGroups.has(key)) {
          marketGroups.get(key)!.wholesaleLeadsCount += 1;
        } else {
          marketGroups.set(key, {
            state,
            stateCode: normalizedSt?.code,
            district,
            city,
            pincode: '',
            ordersCount: 0,
            revenue: 0,
            customerKeysSet: new Set<string>(),
            wholesaleLeadsCount: 1,
            unitsSold: 0,
            campaignOrdersCount: 0,
            campaignRevenue: 0,
          });
        }
      }
    }

    const derivedMetrics: GrowthMarketMetric[] = [];
    for (const [key, data] of marketGroups.entries()) {
      const marketId = `mkt_${data.state.toLowerCase().replace(/\s+/g, '_')}_${(data.district || 'general').toLowerCase().replace(/\s+/g, '_')}_${(data.city || 'general').toLowerCase().replace(/\s+/g, '_')}`;
      const customersCount = data.customerKeysSet.size;
      let repeatCustomersCount = 0;
      for (const cKey of data.customerKeysSet) {
        if ((customerTotalOrdersMap.get(cKey) || 0) > 1) {
          repeatCustomersCount++;
        }
      }

      const aov = data.ordersCount > 0 ? data.revenue / data.ordersCount : 0;
      const scoring = calculateMarketOpportunityScore({
        ordersCount: data.ordersCount,
        revenue: data.revenue,
        customersCount,
        repeatCustomersCount,
        wholesaleLeadsCount: data.wholesaleLeadsCount,
        retailLeadsCount: 0,
        artistLeadsCount: 0,
        campaignOrdersCount: data.campaignOrdersCount,
        campaignRevenue: data.campaignRevenue,
        unitsSold: data.unitsSold,
      });

      const metric: GrowthMarketMetric = {
        id: `metric_${marketId}`,
        marketId,
        marketName: `${data.city && data.city !== 'General' ? data.city + ', ' : ''}${data.district && data.district !== 'General' ? data.district + ', ' : ''}${data.state}`,
        state: data.state,
        district: data.district,
        city: data.city,
        pincode: data.pincode,
        customersCount,
        ordersCount: data.ordersCount,
        revenue: data.revenue,
        unitsSold: data.unitsSold,
        aov,
        repeatCustomersCount,
        wholesaleLeadsCount: data.wholesaleLeadsCount,
        retailLeadsCount: 0,
        artistLeadsCount: 0,
        campaignOrdersCount: data.campaignOrdersCount,
        campaignRevenue: data.campaignRevenue,
        productDemandScore: Math.round(scoring.score * 0.9),
        marketOpportunityScore: scoring.score,
        scoreBreakdown: scoring.breakdown,
        sourceTier: 'VERIFIED',
        sourceName: 'FirstPartyOrders',
        updatedAt: new Date().toISOString(),
      };

      derivedMetrics.push(metric);
      memoryMarketMetrics.set(metric.id, metric);
    }

    return derivedMetrics;
  } catch (err) {
    console.warn('[Growth DB] Error deriving market metrics from live orders:', err);
    return Array.from(memoryMarketMetrics.values());
  }
}

export async function getMarketMetrics(): Promise<GrowthMarketMetric[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_market_metrics').select('*');
      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          marketId: r.market_id,
          marketName: r.market_name,
          state: r.state,
          district: r.district,
          city: r.city,
          pincode: r.pincode,
          customersCount: r.customers_count || 0,
          ordersCount: r.orders_count || 0,
          revenue: Number(r.revenue || 0),
          unitsSold: r.units_sold || 0,
          aov: Number(r.aov || 0),
          repeatCustomersCount: r.repeat_customers_count || 0,
          wholesaleLeadsCount: r.wholesale_leads_count || 0,
          retailLeadsCount: r.retail_leads_count || 0,
          artistLeadsCount: r.artist_leads_count || 0,
          campaignOrdersCount: r.campaign_orders_count || 0,
          campaignRevenue: Number(r.campaign_revenue || 0),
          productDemandScore: Number(r.product_demand_score || 0),
          marketOpportunityScore: Number(r.market_opportunity_score || 0),
          scoreBreakdown: r.score_breakdown || {},
          periodStart: r.period_start,
          periodEnd: r.period_end,
          sourceTier: r.source_tier || 'DERIVED',
          sourceName: r.source_name || 'FirstParty',
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching market metrics from Supabase:', e);
    }
  }

  // If in-memory metrics already populated, return them
  if (memoryMarketMetrics.size > 0) {
    return Array.from(memoryMarketMetrics.values());
  }

  // Fallback: Dynamically derive metrics from verified first-party orders
  return deriveMarketMetricsFromOrders();
}

export async function saveMarketRecord(market: GrowthMarket): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_markets').upsert({
      id: market.id,
      country: market.country || 'India',
      state: market.state,
      state_code: market.stateCode,
      district: market.district,
      district_code: market.districtCode,
      city: market.city,
      city_code: market.cityCode,
      pincode: market.pincode,
      status: market.status || 'active',
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_markets table unmigrated or unavailable:', error.message);
    }
  }
  memoryMarkets.set(market.id, market);
}

export async function saveMarketMetric(metric: GrowthMarketMetric): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_market_metrics').upsert({
      id: metric.id,
      market_id: metric.marketId,
      market_name: metric.marketName,
      state: metric.state,
      district: metric.district,
      city: metric.city,
      pincode: metric.pincode,
      customers_count: metric.customersCount,
      orders_count: metric.ordersCount,
      revenue: metric.revenue,
      units_sold: metric.unitsSold,
      aov: metric.aov,
      repeat_customers_count: metric.repeatCustomersCount,
      wholesale_leads_count: metric.wholesaleLeadsCount,
      retail_leads_count: metric.retailLeadsCount,
      artist_leads_count: metric.artistLeadsCount,
      campaign_orders_count: metric.campaignOrdersCount,
      campaign_revenue: metric.campaignRevenue,
      product_demand_score: metric.productDemandScore,
      market_opportunity_score: metric.marketOpportunityScore,
      score_breakdown: metric.scoreBreakdown,
      source_tier: metric.sourceTier,
      source_name: metric.sourceName,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_market_metrics table unmigrated or unavailable:', error.message);
    }
  }
  memoryMarketMetrics.set(metric.id, metric);
}

// ==========================================
// 3. KEYWORDS & SNAPSHOTS
// ==========================================
function parseCompetition(val: any): 'LOW' | 'MEDIUM' | 'HIGH' | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') {
    const s = val.trim().toUpperCase();
    if (s === 'LOW' || s === 'MEDIUM' || s === 'HIGH') return s;
    const num = parseFloat(s);
    if (!isNaN(num)) {
      if (num < 0.33) return 'LOW';
      if (num < 0.66) return 'MEDIUM';
      return 'HIGH';
    }
  }
  if (typeof val === 'number') {
    if (val < 0.33) return 'LOW';
    if (val < 0.66) return 'MEDIUM';
    return 'HIGH';
  }
  return 'MEDIUM';
}

export async function getKeywords(): Promise<GrowthKeyword[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_keywords').select('*');
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          keyword: r.keyword,
          language: r.language || 'en',
          country: r.country || 'India',
          state: r.state,
          district: r.district,
          city: r.city,
          category: r.category,
          productId: r.product_id,
          searchVolume: r.search_volume !== null && r.search_volume !== undefined ? Number(r.search_volume) : null,
          competition: parseCompetition(r.competition),
          cpc: r.cpc ? Number(r.cpc) : null,
          trend: r.trend ?? null,
          sourceTier: r.source_tier || 'IMPORTED',
          sourceName: r.source_name || 'Manual',
          collectedAt: r.collected_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching keywords:', e);
    }
  }
  return Array.from(memoryKeywords.values());
}

export async function saveKeywordRecord(kw: GrowthKeyword): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    let numericComp: number | null = null;
    if (typeof (kw.competition as any) === 'number') {
      numericComp = kw.competition as any;
    } else if (kw.competition === 'LOW') {
      numericComp = 0.2;
    } else if (kw.competition === 'HIGH') {
      numericComp = 0.85;
    } else if (kw.competition === 'MEDIUM') {
      numericComp = 0.5;
    }

    const { error } = await supabase.from('growth_keywords').upsert({
      id: kw.id,
      keyword: kw.keyword,
      language: kw.language,
      country: kw.country,
      state: kw.state,
      district: kw.district,
      city: kw.city,
      category: kw.category,
      product_id: kw.productId,
      search_volume: kw.searchVolume,
      competition: numericComp,
      cpc: kw.cpc,
      trend: kw.trend,
      source_tier: kw.sourceTier,
      source_name: kw.sourceName,
      collected_at: kw.collectedAt,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_keywords table unmigrated or unavailable:', error.message);
    }
  }
  memoryKeywords.set(kw.id, kw);
}

export async function saveGrowthKeywords(kws: GrowthKeyword[]): Promise<void> {
  for (const kw of kws) {
    await saveKeywordRecord(kw);
  }
}

export async function saveKeywordSnapshot(snapshot: GrowthKeywordSnapshot): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_keyword_snapshots').insert({
      id: snapshot.id,
      keyword_id: snapshot.keywordId,
      keyword: snapshot.keyword,
      snapshot_date: snapshot.snapshotDate,
      search_volume: snapshot.searchVolume,
      competition: snapshot.competition,
      cpc: snapshot.cpc,
      source_name: snapshot.sourceName,
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_keyword_snapshots table unmigrated or unavailable:', error.message);
    }
  }
  memoryKeywordSnapshots.push(snapshot);
}

export async function getKeywordSnapshots(keywordId?: string): Promise<GrowthKeywordSnapshot[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      let query = supabase.from('growth_keyword_snapshots').select('*').order('snapshot_date', { ascending: false });
      if (keywordId) {
        query = query.eq('keyword_id', keywordId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          keywordId: r.keyword_id,
          keyword: r.keyword,
          snapshotDate: r.snapshot_date,
          searchVolume: r.search_volume,
          competition: r.competition,
          cpc: r.cpc,
          sourceName: r.source_name,
          createdAt: r.created_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching keyword snapshots:', e);
    }
  }
  return keywordId ? memoryKeywordSnapshots.filter((s) => s.keywordId === keywordId) : memoryKeywordSnapshots;
}

// ==========================================
// 4. LEADS (CRM)
// ==========================================
export async function getLeads(): Promise<GrowthLead[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_leads').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          businessName: r.business_name,
          contactName: r.contact_name,
          phone: r.phone,
          whatsapp: r.whatsapp,
          email: r.email,
          leadType: r.lead_type || 'Retailer',
          state: r.state,
          district: r.district,
          city: r.city,
          pincode: r.pincode,
          address: r.address,
          source: r.source || 'Manual',
          interestedProducts: r.interested_products || [],
          status: r.status || 'New',
          priority: r.priority || 'MEDIUM',
          assignedTo: r.assigned_to,
          notes: r.notes,
          nextFollowUp: r.next_follow_up,
          lastContactedAt: r.last_contacted_at,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching leads:', e);
    }
  }
  return Array.from(memoryLeads.values());
}

export async function saveLeadRecord(lead: GrowthLead): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_leads').upsert({
      id: lead.id,
      business_name: lead.businessName,
      contact_name: lead.contactName,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      email: lead.email,
      lead_type: lead.leadType,
      state: lead.state,
      district: lead.district,
      city: lead.city,
      pincode: lead.pincode,
      address: lead.address,
      source: lead.source,
      interested_products: lead.interestedProducts || [],
      status: lead.status,
      priority: lead.priority,
      assigned_to: lead.assignedTo,
      notes: lead.notes,
      next_follow_up: lead.nextFollowUp,
      last_contacted_at: lead.lastContactedAt,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_leads table unmigrated or unavailable:', error.message);
    }
  }
  memoryLeads.set(lead.id, lead);
}

// ==========================================
// 5. COMPETITORS & OBSERVATIONS
// ==========================================
export async function getCompetitors(): Promise<GrowthCompetitor[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_competitors').select('*');
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          name: r.name,
          website: r.website,
          instagram: r.instagram,
          facebook: r.facebook,
          state: r.state,
          district: r.district,
          city: r.city,
          productCategories: r.product_categories || [],
          positioning: r.positioning,
          notes: r.notes,
          sourceTier: r.source_tier || 'IMPORTED',
          sourceName: r.source_name || 'Manual',
          lastCheckedAt: r.last_checked_at,
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching competitors:', e);
    }
  }
  return Array.from(memoryCompetitors.values());
}

export async function saveCompetitorRecord(comp: GrowthCompetitor): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_competitors').upsert({
      id: comp.id,
      name: comp.name,
      website: comp.website,
      instagram: comp.instagram,
      facebook: comp.facebook,
      state: comp.state,
      district: comp.district,
      city: comp.city,
      product_categories: comp.productCategories || [],
      positioning: comp.positioning,
      notes: comp.notes,
      source_tier: comp.sourceTier,
      source_name: comp.sourceName,
      last_checked_at: comp.lastCheckedAt,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_competitors table unmigrated or unavailable:', error.message);
    }
  }
  memoryCompetitors.set(comp.id, comp);
}

export async function getCompetitorObservations(competitorId?: string): Promise<GrowthCompetitorObservation[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      let query = supabase.from('growth_competitor_observations').select('*').order('created_at', { ascending: false });
      if (competitorId) {
        query = query.eq('competitor_id', competitorId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          competitorId: r.competitor_id,
          competitorName: r.competitor_name,
          productName: r.product_name,
          observedPrice: Number(r.observed_price),
          currency: r.currency || 'INR',
          observationDate: r.observation_date,
          source: r.source || 'Manual',
          notes: r.notes,
          createdAt: r.created_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching competitor observations:', e);
    }
  }
  return competitorId ? memoryObservations.filter((o) => o.competitorId === competitorId) : memoryObservations;
}

export async function saveCompetitorObservation(obs: GrowthCompetitorObservation): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_competitor_observations').insert({
      id: obs.id,
      competitor_id: obs.competitorId,
      competitor_name: obs.competitorName,
      product_name: obs.productName,
      observed_price: obs.observedPrice,
      currency: obs.currency || 'INR',
      observation_date: obs.observationDate,
      source: obs.source,
      notes: obs.notes,
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_competitor_observations table unmigrated or unavailable:', error.message);
    }
  }
  memoryObservations.push(obs);
}

// ==========================================
// 6. RECOMMENDATIONS
// ==========================================
export async function getRecommendations(): Promise<GrowthRecommendation[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_recommendations').select('*').order('generated_at', { ascending: false });
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          title: r.title,
          priority: r.priority || 'MEDIUM',
          reason: r.reason,
          supportingMetrics: r.supporting_metrics || [],
          dataSources: r.data_sources || [],
          recommendedActions: r.recommended_actions || [],
          confidence: r.confidence || 'MEDIUM',
          status: r.status || 'New',
          generatedAt: r.generated_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching recommendations:', e);
    }
  }
  return Array.from(memoryRecommendations.values());
}

export async function saveRecommendation(rec: GrowthRecommendation): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_recommendations').upsert({
      id: rec.id,
      title: rec.title,
      priority: rec.priority,
      reason: rec.reason,
      supporting_metrics: rec.supportingMetrics,
      data_sources: rec.dataSources,
      recommended_actions: rec.recommendedActions,
      confidence: rec.confidence,
      status: rec.status,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_recommendations table unmigrated or unavailable:', error.message);
    }
  }
  memoryRecommendations.set(rec.id, rec);
}

// ==========================================
// 7. DATA SOURCES & SYNC LOGS
// ==========================================
export async function getDataSources(includeDisabled = false): Promise<GrowthDataSource[]> {
  const supabase = getSupabaseAdmin();
  let sources: GrowthDataSource[] = [];
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_data_sources').select('*');
      if (!error && data && data.length > 0) {
        sources = data.map((r: any) => ({
          id: r.id,
          providerKey: r.provider_key,
          name: r.name,
          type: r.type,
          status: r.status || 'Fresh',
          lastSyncedAt: r.last_synced_at,
          recordsCount: r.records_count || 0,
          errorMessage: r.error_message,
          quotaStatus: r.quota_status,
          // Strip API keys / secrets before returning configuration
          config: r.config ? sanitizeDataSourceConfig(r.config) : {},
          createdAt: r.created_at || new Date().toISOString(),
          updatedAt: r.updated_at || new Date().toISOString(),
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching data sources:', e);
    }
  }

  if (sources.length === 0) {
    sources = Array.from(memoryDataSources.values()).map((ds) => ({
      ...ds,
      config: sanitizeDataSourceConfig(ds.config || {}),
    }));
  }

  if (!includeDisabled) {
    sources = sources.filter((ds) => {
      if (ds.providerKey === 'google_ads_keywords') {
        return isGoogleAdsEnabled();
      }
      if (ds.providerKey === 'google_search_console') {
        return isSearchConsoleConfigured();
      }
      return ds.status !== 'Disabled';
    });
  }

  return sources;
}

function sanitizeDataSourceConfig(config: Record<string, any>): Record<string, any> {
  const clean = { ...config };
  delete clean.secret;
  delete clean.apiKey;
  delete clean.developerToken;
  delete clean.password;
  delete clean.clientSecret;
  return clean;
}

export async function saveDataSourceRecord(ds: GrowthDataSource): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_data_sources').upsert({
      id: ds.id,
      provider_key: ds.providerKey,
      name: ds.name,
      type: ds.type,
      status: ds.status,
      last_synced_at: ds.lastSyncedAt,
      records_count: ds.recordsCount,
      error_message: ds.errorMessage,
      quota_status: ds.quotaStatus,
      config: ds.config || {},
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_data_sources table unmigrated or unavailable:', error.message);
    }
  }
  memoryDataSources.set(ds.providerKey, ds);
}

export async function logSyncEvent(log: GrowthDataSyncLog): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_data_sync_logs').insert({
      id: log.id,
      source_id: log.sourceId,
      provider_key: log.providerKey,
      status: log.status,
      records_imported: log.recordsImported,
      records_updated: log.recordsUpdated,
      error_details: log.errorDetails,
      duration_ms: log.durationMs,
      started_at: log.startedAt,
      completed_at: log.completedAt || new Date().toISOString(),
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_data_sync_logs table unmigrated or unavailable:', error.message);
    }
  }
  memorySyncLogs.push(log);
}

// ==========================================
// 8. IMPORT JOBS
// ==========================================
export async function getImportJobs(): Promise<GrowthImportJob[]> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.from('growth_import_jobs').select('*').order('created_at', { ascending: false });
      if (!error && data) {
        return data.map((r: any) => ({
          id: r.id,
          importType: r.import_type,
          filename: r.filename,
          totalRows: r.total_rows || 0,
          importedRows: r.imported_rows || 0,
          skippedRows: r.skipped_rows || 0,
          errorCount: r.error_count || 0,
          status: r.status || 'PENDING',
          createdAt: r.created_at || new Date().toISOString(),
          completedAt: r.completed_at,
        }));
      }
    } catch (e) {
      console.warn('[Growth DB] Error fetching import jobs:', e);
    }
  }
  return Array.from(memoryImportJobs.values());
}

export async function saveImportJob(job: GrowthImportJob): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { error } = await supabase.from('growth_import_jobs').upsert({
      id: job.id,
      import_type: job.importType,
      filename: job.filename,
      total_rows: job.totalRows,
      imported_rows: job.importedRows,
      skipped_rows: job.skippedRows,
      error_count: job.errorCount,
      status: job.status,
      created_at: job.createdAt,
      completed_at: job.completedAt,
    });
    if (error) {
      console.warn('[Growth DB] Notice: Supabase growth_import_jobs table unmigrated or unavailable:', error.message);
    }
  }
  memoryImportJobs.set(job.id, job);
}
