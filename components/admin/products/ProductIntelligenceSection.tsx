'use client';

import React, { useState } from 'react';
import {
  ProductIntelligenceMetadata,
} from '@/lib/types';
import {
  IntelligenceStatus,
  ProductScope,
  VerifiedAttributeSlug,
  AttributeVerificationSource,
  VerifiedAttribute,
} from '@/lib/growth/universal-product-contract';
import {
  CANONICAL_ENTITIES,
  ALLOWED_SCOPES,
  VERIFIED_ATTRIBUTE_SPECS,
  validateProductIntelligence,
} from '@/lib/growth/intelligence-validator';
import {
  ShieldCheck,
  AlertTriangle,
  Lock,
  Compass,
  CheckCircle2,
  Plus,
  Trash2,
  HelpCircle,
  Sparkles,
  Info,
  Check,
} from 'lucide-react';

interface ProductIntelligenceSectionProps {
  intelligence: ProductIntelligenceMetadata;
  onChange: (updated: ProductIntelligenceMetadata) => void;
  productName: string;
  isLocked?: boolean;
}

export default function ProductIntelligenceSection({
  intelligence,
  onChange,
  productName,
  isLocked: externalLocked = false,
}: ProductIntelligenceSectionProps) {
  const [selectedAttrToAdd, setSelectedAttrToAdd] = useState<VerifiedAttributeSlug>('pure');

  const isLocked = externalLocked || intelligence.status === 'LOCKED';
  const validation = validateProductIntelligence(intelligence);
  const currentEntity = CANONICAL_ENTITIES[intelligence.entityKey] || CANONICAL_ENTITIES.UNKNOWN;

  const handleStatusChange = (newStatus: IntelligenceStatus) => {
    onChange({
      ...intelligence,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleEntityChange = (newKey: string) => {
    const entityDef = CANONICAL_ENTITIES[newKey] || CANONICAL_ENTITIES.UNKNOWN;
    const shouldReview = newKey === 'UNKNOWN';
    onChange({
      ...intelligence,
      entityKey: newKey,
      family: entityDef.family,
      scopes: intelligence.scopes.length > 0 ? intelligence.scopes : entityDef.defaultScopes,
      status: shouldReview ? 'NEEDS_REVIEW' : intelligence.status,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleToggleScope = (scope: ProductScope) => {
    if (isLocked) return;
    const current = intelligence.scopes || [];
    let updated: ProductScope[];
    if (current.includes(scope)) {
      if (current.length === 1) return; // Must have at least 1 scope
      updated = current.filter((s) => s !== scope);
    } else {
      updated = [...current, scope];
    }
    onChange({
      ...intelligence,
      scopes: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddAttribute = () => {
    if (isLocked) return;
    const exists = intelligence.verifiedAttributes.some((a) => a.slug === selectedAttrToAdd);
    if (exists) return;

    const spec = VERIFIED_ATTRIBUTE_SPECS[selectedAttrToAdd];
    if (!spec) return;

    const defaultSource: AttributeVerificationSource = spec.allowedSources[0] || 'ADMIN_EXPLICIT';

    const newAttr: VerifiedAttribute = {
      id: `attr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      slug: selectedAttrToAdd,
      displayName: spec.displayName,
      category: spec.category,
      verificationSource: defaultSource,
      verifiedAt: new Date().toISOString(),
      allowInSeoTitle: selectedAttrToAdd !== 'organic' && selectedAttrToAdd !== 'lab-tested',
    };

    onChange({
      ...intelligence,
      verifiedAttributes: [...intelligence.verifiedAttributes, newAttr],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRemoveAttribute = (id: string) => {
    if (isLocked) return;
    onChange({
      ...intelligence,
      verifiedAttributes: intelligence.verifiedAttributes.filter((a) => a.id !== id),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateAttribute = (
    id: string,
    updates: Partial<VerifiedAttribute>
  ) => {
    if (isLocked) return;
    onChange({
      ...intelligence,
      verifiedAttributes: intelligence.verifiedAttributes.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
      updatedAt: new Date().toISOString(),
    });
  };

  const activeAttrSlugs = new Set(intelligence.verifiedAttributes.map((a) => a.slug));
  const availableAttrsToAdd = Object.values(VERIFIED_ATTRIBUTE_SPECS).filter(
    (spec) => !activeAttrSlugs.has(spec.slug)
  );

  return (
    <div className="space-y-6 text-[#0f2d22]">
      {/* 1. Header & Governance State Selector */}
      <div className="bg-white border border-[#e8e2d5] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#1b4332]" />
              <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-[#0f2d22]">
                Product Intelligence &amp; Knowledge Controls
              </h3>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Governs canonical entity classification, safe application scopes, and verified quality claims.
            </p>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Governance:</span>
            <div className="inline-flex rounded-lg border border-[#e8e2d5] p-0.5 bg-[#f5f1e8] text-xs font-bold">
              {(['AUTO', 'MANUAL', 'LOCKED', 'NEEDS_REVIEW'] as IntelligenceStatus[]).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleStatusChange(st)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    intelligence.status === st
                      ? st === 'NEEDS_REVIEW'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : st === 'LOCKED'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : st === 'MANUAL'
                        ? 'bg-[#1b4332] text-white shadow-xs'
                        : 'bg-[#C5A059] text-[#1b4332] shadow-xs'
                      : 'text-slate-600 hover:text-[#0f2d22]'
                  }`}
                >
                  {st === 'NEEDS_REVIEW' ? 'REVIEW' : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Prominent Banners */}
        {intelligence.status === 'NEEDS_REVIEW' && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3.5 flex items-start gap-3 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-amber-950">Classification Needs Review</p>
              <p className="text-amber-800">
                Product classification needs review before advanced SEO, guides, and public knowledge claims are generated. Basic selling remains functional, but automated intelligence claims are restricted.
              </p>
            </div>
          </div>
        )}

        {isLocked && (
          <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 flex items-start gap-3 text-slate-800">
            <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-900">Intelligence Settings Locked</p>
              <p className="text-slate-700">
                These settings are locked against routine overwrites. Switch status to <strong>MANUAL</strong> to modify entity, scopes, or verified attributes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Canonical Entity Selection */}
      <div className="bg-white border border-[#e8e2d5] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0f2d22] mb-1">
            Canonical Botanical / Product Entity
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Grounds this product in a verified canonical knowledge entity. Prevents spelling variants (Henna vs Mehndi) from fragmenting knowledge.
          </p>

          <select
            value={intelligence.entityKey}
            onChange={(e) => handleEntityChange(e.target.value)}
            disabled={isLocked}
            className="w-full bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg px-3.5 py-2.5 text-xs font-medium text-[#0f2d22] focus:outline-hidden focus:ring-1 focus:ring-[#1b4332] disabled:opacity-60"
          >
            {Object.values(CANONICAL_ENTITIES).map((entity) => (
              <option key={entity.key} value={entity.key}>
                {entity.displayName} {entity.scientificName ? `(${entity.scientificName})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Entity Context Card */}
        <div className="bg-[#FAF8F5] border border-[#e8e2d5]/60 rounded-lg p-3.5 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-[#1b4332]">{currentEntity.displayName}</span>
            {currentEntity.scientificName && (
              <span className="italic text-slate-600 font-serif">
                {currentEntity.scientificName}
              </span>
            )}
            <span className="bg-white border border-[#e8e2d5] px-2 py-0.5 rounded-sm text-[10px] font-semibold text-slate-600">
              Family: {currentEntity.family}
            </span>
          </div>

          <p className="text-slate-600 leading-relaxed">{currentEntity.description}</p>

          {currentEntity.aliases.length > 0 && (
            <div className="pt-2 border-t border-[#e8e2d5]/50 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Known Aliases:</span>
              {currentEntity.aliases.map((alias) => (
                <span
                  key={alias}
                  className="bg-white border border-slate-200 text-slate-700 text-[10px] px-1.5 py-0.5 rounded-sm"
                >
                  {alias}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Product Scopes Multi-Select */}
      <div className="bg-white border border-[#e8e2d5] rounded-xl p-4 sm:p-5 shadow-xs space-y-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-[#0f2d22] mb-1">
            Permitted Application Scopes
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Defines which cosmetic, body art, or formulation categories are legitimate for this product. Prevents cross-category pollution.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALLOWED_SCOPES.map((scope) => {
            const isSelected = intelligence.scopes.includes(scope);
            return (
              <button
                key={scope}
                type="button"
                onClick={() => handleToggleScope(scope)}
                disabled={isLocked}
                className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-bold transition-all text-left cursor-pointer disabled:opacity-60 ${
                  isSelected
                    ? 'bg-[#1b4332]/10 border-[#1b4332] text-[#1b4332]'
                    : 'bg-[#FAF8F5] border-[#e8e2d5] text-slate-600 hover:border-slate-400'
                }`}
              >
                <span>{scope.replace(/_/g, ' ')}</span>
                {isSelected ? (
                  <Check className="w-4 h-4 text-[#1b4332] shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full border border-slate-300 shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Verified Attributes Management */}
      <div className="bg-white border border-[#e8e2d5] rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-[#0f2d22]">
              Verified Processing &amp; Quality Attributes
            </h4>
          </div>
          {/* UI Safety Guidance Notice */}
          <div className="mt-2 bg-blue-50/70 border border-blue-200 text-blue-900 text-xs p-3 rounded-lg flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Strict Attribute Governance Policy:</p>
              <p className="text-blue-800">
                Only select an attribute when you have verified business or production evidence (e.g. milling records, lab COA, or license). Normal commercial text in product titles is strictly separated from verified attributes.
              </p>
            </div>
          </div>
        </div>

        {/* Add Attribute Row */}
        {!isLocked && availableAttrsToAdd.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <select
              value={selectedAttrToAdd}
              onChange={(e) => setSelectedAttrToAdd(e.target.value as VerifiedAttributeSlug)}
              className="bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg px-3 py-2 text-xs font-medium text-[#0f2d22] grow focus:outline-hidden focus:ring-1 focus:ring-[#1b4332]"
            >
              {availableAttrsToAdd.map((spec) => (
                <option key={spec.slug} value={spec.slug}>
                  + Add {spec.displayName} ({spec.category})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleAddAttribute}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#1b4332] text-white text-xs font-bold rounded-lg hover:bg-[#143326] transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Attribute</span>
            </button>
          </div>
        )}

        {/* Active Attributes List */}
        <div className="space-y-3 pt-2">
          {intelligence.verifiedAttributes.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-[#e8e2d5] rounded-xl text-slate-500 text-xs bg-[#FAF8F5]">
              <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
              <p className="font-bold text-slate-700">Zero Verified Claims Attached</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Clean baseline state. Public search titles and guides will use standard botanical descriptions without unsupported marketing claims.
              </p>
            </div>
          ) : (
            intelligence.verifiedAttributes.map((attr) => {
              const spec = VERIFIED_ATTRIBUTE_SPECS[attr.slug];
              const isInvalidOrganic =
                attr.slug === 'organic' &&
                attr.verificationSource !== 'LEGAL_REGISTRATION' &&
                attr.verificationSource !== 'LAB_CERTIFICATE';
              const isInvalidLab =
                attr.slug === 'lab-tested' && attr.verificationSource !== 'LAB_CERTIFICATE';

              return (
                <div
                  key={attr.id}
                  className={`border rounded-xl p-3.5 text-xs space-y-3 transition-all ${
                    isInvalidOrganic || isInvalidLab
                      ? 'bg-rose-50/50 border-rose-300'
                      : 'bg-white border-[#e8e2d5]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-[#0f2d22]">{attr.displayName}</span>
                        <span className="bg-[#f5f1e8] text-[#1b4332] text-[10px] font-bold px-2 py-0.5 rounded-sm">
                          {attr.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{spec?.description}</p>
                    </div>

                    {!isLocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAttribute(attr.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                        title="Remove Attribute"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Verification Source & Promotion Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Verification Source <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={attr.verificationSource}
                        disabled={isLocked}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, {
                            verificationSource: e.target.value as AttributeVerificationSource,
                          })
                        }
                        className="w-full bg-[#FAF8F5] border border-[#e8e2d5] rounded-md px-2.5 py-1.5 text-xs text-[#0f2d22] focus:outline-hidden focus:ring-1 focus:ring-[#1b4332]"
                      >
                        {spec?.allowedSources.map((src) => (
                          <option key={src} value={src}>
                            {src.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        Proof Reference / License #
                      </label>
                      <input
                        type="text"
                        disabled={isLocked}
                        value={attr.verificationRef || ''}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, { verificationRef: e.target.value })
                        }
                        placeholder="e.g. COA-2026-088 or NPOP Cert"
                        className="w-full bg-[#FAF8F5] border border-[#e8e2d5] rounded-md px-2.5 py-1.5 text-xs text-[#0f2d22] focus:outline-hidden focus:ring-1 focus:ring-[#1b4332]"
                      >
                      </input>
                    </div>
                  </div>

                  {/* Allow in SEO Promotion */}
                  <div className="flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-medium text-slate-700">
                      <input
                        type="checkbox"
                        disabled={isLocked}
                        checked={attr.allowInSeoTitle}
                        onChange={(e) =>
                          handleUpdateAttribute(attr.id, { allowInSeoTitle: e.target.checked })
                        }
                        className="rounded-sm border-slate-300 text-[#1b4332] focus:ring-[#1b4332]"
                      />
                      <span>Allow promotion into generated SEO title and guide headers</span>
                    </label>

                    <span className="text-[10px] text-slate-400">
                      Verified: {new Date(attr.verifiedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Inline Error Callouts */}
                  {isInvalidOrganic && (
                    <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Organic attribute strictly requires LEGAL_REGISTRATION or LAB_CERTIFICATE.
                    </p>
                  )}
                  {isInvalidLab && (
                    <p className="text-[11px] font-bold text-rose-700 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Lab-Tested attribute strictly requires LAB_CERTIFICATE.
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Validation Errors Notice */}
        {!validation.valid && (
          <div className="bg-rose-50 border border-rose-300 rounded-lg p-3 text-rose-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Intelligence Validation Issues:
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-rose-800 text-[11px]">
              {validation.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

