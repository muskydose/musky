import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import Link from 'next/link';
import {
  CANONICAL_ENTITY_REGISTRY,
  resolveCanonicalEntity,
  getAuthoritativeEntityCounts,
} from '@/lib/growth/entity-registry';
import {
  ENTITY_KEY_TO_SLUG,
  detectSearchCannibalization,
  classifySearchIntent,
} from '@/lib/growth/search-intent-router';
import { getProducts } from '@/lib/db/products';
import { getPublishedGuides } from '@/lib/db/guides';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  BookOpen,
  ShoppingBag,
  Layers,
  CheckCircle2,
  Globe,
  Radio,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Organic Search Health & Entity Diagnostics | Musky Admin',
};

export default async function OrganicHealthPage() {
  const [products, guides] = await Promise.all([
    getProducts(),
    getPublishedGuides(),
  ]);

  const activeProducts = products.filter((p) => p && p.isActive !== false);

  // Analyze Entity Health
  const entityHealthList = Object.values(CANONICAL_ENTITY_REGISTRY).map((record) => {
    const slug = ENTITY_KEY_TO_SLUG[record.entityKey];
    const publicUrl = slug ? `/knowledge/${slug}` : null;
    const isIndexable = record.status === 'KNOWN';

    // Matched Products
    const matchedProds = activeProducts.filter((p) => {
      const res = resolveCanonicalEntity(p);
      return res.entityKey === record.entityKey;
    });

    // Matched Guides
    const matchedGuides = guides.filter((g) => {
      const gSlug = g.slug.toLowerCase();
      const gTitle = g.title.toLowerCase();
      return record.normalizedAliases.some((a) => gSlug.includes(a) || gTitle.includes(a));
    });

    return {
      record,
      slug,
      publicUrl,
      isIndexable,
      productCount: matchedProds.length,
      guideCount: matchedGuides.length,
      products: matchedProds,
      guides: matchedGuides,
    };
  });

  // Run Search Cannibalization Scan on Core Keywords
  const sampleQueries = [
    { query: 'henna powder', destinationUrl: '/categories/henna', intent: 'CATEGORY' as const, entityKey: 'HENNA_MEHNDI' },
    { query: 'pure henna powder', destinationUrl: '/categories/henna', intent: 'CATEGORY' as const, entityKey: 'HENNA_MEHNDI' },
    { query: 'mehndi cones', destinationUrl: '/categories/henna', intent: 'CATEGORY' as const, entityKey: 'HENNA_MEHNDI' },
    { query: 'sojat henna', destinationUrl: '/sojat-henna', intent: 'LOCAL' as const, entityKey: 'HENNA_MEHNDI' },
    { query: 'henna wholesale', destinationUrl: '/wholesale', intent: 'WHOLESALE' as const, entityKey: 'HENNA_MEHNDI' },
    { query: 'amla powder', destinationUrl: '/categories/hair-care', intent: 'CATEGORY' as const, entityKey: 'AMLA' },
  ];

  const cannibalizationWarnings = detectSearchCannibalization(sampleQueries);

  const { totalEntities, publicIndexableCount, needsReviewCount } = getAuthoritativeEntityCounts();

  return (
    <AdminLayout title="Organic Search Health & Entity Diagnostics">
      <div className="space-y-6">
        {/* Header Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Canonical Entities
              </span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-neutral-900">{totalEntities}</p>
            <p className="mt-1 text-xs text-neutral-500">Total defined in registry</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Indexable Knowledge
              </span>
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-blue-700">{publicIndexableCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Public canonical pages</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Needs Review / Unmapped
              </span>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-amber-700">{needsReviewCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Protected from indexing</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Cannibalization Alerts
              </span>
              <Radio className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {cannibalizationWarnings.length}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Intent collisions resolved</p>
          </div>
        </div>

        {/* Cannibalization Notice */}
        {cannibalizationWarnings.length > 0 && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50/60 p-5">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-blue-600" />
              Search Cannibalization Intent Governance
            </h3>
            <div className="mt-2 space-y-2">
              {cannibalizationWarnings.map((w, idx) => (
                <div key={idx} className="text-xs text-blue-900 bg-white/80 rounded-lg p-3 border border-blue-100">
                  <span className="font-bold uppercase tracking-wider text-blue-700 mr-2">[{w.intent}]</span>
                  {w.warningMessage}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Entity Health Table */}
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xs">
          <div className="border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900">Canonical Entity Search Health</h2>
              <p className="text-xs text-neutral-500">
                Deterministic destination mapping, indexability status, and coverage metrics.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-600 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Canonical Entity</th>
                  <th className="px-4 py-3">Public Destination</th>
                  <th className="px-4 py-3">Scopes</th>
                  <th className="px-4 py-3 text-center">Products</th>
                  <th className="px-4 py-3 text-center">Guides</th>
                  <th className="px-4 py-3">Indexability</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {entityHealthList.map((item) => (
                  <tr key={item.record.entityKey} className="hover:bg-neutral-50/50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-neutral-900">{item.record.canonicalName}</div>
                      {item.record.scientificName && (
                        <div className="text-[11px] italic text-neutral-500">
                          {item.record.scientificName}
                        </div>
                      )}
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                        {item.record.entityKey}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      {item.publicUrl ? (
                        <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          {item.publicUrl}
                        </span>
                      ) : (
                        <span className="text-neutral-400 italic">None (Unmapped)</span>
                      )}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {item.record.supportedScopes.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-700"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-neutral-900">
                      {item.productCount}
                    </td>

                    <td className="px-4 py-4 text-center font-bold text-neutral-900">
                      {item.guideCount}
                    </td>

                    <td className="px-4 py-4">
                      {item.isIndexable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckCircle2 className="h-3 w-3" />
                          Indexable
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                          <AlertTriangle className="h-3 w-3" />
                          Noindex / Needs Review
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      {item.publicUrl && item.isIndexable && (
                        <Link
                          href={item.publicUrl}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold"
                        >
                          View Page <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
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

