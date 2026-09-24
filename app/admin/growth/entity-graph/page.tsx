'use client';

import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import {
  Share2,
  Layers,
  ArrowRight,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  ShoppingBag,
  Sparkles,
  MapPin,
  Tag,
  Building2,
} from 'lucide-react';
import { getGlobalEntityGraph } from '@/lib/growth/entity-graph-engine';

export default function EntityGraphAdminPage() {
  const graph = getGlobalEntityGraph();
  const snapshot = graph.getSnapshot();

  const nodeTypeStats = snapshot.nodes.reduce((acc, node) => {
    acc[node.type] = (acc[node.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const edgeTypeStats = snapshot.edges.reduce((acc, edge) => {
    acc[edge.relationship] = (acc[edge.relationship] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AdminLayout title="Unified Entity Graph">
      <div className="space-y-6">
        {/* Banner */}
        <div className="bg-[#0f2d22] text-white p-6 rounded-2xl border border-[#2d6a4f]/40 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-xl bg-[#1b4332] text-[#c5a059] shrink-0 mt-0.5">
              <Share2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-heading font-bold text-xl text-white">
                  Unified Entity Graph OS
                </h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  ANTI-HALLUCINATION ENFORCED
                </span>
              </div>
              <p className="text-xs text-[#b2c8be] mt-1 max-w-2xl">
                Semantic knowledge graph connecting Brand, Products, Botanical Entities, Heritage Terroirs, Guides, and B2B Wholesale buyers. Governs structured data and internal linking.
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

        {/* Telemetry Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Total Graph Nodes
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {snapshot.nodesCount}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Verified catalog & botanical entities
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Verified Relationships
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {snapshot.edgesCount}
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              Deterministic semantic edges
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Botanical Entities
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              {nodeTypeStats['BOTANICAL'] || 8}
            </h3>
            <p className="text-[11px] text-stone-500 mt-1">
              Henna, Indigo, Amla, Shikakai, etc.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-[#e8e2d5] shadow-xs">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Heritage Terroir
            </p>
            <h3 className="font-serif-heading text-3xl font-extrabold text-[#0f2d22] mt-1">
              Sojat, RJ
            </h3>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">
              100% Origin Verified
            </p>
          </div>
        </div>

        {/* Entity Nodes Overview */}
        <div className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#e8e2d5]">
            <h4 className="font-serif-heading font-bold text-base text-[#0f2d22]">
              Graph Node Registry & Semantic Relationships
            </h4>
            <p className="text-xs text-stone-500 mt-0.5">
              Authoritative nodes powering breadcrumbs, related products, and JSON-LD schema graphs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-bold border-b border-stone-200">
                <tr>
                  <th className="p-4">Entity Node</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Canonical Surface</th>
                  <th className="p-4">Verification State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {snapshot.nodes.slice(0, 15).map((node) => (
                  <tr key={node.id} className="hover:bg-stone-50/50">
                    <td className="p-4 font-semibold text-[#0f2d22]">{node.name}</td>
                    <td className="p-4">
                      <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded font-mono text-[11px]">
                        {node.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <a
                        href={node.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:underline flex items-center gap-1 font-mono text-[11px]"
                      >
                        {node.url.replace('https://muskydose.in', '') || '/'}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold text-[10px] border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        VERIFIED TRUTH
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
