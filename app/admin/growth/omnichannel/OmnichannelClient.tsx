'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  OmnichannelDashboardMetrics,
  ProductOmnichannelLaunchPackage,
  GrowthOpportunity,
  OmnichannelChannel,
} from '@/lib/growth/types';
import {
  Users,
  Sparkles,
  Share2,
  TrendingUp,
  MessageCircle,
  Video,
  Instagram,
  Facebook,
  Globe,
  Store,
  RefreshCw,
  Copy,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Send,
  Layers,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

export default function OmnichannelClient() {
  const [metrics, setMetrics] = useState<OmnichannelDashboardMetrics | null>(null);
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([]);
  const [launchPackages, setLaunchPackages] = useState<ProductOmnichannelLaunchPackage[]>([]);
  const [channelScores, setChannelScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedDraft, setCopiedDraft] = useState<string | null>(null);
  const [selectedProductLaunch, setSelectedProductLaunch] = useState<ProductOmnichannelLaunchPackage | null>(null);
  const [activeChannelTab, setActiveChannelTab] = useState<'IG' | 'YT' | 'WA' | 'FB' | 'GB'>('IG');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/growth/omnichannel');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics || null);
          setOpportunities(data.opportunities || []);
          setLaunchPackages(data.launchPackages || []);
          setChannelScores(data.channelScores || []);
          if (data.launchPackages && data.launchPackages.length > 0) {
            setSelectedProductLaunch(data.launchPackages[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load omnichannel data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedDraft(id);
    setTimeout(() => setCopiedDraft(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif-heading font-bold text-2xl text-[#0f2d22]">
              Omnichannel Customer Engine
            </h1>
            <span className="bg-[#e8f5e9] text-[#1b4332] text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#c8e6c9]">
              1 CATALOG → ALL CHANNELS → 1 LEAD ENGINE
            </span>
          </div>
          <p className="text-xs text-[#626c66] mt-1">
            Automated Product Launch Packages, Content Repurposing Queue, Channel Attribution & Decision Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#f4efe6] text-[#1b4332] rounded-xl text-xs font-bold hover:bg-[#e8e2d5] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Channels
          </button>
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#0f2d22] transition-colors shadow-xs"
          >
            <Users className="w-4 h-4" />
            View All Leads
          </Link>
        </div>
      </div>

      {/* Top Headline KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-[#626c66] uppercase tracking-wider block">Total Leads</span>
          <span className="text-xl font-bold text-[#0f2d22] mt-1 block">{metrics?.totalLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Leads Today</span>
          <span className="text-xl font-bold text-blue-900 mt-1 block">{metrics?.leadsToday ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">Qualified</span>
          <span className="text-xl font-bold text-indigo-900 mt-1 block">{metrics?.qualifiedLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">WhatsApp</span>
          <span className="text-xl font-bold text-emerald-900 mt-1 block">{metrics?.whatsappLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-pink-700 uppercase tracking-wider block">Instagram</span>
          <span className="text-xl font-bold text-pink-900 mt-1 block">{metrics?.instagramLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-red-700 uppercase tracking-wider block">YouTube</span>
          <span className="text-xl font-bold text-red-900 mt-1 block">{metrics?.youtubeLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Google</span>
          <span className="text-xl font-bold text-teal-900 mt-1 block">{metrics?.googleLeads ?? 0}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-xs">
          <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Wholesale</span>
          <span className="text-xl font-bold text-purple-900 mt-1 block">{metrics?.wholesaleLeads ?? 0}</span>
        </div>
      </div>

      {/* Channel Performance Table */}
      {metrics?.channelPerformance && (
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
                Omnichannel Performance & Attribution Breakdown
              </h3>
              <p className="text-xs text-[#626c66]">
                First-Party Measurable Traffic, Leads, Qualified Conversions & Attributed Commercial Revenue
              </p>
            </div>
            <span className="text-xs font-bold text-[#1b4332] bg-[#e8f5e9] px-3 py-1 rounded-full border border-[#c8e6c9]">
              Reliable Attribution Only
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#e8e2d5] text-[#626c66] bg-[#fcfbf9]">
                  <th className="p-3 font-bold">Channel</th>
                  <th className="p-3 font-bold">Estimated Visitors</th>
                  <th className="p-3 font-bold">Total Leads</th>
                  <th className="p-3 font-bold">Qualified Leads</th>
                  <th className="p-3 font-bold">Orders</th>
                  <th className="p-3 font-bold">Lead Rate</th>
                  <th className="p-3 font-bold">Conversion Rate</th>
                  <th className="p-3 font-bold text-right">Attributed Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f4efe6]">
                {metrics.channelPerformance.map((c) => (
                  <tr key={c.channel} className="hover:bg-[#fcfbf9] transition-colors">
                    <td className="p-3 font-bold text-[#0f2d22] flex items-center gap-2">
                      {c.channel === 'WHATSAPP' && <MessageCircle className="w-4 h-4 text-emerald-600" />}
                      {c.channel === 'INSTAGRAM' && <Instagram className="w-4 h-4 text-pink-600" />}
                      {c.channel === 'YOUTUBE' && <Video className="w-4 h-4 text-red-600" />}
                      {c.channel === 'FACEBOOK' && <Facebook className="w-4 h-4 text-blue-600" />}
                      {c.channel === 'GOOGLE_ORGANIC' && <Globe className="w-4 h-4 text-teal-600" />}
                      {c.channel === 'GOOGLE_MERCHANT' && <Store className="w-4 h-4 text-amber-600" />}
                      {c.channel === 'DIRECT' && <Layers className="w-4 h-4 text-gray-600" />}
                      <span>{c.label}</span>
                    </td>
                    <td className="p-3 text-[#626c66]">{c.visitors}</td>
                    <td className="p-3 font-bold text-[#0f2d22]">{c.leads}</td>
                    <td className="p-3 font-bold text-indigo-900">{c.qualified}</td>
                    <td className="p-3 font-bold text-emerald-900">{c.orders}</td>
                    <td className="p-3 text-[#626c66]">{c.leadRate}%</td>
                    <td className="p-3 text-[#626c66]">{c.conversionRate}%</td>
                    <td className="p-3 text-right font-bold text-[#0f2d22]">
                      ₹{c.attributedRevenue.toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Channel Opportunity Score Matrix */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div>
          <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
            Channel Opportunity Decision Engine
          </h3>
          <p className="text-xs text-[#626c66]">
            Deterministic scoring (0–100) identifying high-potential customer acquisition channels
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {channelScores.map((ch) => (
            <div
              key={ch.channel}
              className="bg-[#fcfbf9] p-4 rounded-xl border border-[#e8e2d5] flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#0f2d22]">{ch.label}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ch.classification === 'BEST_CURRENT_CHANNEL'
                        ? 'bg-[#e8f5e9] text-emerald-900 border-[#c8e6c9]'
                        : ch.classification === 'SECONDARY_CHANNEL'
                        ? 'bg-[#fff8e1] text-amber-900 border-[#ffe082]'
                        : 'bg-[#f4efe6] text-[#626c66] border-[#e8e2d5]'
                    }`}
                  >
                    {ch.classification.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-2xl font-bold text-[#0f2d22]">{ch.score}</span>
                  <span className="text-xs text-[#626c66]">/ 100 Opportunity Score</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Automated Product Omnichannel Launchpad */}
      {selectedProductLaunch && (
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e8e2d5] pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
                  Automated Omnichannel Launch Package
                </h3>
              </div>
              <p className="text-xs text-[#626c66] mt-0.5">
                Ready-to-publish drafts auto-propagated from central product data
              </p>
            </div>

            {/* Product Selector Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-[#626c66]">Select Product:</label>
              <select
                value={selectedProductLaunch.productId}
                onChange={(e) => {
                  const found = launchPackages.find((p) => p.productId === e.target.value);
                  if (found) setSelectedProductLaunch(found);
                }}
                className="px-3 py-1.5 bg-[#fdfbf7] border border-[#e8e2d5] rounded-xl text-xs font-bold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              >
                {launchPackages.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Channel Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-[#e8e2d5] pb-2 text-xs font-bold">
            {[
              { id: 'IG', label: 'Instagram Post & Reel' },
              { id: 'YT', label: 'YouTube Short & Script' },
              { id: 'WA', label: 'WhatsApp Broadcasts' },
              { id: 'FB', label: 'Facebook Post' },
              { id: 'GB', label: 'Google Business Update' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveChannelTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  activeChannelTab === tab.id
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'bg-[#f4efe6] text-[#626c66] hover:bg-[#e8e2d5]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="bg-[#fcfbf9] p-5 rounded-xl border border-[#e8e2d5] space-y-4 text-xs">
            {activeChannelTab === 'IG' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f2d22]">Instagram Feed Caption & Reel Hook</span>
                  <button
                    onClick={() => handleCopy(selectedProductLaunch.instagram.captionDraft, 'ig_cap')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e8e2d5] text-[#1b4332] rounded-lg font-bold hover:bg-[#f4efe6] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDraft === 'ig_cap' ? 'Copied!' : 'Copy Caption'}
                  </button>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#0f2d22]">
                  {selectedProductLaunch.instagram.captionDraft}
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#e8e2d5]">
                  <span className="font-bold text-[#0f2d22] block">Reel Concept & Hook:</span>
                  <p className="text-[#626c66] mt-1">{selectedProductLaunch.instagram.reelConcept}</p>
                </div>
              </div>
            )}

            {activeChannelTab === 'YT' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f2d22]">YouTube Short 30-Second Script</span>
                  <button
                    onClick={() => handleCopy(selectedProductLaunch.youtube.shortScriptDraft, 'yt_script')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e8e2d5] text-[#1b4332] rounded-lg font-bold hover:bg-[#f4efe6] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDraft === 'yt_script' ? 'Copied!' : 'Copy Script'}
                  </button>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#0f2d22]">
                  {selectedProductLaunch.youtube.shortScriptDraft}
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#e8e2d5] space-y-1">
                  <span className="font-bold text-[#0f2d22] block">Recommended Video Title:</span>
                  <p className="text-[#626c66]">{selectedProductLaunch.youtube.videoTitle}</p>
                </div>
              </div>
            )}

            {activeChannelTab === 'WA' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f2d22]">WhatsApp Broadcast & Quick Responses</span>
                  <button
                    onClick={() => handleCopy(selectedProductLaunch.whatsapp.promotionalDraft, 'wa_promo')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e8e2d5] text-[#1b4332] rounded-lg font-bold hover:bg-[#f4efe6] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDraft === 'wa_promo' ? 'Copied!' : 'Copy Promotion'}
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-[#e8e2d5] space-y-1">
                    <span className="font-bold text-emerald-900 block">Retail Promotional Broadcast:</span>
                    <p className="text-[#0f2d22] text-[11px] whitespace-pre-wrap">{selectedProductLaunch.whatsapp.promotionalDraft}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#e8e2d5] space-y-1">
                    <span className="font-bold text-purple-900 block">B2B Wholesale / Salon Rate Card:</span>
                    <p className="text-[#0f2d22] text-[11px] whitespace-pre-wrap">{selectedProductLaunch.whatsapp.wholesaleDraft}</p>
                  </div>
                </div>
              </div>
            )}

            {activeChannelTab === 'FB' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f2d22]">Facebook Page Post</span>
                  <button
                    onClick={() => handleCopy(selectedProductLaunch.facebook.postDraft, 'fb_post')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e8e2d5] text-[#1b4332] rounded-lg font-bold hover:bg-[#f4efe6] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDraft === 'fb_post' ? 'Copied!' : 'Copy Post'}
                  </button>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#0f2d22]">
                  {selectedProductLaunch.facebook.postDraft}
                </div>
              </div>
            )}

            {activeChannelTab === 'GB' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-[#0f2d22]">Google Business Profile Update</span>
                  <button
                    onClick={() => handleCopy(selectedProductLaunch.googleBusiness.postDraft, 'gb_post')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e8e2d5] text-[#1b4332] rounded-lg font-bold hover:bg-[#f4efe6] transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDraft === 'gb_post' ? 'Copied!' : 'Copy Update'}
                  </button>
                </div>
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-[#0f2d22]">
                  {selectedProductLaunch.googleBusiness.postDraft}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Omnichannel Opportunities Stream */}
      {opportunities.length > 0 && (
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
                Omnichannel Growth Opportunities ({opportunities.length})
              </h3>
            </div>
            <Link
              href="/admin/growth/opportunities"
              className="text-xs font-bold text-[#1b4332] hover:underline inline-flex items-center gap-1"
            >
              Action Center <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {opportunities.map((opp) => (
              <div
                key={opp.id}
                className="bg-[#fcfbf9] p-4 rounded-xl border border-[#e8e2d5] flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[#0f2d22]">{opp.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                      Score: {opp.growthScore}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#626c66] mt-1 leading-relaxed">{opp.description}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#e8e2d5] text-[11px]">
                  <span className="text-[#626c66] font-mono">Channel Target: {opp.categoryFilter}</span>
                  <Link
                    href="/admin/growth/opportunities"
                    className="text-[#1b4332] font-bold hover:underline"
                  >
                    Execute Draft →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

