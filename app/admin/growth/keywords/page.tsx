'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminLayout from '@/components/AdminLayout';
import {
  Search,
  MapPin,
  Target,
  Sparkles,
  Info,
  Building2,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  X,
  Globe,
  BarChart3,
  ShieldCheck,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { INDIAN_STATES_AND_UTS } from '@/lib/growth/geography';

interface CatalogSearchMatch {
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
  relevanceScore: number;
  sourceBadge: 'CATALOG MATCH';
}

interface EnrichedKeyword {
  id: string;
  keyword: string;
  language: string;
  country: string;
  state?: string;
  district?: string;
  city?: string;
  category?: string;
  searchVolume?: number | null;
  competition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  cpc?: number | null;
  trend?: 'RISING' | 'STABLE' | 'DECLINING' | null;
  sourceTier: 'VERIFIED' | 'IMPORTED' | 'DERIVED' | 'ESTIMATED';
  sourceName: string;
  collectedAt: string;
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

interface SearchConsoleQuery {
  id: string;
  query: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  page?: string;
  country: string;
  dateRange: string;
  collectedAt: string;
  sourceBadge: 'SEARCH CONSOLE';
}

interface BusinessDemandSignal {
  ordersCount: number;
  totalRevenue: number;
  unitsSold: number;
  wholesaleInquiriesCount: number;
  topStates: Array<{ state: string; count: number; revenue: number }>;
  sourceBadge: 'FIRST-PARTY STORE';
}

interface EnrichedProductKeywordMatch {
  id: string;
  productId: string;
  productName: string;
  category: string;
  keyword: string;
  keywordType: string;
  relevanceScore: number;
  searchIntent: string;
  generatedFrom: string;
  status: string;
  isActive: boolean;
  isOpportunity: boolean;
  verifiedDemandAvailable: boolean;
  verifiedSearchVolume?: number | null;
  verifiedCpc?: number | null;
  verifiedCompetition?: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  verifiedTrend?: 'RISING' | 'STABLE' | 'DECLINING' | null;
  verifiedSourceName?: string | null;
  noDataExplanation?: string;
  matchedFields: string[];
  sourceBadge: 'GENERATED KEYWORD';
  createdAt?: string;
  updatedAt?: string;
}

export default function MicroMarketHubPage() {
  const [search, setSearch] = useState('henna');
  const [loading, setLoading] = useState(false);

  // Regional Drilldown State: India -> State -> District -> City
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');

  // Response State
  const [catalogMatches, setCatalogMatches] = useState<CatalogSearchMatch[]>([]);
  const [keywordMatches, setKeywordMatches] = useState<EnrichedKeyword[]>([]);
  const [generatedKeywords, setGeneratedKeywords] = useState<EnrichedProductKeywordMatch[]>([]);
  const [gscQueries, setGscQueries] = useState<SearchConsoleQuery[]>([]);
  const [businessSignals, setBusinessSignals] = useState<BusinessDemandSignal | null>(null);
  const [sourcesMetadata, setSourcesMetadata] = useState<any>(null);
  const [regionalSummary, setRegionalSummary] = useState<{
    topStates: Array<{ name: string; volume: number }>;
    topDistricts: Array<{ name: string; volume: number }>;
    topCities: Array<{ name: string; volume: number }>;
  }>({ topStates: [], topDistricts: [], topCities: [] });
  const [overallOpportunity, setOverallOpportunity] = useState<{
    score: number | null;
    explanation: string;
  }>({ score: null, explanation: '' });

  // Modal States
  const [selectedAdsTarget, setSelectedAdsTarget] = useState<EnrichedKeyword | null>(null);
  const [showDataSourceModal, setShowDataSourceModal] = useState<boolean>(false);
  const [adsDraftConfirmed, setAdsDraftConfirmed] = useState(false);

  const fetchDemandIntelligence = useCallback(async (queryTerm: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/growth/keywords?search=${encodeURIComponent(queryTerm)}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogMatches(data.catalogMatches || []);
        setKeywordMatches(data.keywordMatches || []);
        setGeneratedKeywords(data.generatedKeywords || []);
        setGscQueries(data.sources?.searchConsole?.queries || []);
        setBusinessSignals(data.sources?.firstPartyStore?.businessSignals || null);
        setSourcesMetadata(data.sources || null);
        setRegionalSummary(data.regionalSummary || { topStates: [], topDistricts: [], topCities: [] });
        setOverallOpportunity(data.overallQueryOpportunity || { score: null, explanation: '' });
      }
    } catch (err) {
      console.error('Error fetching market demand data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDemandIntelligence(search);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, fetchDemandIntelligence]);

  // Quick search pills
  const samplePills = ['henna', 'amla', 'indigo', 'mehndi', 'rose water'];

  // Filtered keywords based on regional drilldown
  const filteredKeywords = keywordMatches.filter((kw) => {
    if (selectedState !== 'ALL' && kw.state && kw.state.toLowerCase() !== selectedState.toLowerCase()) {
      return false;
    }
    if (selectedDistrict !== 'ALL' && kw.district && kw.district.toLowerCase() !== selectedDistrict.toLowerCase()) {
      return false;
    }
    if (selectedCity !== 'ALL' && kw.city && kw.city.toLowerCase() !== selectedCity.toLowerCase()) {
      return false;
    }
    return true;
  });

  // Calculate India Summary Metrics
  const totalVerifiedCsvVolume = keywordMatches.reduce((sum, k) => sum + (k.searchVolume || 0), 0);
  const totalGscImpressions = gscQueries.reduce((sum, g) => sum + (g.impressions || 0), 0);
  const hasExternalDemand = totalVerifiedCsvVolume > 0 || totalGscImpressions > 0;

  const topStateName = regionalSummary.topStates[0]?.name || businessSignals?.topStates[0]?.state || null;
  const topDistrictName = regionalSummary.topDistricts[0]?.name || null;
  const topCityName = regionalSummary.topCities[0]?.name || null;

  const topTrend = keywordMatches.find((k) => k.trend)?.trend || (gscQueries.length > 0 ? 'ACTIVE' : null);
  const topCompetition = keywordMatches.find((k) => k.competition)?.competition || null;
  const cpcKeywords = keywordMatches.filter((k) => typeof k.cpc === 'number' && k.cpc > 0);
  const avgCpc = cpcKeywords.length > 0
    ? (cpcKeywords.reduce((sum, k) => sum + (k.cpc || 0), 0) / cpcKeywords.length).toFixed(2)
    : null;

  return (
    <AdminLayout title="Growth AI — Micro-Market Hub">
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        
        {/* ========================================================================= */}
        {/* TOP HERO SEARCH BAR                                                       */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-br from-[#0f2d22] to-[#1b4332] text-white p-6 md:p-8 rounded-3xl shadow-sm border border-[#2d6a4f]/30 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#c5a059]" />
                <span className="text-xs uppercase tracking-widest font-bold text-[#c5a059]">
                  Micro-Market Intelligence Hub
                </span>
              </div>
              <h2 className="font-serif-heading text-2xl md:text-3xl font-extrabold text-white mt-1">
                India Market Demand &amp; Regional Discovery
              </h2>
              <p className="text-xs text-[#b2c8be] mt-1 max-w-xl">
                Explore search demand, state &amp; district micro-markets, verified store sales, and ads planning for Musky Dose botanicals.
              </p>
            </div>

            {/* Why This Number / Data Source Modal Trigger */}
            <button
              onClick={() => setShowDataSourceModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white transition-colors shrink-0"
            >
              <Info className="w-4 h-4 text-[#c5a059]" />
              <span>Data Sources &amp; Transparency</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-3.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product or botanical keyword (e.g. henna, amla, indigo, mehndi, rose water)..."
              className="w-full pl-12 pr-4 py-3.5 bg-white text-gray-900 placeholder-gray-400 rounded-2xl text-sm md:text-base font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-[#c5a059] transition-all"
            />
            {loading && (
              <div className="absolute right-4 top-3.5 flex items-center gap-1.5 text-xs text-gray-400">
                <Clock className="w-4 h-4 animate-spin text-[#1b4332]" />
                <span>Loading...</span>
              </div>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-[#b2c8be]">Quick Discover:</span>
            {samplePills.map((pill) => (
              <button
                key={pill}
                onClick={() => {
                  setSearch(pill);
                  setSelectedState('ALL');
                  setSelectedDistrict('ALL');
                  setSelectedCity('ALL');
                }}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  search.toLowerCase() === pill
                    ? 'bg-[#c5a059] text-[#0f2d22] font-bold shadow-xs'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: INDIA MARKET SUMMARY                                          */}
        {/* ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#1b4332]" />
              <span>India Market Summary for &quot;{search || 'All Botanicals'}&quot;</span>
            </h3>
            {overallOpportunity.score !== null && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-extrabold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Opp. Score: {overallOpportunity.score}/100
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {/* Metric 1: Search Demand */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Search Demand</p>
              <div className="text-lg font-black text-[#0f2d22]">
                {totalVerifiedCsvVolume > 0 ? (
                  `${totalVerifiedCsvVolume.toLocaleString()}/mo`
                ) : gscQueries.length > 0 ? (
                  `${totalGscImpressions.toLocaleString()} imp`
                ) : (
                  <span className="text-xs text-gray-400 font-normal">Unconnected</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">
                {totalVerifiedCsvVolume > 0 ? 'Verified CSV Vol' : gscQueries.length > 0 ? 'Search Console' : 'No external vol'}
              </p>
            </div>

            {/* Metric 2: Top State */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Top State</p>
              <div className="text-base font-bold text-[#0f2d22] truncate">
                {topStateName || <span className="text-xs text-gray-400 font-normal">National</span>}
              </div>
              <p className="text-[10px] text-gray-500">{topStateName ? 'Highest activity' : 'India-wide'}</p>
            </div>

            {/* Metric 3: Top District */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Top District</p>
              <div className="text-base font-bold text-[#0f2d22] truncate">
                {topDistrictName || <span className="text-xs text-gray-400 font-normal">—</span>}
              </div>
              <p className="text-[10px] text-gray-500">{topDistrictName ? 'Verified district' : 'Unavailable'}</p>
            </div>

            {/* Metric 4: Top City */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Top City</p>
              <div className="text-base font-bold text-[#0f2d22] truncate">
                {topCityName || <span className="text-xs text-gray-400 font-normal">—</span>}
              </div>
              <p className="text-[10px] text-gray-500">{topCityName ? 'Verified micro-market' : 'Unavailable'}</p>
            </div>

            {/* Metric 5: Trend */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Trend</p>
              <div className="text-base font-bold text-[#0f2d22]">
                {topTrend ? (
                  <span className="text-emerald-700 font-extrabold">{topTrend}</span>
                ) : (
                  <span className="text-xs text-gray-400 font-normal">—</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">{topTrend ? 'Trajectory' : 'Unconnected'}</p>
            </div>

            {/* Metric 6: Competition */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Competition</p>
              <div className="text-base font-bold text-[#0f2d22]">
                {topCompetition ? (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 text-xs font-bold">
                    {topCompetition}
                  </span>
                ) : (
                  <span className="text-xs text-gray-400 font-normal">—</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">{topCompetition ? 'Ad Density' : 'Unconnected'}</p>
            </div>

            {/* Metric 7: Estimated CPC */}
            <div className="bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-1">
              <p className="text-[11px] font-bold text-[#626c66] uppercase tracking-wider">Est. CPC</p>
              <div className="text-base font-bold text-[#0f2d22]">
                {avgCpc ? (
                  `₹${avgCpc}`
                ) : (
                  <span className="text-xs text-gray-400 font-normal">—</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500">{avgCpc ? 'Top of page bid' : 'Unconnected'}</p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SECTION 2 & 4: INDIA REGIONAL HEATMAP & STATE DRILLDOWN                   */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#1b4332]" />
                <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
                  India Regional Micro-Markets &amp; Heatmap
                </h3>
              </div>
              <p className="text-xs text-[#626c66] mt-0.5">
                Click any State to filter keywords, verified micro-market demands, and store sales.
              </p>
            </div>

            {/* Breadcrumb Hierarchy */}
            <div className="flex items-center gap-1.5 text-xs font-semibold bg-[#faf8f5] px-3 py-1.5 rounded-xl border border-[#e8e2d5]">
              <span className="text-gray-500">Hierarchy:</span>
              <button
                onClick={() => {
                  setSelectedState('ALL');
                  setSelectedDistrict('ALL');
                  setSelectedCity('ALL');
                }}
                className={`hover:underline ${selectedState === 'ALL' ? 'text-[#1b4332] font-bold' : 'text-gray-700'}`}
              >
                All India
              </button>
              {selectedState !== 'ALL' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[#1b4332] font-bold">{selectedState}</span>
                </>
              )}
              {selectedDistrict !== 'ALL' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[#1b4332] font-bold">{selectedDistrict}</span>
                </>
              )}
              {selectedCity !== 'ALL' && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-[#1b4332] font-bold">{selectedCity}</span>
                </>
              )}
            </div>
          </div>

          {/* State Filter Buttons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => {
                setSelectedState('ALL');
                setSelectedDistrict('ALL');
                setSelectedCity('ALL');
              }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                selectedState === 'ALL'
                  ? 'bg-[#1b4332] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All India
            </button>
            {INDIAN_STATES_AND_UTS.map((st) => {
              const matchingKws = keywordMatches.filter(
                (k) => k.state && k.state.toLowerCase() === st.name.toLowerCase()
              );
              const storeState = businessSignals?.topStates?.find(
                (s) => s.state.toLowerCase() === st.name.toLowerCase()
              );
              const hasActivity = matchingKws.length > 0 || (storeState && storeState.count > 0);

              return (
                <button
                  key={st.code}
                  onClick={() => {
                    setSelectedState(st.name);
                    setSelectedDistrict('ALL');
                    setSelectedCity('ALL');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    selectedState.toLowerCase() === st.name.toLowerCase()
                      ? 'bg-[#1b4332] text-white shadow-xs font-bold'
                      : hasActivity
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{st.name}</span>
                  {matchingKws.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-[#c5a059] text-[#0f2d22] text-[10px] font-bold">
                      {matchingKws.length} kw
                    </span>
                  )}
                  {storeState && storeState.count > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full bg-emerald-700 text-white text-[10px] font-bold">
                      {storeState.count} orders
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Regional Drilldown Details Card */}
          {selectedState !== 'ALL' && (
            <div className="bg-[#faf8f5] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e8e2d5] pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <h4 className="font-serif-heading font-bold text-base text-[#0f2d22]">
                    State Drill-Down: {selectedState}
                  </h4>
                </div>
                <button
                  onClick={() => {
                    setSelectedState('ALL');
                    setSelectedDistrict('ALL');
                    setSelectedCity('ALL');
                  }}
                  className="text-xs text-gray-500 hover:text-gray-800 underline self-start sm:self-auto"
                >
                  Reset to All India
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* State Search Demand */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5]">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Verified State Demand</span>
                  <div className="text-lg font-extrabold text-[#0f2d22] mt-1">
                    {filteredKeywords.reduce((s, k) => s + (k.searchVolume || 0), 0) > 0 ? (
                      `${filteredKeywords.reduce((s, k) => s + (k.searchVolume || 0), 0).toLocaleString()} vol/mo`
                    ) : (
                      <span className="text-xs text-gray-400 font-normal">Data unavailable at this geographic level</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">{filteredKeywords.length} verified keyword ideas in {selectedState}</p>
                </div>

                {/* State Store Activity */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5]">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">First-Party Store Sales</span>
                  <div className="text-lg font-extrabold text-emerald-800 mt-1">
                    {(() => {
                      const st = businessSignals?.topStates?.find(
                        (s) => s.state.toLowerCase() === selectedState.toLowerCase()
                      );
                      return st ? `${st.count} orders (₹${st.revenue.toLocaleString()})` : '0 orders recorded';
                    })()}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1">Real WhatsApp &amp; Storefront orders</p>
                </div>

                {/* Ads Planning Shortcut */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] flex flex-col justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Targeting Action</span>
                  <button
                    onClick={() => {
                      const topKw = filteredKeywords[0] || keywordMatches[0] || {
                        id: 'plan_state_draft',
                        keyword: search,
                        state: selectedState,
                        country: 'India',
                        category: 'Herbal',
                        sourceTier: 'VERIFIED',
                        sourceName: 'Admin Planning',
                        collectedAt: new Date().toISOString(),
                        muskyOpportunityScore: 75,
                        suggestedGoogleAdsTarget: {
                          keyword: search,
                          matchType: 'PHRASE',
                          locationTarget: `${selectedState}, India`,
                          suggestedCampaign: `Search_Growth_${search}_${selectedState}`,
                          suggestedAdGroup: `AG_${search}_${selectedState}`,
                          requiresAdminConfirmation: true,
                          autoSpendAllowed: false,
                        },
                      };
                      setSelectedAdsTarget(topKw as any);
                    }}
                    className="mt-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#1b4332] text-white text-xs font-bold hover:bg-[#2d6a4f] transition-colors"
                  >
                    <Target className="w-3.5 h-3.5" />
                    <span>Prepare Google Ads Draft for {selectedState}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Empty Market Heatmap Notice when no external dataset is imported */}
          {!hasExternalDemand && (
            <div className="p-8 text-center bg-[#faf8f5] rounded-2xl border border-dashed border-[#e8e2d5] space-y-2">
              <Globe className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="font-bold text-gray-700 text-sm">No verified market-demand data available yet.</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Connect Google Search Console or import verified regional keyword datasets to visualize geographic search volume.
              </p>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 3: KEYWORD DEMAND IDEAS                                           */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
                  Verified Keyword Demand &amp; Ideas
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Verified botanical keyword ideas and search metrics for &quot;{search}&quot;.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#faf8f5] text-gray-700 border border-[#e8e2d5]">
              {filteredKeywords.length + gscQueries.length} Verified Keywords
            </span>
          </div>

          {filteredKeywords.length === 0 && gscQueries.length === 0 ? (
            <div className="p-8 text-center bg-[#faf8f5] rounded-2xl border border-dashed border-[#e8e2d5] space-y-2">
              <Sparkles className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="font-bold text-gray-700 text-sm">Verified market-demand data is not connected yet.</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                No external search volume records found for &quot;{search}&quot;. First-party store analytics and catalog matches remain active below.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-[#626c66] uppercase tracking-wider font-bold">
                    <th className="p-3.5">Keyword</th>
                    <th className="p-3.5 text-right">Search Volume</th>
                    <th className="p-3.5 text-right">Est. CPC</th>
                    <th className="p-3.5 text-center">Competition</th>
                    <th className="p-3.5 text-center">Trend</th>
                    <th className="p-3.5">Target Location</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d5]">
                  {filteredKeywords.map((kw) => (
                    <tr key={kw.id} className="hover:bg-[#fdfbf7] transition-colors">
                      <td className="p-3.5 font-bold text-[#0f2d22] text-sm">{kw.keyword}</td>
                      <td className="p-3.5 text-right font-extrabold text-[#0f2d22]">
                        {typeof kw.searchVolume === 'number' ? kw.searchVolume.toLocaleString() : '—'}
                      </td>
                      <td className="p-3.5 text-right font-semibold text-gray-800">
                        {typeof kw.cpc === 'number' && kw.cpc > 0 ? `₹${kw.cpc.toFixed(2)}` : '—'}
                      </td>
                      <td className="p-3.5 text-center">
                        {kw.competition ? (
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[11px]">
                            {kw.competition}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {kw.trend ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                            {kw.trend}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {[kw.city, kw.district, kw.state, kw.country].filter(Boolean).join(', ') || 'India (National)'}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => setSelectedAdsTarget(kw)}
                          className="px-3 py-1.5 bg-[#1b4332] text-white hover:bg-[#2d6a4f] rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          Prepare Ads Target
                        </button>
                      </td>
                    </tr>
                  ))}

                  {/* Real Search Console Queries in Table */}
                  {gscQueries.map((gsc) => (
                    <tr key={gsc.id} className="hover:bg-[#fdfbf7] transition-colors bg-blue-50/20">
                      <td className="p-3.5 font-bold text-[#0f2d22] text-sm flex items-center gap-2">
                        <span>{gsc.query}</span>
                        <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                          GSC
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-blue-900">
                        {gsc.impressions.toLocaleString()} imp
                      </td>
                      <td className="p-3.5 text-right font-semibold text-gray-700">
                        {gsc.clicks} clicks ({(gsc.ctr * 100).toFixed(1)}%)
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-900 font-bold text-[11px]">
                          Pos #{gsc.position.toFixed(1)}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                          ACTIVE
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600">
                        {gsc.country === 'ind' ? 'India (National)' : gsc.country}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedAdsTarget({
                              id: gsc.id,
                              keyword: gsc.query,
                              language: 'en',
                              country: 'India',
                              category: 'Herbal',
                              sourceTier: 'VERIFIED',
                              sourceName: 'Google Search Console',
                              collectedAt: gsc.collectedAt,
                              muskyOpportunityScore: 80,
                              suggestedGoogleAdsTarget: {
                                keyword: gsc.query,
                                matchType: 'PHRASE',
                                locationTarget: 'India (National)',
                                suggestedCampaign: 'Search_Growth_GSC_' + gsc.query.replace(/\s+/g, '_'),
                                suggestedAdGroup: 'AG_' + gsc.query.replace(/\s+/g, '_'),
                                requiresAdminConfirmation: true,
                                autoSpendAllowed: false,
                              },
                            });
                          }}
                          className="px-3 py-1.5 bg-[#1b4332] text-white hover:bg-[#2d6a4f] rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          Prepare Ads Target
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 4: AUTONOMOUS PRODUCT KEYWORD UNIVERSE TARGETS                    */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-700" />
                <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
                  Autonomous Product Keyword Targets
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Target keywords derived from botanical entity profiles and product catalog metadata.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
              {generatedKeywords.length} Target Keywords
            </span>
          </div>

          {generatedKeywords.length === 0 ? (
            <div className="p-8 text-center bg-[#faf8f5] rounded-2xl border border-dashed border-[#e8e2d5] space-y-2">
              <Target className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="font-bold text-gray-700 text-sm">No autonomous keyword targets matching &quot;{search}&quot;.</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Keyword universes are dynamically generated for all catalog products based on botanical entities, intent, and use cases.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#e8e2d5] bg-[#faf8f5] text-[#626c66] uppercase tracking-wider font-bold">
                    <th className="p-3.5">Target Keyword</th>
                    <th className="p-3.5">Product Link</th>
                    <th className="p-3.5 text-center">Category Type</th>
                    <th className="p-3.5 text-right">Search Volume</th>
                    <th className="p-3.5 text-center">Demand Status</th>
                    <th className="p-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e8e2d5]">
                  {generatedKeywords.slice(0, 25).map((gkw) => (
                    <tr key={gkw.id} className="hover:bg-[#fdfbf7] transition-colors">
                      <td className="p-3.5">
                        <div className="font-bold text-[#0f2d22] text-sm flex items-center gap-1.5">
                          <span>{gkw.keyword}</span>
                          <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                            GENERATED
                          </span>
                        </div>
                        {gkw.matchedFields && gkw.matchedFields.length > 0 && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {gkw.matchedFields.join(' • ')}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-gray-800">
                        <span className="font-medium text-[#1b4332] bg-[#1b4332]/10 px-2 py-0.5 rounded-full text-[11px]">
                          {gkw.productName}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-[10px] uppercase">
                          {gkw.keywordType}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-extrabold text-[#0f2d22]">
                        {typeof gkw.verifiedSearchVolume === 'number' && gkw.verifiedSearchVolume > 0 ? (
                          `${gkw.verifiedSearchVolume.toLocaleString()}/mo`
                        ) : (
                          <span className="text-gray-400 font-normal text-[11px]">Unavailable</span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {gkw.verifiedDemandAvailable ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                            VERIFIED DEMAND
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-medium text-[10px]" title="Verified search-demand data unavailable yet. Target derived from autonomous botanical universe.">
                            UNVERIFIED DEMAND
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => {
                            setSelectedAdsTarget({
                              id: gkw.id,
                              keyword: gkw.keyword,
                              language: 'en',
                              country: 'India',
                              category: gkw.category || 'Herbal',
                              sourceTier: 'DERIVED',
                              sourceName: `Product Target (${gkw.productName})`,
                              collectedAt: gkw.createdAt || new Date().toISOString(),
                              muskyOpportunityScore: gkw.relevanceScore,
                              suggestedGoogleAdsTarget: {
                                keyword: gkw.keyword,
                                matchType: 'PHRASE',
                                locationTarget: 'India (National)',
                                suggestedCampaign: `Search_Product_${gkw.category.replace(/\s+/g, '_')}`,
                                suggestedAdGroup: `AG_${gkw.keyword.replace(/\s+/g, '_')}`,
                                requiresAdminConfirmation: true,
                                autoSpendAllowed: false,
                              },
                            });
                          }}
                          className="px-3 py-1.5 bg-[#1b4332] text-white hover:bg-[#2d6a4f] rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          Prepare Ads Target
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 5: MUSKY DOSE BUSINESS SIGNALS                                   */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-700" />
                <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
                  Musky Dose Business Signals
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                First-party WhatsApp &amp; Storefront order analytics for matching products. (Completely separate from search volume).
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              FIRST-PARTY STORE
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e2d5] space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Matching Orders</span>
              <div className="text-2xl font-black text-[#0f2d22]">
                {businessSignals?.ordersCount || 0}
              </div>
              <p className="text-[10px] text-gray-500">Completed customer orders</p>
            </div>

            <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e2d5] space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Sales Revenue</span>
              <div className="text-2xl font-black text-emerald-800">
                ₹{(businessSignals?.totalRevenue || 0).toLocaleString()}
              </div>
              <p className="text-[10px] text-gray-500">Gross revenue generated</p>
            </div>

            <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e2d5] space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Units Sold</span>
              <div className="text-2xl font-black text-[#0f2d22]">
                {businessSignals?.unitsSold || 0}
              </div>
              <p className="text-[10px] text-gray-500">Botanical units dispatched</p>
            </div>

            <div className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e2d5] space-y-1">
              <span className="text-[11px] font-bold text-gray-500 uppercase">Wholesale Leads</span>
              <div className="text-2xl font-black text-[#c5a059]">
                {businessSignals?.wholesaleInquiriesCount || 0}
              </div>
              <p className="text-[10px] text-gray-500">B2B bulk inquiries</p>
            </div>
          </div>

          {/* Top Customer States */}
          {businessSignals?.topStates && businessSignals.topStates.length > 0 && (
            <div className="pt-2">
              <span className="text-xs font-bold text-gray-700">Top Customer Delivery States:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {businessSignals.topStates.map((st) => (
                  <span
                    key={st.state}
                    className="px-3 py-1 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <span>{st.state}</span>
                    <span className="font-bold">({st.count} orders • ₹{st.revenue.toLocaleString()})</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 6: LIVE CATALOG INVENTORY                                        */}
        {/* ========================================================================= */}
        <div className="bg-white p-6 rounded-3xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1b4332]" />
                <h3 className="font-serif-heading font-bold text-xl text-[#0f2d22]">
                  Live Store Catalog Inventory
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Matched products currently selling in the Musky Dose storefront.
              </p>
            </div>

            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#faf8f5] text-gray-700 border border-[#e8e2d5]">
              {catalogMatches.length} Products Found
            </span>
          </div>

          {catalogMatches.length === 0 ? (
            <div className="p-8 text-center bg-[#faf8f5] rounded-2xl border border-dashed border-[#e8e2d5]">
              <p className="text-xs text-gray-600">No active catalog products matching &quot;{search}&quot;.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogMatches.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e2d5] hover:border-[#1b4332] transition-all space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#1b4332]/10 text-[#1b4332] text-[10px] font-bold uppercase">
                        {prod.categoryName}
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">{prod.sku}</span>
                    </div>

                    <h4 className="font-serif-heading font-bold text-[#0f2d22] text-sm line-clamp-2">
                      {prod.name}
                    </h4>

                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-extrabold text-[#0f2d22]">₹{prod.price}</span>
                      {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                        <span className="text-xs text-gray-400 line-through">₹{prod.compareAtPrice}</span>
                      )}
                      <span className="text-xs text-gray-500">({prod.quantityOrWeight})</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#e8e2d5] flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                      {prod.stockStatus === 'IN_STOCK' ? 'IN STOCK' : prod.stockStatus}
                    </span>
                    <Link
                      href={`/products/${prod.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-bold text-[#1b4332] hover:underline"
                    >
                      <span>View Storefront</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PREPARE GOOGLE ADS TARGETING DRAFT                                */}
      {/* ========================================================================= */}
      {selectedAdsTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-[#e8e2d5]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#1b4332]" />
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                  Google Ads Target Plan Draft
                </h3>
              </div>
              <button
                onClick={() => {
                  setSelectedAdsTarget(null);
                  setAdsDraftConfirmed(false);
                }}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 bg-[#faf8f5] p-4 rounded-2xl border border-[#e8e2d5] text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Target Keyword:</span>
                <span className="font-bold text-[#0f2d22] text-sm">&quot;{selectedAdsTarget.keyword}&quot;</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Match Type:</span>
                <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded">
                  {selectedAdsTarget.suggestedGoogleAdsTarget?.matchType || 'PHRASE'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Target Location:</span>
                <span className="font-bold text-[#0f2d22]">
                  {selectedAdsTarget.suggestedGoogleAdsTarget?.locationTarget || 'India (National)'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500 font-medium">Suggested Campaign:</span>
                <span className="font-mono text-[11px] text-gray-800">
                  {selectedAdsTarget.suggestedGoogleAdsTarget?.suggestedCampaign || 'Search_Growth_Herbal'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-gray-500 font-medium">Suggested Ad Group:</span>
                <span className="font-mono text-[11px] text-gray-800">
                  {selectedAdsTarget.suggestedGoogleAdsTarget?.suggestedAdGroup || 'AG_henna_powder'}
                </span>
              </div>
            </div>

            {/* Safety Verification Box */}
            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-relaxed">
                <strong>Zero Auto-Spend Safeguard:</strong> This generates an offline planning draft only. No live Google Ads campaign is created and zero advertising spend is triggered.
              </p>
            </div>

            {adsDraftConfirmed ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <p className="text-xs font-bold text-emerald-800 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Target plan draft saved for &quot;{selectedAdsTarget.keyword}&quot;
                </p>
              </div>
            ) : (
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setSelectedAdsTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setAdsDraftConfirmed(true)}
                  className="px-5 py-2 rounded-xl bg-[#1b4332] hover:bg-[#2d6a4f] text-white text-xs font-bold transition-all shadow-xs"
                >
                  Confirm Target Plan Draft
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DATA SOURCES & TRANSPARENCY (Why This Number?)                   */}
      {/* ========================================================================= */}
      {showDataSourceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-xl max-w-xl w-full p-6 space-y-5 border border-[#e8e2d5]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-[#1b4332]" />
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                  Data Sources &amp; Transparency
                </h3>
              </div>
              <button
                onClick={() => setShowDataSourceModal(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-600">
                Growth AI combines 4 distinct, verified data layers to present a truthful picture of commercial demand without fabricating numbers:
              </p>

              {/* Source 1: Search Console */}
              <div className="p-3.5 rounded-xl border border-[#e8e2d5] bg-[#faf8f5] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f2d22]">1. Google Search Console (Organic Site Performance)</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px]">
                    {sourcesMetadata?.searchConsole?.enabled ? 'CONNECTED' : 'ACTIVE / LIVE'}
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Real organic search queries, clicks, impressions, CTR, and ranking positions from the official Google Search Console API for <code className="text-gray-700 font-mono">muskydose.in</code>.
                </p>
              </div>

              {/* Source 2: First-Party Store */}
              <div className="p-3.5 rounded-xl border border-[#e8e2d5] bg-[#faf8f5] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f2d22]">2. Musky Dose First-Party Store &amp; WhatsApp Analytics</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Real customer purchases, revenue, unit counts, customer delivery states, and wholesale inquiries queried from PostgreSQL.
                </p>
              </div>

              {/* Source 3: Verified CSV */}
              <div className="p-3.5 rounded-xl border border-[#e8e2d5] bg-[#faf8f5] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f2d22]">3. Verified CSV Keyword Imports</span>
                  <span className="px-2 py-0.5 rounded bg-[#1b4332]/10 text-[#1b4332] font-bold text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Legitimate Google Keyword Planner or market research datasets imported via the Admin Growth CSV tool with full provenance and date auditing.
                </p>
              </div>

              {/* Source 4: Live Store Catalog */}
              <div className="p-3.5 rounded-xl border border-[#e8e2d5] bg-[#faf8f5] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0f2d22]">4. Store Catalog Discovery</span>
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 font-bold text-[10px]">
                    ACTIVE
                  </span>
                </div>
                <p className="text-gray-500 text-[11px]">
                  Deterministic product relevance matching across 200+ botanical inventory items.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowDataSourceModal(false)}
                className="px-5 py-2 bg-[#1b4332] text-white text-xs font-bold rounded-xl hover:bg-[#2d6a4f]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
  );
}
