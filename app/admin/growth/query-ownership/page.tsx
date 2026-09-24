'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import {
  Compass,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Search,
  ExternalLink,
  Layers,
  BookOpen,
  ShoppingBag,
  Building2,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { resolveQueryOwnership, auditCannibalizationAcrossQueries } from '@/lib/growth/query-ownership-engine';

export default function QueryOwnershipAdminPage() {
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  const sampleOwnershipMap = [
    {
      query: 'pure sojat henna powder',
      intent: 'PRODUCT_SPECIFIC',
      pageType: 'PRODUCT',
      canonicalUrl: 'https://muskydose.in/products/pure-sojat-henna-powder',
      status: 'CLEAN',
    },
    {
      query: 'what is baq henna vs regular henna',
      intent: 'INFORMATIONAL',
      pageType: 'GUIDE',
      canonicalUrl: 'https://muskydose.in/guides/guide-what-is-baq-henna-vs-regular',
      status: 'CLEAN',
    },
    {
      query: 'sojat mehndi wholesale rate',
      intent: 'WHOLESALE',
      pageType: 'WHOLESALE',
      canonicalUrl: 'https://muskydose.in/wholesale',
      status: 'CLEAN',
    },
    {
      query: 'natural indigo powder for hair',
      intent: 'PRODUCT_SPECIFIC',
      pageType: 'PRODUCT',
      canonicalUrl: 'https://muskydose.in/products/natural-indigo-powder',
      status: 'CLEAN',
    },
    {
      query: '2 step henna and indigo hair dye',
      intent: 'INFORMATIONAL',
      pageType: 'GUIDE',
      canonicalUrl: 'https://muskydose.in/guides/guide-henna-indigo-2-step-hair-dye',
      status: 'CLEAN',
    },
    {
      query: 'maruthani powder',
      intent: 'KNOWLEDGE',
      pageType: 'KNOWLEDGE',
      canonicalUrl: 'https://muskydose.in/knowledge/henna-mehndi',
      status: 'CLEAN',
    },
    {
      query: 'sojat henna origin and heritage',
      intent: 'LOCAL',
      pageType: 'LOCAL_HUB',
      canonicalUrl: 'https://muskydose.in/sojat-henna',
      status: 'CLEAN',
    },
  ];

  const handleTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;
    const res = resolveQueryOwnership(testQuery, [], [], []);
    setTestResult(res);
  };

  return (
    <AdminLayout title="Query-to-Page Ownership Engine">
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-[#1b4332] text-[#c5a059] shrink-0 mt-0.5">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-heading font-bold text-xl text-white">
                  Deterministic Query Ownership Engine
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ZERO CANNIBALIZATION
                </span>
              </div>
              <p className="text-xs text-[#b2c8be] mt-1 max-w-2xl">
                Every search query is governed by explicit intent rules: Informational queries belong to Guides, Transactional queries to Product PDPs, B2B queries to Wholesale, and Botanical queries to Knowledge entities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/growth"
              className="inline-flex items-center gap-1.5 bg-[#1b4332] text-white px-4 py-2.5 rounded-xl font-bold text-xs border border-[#2d6a4f] hover:bg-[#245a43]"
            >
              <span>Back to Growth Center</span>
            </Link>
          </div>
        </div>

        {/* Live Intent Resolution Tester */}
        <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs">
          <h4 className="font-serif-heading font-bold text-base text-[#0f2d22] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#c5a059]" />
            Live Query Ownership & Intent Tester
          </h4>
          <form onSubmit={handleTest} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-stone-400" />
              <input
                type="text"
                placeholder="Enter any customer search query (e.g. bulk indigo powder, how to mix henna)..."
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-[#1b4332]"
              />
            </div>
            <button
              type="submit"
              className="bg-[#1b4332] text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-[#245a43] transition-colors"
            >
              Resolve Owner
            </button>
          </form>

          {testResult && (
            <div className="mt-4 p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Intent: <span className="text-[#1b4332]">{testResult.primaryIntent}</span>
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Confidence: {testResult.confidenceScore} / 1000
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold text-[#0f2d22]">
                <span>Canonical Owner:</span>
                <a
                  href={testResult.canonicalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-700 underline flex items-center gap-1 hover:text-emerald-800"
                >
                  {testResult.canonicalUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-xs text-stone-600 italic">Reason: {testResult.reason}</p>
            </div>
          )}
        </div>

        {/* Ownership Matrix Table */}
        <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#e8e2d5]">
            <h4 className="font-serif-heading font-bold text-base text-[#0f2d22]">
              Canonical Search Query Ownership Registry
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Governed mappings ensuring search engines index exactly one authoritative URL per intent.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="p-4">Target Search Query</th>
                  <th className="p-4">Search Intent</th>
                  <th className="p-4">Surface Type</th>
                  <th className="p-4">Canonical Owner Page</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {sampleOwnershipMap.map((row, idx) => (
                  <tr key={idx} className="hover:bg-stone-50/50">
                    <td className="p-4 font-semibold text-[#0f2d22]">{row.query}</td>
                    <td className="p-4">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-mono text-[11px]">
                        {row.intent}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-stone-600">{row.pageType}</span>
                    </td>
                    <td className="p-4">
                      <a
                        href={row.canonicalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        {row.canonicalUrl.replace('https://muskydose.in', '')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        PROTECTED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
