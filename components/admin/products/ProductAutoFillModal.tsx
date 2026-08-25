'use client';

import React, { useState } from 'react';
import { Product, Category } from '@/lib/types';
import { ProductAutoFillDraft } from '@/lib/ai/product-autofill';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Tag,
  Search,
  HelpCircle,
  Layers,
  ArrowRight,
  ShieldCheck,
  Edit3,
} from 'lucide-react';

interface ProductAutoFillModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  categories: Category[];
  currentFormData: Partial<Product>;
  onApplyDraft: (draft: ProductAutoFillDraft, overwriteStrategy: 'empty_only' | 'overwrite_all') => void;
}

export default function ProductAutoFillModal({
  isOpen,
  onClose,
  productName,
  categories,
  currentFormData,
  onApplyDraft,
}: ProductAutoFillModalProps) {
  const [nameInput, setNameInput] = useState(productName || currentFormData.name || '');
  const [selectedCategory, setSelectedCategory] = useState(currentFormData.categoryId || '');
  const [productType, setProductType] = useState<string>(currentFormData.productType || 'POWDER');
  const [weightInput, setWeightInput] = useState(currentFormData.quantityOrWeight || '250g Pack');
  const [hintsInput, setHintsInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProductAutoFillDraft | null>(null);
  const [activeDraftTab, setActiveDraftTab] = useState<'content' | 'formulation' | 'seo' | 'faqs'>('content');
  const [overwriteStrategy, setOverwriteStrategy] = useState<'empty_only' | 'overwrite_all'>('empty_only');

  if (!isOpen) return null;

  const handleGenerate = async () => {
    if (!nameInput.trim()) {
      setError('Please provide a product title before generating auto-fill details.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const catObj = categories.find((c) => c.id === selectedCategory);
      const res = await fetch('/api/admin/products/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: nameInput.trim(),
          categoryId: selectedCategory || undefined,
          categoryName: catObj?.name || undefined,
          productType,
          quantityOrWeight: weightInput.trim() || undefined,
          hints: hintsInput.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate product draft.');
      }

      setDraft(data.draft);
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating details.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (!draft) return;
    onApplyDraft(draft, overwriteStrategy);
    onClose();
  };

  // Draft editing helpers
  const updateDraftField = (key: keyof ProductAutoFillDraft, val: any) => {
    if (!draft) return;
    setDraft({ ...draft, [key]: val });
  };

  const updateIngredient = (index: number, val: string) => {
    if (!draft) return;
    const arr = [...draft.ingredients];
    arr[index] = val;
    setDraft({ ...draft, ingredients: arr });
  };

  const updateBenefit = (index: number, val: string) => {
    if (!draft) return;
    const arr = [...draft.benefits];
    arr[index] = val;
    setDraft({ ...draft, benefits: arr });
  };

  const hasExistingValues = Boolean(
    currentFormData.shortDescription ||
    currentFormData.fullDescription ||
    (currentFormData.ingredients && currentFormData.ingredients.length > 0) ||
    (currentFormData.benefits && currentFormData.benefits.length > 0)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FAF8F5] rounded-2xl border border-[#e8e2d5] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-xs text-[#0f2d22]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#e8e2d5] bg-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#183F2B] flex items-center justify-center text-[#C5A059] shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-[#183F2B] flex items-center gap-2">
                <span>Assisted Product Auto-Fill</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-sans font-bold bg-[#C5A059]/15 text-[#8c6b2d] uppercase tracking-wider">
                  AI Draft Suggestion
                </span>
              </h2>
              <p className="text-xs text-[#626c66] mt-0.5">
                Generate authentic Ayurvedic herbal descriptions, ingredients, benefits, usage guides, and SEO metadata.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#626c66] hover:text-[#0f2d22] hover:bg-[#f5f1e8] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Generator Input Form */}
          <div className="bg-white p-5 rounded-xl border border-[#e8e2d5] space-y-4 shadow-xs">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
              <div className="md:col-span-5">
                <label className="block text-xs font-bold text-[#183F2B] mb-1">
                  Product Name / Title *
                </label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="e.g. Sojat Micro-Fine Henna Powder"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                />
              </div>

              <div className="md:col-span-3">
                <label className="block text-xs font-bold text-[#183F2B] mb-1">
                  Category Hint
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                >
                  <option value="">Auto-Detect Category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#183F2B] mb-1">
                  Product Type
                </label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                >
                  <option value="POWDER">POWDER</option>
                  <option value="RAW">RAW</option>
                  <option value="FINISHED">FINISHED</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-[#183F2B] mb-1">
                  Pack / Weight
                </label>
                <input
                  type="text"
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  placeholder="e.g. 250g Pack"
                  className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-[#f5f1e8]">
              <div className="flex-1">
                <input
                  type="text"
                  value={hintsInput}
                  onChange={(e) => setHintsInput(e.target.value)}
                  placeholder="Optional hints: e.g. 'Triple cloth sifted, rich burgundy dye, cooling scalp conditioner'"
                  className="w-full px-3 py-1.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22] placeholder:text-[#626c66]/60 focus:outline-none focus:border-[#183F2B]"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading || !nameInput.trim()}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#183F2B] text-white text-xs font-bold rounded-xl hover:bg-[#123021] transition-all shadow-sm disabled:opacity-50 cursor-pointer shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#C5A059] ${loading ? 'animate-spin' : ''}`} />
                <span>{loading ? 'Generating Botanical Draft...' : draft ? 'Regenerate Draft' : 'Generate Details'}</span>
              </button>
            </div>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-4 bg-[#9A4F32]/10 border border-[#9A4F32]/20 text-[#9A4F32] rounded-xl text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button type="button" onClick={() => setError(null)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="p-8 bg-white rounded-xl border border-[#e8e2d5] flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#183F2B]/20 border-t-[#183F2B] rounded-full animate-spin" />
              <div>
                <p className="text-sm font-bold text-[#183F2B]">Generating Brand-Aligned Product Draft...</p>
                <p className="text-xs text-[#626c66] mt-1">
                  Structuring Sojat herbal descriptions, botanical ingredients, benefits, usage instructions, and SEO tags.
                </p>
              </div>
            </div>
          )}

          {/* Generated Draft Review & Editor */}
          {draft && !loading && (
            <div className="bg-white rounded-xl border border-[#e8e2d5] shadow-xs overflow-hidden">
              {/* Draft Header & Navigation Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#e8e2d5] bg-[#FAF8F5] px-4">
                <div className="flex overflow-x-auto text-xs font-bold text-[#0f2d22]">
                  <button
                    type="button"
                    onClick={() => setActiveDraftTab('content')}
                    className={`px-4 py-3 flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
                      activeDraftTab === 'content'
                        ? 'border-[#183F2B] bg-white text-[#183F2B]'
                        : 'border-transparent text-[#626c66] hover:text-[#0f2d22]'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Descriptions</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDraftTab('formulation')}
                    className={`px-4 py-3 flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
                      activeDraftTab === 'formulation'
                        ? 'border-[#183F2B] bg-white text-[#183F2B]'
                        : 'border-transparent text-[#626c66] hover:text-[#0f2d22]'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Ingredients & Benefits ({draft.benefits.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDraftTab('seo')}
                    className={`px-4 py-3 flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
                      activeDraftTab === 'seo'
                        ? 'border-[#183F2B] bg-white text-[#183F2B]'
                        : 'border-transparent text-[#626c66] hover:text-[#0f2d22]'
                    }`}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>SEO & Metadata</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDraftTab('faqs')}
                    className={`px-4 py-3 flex items-center gap-1.5 border-b-2 transition-colors shrink-0 ${
                      activeDraftTab === 'faqs'
                        ? 'border-[#183F2B] bg-white text-[#183F2B]'
                        : 'border-transparent text-[#626c66] hover:text-[#0f2d22]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>FAQs ({draft.faqs.length})</span>
                  </button>
                </div>

                <div className="py-2 sm:py-0 text-[11px] text-[#626c66] flex items-center gap-2">
                  <span className="font-semibold text-[#183F2B]">Category:</span>
                  <span className="bg-[#183F2B]/10 text-[#183F2B] px-2 py-0.5 rounded-md font-bold">
                    {draft.suggestedCategoryName}
                  </span>
                  <span className="font-semibold text-[#183F2B] ml-2">Slug:</span>
                  <span className="bg-[#f5f1e8] px-2 py-0.5 rounded-md font-mono text-[#0f2d22]">
                    /{draft.slug}
                  </span>
                </div>
              </div>

              {/* Tab 1: Descriptions */}
              {activeDraftTab === 'content' && (
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#183F2B]">Short Description</label>
                      <span className="text-[10px] text-[#626c66]">{draft.shortDescription.length} characters</span>
                    </div>
                    <textarea
                      rows={2}
                      value={draft.shortDescription}
                      onChange={(e) => updateDraftField('shortDescription', e.target.value)}
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#183F2B]">Full Botanical Description</label>
                      <span className="text-[10px] text-[#626c66]">{draft.fullDescription.length} characters</span>
                    </div>
                    <textarea
                      rows={6}
                      value={draft.fullDescription}
                      onChange={(e) => updateDraftField('fullDescription', e.target.value)}
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#183F2B] mb-1">Usage & Application Instructions</label>
                    <textarea
                      rows={3}
                      value={draft.usageInstructions}
                      onChange={(e) => updateDraftField('usageInstructions', e.target.value)}
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Ingredients & Benefits */}
              {activeDraftTab === 'formulation' && (
                <div className="p-5 space-y-5">
                  <div>
                    <label className="block font-bold text-[#183F2B] mb-2">Ingredients List</label>
                    <div className="space-y-2">
                      {draft.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-[#183F2B]/10 text-[#183F2B] font-bold flex items-center justify-center text-[10px]">
                            {i + 1}
                          </span>
                          <input
                            type="text"
                            value={ing}
                            onChange={(e) => updateIngredient(i, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#183F2B] mb-2">Key Product Benefits</label>
                    <div className="space-y-2">
                      {draft.benefits.map((b, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#2d6a4f] shrink-0" />
                          <input
                            type="text"
                            value={b}
                            onChange={(e) => updateBenefit(i, e.target.value)}
                            className="flex-1 px-3 py-1.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: SEO & Metadata */}
              {activeDraftTab === 'seo' && (
                <div className="p-5 space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#183F2B]">SEO Meta Title</label>
                      <span className="text-[10px] text-[#626c66]">{draft.seoTitle.length} / 60 chars</span>
                    </div>
                    <input
                      type="text"
                      value={draft.seoTitle}
                      onChange={(e) => updateDraftField('seoTitle', e.target.value)}
                      className="w-full px-3 py-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#183F2B]">SEO Meta Description</label>
                      <span className="text-[10px] text-[#626c66]">{draft.seoDescription.length} / 160 chars</span>
                    </div>
                    <textarea
                      rows={2}
                      value={draft.seoDescription}
                      onChange={(e) => updateDraftField('seoDescription', e.target.value)}
                      className="w-full p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#183F2B]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#183F2B] mb-1">Target Keywords</label>
                    <div className="flex flex-wrap gap-1.5 p-3 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl">
                      {draft.keywords.map((kw, i) => (
                        <span key={i} className="px-2.5 py-1 bg-white border border-[#e8e2d5] rounded-lg text-[11px] font-medium text-[#0f2d22]">
                          #{kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: FAQs */}
              {activeDraftTab === 'faqs' && (
                <div className="p-5 space-y-3">
                  {draft.faqs.map((faq, i) => (
                    <div key={i} className="p-3 bg-[#FAF8F5] border border-[#e8e2d5] rounded-xl space-y-1.5">
                      <div className="font-bold text-[#183F2B] flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-[#C5A059]" />
                        <span>{faq.question}</span>
                      </div>
                      <p className="text-xs text-[#626c66] pl-5">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Overwrite Protection Notice & Strategy Selector */}
          {draft && !loading && (
            <div className="p-4 bg-[#fbf9f4] border border-[#e8e2d5] rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#183F2B]">
                <ShieldCheck className="w-4 h-4 text-[#2d6a4f]" />
                <span>Field Overwrite & Safety Protection</span>
              </div>
              <p className="text-[11px] text-[#626c66]">
                Applying this draft will populate the form in your browser. Prices, stock counts, and SKU will <strong>never</strong> be touched by AI. You must click &quot;Save Product&quot; to commit changes.
              </p>

              {hasExistingValues && (
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0f2d22]">
                    <input
                      type="radio"
                      name="strategy"
                      checked={overwriteStrategy === 'empty_only'}
                      onChange={() => setOverwriteStrategy('empty_only')}
                      className="text-[#183F2B] focus:ring-[#183F2B]"
                    />
                    <span>Fill only empty fields (Safest — preserves existing descriptions)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#0f2d22]">
                    <input
                      type="radio"
                      name="strategy"
                      checked={overwriteStrategy === 'overwrite_all'}
                      onChange={() => setOverwriteStrategy('overwrite_all')}
                      className="text-[#183F2B] focus:ring-[#183F2B]"
                    />
                    <span>Replace existing text with new AI draft</span>
                  </label>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#e8e2d5] bg-white flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#626c66] flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5 text-[#183F2B]" />
            <span>AI suggests drafts only. Admin review and manual save required.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] text-xs font-semibold rounded-xl hover:bg-[#f5f1e8] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {draft && (
              <button
                type="button"
                onClick={handleApply}
                className="inline-flex items-center gap-2 px-6 py-2 bg-[#183F2B] text-white text-xs font-bold rounded-xl hover:bg-[#123021] transition-all shadow-sm hover:scale-102 cursor-pointer"
              >
                <span>Apply to Form</span>
                <ArrowRight className="w-4 h-4 text-[#C5A059]" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
