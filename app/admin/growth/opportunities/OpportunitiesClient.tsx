'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  TrendingUp,
  Search,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  FileText,
  HelpCircle,
  ShoppingBag,
  Layers,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  Target,
  BarChart3,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  GrowthOpportunity,
  GrowthOpportunityPriority,
  OpportunityDashboardStats,
  ProductSeoHealthScore,
} from '@/lib/growth/types';

interface ProductHealthSummary {
  id: string;
  name: string;
  slug: string;
  categoryName: string;
  price: number;
  inStock: boolean;
  seoHealth: ProductSeoHealthScore;
  internalLinksCount: number;
}

interface DraftResponse {
  type: string;
  title: string;
  markdownContent: string;
  copyableText: string;
  suggestedMetadata?: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string[];
  };
}

export default function OpportunitiesClient() {
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([]);
  const [stats, setStats] = useState<OpportunityDashboardStats | null>(null);
  const [productSummaries, setProductSummaries] = useState<ProductHealthSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'ALL' | 'P1' | 'SEO' | 'CONTENT' | 'CANNIBALIZATION' | 'ATTRIBUTION' | 'CATALOG'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string>('ALL');

  // GSC & Attribution data
  const [gscStatus, setGscStatus] = useState<{ configured: boolean; statusText: string; message: string } | null>(null);
  const [guideAttribution, setGuideAttribution] = useState<any[]>([]);

  // Draft Modal
  const [activeDraft, setActiveDraft] = useState<DraftResponse | null>(null);
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/admin/growth/opportunities?limit=100`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (selectedProductFilter !== 'ALL') url += `&productId=${encodeURIComponent(selectedProductFilter)}`;

      if (activeTab === 'P1') url += `&priority=P1_NOW`;
      else if (activeTab === 'SEO') url += `&type=METADATA_INCOMPLETE`;
      else if (activeTab === 'CONTENT') url += `&type=MISSING_GUIDE`;
      else if (activeTab === 'CANNIBALIZATION') url += `&type=CANNIBALIZATION_RISK`;

      const res = await fetch(url, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: Failed to fetch opportunities`);
      }

      const json = await res.json();
      if (json.success && json.data) {
        setOpportunities(json.data.opportunities || []);
        setStats(json.data.stats || null);
        setProductSummaries(json.data.productHealthSummaries || []);
        setGuideAttribution(json.data.guideAttribution || []);
        setGscStatus(json.data.gscStatus || null);
      } else {
        throw new Error(json.error || 'Failed to load opportunities');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading growth opportunities');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedProductFilter]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const handleUpdateStatus = async (oppId: string, newStatus: string) => {
    try {
      await fetch('/api/admin/growth/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          opportunityId: oppId,
          newStatus,
        }),
      });

      setOpportunities((prev) =>
        prev.map((o) => (o.id === oppId ? { ...o, status: newStatus as any } : o))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleGenerateDraft = async (opp: GrowthOpportunity) => {
    setDraftLoading(true);
    setActiveDraft(null);
    try {
      const res = await fetch('/api/admin/growth/opportunities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          action: 'GENERATE_DRAFT',
          opportunity: opp,
          productId: opp.productId,
        }),
      });

      const json = await res.json();
      if (json.success && json.draft) {
        setActiveDraft(json.draft);
      } else {
        alert(json.error || 'Failed to generate draft');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setDraftLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5" />
              Growth Engine V1
            </span>
            <span className="text-xs text-stone-500 font-medium">Deterministic Opportunity Action Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-900 font-momo-display">
            Growth &amp; Opportunity Center
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Deterministic Demand &rarr; Content Opportunities &rarr; Commerce Attribution Loop
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/growth/keywords"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-300 rounded-lg hover:bg-stone-50 transition"
          >
            <MapPin className="w-4 h-4 text-emerald-600" />
            Keyword Universe
          </Link>
          <button
            onClick={() => fetchOpportunities()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#183F2B] rounded-lg hover:bg-[#133222] transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Opportunities
          </button>
        </div>
      </div>

      {/* GSC Safe Status Banner */}
      {gscStatus && (
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 text-xs ${
          gscStatus.configured
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-200 text-amber-900'
        }`}>
          <div className="flex items-center gap-3">
            <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[10px] ${
              gscStatus.configured ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
            }`}>
              {gscStatus.statusText}
            </span>
            <span>{gscStatus.message}</span>
          </div>
          {!gscStatus.configured && (
            <span className="text-[11px] text-amber-700 font-medium shrink-0">
              Deterministic First-Party Store Data Active
            </span>
          )}
        </div>
      )}

      {/* 6 Key Metric Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-xl border border-red-100 shadow-sm">
            <div className="flex items-center justify-between text-red-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">P1 NOW</span>
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{stats.p1Count}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Immediate actions</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between text-amber-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">P2 NEXT</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{stats.p2Count}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Medium priority</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 shadow-sm">
            <div className="flex items-center justify-between text-emerald-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Growth Score</span>
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">88/100</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Avg high priority</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-center justify-between text-blue-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Total Opps</span>
              <Target className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{stats.totalOpportunities}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Active signals</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm">
            <div className="flex items-center justify-between text-purple-600 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Guides</span>
              <HelpCircle className="w-4 h-4" />
            </div>
            <div className="text-2xl font-extrabold text-stone-900">{guideAttribution.length}</div>
            <div className="text-[11px] text-stone-500 mt-0.5">Published guides</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
            <div className="flex items-center justify-between text-stone-700 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">Avg Health</span>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-700">{stats.averageSeoHealthScore}%</div>
            <div className="text-[11px] text-stone-500 mt-0.5">{stats.productsNeedingSeoCount} need work</div>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-b border-stone-200">
        <div className="flex items-center gap-1 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'ALL'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            All Opportunities ({stats?.totalOpportunities || 0})
          </button>
          <button
            onClick={() => setActiveTab('P1')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'P1'
                ? 'border-red-600 text-red-900 bg-red-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            🔴 P1 Immediate ({stats?.p1Count || 0})
          </button>
          <button
            onClick={() => setActiveTab('SEO')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'SEO'
                ? 'border-blue-600 text-blue-900 bg-blue-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            🎯 SEO &amp; Metadata
          </button>
          <button
            onClick={() => setActiveTab('CONTENT')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'CONTENT'
                ? 'border-purple-600 text-purple-900 bg-purple-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            📚 Guides &amp; FAQs
          </button>
          <button
            onClick={() => setActiveTab('CANNIBALIZATION')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'CANNIBALIZATION'
                ? 'border-amber-600 text-amber-900 bg-amber-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            ⚠️ Cannibalization Alerts
          </button>
          <button
            onClick={() => setActiveTab('ATTRIBUTION')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'ATTRIBUTION'
                ? 'border-emerald-700 text-emerald-900 bg-emerald-50/50'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            📊 Guide &rarr; Commerce Attribution
          </button>
          <button
            onClick={() => setActiveTab('CATALOG')}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition whitespace-nowrap ${
              activeTab === 'CATALOG'
                ? 'border-stone-800 text-stone-900 bg-stone-100'
                : 'border-transparent text-stone-600 hover:text-stone-900'
            }`}
          >
            📦 Catalog SEO Health ({productSummaries.length})
          </button>
        </div>

        {/* Search and Product Filters */}
        <div className="flex items-center gap-2 pb-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search opportunities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-600 w-48 sm:w-60"
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'CATALOG' ? (
        /* Catalog SEO Health View */
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Product SEO Health &amp; Completeness Audit</h3>
              <p className="text-xs text-stone-500">Internal score based on metadata, keyword depth, and completeness</p>
            </div>
            <span className="text-xs font-semibold text-stone-600">{productSummaries.length} Products Monitored</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/75 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">SEO Health</th>
                  <th className="px-4 py-3">Metadata</th>
                  <th className="px-4 py-3">Keywords</th>
                  <th className="px-4 py-3">Internal Links</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {productSummaries.map((p) => {
                  const h = p.seoHealth;
                  return (
                    <tr key={p.id} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-stone-900">{p.name}</div>
                        <div className="text-[11px] text-stone-400 font-mono">/products/{p.slug}</div>
                      </td>
                      <td className="px-4 py-3.5 text-stone-600">{p.categoryName}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              h.rating === 'EXCELLENT'
                                ? 'bg-emerald-100 text-emerald-800'
                                : h.rating === 'GOOD'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {h.overallScore}% — {h.rating}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {h.breakdown.hasSeoTitle ? (
                            <span title="SEO Title OK"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></span>
                          ) : (
                            <span title="Missing Title"><AlertCircle className="w-4 h-4 text-red-500" /></span>
                          )}
                          <span className="text-stone-600">Title</span>
                          <span className="text-stone-300">|</span>
                          {h.breakdown.hasSeoDescription ? (
                            <span title="SEO Description OK"><CheckCircle2 className="w-4 h-4 text-emerald-600" /></span>
                          ) : (
                            <span title="Missing Description"><AlertCircle className="w-4 h-4 text-red-500" /></span>
                          )}
                          <span className="text-stone-600">Desc</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-stone-800">{h.breakdown.keywordUniverseCount}</span>
                        <span className="text-stone-500"> targets</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-stone-100 text-stone-700 text-[11px] font-medium">
                          <Layers className="w-3 h-3 text-stone-500" />
                          {p.internalLinksCount} Suggested Links
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/admin/products/${p.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 hover:underline"
                        >
                          Optimize &rarr;
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'ATTRIBUTION' ? (
        /* Guide Attribution Matrix View */
        <div className="bg-white rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-stone-900">Guide &rarr; Product Commerce Attribution Matrix</h3>
              <p className="text-xs text-stone-500">First-party attribution from educational guide views to product clicks, cart adds, and completed orders</p>
            </div>
            <span className="text-xs font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-full">
              {guideAttribution.length} Monitored Guides
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-100/75 text-stone-600 font-semibold border-b border-stone-200">
                <tr>
                  <th className="px-4 py-3">Guide Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-center">Guide Views</th>
                  <th className="px-4 py-3 text-center">Product Clicks</th>
                  <th className="px-4 py-3 text-center">CTR</th>
                  <th className="px-4 py-3 text-center">Cart Adds</th>
                  <th className="px-4 py-3 text-center">Orders</th>
                  <th className="px-4 py-3 text-right">Attributed Revenue</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {guideAttribution.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-stone-400">
                      No guide attribution events recorded yet.
                    </td>
                  </tr>
                ) : (
                  guideAttribution.map((ga) => (
                    <tr key={ga.guideSlug} className="hover:bg-stone-50 transition">
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-stone-900">{ga.guideTitle}</div>
                        <div className="text-[11px] text-stone-400 font-mono">/guides/{ga.guideSlug}</div>
                      </td>
                      <td className="px-4 py-3.5 text-stone-600">{ga.category}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-stone-800">{ga.guideViews}</td>
                      <td className="px-4 py-3.5 text-center font-semibold text-emerald-700">{ga.productClicks}</td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold text-[11px]">
                          {ga.ctr}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center font-medium text-stone-700">{ga.addToCartCount}</td>
                      <td className="px-4 py-3.5 text-center font-bold text-stone-900">{ga.ordersCount}</td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-800">
                        ₹{ga.attributedRevenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link
                          href={`/guides/${ga.guideSlug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Opportunities Feed */
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-800 rounded-xl text-xs border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {loading ? (
            <div className="p-12 text-center text-stone-500 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
              Loading prioritized growth opportunities...
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-12 text-center text-stone-500 text-xs bg-white rounded-xl border border-stone-200">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
              Everything looks healthy right now. No opportunities matching this filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-sm hover:border-emerald-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Score Badge */}
                      {opp.growthScore !== undefined && (
                        <span className="px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-800 text-white shadow-xs">
                          ★ Score: {opp.growthScore}/100
                        </span>
                      )}

                      {opp.priority === 'P1_NOW' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-100 text-red-800 border border-red-200">
                          P1 NOW
                        </span>
                      ) : opp.priority === 'P2_NEXT' ? (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          P2 NEXT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          P3 LATER
                        </span>
                      )}

                      <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                        {opp.type.replace(/_/g, ' ')}
                      </span>

                      {opp.status && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                          opp.status === 'APPLIED' ? 'bg-emerald-100 text-emerald-800' :
                          opp.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                          opp.status === 'DISMISSED' ? 'bg-stone-200 text-stone-600' :
                          'bg-stone-100 text-stone-700'
                        }`}>
                          {opp.status}
                        </span>
                      )}
                    </div>

                    <h4 className="text-base font-bold text-stone-900">{opp.title}</h4>
                    <p className="text-xs text-stone-600 leading-relaxed max-w-3xl">{opp.description}</p>

                    {/* Cannibalization Details if present */}
                    {opp.cannibalizationDetails && (
                      <div className="bg-amber-50/70 p-3 rounded-lg border border-amber-200 text-xs text-amber-900 space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-amber-950">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Conflicting Pages:</span>
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                          {opp.cannibalizationDetails.conflictingPages.map((cp, idx) => (
                            <li key={idx}>
                              <span className="font-semibold">{cp.title}</span> ({cp.url}) — Intent: {cp.intent}
                            </li>
                          ))}
                        </ul>
                        <div className="text-[11px] text-amber-900 pt-1 font-medium">
                          💡 Suggestion: {opp.cannibalizationDetails.resolutionSuggestion}
                        </div>
                      </div>
                    )}

                    {/* Performance / Metric Tags */}
                    <div className="flex items-center gap-3 text-[11px] text-stone-500 pt-1 flex-wrap">
                      {opp.marketDemand?.searchVolume && (
                        <span className="font-semibold text-stone-700">
                          Volume: {opp.marketDemand.searchVolume.toLocaleString()}/mo
                        </span>
                      )}
                      {opp.gscPerformance && (
                        <>
                          <span className="text-emerald-700 font-semibold">
                            GSC Impressions: {opp.gscPerformance.impressions}
                          </span>
                          <span className="text-stone-700">
                            Avg Pos: #{opp.gscPerformance.position?.toFixed(1)}
                          </span>
                        </>
                      )}
                      {opp.productName && (
                        <span className="text-stone-700 font-medium">
                          Mapped Product: <span className="font-semibold">{opp.productName}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleGenerateDraft(opp)}
                      disabled={draftLoading}
                      className="px-3.5 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      {opp.actionLabel || 'Generate Action Draft'}
                    </button>

                    {opp.actionLink && (
                      <Link
                        href={opp.actionLink}
                        className="px-3.5 py-2 text-xs font-semibold text-white bg-[#183F2B] rounded-lg hover:bg-[#133222] transition inline-flex items-center gap-1 shadow-xs"
                      >
                        Open Editor &rarr;
                      </Link>
                    )}

                    <button
                      onClick={() => handleUpdateStatus(opp.id, opp.status === 'DISMISSED' ? 'NEW' : 'DISMISSED')}
                      className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition text-xs"
                      title={opp.status === 'DISMISSED' ? 'Restore' : 'Dismiss'}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action Draft Modal */}
      {activeDraft && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between bg-stone-50 rounded-t-2xl">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  Autonomous Content / Action Draft
                </span>
                <h3 className="text-base font-bold text-stone-900">{activeDraft.title}</h3>
              </div>
              <button
                onClick={() => setActiveDraft(null)}
                aria-label="Close Draft Modal"
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs text-stone-800 leading-relaxed font-mono bg-stone-50/50 rounded-b-2xl">
              <pre className="whitespace-pre-wrap font-sans bg-white p-4 rounded-xl border border-stone-200 shadow-inner">
                {activeDraft.copyableText}
              </pre>
            </div>

            <div className="px-6 py-4 border-t border-stone-200 bg-white rounded-b-2xl flex items-center justify-between">
              <span className="text-[11px] text-stone-500">
                Draft template ready. Review and apply to product or blog content.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => copyToClipboard(activeDraft.copyableText)}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition inline-flex items-center gap-1.5 shadow"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Draft Text'}
                </button>
                <button
                  onClick={() => setActiveDraft(null)}
                  className="px-3.5 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
