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
import { getMerchantFeedHealthSummary } from '@/lib/growth/merchant-feed';
import { buildHennaSearchCluster } from '@/lib/growth/seo-demand-engine';
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
  Clock,
  ListChecks,
  Lock,
  Store,
  FileCode,
  Info,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Organic Search Health & Google Growth Loop | Musky Admin',
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

  // Merchant Center Health
  const merchantSummary = getMerchantFeedHealthSummary(products);

  // Henna Search Cluster (Real GSC data check)
  const hennaCluster = buildHennaSearchCluster([]);

  // Google Indexation Checklist Items
  const indexationChecklist = [
    {
      id: 'ownership',
      title: 'Google Search Console Domain Ownership Verification',
      status: 'PENDING_OWNER',
      details: 'Add DNS TXT verification record at your domain registrar for muskydose.in, or upload Google HTML verification tag.',
      docsUrl: 'https://support.google.com/webmasters/answer/9008080',
    },
    {
      id: 'sitemap',
      title: 'Submit XML Sitemap to Search Console',
      status: 'READY_TO_SUBMIT',
      details: 'Universal Sitemap is live at https://muskydose.in/sitemap.xml containing all active products, guides, and category hubs.',
      endpoint: '/sitemap.xml',
    },
    {
      id: 'pillars',
      title: 'URL Inspection for Core Architectural Pillars',
      status: 'READY_FOR_INSPECTION',
      details: 'Request indexing for Homepage (/), Products (/products), Henna Hub (/categories/henna), Knowledge Graph (/knowledge/henna-mehndi), Sojat Heritage (/sojat-henna), and Wholesale (/wholesale).',
    },
    {
      id: 'merchant',
      title: 'Google Merchant Center Free Listings XML Feed',
      status: 'LIVE_FEED_AVAILABLE',
      details: 'Automated XML feed ready at /api/feeds/google-merchant.xml with strictly INR pricing and direct botanical agricultural identifier_exists: no.',
      endpoint: '/api/feeds/google-merchant.xml',
    },
  ];

  return (
    <AdminLayout title="Organic Search Health & Google Growth Loop">
      <div className="space-y-6">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Canonical Entities
              </span>
              <Layers className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-neutral-900">{totalEntities}</p>
            <p className="mt-1 text-xs text-neutral-500">Authoritative registry items</p>
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
                Merchant Feed Ready
              </span>
              <Store className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">{merchantSummary.feedReadyCount}</p>
            <p className="mt-1 text-xs text-neutral-500">Of {merchantSummary.totalProducts} active products</p>
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
                Cannibalization Guards
              </span>
              <Radio className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-3xl font-extrabold text-emerald-700">
              {cannibalizationWarnings.length}
            </p>
            <p className="mt-1 text-xs text-neutral-500">Intent collisions resolved</p>
          </div>
        </div>

        {/* SECTION 1: Google Search Console Status Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <Search className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-bold text-neutral-900">Google Search Console Integration</h2>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Real search performance analytics directly from Google. Zero fabricated or simulated traffic metrics.
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 border border-amber-200 text-xs font-semibold text-amber-800">
              <Clock className="h-3.5 w-3.5" />
              Waiting for Google Search Console data
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Total Queries</p>
              <p className="text-2xl font-bold text-neutral-700 mt-1">0</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Awaiting live crawl</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Search Impressions</p>
              <p className="text-2xl font-bold text-neutral-700 mt-1">0</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Real Google data only</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Organic Clicks</p>
              <p className="text-2xl font-bold text-neutral-700 mt-1">0</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">Verified visits</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Average Position</p>
              <p className="text-2xl font-bold text-neutral-700 mt-1">—</p>
              <p className="text-[11px] text-neutral-400 mt-0.5">DATA_NOT_AVAILABLE</p>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-blue-50/70 p-4 border border-blue-100 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 leading-relaxed">
              <strong>Strict Real-Data Governance:</strong> Musky Dose enforces deterministic search scoring. When Search Console data has not yet been synced from Google, opportunity detection displays <em>&quot;Waiting for Google Search Console data&quot;</em> and returns status <code>DATA_NOT_AVAILABLE</code> rather than synthesizing hypothetical rankings or impressions.
            </div>
          </div>
        </div>

        {/* SECTION 2: Google Indexation Readiness Checklist */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
            <ListChecks className="h-5 w-5 text-emerald-600" />
            <div>
              <h2 className="text-lg font-bold text-neutral-900">Google Indexation &amp; Launch Checklist</h2>
              <p className="text-xs text-neutral-500">
                Actionable roadmap for the site administrator to initiate and verify Google crawl coverage.
              </p>
            </div>
          </div>

          <div className="mt-4 divide-y divide-neutral-100">
            {indexationChecklist.map((item, idx) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-bold text-neutral-700">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900">{item.title}</span>
                  </div>
                  <p className="text-xs text-neutral-600 pl-7">{item.details}</p>
                </div>
                <div className="pl-7 sm:pl-0 flex items-center gap-2 shrink-0">
                  {item.endpoint && (
                    <Link
                      href={item.endpoint}
                      target="_blank"
                      className="inline-flex items-center gap-1 rounded-lg bg-neutral-100 px-2.5 py-1 text-xs font-mono font-medium text-neutral-700 hover:bg-neutral-200"
                    >
                      {item.endpoint} <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {item.docsUrl && (
                    <Link
                      href={item.docsUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      Google Docs <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 3: Google Merchant Center Feed Health */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-4">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-emerald-600" />
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Google Merchant Center Feed Generator</h2>
                <p className="text-xs text-neutral-500">
                  Free Listings product XML &amp; JSON feeds strictly compliant with Google policies for India.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/api/feeds/google-merchant.xml"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              >
                <FileCode className="h-3.5 w-3.5" /> View XML Feed
              </Link>
              <Link
                href="/api/feeds/google-merchant"
                target="_blank"
                className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-800 hover:bg-neutral-200"
              >
                View JSON
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Active Products</p>
              <p className="text-xl font-bold text-neutral-900 mt-1">{merchantSummary.totalProducts}</p>
            </div>
            <div className="rounded-xl bg-emerald-50/50 p-4 border border-emerald-100">
              <p className="text-xs text-emerald-700">FEED_READY</p>
              <p className="text-xl font-bold text-emerald-800 mt-1">{merchantSummary.feedReadyCount}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Needs Review</p>
              <p className="text-xl font-bold text-neutral-700 mt-1">{merchantSummary.needsReviewCount}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-100">
              <p className="text-xs text-neutral-500">Missing Images / Price</p>
              <p className="text-xl font-bold text-neutral-700 mt-1">
                {merchantSummary.missingImageCount + merchantSummary.missingPriceCount}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-xs text-neutral-600 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-neutral-800">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              Feed Compliance &amp; Policy Protections:
            </div>
            <p>• Currency strictly formatted in Indian Rupees (<code>INR</code>) with 2 decimal precision.</p>
            <p>• Direct agricultural botanicals without commercial barcodes strictly provide <code>&lt;g:identifier_exists&gt;no&lt;/g:identifier_exists&gt;</code>.</p>
            <p>• Products with fallback SVG placeholders or missing descriptions are omitted from the live XML feed to protect Google account standing.</p>
          </div>
        </div>

        {/* SECTION 4: Recommendation Lifecycle & Manual SEO Lock Notice */}
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2 border-b border-neutral-100 pb-4">
            <Lock className="h-5 w-5 text-amber-600" />
            <div>
              <h2 className="text-lg font-bold text-neutral-900">SEO Recommendation Lifecycle &amp; Safeguards</h2>
              <p className="text-xs text-neutral-500">
                Deterministic suggestions operate through a strictly auditable state machine.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">NEW</span>
              <p className="text-xs text-neutral-600 mt-1">Detected from real GSC signals</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">REVIEWED</span>
              <p className="text-xs text-neutral-600 mt-1">Inspected by administrator</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">IMPLEMENTED</span>
              <p className="text-xs text-neutral-600 mt-1">Safely applied to content</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">DISMISSED</span>
              <p className="text-xs text-neutral-600 mt-1">Archived without changes</p>
            </div>
          </div>

          <div className="mt-4 text-xs text-neutral-600 bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
            <strong>Manual / Locked SEO Protection:</strong> Any product or guide marked with manual SEO overrides (<code>isManualSeoLocked: true</code>) is immune to automated overwrite. Recommendations for locked assets will suggest copy for manual review and will never silently mutate published metadata.
          </div>
        </div>

        {/* SECTION 5: Cannibalization Notice */}
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

        {/* SECTION 6: Canonical Entity Search Health Table */}
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
