'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ProductGuide, ProductGuideFAQ, Product } from '@/lib/types';
import { deriveProductGuide } from '@/lib/growth/guide-generator';
import {
  ArrowLeft,
  Save,
  BookOpen,
  Plus,
  Trash2,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Eye,
  Info,
  Layers,
  Search,
} from 'lucide-react';

interface GuideFormClientProps {
  guide?: ProductGuide;
  products: Product[];
}

export default function GuideFormClient({
  guide,
  products = [],
}: GuideFormClientProps) {
  const router = useRouter();
  const isEditing = Boolean(guide?.id);

  const [selectedProductId, setSelectedProductId] = useState<string>(
    guide?.productId || guide?.associatedProductId || (products.length > 0 ? products[0].id : '')
  );

  const [formData, setFormData] = useState<Partial<ProductGuide>>({
    id: guide?.id || '',
    title: guide?.title || '',
    slug: guide?.slug || '',
    shortIntro: guide?.shortIntro || '',
    coverImage: guide?.coverImage || '/images/fallback.svg',
    category: guide?.category || 'Henna Application',
    readTime: guide?.readTime || '5 min read',
    content: guide?.content || '',
    productId: guide?.productId || guide?.associatedProductId || '',
    associatedProductId: guide?.associatedProductId || guide?.productId || '',
    productIds: guide?.productIds || [],
    relatedProductIds: guide?.relatedProductIds || [],
    overview: guide?.overview || '',
    whatIsThis: guide?.whatIsThis || '',
    whoShouldUse: guide?.whoShouldUse || '',
    whoShouldAvoid: guide?.whoShouldAvoid || '',
    howToUse: guide?.howToUse || '',
    quantityPreparation: guide?.quantityPreparation || '',
    storageInstructions: guide?.storageInstructions || '',
    importantNotes: guide?.importantNotes || '',
    keyBenefits: guide?.keyBenefits || [],
    ingredients: guide?.ingredients || [],
    faqs: guide?.faqs || [{ question: '', answer: '' }],
    seoTitle: guide?.seoTitle || '',
    seoDescription: guide?.seoDescription || '',
    seoKeywords: guide?.seoKeywords || '',
    isPublished: guide?.isPublished ?? guide?.published ?? true,
    published: guide?.published ?? guide?.isPublished ?? true,
    isFeatured: guide?.isFeatured ?? false,
  });

  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [hasManuallyEdited, setHasManuallyEdited] = useState(isEditing);
  const [needsReviewWarning, setNeedsReviewWarning] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Auto-fill Guide Draft from selected Product
  const handleAutoFill = (overrideManual = false) => {
    if (hasManuallyEdited && !overrideManual) {
      const confirmOverwrite = window.confirm(
        'You have existing edits in this guide. Auto-filling will regenerate all fields from the selected product. Continue?'
      );
      if (!confirmOverwrite) return;
    }

    const selectedProduct = products.find((p) => p.id === selectedProductId);
    if (!selectedProduct) {
      setNotification({ type: 'error', message: 'Please select a valid product first.' });
      return;
    }

    setIsAutoFilling(true);
    try {
      const draft = deriveProductGuide(selectedProduct, products);

      setFormData((prev) => ({
        ...prev,
        title: draft.title,
        slug: draft.slug,
        shortIntro: draft.shortIntro,
        category: draft.category,
        readTime: draft.readTime,
        content: draft.content,
        overview: draft.overview,
        whatIsThis: draft.whatIsThis,
        keyBenefits: draft.keyBenefits,
        ingredients: draft.ingredients,
        whoShouldUse: draft.whoShouldUse,
        whoShouldAvoid: draft.whoShouldAvoid,
        howToUse: draft.howToUse,
        quantityPreparation: draft.quantityPreparation,
        storageInstructions: draft.storageInstructions,
        importantNotes: draft.importantNotes,
        faqs: draft.faqs,
        productId: selectedProduct.id,
        associatedProductId: selectedProduct.id,
        relatedProductIds: draft.relatedProductIds,
        coverImage: draft.coverImage,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        seoKeywords: draft.seoKeywords,
      }));

      if (draft.needsReview) {
        setNeedsReviewWarning(draft.missingFields);
        setNotification({
          type: 'info',
          message: `Guide auto-filled! [GUIDE NEEDS REVIEW] Please review missing fields: ${draft.missingFields.join(', ')}`,
        });
      } else {
        setNeedsReviewWarning([]);
        setNotification({
          type: 'success',
          message: `Complete professional guide draft generated from "${selectedProduct.name}"!`,
        });
      }

      setHasManuallyEdited(true);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Auto-fill failed.' });
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Auto slug generator
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setHasManuallyEdited(true);
    if (!isEditing || !formData.slug) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      setFormData((prev) => ({ ...prev, title, slug: generatedSlug }));
    } else {
      setFormData((prev) => ({ ...prev, title }));
    }
  };

  // FAQ Handlers
  const handleAddFaq = () => {
    setHasManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: '', answer: '' }],
    }));
  };

  const handleFaqChange = (index: number, field: 'question' | 'answer', value: string) => {
    setHasManuallyEdited(true);
    setFormData((prev) => {
      const updatedFaqs = [...(prev.faqs || [])];
      updatedFaqs[index] = { ...updatedFaqs[index], [field]: value };
      return { ...prev, faqs: updatedFaqs };
    });
  };

  const handleRemoveFaq = (index: number) => {
    setHasManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.slug) {
      setNotification({ type: 'error', message: 'Title and Slug are required.' });
      return;
    }

    setIsSaving(true);
    setNotification(null);

    try {
      const res = await fetch('/api/admin/guides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          published: formData.isPublished ?? true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setNotification({ type: 'success', message: 'Product guide saved successfully!' });
        setTimeout(() => {
          router.push('/admin/guides');
          router.refresh();
        }, 1200);
      } else {
        setNotification({ type: 'error', message: data.error || 'Failed to save guide' });
      }
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'An error occurred while saving.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-sm font-medium shadow-md ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : notification.type === 'info'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : notification.type === 'info' ? (
              <Info className="w-5 h-5 text-amber-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-xs font-bold underline opacity-75 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/guides"
            className="p-2 rounded-xl border border-[#e8e2d5] text-gray-500 hover:text-[#0f2d22] hover:bg-[#faf8f5]"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
              {isEditing ? 'Edit Product Guide' : 'Create New Product Guide'}
            </h2>
            <p className="text-xs text-[#626c66]">
              {isEditing ? `Editing guide ID: ${guide?.id}` : 'Draft a new Sojat Henna or Herbal Care article'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/guides"
            className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-[#0f2d22] bg-gray-100 rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all border border-[#c5a059]/30 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Guide'}</span>
          </button>
        </div>
      </div>

      {/* Universal Auto-Guide Generator Banner */}
      <div className="bg-gradient-to-r from-[#0f2d22] to-[#1b4332] text-white p-6 rounded-2xl shadow-md border border-[#c5a059]/40 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#c5a059]" />
              <span className="font-serif-heading font-extrabold text-lg text-[#fcfbf7] tracking-wide">
                Universal Auto-Guide Generator
              </span>
              <span className="bg-[#c5a059]/20 text-[#c5a059] border border-[#c5a059]/40 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Taxonomy-Aware
              </span>
            </div>
            <p className="text-xs text-[#e8e2d5] max-w-2xl leading-relaxed">
              Select any botanical product to auto-derive a complete truth-grounded guide draft with botanical overview, preparation charts, FAQs, and Auto-SEO.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-[#0f2d22]/90 border border-[#c5a059]/40 text-white rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#c5a059]"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id} className="text-[#0f2d22] bg-white">
                  {p.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handleAutoFill(false)}
              disabled={isAutoFilling || products.length === 0}
              className="inline-flex items-center gap-2 bg-[#c5a059] hover:bg-[#b08d48] text-[#0f2d22] px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isAutoFilling ? 'Generating...' : 'Auto-Fill Guide'}</span>
            </button>
          </div>
        </div>

        {needsReviewWarning.length > 0 && (
          <div className="bg-amber-500/20 border border-amber-400/40 rounded-xl p-3 text-xs text-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>
              <strong>GUIDE NEEDS REVIEW:</strong> Missing verified data for: {needsReviewWarning.join(', ')}. Please verify or fill in manually.
            </span>
          </div>
        )}
      </div>

      {/* Main Grid: Form Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3 width): Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22] border-b border-[#f0ebe0] pb-3">
              Guide Title & URL
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-1">
                Guide Title <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={handleTitleChange}
                placeholder="e.g. Complete Guide to BAQ Henna Powder"
                className="w-full px-4 py-2.5 text-sm bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332] font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-1">
                URL Slug <span className="text-rose-600">*</span>
              </label>
              <div className="flex items-center bg-[#faf8f5] border border-[#e8e2d5] rounded-xl px-3 py-2 text-xs text-gray-500 font-mono">
                <span className="shrink-0 text-gray-400">muskydose.in/guides/</span>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => {
                    setHasManuallyEdited(true);
                    setFormData((prev) => ({ ...prev, slug: e.target.value }));
                  }}
                  className="w-full bg-transparent focus:outline-none text-[#0f2d22] font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-1">
                Short Intro / Direct Summary
              </label>
              <textarea
                rows={3}
                value={formData.shortIntro}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, shortIntro: e.target.value }));
                }}
                placeholder="Brief 2-3 sentence overview shown on preview cards and search snippets..."
                className="w-full px-4 py-2.5 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332] leading-relaxed"
              />
            </div>
          </div>

          {/* Detailed Content Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ebe0] pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Detailed Guide Content (Markdown / Structured Text)
              </h3>
              <span className="text-[11px] text-gray-500">Supports headings, lists & alerts</span>
            </div>

            <textarea
              rows={16}
              value={formData.content}
              onChange={(e) => {
                setHasManuallyEdited(true);
                setFormData((prev) => ({ ...prev, content: e.target.value }));
              }}
              placeholder="Write the full step-by-step instructions, preparation ratios, dye release time charts..."
              className="w-full p-4 text-xs font-mono bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332] leading-relaxed"
            />
          </div>

          {/* FAQs Section */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f0ebe0] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-[#c5a059]" />
                <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                  Guide FAQs (Schema.org Ready)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleAddFaq}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#1b4332] bg-[#e8f3ed] rounded-xl hover:bg-[#d8e8de] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add FAQ</span>
              </button>
            </div>

            <div className="space-y-4">
              {formData.faqs?.map((faq, index) => (
                <div key={index} className="p-4 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider">
                      FAQ #{index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFaq(index)}
                      className="p-1 text-gray-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={faq.question}
                      onChange={(e) => handleFaqChange(index, 'question', e.target.value)}
                      placeholder="Question: e.g. How long should Lawsonia henna rest before applying?"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#e8e2d5] rounded-lg font-semibold focus:outline-none focus:border-[#1b4332]"
                    />
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={faq.answer}
                      onChange={(e) => handleFaqChange(index, 'answer', e.target.value)}
                      placeholder="Answer: Lawsonia henna requires 8-12 hours of dye release at room temperature..."
                      className="w-full px-3 py-2 text-xs bg-white border border-[#e8e2d5] rounded-lg focus:outline-none focus:border-[#1b4332] leading-relaxed"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3 width): Sidebar Settings & Metadata */}
        <div className="space-y-6">
          {/* Status & Visibility Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] border-b border-[#f0ebe0] pb-3">
              Publishing Controls
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl cursor-pointer hover:bg-white transition-all">
                <input
                  type="checkbox"
                  checked={formData.isPublished}
                  onChange={(e) => {
                    setHasManuallyEdited(true);
                    setFormData((prev) => ({
                      ...prev,
                      isPublished: e.target.checked,
                      published: e.target.checked,
                    }));
                  }}
                  className="w-4 h-4 text-[#1b4332] rounded focus:ring-[#1b4332]"
                />
                <div>
                  <span className="text-xs font-bold text-[#0f2d22] block">Published Status</span>
                  <span className="text-[11px] text-gray-500 block">Visible on storefront & sitemap</span>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-[#faf8f5] border border-[#e8e2d5] rounded-xl cursor-pointer hover:bg-white transition-all">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => {
                    setHasManuallyEdited(true);
                    setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }));
                  }}
                  className="w-4 h-4 text-[#1b4332] rounded focus:ring-[#1b4332]"
                />
                <div>
                  <span className="text-xs font-bold text-[#0f2d22] block">Featured Guide</span>
                  <span className="text-[11px] text-gray-500 block">Promote on homepage guide strip</span>
                </div>
              </label>
            </div>
          </div>

          {/* Categorization & Link to Product Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] border-b border-[#f0ebe0] pb-3">
              Product & Category Link
            </h3>

            <div>
              <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-1">
                Category / Topic
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, category: e.target.value }));
                }}
                placeholder="e.g. Henna Application, Hair Care, Face Care"
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-1">
                Read Time
              </label>
              <input
                type="text"
                value={formData.readTime}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, readTime: e.target.value }));
                }}
                placeholder="e.g. 5 min read"
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider mb-1">
                Primary Linked Product
              </label>
              <select
                value={formData.productId || formData.associatedProductId || ''}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({
                    ...prev,
                    productId: e.target.value,
                    associatedProductId: e.target.value,
                  }));
                }}
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332] font-semibold text-[#0f2d22]"
              >
                <option value="">-- No Specific Product Linked --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (SKU: {p.sku || p.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cover Image Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] border-b border-[#f0ebe0] pb-3">
              Cover Image URL
            </h3>

            <div>
              <input
                type="text"
                value={formData.coverImage}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, coverImage: e.target.value }));
                }}
                placeholder="e.g. /images/products/henna-leaf.jpg"
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            {formData.coverImage && (
              <div className="relative aspect-[16/9] bg-gray-100 rounded-xl overflow-hidden border border-[#e8e2d5]">
                <Image
                  src={formData.coverImage}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          {/* SEO Metadata Card */}
          <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-2xs space-y-4">
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22] border-b border-[#f0ebe0] pb-3">
              Auto-SEO & Meta Tags
            </h3>

            <div>
              <label className="block text-[11px] font-bold text-[#0f2d22] uppercase mb-1">
                SEO Title (≤ 60 Chars)
              </label>
              <input
                type="text"
                value={formData.seoTitle}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, seoTitle: e.target.value }));
                }}
                placeholder="Meta Title for Search Engines"
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0f2d22] uppercase mb-1">
                Meta Description (140-160 Chars)
              </label>
              <textarea
                rows={3}
                value={formData.seoDescription}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, seoDescription: e.target.value }));
                }}
                placeholder="Meta Description snippet for search results..."
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#0f2d22] uppercase mb-1">
                Target Keywords
              </label>
              <input
                type="text"
                value={formData.seoKeywords}
                onChange={(e) => {
                  setHasManuallyEdited(true);
                  setFormData((prev) => ({ ...prev, seoKeywords: e.target.value }));
                }}
                placeholder="Comma separated keywords"
                className="w-full px-3 py-2 text-xs bg-[#faf8f5] border border-[#e8e2d5] rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
