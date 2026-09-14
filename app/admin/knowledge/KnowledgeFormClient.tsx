'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { KnowledgeEntity, KnowledgeDatabaseStatus } from '@/lib/db/knowledge';
import {
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Archive,
  ExternalLink,
  Leaf,
  Globe,
  Tag,
  BookOpen,
  Info,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';

interface KnowledgeFormClientProps {
  initialEntity?: KnowledgeEntity;
  isNew?: boolean;
}

const SCOPE_OPTIONS = ['HAIR', 'BEARD', 'BODY', 'FACE', 'BODY_ART'];
const PRODUCT_FAMILIES = [
  'BOTANICAL_SINGLE',
  'BOTANICAL_BLEND',
  'ESSENTIAL_OIL_SINGLE',
  'CARRIER_OIL',
];
const ENTITY_CLASSES = [
  'BOTANICAL_SINGLE',
  'BOTANICAL_BLEND',
  'OIL_SINGLE',
  'MINERAL_CLAY',
];

export default function KnowledgeFormClient({
  initialEntity,
  isNew = false,
}: KnowledgeFormClientProps) {
  const router = useRouter();

  const isUnknown = initialEntity?.entityKey === 'UNKNOWN';

  // Form State
  const [canonicalName, setCanonicalName] = useState(initialEntity?.canonicalName || '');
  const [entityKey, setEntityKey] = useState(initialEntity?.entityKey || '');
  const [slug, setSlug] = useState(initialEntity?.slug || '');
  const [scientificName, setScientificName] = useState(initialEntity?.scientificName || '');
  const [botanicalFamily, setBotanicalFamily] = useState(initialEntity?.botanicalFamily || '');
  const [productFamily, setProductFamily] = useState(initialEntity?.productFamily || 'BOTANICAL_SINGLE');
  const [entityClass, setEntityClass] = useState(initialEntity?.entityClass || 'BOTANICAL_SINGLE');
  const [sortOrder, setSortOrder] = useState<number>(initialEntity?.sortOrder ?? 100);

  const [aliases, setAliases] = useState<string>(
    initialEntity?.aliases?.join(', ') || ''
  );
  const [redirectSlugs, setRedirectSlugs] = useState<string>(
    initialEntity?.redirectSlugs?.join(', ') || ''
  );
  const [supportedScopes, setSupportedScopes] = useState<string[]>(
    initialEntity?.supportedScopes || ['HAIR']
  );

  const [safeUseCases, setSafeUseCases] = useState<string>(
    initialEntity?.safeUseCases?.join('\n') || ''
  );
  const [compatibleAttributes, setCompatibleAttributes] = useState<string>(
    initialEntity?.compatibleAttributes?.join(', ') || ''
  );
  const [relatedEntities, setRelatedEntities] = useState<string>(
    initialEntity?.relatedEntities?.join(', ') || ''
  );
  const [guideFamilies, setGuideFamilies] = useState<string>(
    initialEntity?.guideFamilies?.join(', ') || ''
  );

  const [description, setDescription] = useState(initialEntity?.description || '');
  const [seoTitle, setSeoTitle] = useState(initialEntity?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(initialEntity?.seoDescription || '');
  const [ogImageUrl, setOgImageUrl] = useState(initialEntity?.ogImageUrl || '');
  const [robotsIndex, setRobotsIndex] = useState<boolean>(initialEntity?.robotsIndex ?? true);
  const [robotsFollow, setRobotsFollow] = useState<boolean>(initialEntity?.robotsFollow ?? true);

  // Status & Publishing
  const [status, setStatus] = useState<KnowledgeDatabaseStatus>(
    initialEntity?.dbStatus || 'draft'
  );
  const [published, setPublished] = useState<boolean>(
    initialEntity?.published ?? false
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);

  // Auto-generate slug when typing canonical name if new
  const handleNameChange = (val: string) => {
    setCanonicalName(val);
    if (isNew && !slug) {
      const autoSlug = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(autoSlug);
    }
  };

  // Status change handler syncing published boolean
  const handleStatusChange = (newStatus: KnowledgeDatabaseStatus) => {
    if (isUnknown && newStatus === 'published') return;
    setStatus(newStatus);
    if (newStatus === 'published') {
      setPublished(true);
    } else {
      setPublished(false);
    }
  };

  // Published toggle syncing status
  const handlePublishedToggle = (isPub: boolean) => {
    if (isUnknown && isPub) return;
    setPublished(isPub);
    if (isPub) {
      setStatus('published');
    } else if (status === 'published') {
      setStatus('draft');
    }
  };

  // Scope toggle
  const toggleScope = (sc: string) => {
    setSupportedScopes((prev) =>
      prev.includes(sc) ? prev.filter((item) => item !== sc) : [...prev, sc]
    );
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSaving(true);

    try {
      // Parse list fields
      const parsedAliases = aliases
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const parsedRedirects = redirectSlugs
        .split(',')
        .map((s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))
        .filter(Boolean);

      const parsedSafeUseCases = safeUseCases
        .split(/\r?\n|,/)
        .map((s) => s.trim())
        .filter(Boolean);

      const parsedAttributes = compatibleAttributes
        .split(',')
        .map((s) => s.toLowerCase().trim())
        .filter(Boolean);

      const parsedRelatedKeys = relatedEntities
        .split(',')
        .map((s) => s.toUpperCase().trim())
        .filter(Boolean);

      const parsedGuideFamilies = guideFamilies
        .split(',')
        .map((s) => s.toUpperCase().trim())
        .filter(Boolean);

      const payload: any = {
        canonicalName: canonicalName.trim(),
        scientificName: scientificName.trim() || undefined,
        botanicalFamily: botanicalFamily.trim() || undefined,
        productFamily,
        entityClass,
        slug: slug.toLowerCase().trim(),
        sortOrder: Number(sortOrder) || 100,
        aliases: parsedAliases,
        redirectSlugs: parsedRedirects,
        supportedScopes,
        safeUseCases: parsedSafeUseCases,
        compatibleAttributes: parsedAttributes,
        relatedEntities: parsedRelatedKeys,
        guideFamilies: parsedGuideFamilies,
        description: description.trim(),
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        ogImageUrl: ogImageUrl.trim() || undefined,
        robotsIndex,
        robotsFollow,
        status,
        published,
      };

      if (isNew) {
        payload.entityKey = entityKey.toUpperCase().trim();
      }

      const url = isNew ? '/api/admin/knowledge' : `/api/admin/knowledge/${initialEntity!.id}`;
      const method = isNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(
          isNew
            ? `Botanical entity "${canonicalName}" created successfully!`
            : `Botanical entity "${canonicalName}" updated successfully!`
        );

        if (isNew && data.entity?.id) {
          setTimeout(() => {
            router.push(`/admin/knowledge/${data.entity.id}`);
          }, 1200);
        } else {
          router.refresh();
        }
      } else {
        setErrorMessage(data.error || 'Failed to save botanical entity.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setIsSaving(false);
    }
  };

  // Archive handler
  const handleArchive = async () => {
    if (!initialEntity || isUnknown) return;
    setIsArchiving(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/knowledge/${initialEntity.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(`Entity "${canonicalName}" was archived successfully.`);
        setStatus('archived');
        setPublished(false);
        setShowArchiveConfirm(false);
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to archive entity.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error archiving entity.');
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl pb-16">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/knowledge"
            className="p-2 rounded-xl text-gray-500 hover:text-[#0f2d22] hover:bg-gray-100 transition-colors"
            title="Back to Knowledge Entities"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#0f2d22]">
                {isNew ? 'Create Botanical Entity' : canonicalName || 'Edit Botanical Entity'}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  status === 'published' && published
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : status === 'needs_review'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : status === 'archived'
                    ? 'bg-gray-100 text-gray-600 border-gray-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {status.toUpperCase()}
              </span>
            </div>
            {!isNew && (
              <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                Key: {entityKey} &bull; ID: {initialEntity?.id}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {!isNew && published && !isUnknown && (
            <Link
              href={`/knowledge/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs text-[#1b4332] bg-[#1b4332]/5 hover:bg-[#1b4332]/10 px-3 py-2 rounded-xl font-bold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Public Route</span>
            </Link>
          )}

          {!isNew && !isUnknown && status !== 'archived' && (
            <button
              type="button"
              onClick={() => setShowArchiveConfirm(true)}
              className="inline-flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 px-3 py-2 rounded-xl font-bold transition-colors"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white px-5 py-2 rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{isNew ? 'Create Entity' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-rose-50 text-rose-900 border border-rose-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-gray-500 hover:text-gray-800"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-gray-500 hover:text-gray-800"
          >
            &times;
          </button>
        </div>
      )}

      {/* Card 1: Core Botanical Identity */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
          <Leaf className="w-4 h-4 text-[#1b4332]" />
          <h2 className="text-sm font-bold text-[#0f2d22]">Core Botanical Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Canonical Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Canonical Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={canonicalName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Henna (Mehndi), Indigo, Senna"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              The primary display name presented across the platform and storefront.
            </p>
          </div>

          {/* Entity Key (Immutable) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Entity Key <span className="text-rose-500">*</span>
              {!isNew && (
                <span className="ml-2 text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  Immutable
                </span>
              )}
            </label>
            <input
              type="text"
              required
              disabled={!isNew}
              value={entityKey}
              onChange={(e) => setEntityKey(e.target.value.toUpperCase())}
              placeholder="e.g. HENNA_MEHNDI, INDIGO, SENNA"
              className={`w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#e8e2d5] bg-[#fcfbf9] ${
                !isNew ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'focus:border-[#1b4332]'
              }`}
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Uppercase identifier used for relational links in `public.entity_relationships`.
            </p>
          </div>

          {/* URL Slug */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center">
              <span className="px-2.5 py-2 text-xs text-gray-500 bg-gray-100 border border-r-0 border-[#e8e2d5] rounded-l-xl">
                /knowledge/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="e.g. henna-mehndi"
                className="w-full px-3 py-2 text-xs font-mono rounded-r-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>
            {!isNew && initialEntity && initialEntity.slug !== slug && (
              <p className="text-[10px] text-amber-700 mt-1 flex items-center gap-1 font-medium">
                <Info className="w-3 h-3" />
                Changing slug preserves previous &ldquo;{initialEntity.slug}&rdquo; as an automatic 308 redirect.
              </p>
            )}
          </div>

          {/* Scientific Name */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Scientific Name (Botanical Binomial)
            </label>
            <input
              type="text"
              value={scientificName}
              onChange={(e) => setScientificName(e.target.value)}
              placeholder="e.g. Lawsonia inermis, Indigofera tinctoria"
              className="w-full px-3 py-2 text-xs italic rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
          </div>

          {/* Botanical Family */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Botanical Family
            </label>
            <input
              type="text"
              value={botanicalFamily}
              onChange={(e) => setBotanicalFamily(e.target.value)}
              placeholder="e.g. Lythraceae, Fabaceae, Phyllanthaceae"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Catalog Sort Order
            </label>
            <input
              type="number"
              min={1}
              value={sortOrder}
              onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 100)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
          </div>

          {/* Product Family */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Product Family Contract
            </label>
            <select
              value={productFamily}
              onChange={(e) => setProductFamily(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] bg-[#fcfbf9] focus:border-[#1b4332]"
            >
              {PRODUCT_FAMILIES.map((fam) => (
                <option key={fam} value={fam}>
                  {fam}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Class */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Entity Classification
            </label>
            <select
              value={entityClass}
              onChange={(e) => setEntityClass(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] bg-[#fcfbf9] focus:border-[#1b4332]"
            >
              {ENTITY_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Card 2: Aliases, Search & Redirects */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
          <Tag className="w-4 h-4 text-[#1b4332]" />
          <h2 className="text-sm font-bold text-[#0f2d22]">Aliases, Search & Redirects</h2>
        </div>

        <div className="space-y-4">
          {/* Aliases */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Natural Aliases (Comma-separated)
            </label>
            <input
              type="text"
              value={aliases}
              onChange={(e) => setAliases(e.target.value)}
              placeholder="e.g. Henna, Mehndi, Mehendi, Heena, Lawsonia inermis"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Search engine normalization automatically generates clean lowercase search representations.
            </p>
          </div>

          {/* Redirect Slugs */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Redirect Slugs (Comma-separated aliases redirecting 308 to canonical URL)
            </label>
            <input
              type="text"
              value={redirectSlugs}
              onChange={(e) => setRedirectSlugs(e.target.value)}
              placeholder="e.g. henna, mehndi, sojat-henna, rajasthani-henna"
              className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
            <p className="text-[10px] text-gray-500 mt-1">
              Requests to `/knowledge/[alias]` will automatically issue a clean HTTP 308 redirect to this entity&apos;s canonical slug.
            </p>
          </div>

          {/* Supported Scopes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">
              Supported Application Scopes
            </label>
            <div className="flex flex-wrap gap-3">
              {SCOPE_OPTIONS.map((sc) => (
                <label
                  key={sc}
                  className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={supportedScopes.includes(sc)}
                    onChange={() => toggleScope(sc)}
                    className="rounded border-[#e8e2d5] text-[#1b4332] focus:ring-[#1b4332]"
                  />
                  <span>{sc}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Taxonomy & Relations */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
          <BookOpen className="w-4 h-4 text-[#1b4332]" />
          <h2 className="text-sm font-bold text-[#0f2d22]">Botanical Monograph & Relations</h2>
        </div>

        <div className="space-y-4">
          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Botanical Monograph / Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Comprehensive botanical description, verified origin, harvest timing, and traditional Ayurvedic use cases..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Safe Use Cases */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Safe Use Cases (One per line or comma-separated)
              </label>
              <textarea
                rows={3}
                value={safeUseCases}
                onChange={(e) => setSafeUseCases(e.target.value)}
                placeholder="hair_conditioning&#10;natural_shine&#10;cooling_scalp_pack"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>

            {/* Compatible Attributes */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Compatible Attributes (Comma-separated)
              </label>
              <textarea
                rows={3}
                value={compatibleAttributes}
                onChange={(e) => setCompatibleAttributes(e.target.value)}
                placeholder="organic, pure, chemical_free, triple_sifted, micro_fine, high_lawsone"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>

            {/* Related Entity Keys */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Related Entity Keys (Comma-separated)
              </label>
              <input
                type="text"
                value={relatedEntities}
                onChange={(e) => setRelatedEntities(e.target.value)}
                placeholder="INDIGO, AMLA, BHRINGRAJ, SHIKAKAI"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>

            {/* Guide Families */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Guide Families (Comma-separated)
              </label>
              <input
                type="text"
                value={guideFamilies}
                onChange={(e) => setGuideFamilies(e.target.value)}
                placeholder="PRODUCT_OVERVIEW, HOW_TO_USE, WHAT_IS_IT, BUYING_GUIDE"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 4: SEO & Metadata */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
          <Globe className="w-4 h-4 text-[#1b4332]" />
          <h2 className="text-sm font-bold text-[#0f2d22]">SEO & Search Engine Indexing</h2>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* SEO Title */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                SEO Meta Title
              </label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Title defaults to canonical template if left blank"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>

            {/* OG Image URL */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Social Share Image (OG Image URL)
              </label>
              <input
                type="text"
                value={ogImageUrl}
                onChange={(e) => setOgImageUrl(e.target.value)}
                placeholder="https://muskydose.com/og/henna.jpg"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
              />
            </div>
          </div>

          {/* SEO Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              SEO Meta Description
            </label>
            <textarea
              rows={2}
              value={seoDescription}
              onChange={(e) => setSeoDescription(e.target.value)}
              placeholder="Description defaults to botanical description if left blank"
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] focus:outline-hidden focus:border-[#1b4332] bg-[#fcfbf9]"
            />
          </div>

          {/* Robots Index / Follow */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={robotsIndex}
                onChange={(e) => setRobotsIndex(e.target.checked)}
                className="rounded border-[#e8e2d5] text-[#1b4332] focus:ring-[#1b4332]"
              />
              <span>Robots Index (Indexable by search engines)</span>
            </label>

            <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={robotsFollow}
                onChange={(e) => setRobotsFollow(e.target.checked)}
                className="rounded border-[#e8e2d5] text-[#1b4332] focus:ring-[#1b4332]"
              />
              <span>Robots Follow (Follow outbound links)</span>
            </label>
          </div>
        </div>
      </div>

      {/* Card 5: Publishing & Lifecycle Controls */}
      <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#e8e2d5] pb-3">
          <CheckCircle className="w-4 h-4 text-[#1b4332]" />
          <h2 className="text-sm font-bold text-[#0f2d22]">Publishing & Lifecycle Controls</h2>
        </div>

        {isUnknown && (
          <div className="p-3.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Governance Sentinel:</strong> The &ldquo;UNKNOWN&rdquo; entity is a system fallback and cannot be published or deleted.
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Database Lifecycle Status
            </label>
            <select
              value={status}
              disabled={isUnknown}
              onChange={(e) => handleStatusChange(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-[#e8e2d5] bg-[#fcfbf9] focus:border-[#1b4332] disabled:opacity-50"
            >
              <option value="draft">Draft (Private in CMS)</option>
              <option value="published">Published (Public on Storefront)</option>
              <option value="needs_review">Needs Review (Pending Verification)</option>
              <option value="archived">Archived (Soft Deleted)</option>
            </select>
          </div>

          <div className="flex flex-col justify-center">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                disabled={isUnknown}
                checked={published}
                onChange={(e) => handlePublishedToggle(e.target.checked)}
                className="rounded border-[#e8e2d5] text-[#1b4332] focus:ring-[#1b4332] disabled:opacity-50"
              />
              <span>Public Storefront Visibility (`published = true`)</span>
            </label>
            <p className="text-[10px] text-gray-500 mt-1">
              Public accessibility strictly requires both `status = published` and `published = true`.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="flex items-center justify-between pt-2">
        <Link
          href="/admin/knowledge"
          className="text-xs text-gray-500 hover:text-gray-800 font-bold"
        >
          &larr; Return to Knowledge List
        </Link>

        <button
          type="submit"
          disabled={isSaving}
          className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{isNew ? 'Create Botanical Entity' : 'Save Changes'}</span>
            </>
          )}
        </button>
      </div>

      {/* Archive Modal */}
      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#e8e2d5] shadow-xl">
            <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
              <Archive className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-[#0f2d22]">Archive Botanical Entity?</h3>
            <p className="text-xs text-gray-600 mt-2">
              Are you sure you want to archive &ldquo;{canonicalName}&rdquo;?
            </p>
            <div className="bg-[#fcfbf9] border border-[#e8e2d5] rounded-xl p-3 my-3 text-[11px] text-gray-600 space-y-1">
              <div>&bull; Soft delete: Status will change to <span className="font-bold">archived</span>.</div>
              <div>&bull; Public visibility: Removed from public storefront immediately.</div>
              <div>&bull; Preserved history: The database record remains intact for relational integrity.</div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleArchive}
                disabled={isArchiving}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isArchiving ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Archiving...</span>
                  </>
                ) : (
                  <span>Confirm Archive</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

