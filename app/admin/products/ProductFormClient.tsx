'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Product, Category } from '@/lib/types';
import MediaSelectModal from '@/components/MediaSelectModal';
import ProductAutoFillModal from '@/components/admin/products/ProductAutoFillModal';
import { ProductAutoFillDraft } from '@/lib/ai/product-autofill';
import { uploadMediaFile } from '@/lib/media-upload';
import { deriveProductAutoSeo } from '@/lib/growth/product-keyword-engine';
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  ExternalLink,
  Info,
  DollarSign,
  FileText,
  Sliders,
  CheckCircle,
  AlertCircle,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Sparkles,
  Search,
  Key,
  Compass,
  RefreshCw,
  Lightbulb,
  Layers,
} from 'lucide-react';

interface ProductFormClientProps {
  initialProduct?: Product;
  categories: Category[];
}

export default function ProductFormClient({
  initialProduct,
  categories,
}: ProductFormClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'content' | 'media' | 'seo' | 'display'>('basic');
  const [isDirty, setIsDirty] = useState(false);

  const [formData, setFormData] = useState<Partial<Product>>({
    id: initialProduct?.id,
    name: initialProduct?.name || '',
    slug: initialProduct?.slug || '',
    categoryId: initialProduct?.categoryId || (categories[0]?.id || 'cat-1'),
    categoryName: initialProduct?.categoryName || (categories[0]?.name || 'Henna'),
    shortDescription: initialProduct?.shortDescription || '',
    fullDescription: initialProduct?.fullDescription || '',
    price: initialProduct?.price || 199,
    compareAtPrice: initialProduct?.compareAtPrice || 299,
    quantityOrWeight: initialProduct?.quantityOrWeight || '250g Pack',
    sku: initialProduct?.sku || 'MD-888',
    images: initialProduct?.images || [
      '/images/fallback.svg',
    ],
    ingredients: initialProduct?.ingredients || ['100% Pure Natural Lawsonia Inermis Leaf Powder'],
    benefits: initialProduct?.benefits || ['Deep rich mahogany stain', 'Chemical-free natural hair coolant'],
    usageInstructions:
      initialProduct?.usageInstructions ||
      'Mix with warm water into smooth paste. Soak for 6 hours before application.',
    stockStatus: initialProduct?.stockStatus || 'in_stock',
    isFeatured: initialProduct?.isFeatured ?? false,
    isActive: initialProduct?.isActive ?? false,
    sortOrder: initialProduct?.sortOrder ?? 1,
    seoTitle: initialProduct?.seoTitle || '',
    seoDescription: initialProduct?.seoDescription || '',
    seoKeywords: initialProduct?.seoKeywords || [],
    robotsIndex: initialProduct?.robotsIndex ?? true,
    robotsFollow: initialProduct?.robotsFollow ?? true,
    ogImageUrl: initialProduct?.ogImageUrl || '',
  });

  const [keywordUniverse, setKeywordUniverse] = useState<any | null>(null);
  const [seoHealth, setSeoHealth] = useState<any | null>(null);
  const [internalLinks, setInternalLinks] = useState<any[]>([]);
  const [loadingUniverse, setLoadingUniverse] = useState(false);
  const [seoKeywordInput, setSeoKeywordInput] = useState('');
  const [activeUniverseCategory, setActiveUniverseCategory] = useState<string>('ALL');

  const autoSeo = deriveProductAutoSeo(formData);

  const applyAutoSeoDefaults = () => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      seoTitle: autoSeo.seoTitle,
      seoDescription: autoSeo.metaDescription,
      seoKeywords: Array.from(new Set([...(prev.seoKeywords || []), autoSeo.primaryKeyword, ...autoSeo.secondaryKeywords])),
    }));
  };

  const [imageInput, setImageInput] = useState('');
  const [ingredientInput, setIngredientInput] = useState('');
  const [benefitInput, setBenefitInput] = useState('');
  const [imageUploadError, setImageUploadError] = useState('');
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isAutoFillModalOpen, setIsAutoFillModalOpen] = useState(false);

  const handleSelectFromMediaLibrary = (url: string) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), url],
    }));
  };

  const handleSetCoverImage = (index: number) => {
    if (index === 0) return;
    setIsDirty(true);
    setFormData((prev) => {
      const images = [...(prev.images || [])];
      const target = images[index];
      images.splice(index, 1);
      images.unshift(target);
      return { ...prev, images };
    });
  };

  const handleMoveImage = (index: number, direction: 'left' | 'right') => {
    setIsDirty(true);
    setFormData((prev) => {
      const images = [...(prev.images || [])];
      const newIndex = direction === 'left' ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= images.length) return prev;
      const temp = images[index];
      images[index] = images[newIndex];
      images[newIndex] = temp;
      return { ...prev, images };
    });
  };

  const [autoFilling, setAutoFilling] = useState(false);
  const [hasManuallyEdited, setHasManuallyEdited] = useState(false);
  const [autoFillChecklist, setAutoFillChecklist] = useState<any | null>(null);

  // Track unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const updateForm = (key: keyof Product, value: any) => {
    setIsDirty(true);
    setHasManuallyEdited(true);
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (catId: string) => {
    const selected = categories.find((c) => c.id === catId);
    setIsDirty(true);
    setHasManuallyEdited(true);
    setFormData((prev) => ({
      ...prev,
      categoryId: catId,
      categoryName: selected?.name || 'Sojat Herbal',
    }));
  };

  const handleOneClickAutoFill = async () => {
    const productName = formData.name?.trim();
    if (!productName) {
      setError('Please enter a Product Name before clicking Auto-Fill.');
      return;
    }

    if (hasManuallyEdited) {
      const confirmed = window.confirm(
        'You have manually edited fields in this product. Auto-Fill will refresh botanical description, SEO, and usage details based on the product name. Do you want to continue?'
      );
      if (!confirmed) return;
    }

    setAutoFilling(true);
    setError('');
    try {
      const res = await fetch('/api/admin/products/auto-fill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName,
          categoryId: formData.categoryId,
          categoryName: formData.categoryName,
          productType: formData.productType,
          quantityOrWeight: formData.quantityOrWeight,
          price: formData.price,
          compareAtPrice: formData.compareAtPrice,
          sku: formData.sku,
          images: formData.images,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to auto-fill product details.');
      }

      const d = data.draft;
      setFormData((prev) => ({
        ...prev,
        name: d.name || prev.name,
        slug: !prev.slug || prev.slug === 'new-product' || !initialProduct ? d.slug : prev.slug,
        categoryId: d.categoryId || prev.categoryId,
        categoryName: d.categoryName || prev.categoryName,
        productType: d.productType || prev.productType,
        quantityOrWeight: d.quantityOrWeight || prev.quantityOrWeight,
        shortDescription: d.shortDescription || prev.shortDescription,
        fullDescription: d.fullDescription || prev.fullDescription,
        ingredients: d.ingredients || prev.ingredients,
        benefits: d.benefits || prev.benefits,
        usageInstructions: d.usageInstructions || prev.usageInstructions,
        seoTitle: d.seoTitle || prev.seoTitle,
        seoDescription: d.seoDescription || prev.seoDescription,
        seoKeywords: d.seoKeywords || prev.seoKeywords,
        stockStatus: d.stockStatus || prev.stockStatus,
        robotsIndex: d.robotsIndex ?? prev.robotsIndex,
        robotsFollow: d.robotsFollow ?? prev.robotsFollow,
      }));

      setAutoFillChecklist(d.checklist);
      setIsDirty(true);
      setHasManuallyEdited(false);
      setSuccessMsg('✨ Product successfully Auto-Filled! Please review fields, confirm price/SKU/images, and Save.');
      setTimeout(() => setSuccessMsg(''), 6000);
    } catch (err: any) {
      setError(err.message || 'Auto-fill failed.');
    } finally {
      setAutoFilling(false);
    }
  };

  const handleApplyAutoFillDraft = (draft: ProductAutoFillDraft, strategy: 'empty_only' | 'overwrite_all') => {
    setIsDirty(true);
    setFormData((prev) => {
      const next = { ...prev };

      const shouldApply = (fieldVal: any) => {
        if (strategy === 'overwrite_all') return true;
        if (fieldVal === undefined || fieldVal === null || fieldVal === '') return true;
        if (Array.isArray(fieldVal) && fieldVal.length === 0) return true;
        return false;
      };

      if (shouldApply(next.shortDescription)) next.shortDescription = draft.shortDescription;
      if (shouldApply(next.fullDescription)) next.fullDescription = draft.fullDescription;
      if (shouldApply(next.usageInstructions)) next.usageInstructions = draft.usageInstructions;
      if (shouldApply(next.quantityOrWeight)) next.quantityOrWeight = draft.quantityOrWeight;
      if (shouldApply(next.productType)) next.productType = draft.productType;

      if (draft.suggestedCategoryId && shouldApply(next.categoryId)) {
        next.categoryId = draft.suggestedCategoryId;
        next.categoryName = draft.suggestedCategoryName;
      }

      if (draft.slug && (!next.slug || strategy === 'overwrite_all')) {
        if (!initialProduct) {
          next.slug = draft.slug;
        }
      }

      if (draft.ingredients && draft.ingredients.length > 0) {
        if (shouldApply(next.ingredients)) {
          next.ingredients = [...draft.ingredients];
        }
      }

      if (draft.benefits && draft.benefits.length > 0) {
        if (shouldApply(next.benefits)) {
          next.benefits = [...draft.benefits];
        }
      }

      return next;
    });

    setSuccessMsg(
      strategy === 'overwrite_all'
        ? 'AI draft details applied! Please review every field and click "Save Product".'
        : 'AI draft applied to empty fields! Please review and click "Save Product".'
    );
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const handleAddImageUrl = () => {
    if (!imageInput.trim()) return;
    if (imageInput.startsWith('data:image/')) {
      setImageUploadError('Base64 image data cannot be stored directly. Please upload the file or provide a clean HTTPS URL.');
      return;
    }
    if (!imageInput.startsWith('http://') && !imageInput.startsWith('https://') && !imageInput.startsWith('/')) {
      setImageUploadError('Please provide a valid image URL starting with http:// or https://');
      return;
    }
    setImageUploadError('');
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      images: [...(prev.images || []), imageInput.trim()],
    }));
    setImageInput('');
  };

  // Image File Uploader (Uploads image files to Supabase Storage via Media API)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setImageUploadError('');
    setSaving(true);

    const fileList = Array.from(files);
    for (const file of fileList) {
      if (!file.type.startsWith('image/')) {
        setImageUploadError(`"${file.name}" is not an image file. Please select JPEG, PNG, WEBP, or SVG.`);
        setSaving(false);
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setImageUploadError(`"${file.name}" exceeds maximum allowed file size of 5MB.`);
        setSaving(false);
        return;
      }

      const targetProductId = formData.id || formData.slug || 'new-product';
      const res = await uploadMediaFile(file, 'products', undefined, targetProductId);
      if (res.success && res.url) {
        setIsDirty(true);
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []).filter((img) => img !== '/images/fallback.svg'), res.url],
        }));
      } else {
        setImageUploadError(`Failed to upload "${file.name}": ${res.error || 'Upload error'}`);
      }
    }

    setSaving(false);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index),
    }));
  };

  const handleAddIngredient = () => {
    if (!ingredientInput.trim()) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      ingredients: [...(prev.ingredients || []), ingredientInput.trim()],
    }));
    setIngredientInput('');
  };

  const handleRemoveIngredient = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index),
    }));
  };

  const handleAddBenefit = () => {
    if (!benefitInput.trim()) return;
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      benefits: [...(prev.benefits || []), benefitInput.trim()],
    }));
    setBenefitInput('');
  };

  const handleRemoveBenefit = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index),
    }));
  };

  const loadKeywordUniverse = async (forceRefresh: boolean = false) => {
    if (!formData.id && !formData.name) return;
    setLoadingUniverse(true);
    try {
      if (formData.id) {
        const method = forceRefresh ? 'POST' : 'GET';
        const res = await fetch(`/api/admin/products/${formData.id}/keywords`, { method });
        const data = await res.json();
        if (data.success) {
          if (data.universe) setKeywordUniverse(data.universe);
          if (data.seoHealth) setSeoHealth(data.seoHealth);
          if (data.internalLinks) setInternalLinks(data.internalLinks);
        }
      }
    } catch (err) {
      console.warn('Could not load keyword universe:', err);
    } finally {
      setLoadingUniverse(false);
    }
  };

  const handleAddSeoKeyword = (kw?: string) => {
    const text = (kw || seoKeywordInput).trim();
    if (!text) return;
    setIsDirty(true);
    setFormData((prev) => {
      const current = prev.seoKeywords || [];
      if (current.includes(text)) return prev;
      return { ...prev, seoKeywords: [...current, text] };
    });
    if (!kw) setSeoKeywordInput('');
  };

  const handleRemoveSeoKeyword = (index: number) => {
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      seoKeywords: (prev.seoKeywords || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.name.trim()) {
      setError('Product Name is required.');
      setActiveTab('basic');
      return;
    }
    if (formData.price === undefined || formData.price === null || formData.price < 0) {
      setError('Valid selling price is required.');
      setActiveTab('pricing');
      return;
    }
    if (!formData.sku || !formData.sku.trim()) {
      setError('SKU code is required.');
      setActiveTab('basic');
      return;
    }

    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const endpoint = formData.id ? `/api/products/${formData.id}` : '/api/products';
      const method = formData.id ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setIsDirty(false);
        setSuccessMsg('Product saved successfully!');
        setTimeout(() => {
          router.push('/admin/products');
        }, 1000);
      } else {
        setError(data.error || 'Failed to save product');
      }
    } catch (err: any) {
      setError('Server error while saving product record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-[#e8e2d5] shadow-xs">
        <button
          onClick={() => {
            if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return;
            router.push('/admin/products');
          }}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Product List</span>
        </button>

        {formData.slug && (
          <Link
            href={`/products/${formData.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#c5a059] hover:underline"
          >
            <span>Preview Public Store Page</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Error / Success Feedback */}
      {error && (
        <div className="bg-rose-100 border border-rose-400 text-rose-800 text-xs p-4 rounded-xl font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}>
            <X className="w-4 h-4 text-rose-500" />
          </button>
        </div>
      )}

      {/* Universal Product Auto-Fill Banner & Quick Actions */}
      <div className="bg-[#183F2B] text-white p-5 rounded-2xl shadow-sm border border-[#183F2B]/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#C5A059]" />
              <h2 className="text-sm font-extrabold tracking-wide uppercase text-white">
                Universal Product Auto-Fill & Publish Engine
              </h2>
            </div>
            <p className="text-xs text-[#FAF8F5]/80 max-w-xl">
              Enter a product title and click Auto-Fill to automatically derive botanical descriptions, ingredients, usage, Auto-SEO, and search indexing.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOneClickAutoFill}
              disabled={autoFilling || !formData.name?.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#C5A059] text-[#183F2B] text-xs font-extrabold rounded-xl hover:bg-[#b59149] transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${autoFilling ? 'animate-spin' : ''}`} />
              <span>{autoFilling ? 'Generating Product Draft...' : '✨ AUTO-FILL PRODUCT'}</span>
            </button>
          </div>
        </div>

        {/* Live Readiness Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 pt-3 border-t border-white/10 text-[11px] font-bold">
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Product Data</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Auto-SEO</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Search Index</span>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Schema.org</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
            formData.price && formData.price > 0 ? 'bg-white/10 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {formData.price && formData.price > 0 ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{formData.price && formData.price > 0 ? `Price: ₹${formData.price}` : 'Price Needed'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
            formData.sku && formData.sku !== 'MD-888' ? 'bg-white/10 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {formData.sku && formData.sku !== 'MD-888' ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{formData.sku && formData.sku !== 'MD-888' ? `SKU: ${formData.sku}` : 'SKU Needed'}</span>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
            formData.images && formData.images.length > 0 && !formData.images[0].includes('fallback') ? 'bg-white/10 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
          }`}>
            {formData.images && formData.images.length > 0 && !formData.images[0].includes('fallback') ? <CheckCircle className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            <span>{formData.images && formData.images.length > 0 && !formData.images[0].includes('fallback') ? 'Image Added' : 'Image Needed'}</span>
          </div>
        </div>
      </div>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
        {/* Form Tab Navigation */}
        <div className="flex border-b border-[#e8e2d5] bg-[#f5f1e8] overflow-x-auto text-xs font-bold text-[#0f2d22]">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'basic'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <Info className="w-4 h-4" />
            <span>Basic Info</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pricing')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'pricing'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Pricing & Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('content')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'content'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Description & Details</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'media'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Product Media ({formData.images?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('seo');
              if (!keywordUniverse && formData.id) {
                loadKeywordUniverse();
              }
            }}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'seo'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <Compass className="w-4 h-4 text-[#c5a059]" />
            <span>SEO & Keywords {keywordUniverse ? `(${keywordUniverse.totalKeywords})` : ''}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`px-5 py-3.5 flex items-center gap-2 border-b-2 transition-colors shrink-0 ${
              activeTab === 'display'
                ? 'border-[#1b4332] bg-white text-[#1b4332]'
                : 'border-transparent hover:text-[#1b4332]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Visibility & Display</span>
          </button>
        </div>

        {/* Tab 1: Basic Info */}
        {activeTab === 'basic' && (
          <div className="p-8 space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#0f2d22] font-bold">
                    Product Title / Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAutoFillModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#183F2B] text-white text-[11px] font-bold rounded-lg hover:bg-[#123021] transition-all shadow-xs hover:scale-102 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#C5A059]" />
                    <span>{initialProduct ? 'Generate / Refresh Details' : 'Generate Details'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => {
                    updateForm('name', e.target.value);
                    if (!initialProduct) {
                      updateForm(
                        'slug',
                        e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      );
                    }
                  }}
                  placeholder="e.g. Sojat Pure Ultra-Fine Sifted Henna Powder"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">URL Slug *</label>
                <input
                  type="text"
                  required
                  value={formData.slug || ''}
                  onChange={(e) => updateForm('slug', e.target.value)}
                  placeholder="sojat-pure-henna-powder"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono text-xs focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Category *</label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Product Type / Classification</label>
                <div className="flex gap-2">
                  <select
                    value={['POWDER', 'RAW', 'FINISHED', 'OIL', 'PASTE', 'MIST'].includes((formData.productType || '').toUpperCase()) ? (formData.productType || '').toUpperCase() : 'CUSTOM'}
                    onChange={(e) => {
                      if (e.target.value !== 'CUSTOM') {
                        updateForm('productType', e.target.value);
                      }
                    }}
                    className="w-1/2 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                  >
                    <option value="POWDER">POWDER (Henna & Herbal Powders)</option>
                    <option value="RAW">RAW (Whole Leaves & Raw Herbs)</option>
                    <option value="FINISHED">FINISHED (Cones, Shampoos, Packs)</option>
                    <option value="OIL">OIL (Essential & Hair Oils)</option>
                    <option value="PASTE">PASTE (Body Art & Herbal Paste)</option>
                    <option value="MIST">MIST (Hydrosols & Rose Water)</option>
                    <option value="CUSTOM">Custom Type...</option>
                  </select>
                  <input
                    type="text"
                    value={formData.productType || ''}
                    onChange={(e) => updateForm('productType', e.target.value)}
                    placeholder="Enter type / classification"
                    className="w-1/2 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Product SKU *</label>
                <input
                  type="text"
                  required
                  value={formData.sku || ''}
                  onChange={(e) => updateForm('sku', e.target.value)}
                  placeholder="e.g. MD-HEN-250"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-mono focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">
                  Pack Quantity / Weight *
                </label>
                <input
                  type="text"
                  required
                  value={formData.quantityOrWeight || ''}
                  onChange={(e) => updateForm('quantityOrWeight', e.target.value)}
                  placeholder="e.g. 250g Pack, 100ml Bottle, Pack of 12"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pricing & Stock */}
        {activeTab === 'pricing' && (
          <div className="p-8 space-y-6 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={formData.price ?? 0}
                  onChange={(e) => updateForm('price', Number(e.target.value))}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-bold text-[#1b4332] text-sm focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">
                  Compare-at Original Price (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.compareAtPrice ?? 0}
                  onChange={(e) => updateForm('compareAtPrice', Number(e.target.value))}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Stock Availability</label>
                <select
                  value={formData.stockStatus || 'in_stock'}
                  onChange={(e: any) => updateForm('stockStatus', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl font-semibold focus:outline-none focus:border-[#1b4332]"
                >
                  <option value="in_stock">In Stock (Available)</option>
                  <option value="out_of_stock">Out of Stock</option>
                  <option value="pre_order">Pre-Order</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Detailed Content */}
        {activeTab === 'content' && (
          <div className="p-8 space-y-6 text-xs">
            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Short Description</label>
              <textarea
                rows={2}
                value={formData.shortDescription || ''}
                onChange={(e) => updateForm('shortDescription', e.target.value)}
                placeholder="Brief summary for product cards and search results..."
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Detailed Full Description</label>
              <textarea
                rows={5}
                value={formData.fullDescription || ''}
                onChange={(e) => updateForm('fullDescription', e.target.value)}
                placeholder="Detailed information regarding harvest origin, processing quality, texture..."
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-[#f5f1e8]">
              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Ingredients</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={ingredientInput}
                    onChange={(e) => setIngredientInput(e.target.value)}
                    placeholder="Add ingredient..."
                    className="flex-1 p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="bg-[#1b4332] text-white px-3 py-2.5 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-1">
                  {formData.ingredients?.map((ing, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-[#f5f1e8] p-2 rounded-lg">
                      <span>{ing}</span>
                      <button type="button" onClick={() => handleRemoveIngredient(idx)} className="text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <label className="block text-[#0f2d22] font-bold mb-1">Key Benefits</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={benefitInput}
                    onChange={(e) => setBenefitInput(e.target.value)}
                    placeholder="Add benefit..."
                    className="flex-1 p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="bg-[#1b4332] text-white px-3 py-2.5 rounded-xl font-bold"
                  >
                    Add
                  </button>
                </div>
                <ul className="space-y-1">
                  {formData.benefits?.map((ben, idx) => (
                    <li key={idx} className="flex items-center justify-between bg-[#f5f1e8] p-2 rounded-lg">
                      <span>{ben}</span>
                      <button type="button" onClick={() => handleRemoveBenefit(idx)} className="text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <label className="block text-[#0f2d22] font-bold mb-1">Usage Instructions</label>
              <textarea
                rows={3}
                value={formData.usageInstructions || ''}
                onChange={(e) => updateForm('usageInstructions', e.target.value)}
                placeholder="How to mix, apply, leave on, and wash off..."
                className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Product Media */}
        {activeTab === 'media' && (
          <div className="p-8 space-y-6 text-xs">
            {imageUploadError && (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl font-medium">
                {imageUploadError}
              </div>
            )}

            {/* Option A: Choose from Media Library */}
            <div className="p-5 bg-[#0f2d22] text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#1b4332] text-[#c5a059] flex items-center justify-center shrink-0">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif-heading font-bold text-sm text-white">Central Media Library</h4>
                  <p className="text-[11px] text-gray-300">
                    Select high-resolution botanical images, category photos, or uploaded brand assets.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMediaModalOpen(true)}
                className="bg-[#c5a059] text-[#0f2d22] px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#d4af37] transition-colors shrink-0"
              >
                <ImageIcon className="w-4 h-4" /> Choose from Media Library
              </button>
            </div>

            {/* Option B: Direct File Upload */}
            <div className="space-y-2 pt-2 border-t border-[#f5f1e8]">
              <label className="block text-[#0f2d22] font-bold">Upload Local Image Files</label>
              <div className="border-2 border-dashed border-[#e8e2d5] hover:border-[#1b4332] rounded-2xl p-6 text-center bg-[#fcfbf7] transition-colors cursor-pointer relative">
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/svg+xml"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-8 h-8 text-[#1b4332] mx-auto mb-2" />
                <p className="font-bold text-[#0f2d22]">Click or Drag & Drop Image Files Here</p>
                <p className="text-[11px] text-gray-500 mt-1">Supports JPG, PNG, WEBP, SVG (Max 5MB each)</p>
              </div>
            </div>

            {/* Option C: Paste Image URL */}
            <div className="space-y-2 pt-2 border-t border-[#f5f1e8]">
              <label className="block text-[#0f2d22] font-bold">Or Add External Image URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageInput}
                  onChange={(e) => setImageInput(e.target.value)}
                  placeholder="https://example.com/image.jpg or /images/fallback.svg"
                  className="flex-1 p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl focus:outline-none focus:border-[#1b4332]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="bg-[#1b4332] text-white px-5 py-3 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4 text-[#c5a059]" /> Add URL
                </button>
              </div>
            </div>

            {/* Gallery Preview & Reorder Manager */}
            <div className="space-y-3 pt-4 border-t border-[#f5f1e8]">
              <div className="flex items-center justify-between">
                <label className="block text-[#0f2d22] font-bold">
                  Product Gallery Manager ({formData.images?.length || 0})
                </label>
                <span className="text-[11px] text-gray-500 font-medium">
                  The first image (Index 1) is used as the Primary Product Cover.
                </span>
              </div>

              {(!formData.images || formData.images.length === 0) ? (
                <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-[#e8e2d5] space-y-2">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="font-bold text-gray-600">No Product Images Added Yet</p>
                  <p className="text-[11px]">Select an image from the Media Library, upload a file, or paste a URL.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {formData.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative group border border-[#e8e2d5] rounded-2xl overflow-hidden bg-gray-50 aspect-square shadow-xs flex flex-col justify-between"
                    >
                      <Image src={img} alt={`Gallery Image ${idx + 1}`} fill className="object-cover" unoptimized />

                      {/* Cover Badge */}
                      <div className="absolute top-2 left-2 z-10">
                        {idx === 0 ? (
                          <span className="bg-[#0f2d22] text-[#c5a059] text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 border border-[#c5a059]/40">
                            <Star className="w-3 h-3 fill-[#c5a059]" /> Cover
                          </span>
                        ) : (
                          <span className="bg-[#0f2d22]/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                            #{idx + 1}
                          </span>
                        )}
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-2 right-2 z-10 bg-rose-600 text-white p-1.5 rounded-lg shadow-md hover:bg-rose-700 transition-colors"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Hover Reorder Controls */}
                      <div className="absolute inset-x-0 bottom-0 p-2 bg-[#0f2d22]/80 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-between gap-1 text-white z-10">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(idx)}
                            className="text-[10px] bg-[#c5a059] text-[#0f2d22] font-bold px-2 py-1 rounded-md hover:bg-[#d4af37]"
                            title="Set as Primary Cover"
                          >
                            Set Cover
                          </button>
                        )}

                        <div className="flex items-center gap-1 ml-auto">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'left')}
                              className="p-1 bg-[#1b4332] hover:bg-[#2d6a4f] rounded-md"
                              title="Move Left"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {idx < (formData.images?.length || 0) - 1 && (
                            <button
                              type="button"
                              onClick={() => handleMoveImage(idx, 'right')}
                              className="p-1 bg-[#1b4332] hover:bg-[#2d6a4f] rounded-md"
                              title="Move Right"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: SEO & Autonomous Keyword Intelligence */}
        {activeTab === 'seo' && (
          <div className="p-8 space-y-8 text-xs">
              {/* Universal Auto-SEO Engine Intelligence Card */}
              <div className="bg-white p-6 rounded-2xl border-2 border-[#1b4332]/20 shadow-xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#c5a059]" />
                    <h3 className="font-momo-display text-base font-normal text-[#0f2d22]">Universal Auto-SEO Intelligence</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-3 py-1 rounded-full font-extrabold text-[11px] border ${
                        autoSeo.status === 'SEO_READY'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : 'bg-amber-50 text-amber-800 border-amber-300'
                      }`}
                    >
                      {autoSeo.status === 'SEO_READY' ? '✓ SEO READY' : `⚠ ${autoSeo.status.replace(/_/g, ' ')}`}
                    </span>
                    <button
                      type="button"
                      onClick={applyAutoSeoDefaults}
                      className="px-3 py-1 bg-[#1b4332] text-white hover:bg-[#0f2d22] rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Fill With Auto-SEO</span>
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#556059] leading-relaxed">
                  {autoSeo.statusMessage} This system deterministically generates metadata, keywords, and Google snippets for any current or future botanical product.
                </p>

                {/* Primary Keyword & Search Intent Bar */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Primary Target Keyword</span>
                    <span className="font-extrabold text-xs text-[#1b4332]">{autoSeo.primaryKeyword || 'Derived from product name'}</span>
                  </div>
                  <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Search Intent</span>
                    <span className="font-extrabold text-xs text-[#c5a059]">{autoSeo.searchIntent}</span>
                  </div>
                  <div className="bg-[#fcfbf7] p-3 rounded-xl border border-[#e8e2d5]">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Canonical Route</span>
                    <span className="font-mono text-[11px] text-gray-700 truncate block">{autoSeo.canonicalUrl}</span>
                  </div>
                </div>

                {/* Live Google Search Snippet Simulation */}
                <div className="mt-4 bg-[#f8f9fa] p-4 rounded-xl border border-gray-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-sans">
                    <span className="text-emerald-800 font-bold">https://muskydose.in</span>
                    <span>› products › {formData.slug || 'product'}</span>
                  </div>
                  <div className="text-base text-[#1a0dab] font-medium hover:underline cursor-pointer font-sans truncate">
                    {formData.seoTitle ? `${formData.seoTitle} | Musky Dose` : `${autoSeo.seoTitle} | Musky Dose`}
                  </div>
                  <div className="text-xs text-[#4d5156] font-sans line-clamp-2 leading-relaxed">
                    {formData.seoDescription || autoSeo.metaDescription}
                  </div>
                </div>

                {/* Suggested Secondary Keywords */}
                {autoSeo.secondaryKeywords.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[11px] font-bold text-[#0f2d22] block mb-1.5">Suggested Secondary Keywords (Click to add):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {autoSeo.secondaryKeywords.map((kw, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            if (!formData.seoKeywords?.includes(kw)) {
                              setIsDirty(true);
                              setFormData((prev) => ({
                                ...prev,
                                seoKeywords: [...(prev.seoKeywords || []), kw],
                              }));
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f5f1e8] hover:bg-[#e8f3ed] text-[#1b4332] border border-[#e8e2d5] transition-colors cursor-pointer"
                        >
                          + {kw}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Top SEO Metadata Fields */}
              <div className="bg-[#fcfbf7] p-6 rounded-2xl border border-[#e8e2d5] space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-[#c5a059]" />
                    <h3 className="font-bold text-sm text-[#0f2d22]">Product SEO Custom Overrides (Optional)</h3>
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">Manual Values Override Auto-SEO</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#0f2d22]">Custom SEO Title</label>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {(formData.seoTitle || autoSeo.seoTitle).length}/60 chars
                      </span>
                    </div>
                    <input
                      type="text"
                      value={formData.seoTitle || ''}
                      onChange={(e) => updateForm('seoTitle', e.target.value)}
                      placeholder={autoSeo.seoTitle}
                      className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl font-medium text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Leave blank to use the auto-generated botanical title.</p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-[#0f2d22]">Meta Description</label>
                      <span className="text-[10px] text-gray-500 font-semibold">
                        {(formData.seoDescription || autoSeo.metaDescription).length}/160 chars
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={formData.seoDescription || ''}
                      onChange={(e) => updateForm('seoDescription', e.target.value)}
                      placeholder={autoSeo.metaDescription}
                      className="w-full p-3 bg-white border border-[#e8e2d5] rounded-xl font-medium text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Leave blank to use the auto-generated botanical description.</p>
                  </div>

                <div>
                  <label className="block font-bold text-[#0f2d22] mb-1">Target SEO Keywords / Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={seoKeywordInput}
                      onChange={(e) => setSeoKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSeoKeyword();
                        }
                      }}
                      placeholder="Type keyword and press Enter or use suggestions below..."
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-medium text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddSeoKeyword()}
                      className="bg-[#1b4332] text-white px-4 py-2.5 rounded-xl font-bold hover:bg-[#0f2d22] transition-colors"
                    >
                      Add Tag
                    </button>
                  </div>

                  {(formData.seoKeywords || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-3 bg-white rounded-xl border border-[#e8e2d5]">
                      {(formData.seoKeywords || []).map((kw, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#f5f1e8] text-[#1b4332] border border-[#e8e2d5]"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSeoKeyword(i)}
                            className="text-gray-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Robots Indexing & Technical Directives */}
                <div className="pt-4 border-t border-[#e8e2d5] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="font-bold text-[#0f2d22] block">Search Engine Robots Indexing</label>
                      <p className="text-[11px] text-gray-500">
                        Control whether Google and other crawlers should index this product page.
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        formData.robotsIndex !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {formData.robotsIndex !== false ? 'INDEXABLE (index, follow)' : 'EXCLUDED (noindex)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-[#e8e2d5]">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.robotsIndex !== false}
                        onChange={(e) => updateForm('robotsIndex', e.target.checked)}
                        className="mt-0.5 rounded text-[#1b4332] focus:ring-[#1b4332]"
                      />
                      <div>
                        <span className="font-bold text-[#0f2d22] block">Allow Search Indexing (`index`)</span>
                        <span className="text-[10.5px] text-gray-500">
                          Uncheck for discontinued, seasonal, or duplicate products.
                        </span>
                      </div>
                    </label>

                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.robotsFollow !== false}
                        onChange={(e) => updateForm('robotsFollow', e.target.checked)}
                        className="mt-0.5 rounded text-[#1b4332] focus:ring-[#1b4332]"
                      />
                      <div>
                        <span className="font-bold text-[#0f2d22] block">Allow Link Following (`follow`)</span>
                        <span className="text-[10.5px] text-gray-500">
                          Allows search engines to follow outbound links from this page.
                        </span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Social Open Graph Share Image */}
                <div className="pt-4 border-t border-[#e8e2d5] space-y-3">
                  <div>
                    <label className="font-bold text-[#0f2d22] block">Social Share / Open Graph Image (1200×630)</label>
                    <p className="text-[11px] text-gray-500">
                      Thumbnail displayed when this product link is shared on WhatsApp, Facebook, or Twitter.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={formData.ogImageUrl || ''}
                      onChange={(e) => updateForm('ogImageUrl', e.target.value)}
                      placeholder={formData.images?.[0] || 'Leave blank to use primary cover photo...'}
                      className="flex-1 p-2.5 bg-white border border-[#e8e2d5] rounded-xl font-mono text-xs focus:outline-none focus:border-[#1b4332]"
                    />
                    <button
                      type="button"
                      onClick={() => setIsMediaModalOpen(true)}
                      className="px-3.5 py-2 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] border border-[#e8e2d5] rounded-xl font-bold text-xs shrink-0"
                    >
                      Choose from Media Library
                    </button>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-[#e8e2d5] flex items-center gap-3">
                    <div className="relative w-20 h-12 bg-gray-100 rounded-lg overflow-hidden border border-[#e8e2d5] shrink-0">
                      <Image
                        src={formData.ogImageUrl || formData.images?.[0] || '/images/fallback.svg'}
                        alt="Social Share Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <div className="text-[11px] text-gray-600 min-w-0">
                      <p className="font-bold text-[#0f2d22] truncate">
                        {formData.seoTitle || formData.name || 'Product Title'}
                      </p>
                      <p className="text-gray-400 text-[10px] truncate">
                        {formData.ogImageUrl ? 'Using Custom Social Share Image' : 'Using Primary Product Cover Image'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Product SEO Health & Quality Score Card */}
            {seoHealth && (
              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e8e2d5]">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-700" />
                      <h3 className="font-bold text-sm text-[#0f2d22]">Product SEO Health Evaluation</h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          seoHealth.rating === 'EXCELLENT'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : seoHealth.rating === 'GOOD'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}
                      >
                        {seoHealth.overallScore}% — {seoHealth.rating}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      Internal assessment evaluating metadata completeness, keyword universe coverage, and demand matching.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Metadata</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.metadataScore}%</div>
                  </div>
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Completeness</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.completenessScore}%</div>
                  </div>
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Keyword Depth</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.keywordCoverageScore}%</div>
                  </div>
                  <div className="p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl">
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Demand Match</span>
                    <div className="text-base font-extrabold text-[#1b4332] mt-0.5">{seoHealth.demandMatchScore}%</div>
                  </div>
                </div>

                {seoHealth.recommendations?.length > 0 && (
                  <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1.5 text-xs text-amber-900">
                    <div className="font-bold text-[11px] uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5" />
                      <span>Recommended Actions to Improve Health:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                      {seoHealth.recommendations.map((rec: string, idx: number) => (
                        <li key={idx}>{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Semantic Internal Linking Suggestions */}
            {internalLinks?.length > 0 && (
              <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#e8e2d5]">
                  <div>
                    <h3 className="font-bold text-sm text-[#0f2d22] flex items-center gap-2">
                      <Layers className="w-4 h-4 text-[#c5a059]" />
                      <span>Semantic Internal Linking Network</span>
                    </h3>
                    <p className="text-[11px] text-gray-500">
                      Recommended internal links to strengthen topical authority and cross-product discovery.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  {internalLinks.map((link: any) => (
                    <div key={link.id} className="p-3 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] flex flex-col justify-between gap-1.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-[#0f2d22]">{link.targetTitle}</span>
                          <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                            {link.targetType}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-600 italic mt-0.5">&ldquo;{link.anchorText}&rdquo;</div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[10px] text-stone-500">
                        <span className="font-mono truncate max-w-[120px]">{link.targetUrl}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (typeof navigator !== 'undefined') {
                                navigator.clipboard.writeText(`[${link.anchorText}](${link.targetUrl})`);
                                alert('Copied markdown link to clipboard!');
                              }
                            }}
                            className="px-2 py-0.5 rounded bg-white border border-[#e8e2d5] font-bold text-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-colors"
                            title="Copy Markdown Link"
                          >
                            Copy Link
                          </button>
                          <span className="font-bold text-emerald-700">{link.relevanceScore}% Fit</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Autonomous Keyword Intelligence Assistant */}
            <div className="bg-white p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e8e2d5]">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#c5a059]" />
                    <h3 className="font-bold text-sm text-[#0f2d22]">Autonomous Keyword Universe</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      LIVE AI ENGINE
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Automatically derived across 10 strategic categories with real Google Search demand matching.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => loadKeywordUniverse(true)}
                  disabled={loadingUniverse}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-[#1b4332] bg-[#f5f1e8] border border-[#e8e2d5] hover:bg-[#e8e2d5] transition-colors shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingUniverse ? 'animate-spin' : ''}`} />
                  <span>{loadingUniverse ? 'Generating Universe...' : 'Re-Sync Universe'}</span>
                </button>
              </div>

              {loadingUniverse && !keywordUniverse && (
                <div className="p-8 text-center text-gray-500 font-bold">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#c5a059] mb-2" />
                  <p>Analyzing botanical attributes and generating keyword universe...</p>
                </div>
              )}

              {keywordUniverse && (
                <div className="space-y-6">
                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Targets</div>
                      <div className="text-lg font-black text-[#1b4332] mt-0.5">{keywordUniverse.totalKeywords}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Verified Demand</div>
                      <div className="text-lg font-black text-emerald-800 mt-0.5">{keywordUniverse.verifiedCount}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200">
                      <div className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Content Opportunities</div>
                      <div className="text-lg font-black text-amber-800 mt-0.5">{keywordUniverse.opportunityCount}</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5]">
                      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Categories</div>
                      <div className="text-lg font-black text-[#1b4332] mt-0.5">10 Types</div>
                    </div>
                  </div>

                  {/* AI Quick Suggestions */}
                  <div className="p-4 rounded-xl bg-[#f5f1e8] border border-[#e8e2d5] space-y-3">
                    <div className="font-bold text-xs text-[#0f2d22] flex items-center gap-1.5">
                      <Lightbulb className="w-4 h-4 text-[#c5a059]" />
                      <span>One-Click SEO Suggestions</span>
                    </div>

                    <div className="space-y-2 text-[11px]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-600 w-24 shrink-0">Primary:</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateForm('seoTitle', `${keywordUniverse.suggestedPrimary} | Musky Dose`);
                            handleAddSeoKeyword(keywordUniverse.suggestedPrimary);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-white border border-[#e8e2d5] font-bold text-[#1b4332] hover:bg-[#1b4332] hover:text-white transition-colors"
                        >
                          + {keywordUniverse.suggestedPrimary}
                        </button>
                      </div>

                      {keywordUniverse.suggestedSecondary?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-gray-600 w-24 shrink-0">Secondary:</span>
                          {keywordUniverse.suggestedSecondary.slice(0, 4).map((kw: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleAddSeoKeyword(kw)}
                              className="px-2 py-0.5 rounded-md bg-white border border-[#e8e2d5] text-[10px] font-semibold text-gray-700 hover:bg-[#1b4332] hover:text-white transition-colors"
                            >
                              + {kw}
                            </button>
                          ))}
                        </div>
                      )}

                      {keywordUniverse.suggestedQuestions?.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-gray-600 w-24 shrink-0">FAQ Queries:</span>
                          {keywordUniverse.suggestedQuestions.slice(0, 3).map((kw: string, idx: number) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-md bg-white/70 border border-[#e8e2d5] text-[10px] italic text-gray-600"
                            >
                              &ldquo;{kw}&rdquo;
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Category Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 text-[11px] font-bold">
                    {['ALL', 'PRIMARY', 'SECONDARY', 'LONG_TAIL', 'QUESTION', 'BUYER_INTENT', 'BENEFIT', 'USE_CASE', 'INGREDIENT', 'REGIONAL', 'SEMANTIC'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveUniverseCategory(cat)}
                        className={`px-3 py-1.5 rounded-xl border transition-colors shrink-0 ${
                          activeUniverseCategory === cat
                            ? 'bg-[#1b4332] text-white border-[#1b4332]'
                            : 'bg-[#fcfbf7] text-gray-600 border-[#e8e2d5] hover:border-[#1b4332]'
                        }`}
                      >
                        {cat.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Keyword Targets Table */}
                  <div className="border border-[#e8e2d5] rounded-xl overflow-hidden overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#f5f1e8] text-[#0f2d22] font-bold border-b border-[#e8e2d5]">
                        <tr>
                          <th className="p-3">Keyword Candidate</th>
                          <th className="p-3">Category</th>
                          <th className="p-3">Intent</th>
                          <th className="p-3">Relevance</th>
                          <th className="p-3">Verified Demand</th>
                          <th className="p-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e8e2d5]">
                        {keywordUniverse.keywords
                          .filter((k: any) => activeUniverseCategory === 'ALL' || k.keywordType === activeUniverseCategory)
                          .slice(0, 40)
                          .map((kw: any) => (
                            <tr key={kw.id} className="hover:bg-[#fcfbf7] transition-colors">
                              <td className="p-3 font-bold text-[#0f2d22]">
                                <div className="flex items-center gap-2">
                                  <span>{kw.keyword}</span>
                                  {kw.isOpportunity && (
                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-100 text-amber-800" title={kw.opportunityReason}>
                                      OPPORTUNITY
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                                  {kw.keywordType}
                                </span>
                              </td>
                              <td className="p-3 text-[11px] text-gray-500 font-medium">{kw.searchIntent}</td>
                              <td className="p-3 font-bold text-[#1b4332]">{kw.relevanceScore}%</td>
                              <td className="p-3">
                                {kw.verifiedSearchVolume ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                                    <span>{kw.verifiedSearchVolume.toLocaleString()}/mo</span>
                                    {kw.verifiedTrend === 'RISING' && <span>📈</span>}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-gray-400 font-medium italic">Unverified</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleAddSeoKeyword(kw.keyword)}
                                  className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#1b4332] text-white hover:bg-[#0f2d22] transition-colors"
                                >
                                  + Add to SEO
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Visibility & Display */}
        {activeTab === 'display' && (
          <div className="p-8 space-y-6 text-xs">
            <div className="space-y-4">
              <label className="flex items-center gap-3 p-4 rounded-xl border border-[#e8e2d5] bg-[#fcfbf7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) => updateForm('isActive', e.target.checked)}
                  className="w-5 h-5 accent-[#1b4332]"
                />
                <div>
                  <div className="font-bold text-[#0f2d22] text-sm">Active in Public Store</div>
                  <div className="text-[11px] text-gray-500">
                    When checked, product is visible to public visitors and customers.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 rounded-xl border border-[#e8e2d5] bg-[#fcfbf7] cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured ?? false}
                  onChange={(e) => updateForm('isFeatured', e.target.checked)}
                  className="w-5 h-5 accent-[#1b4332]"
                />
                <div>
                  <div className="font-bold text-[#0f2d22] text-sm">Featured Product</div>
                  <div className="text-[11px] text-gray-500">
                    Display in the prominent Featured section on the Homepage.
                  </div>
                </div>
              </label>

              <div className="p-4 rounded-xl border border-[#e8e2d5] bg-[#fcfbf7]">
                <label className="block font-bold text-[#0f2d22] mb-1">Sort Display Order</label>
                <input
                  type="number"
                  value={formData.sortOrder ?? 1}
                  onChange={(e) => updateForm('sortOrder', Number(e.target.value))}
                  className="w-32 p-2.5 bg-white border border-[#e8e2d5] rounded-xl text-xs font-bold focus:outline-none focus:border-[#1b4332]"
                />
                <p className="text-[11px] text-gray-500 mt-1">Lower numbers appear first in catalog listings.</p>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Save Action Footer */}
        <div className="p-6 bg-[#f5f1e8] border-t border-[#e8e2d5] flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              if (isDirty && !confirm('You have unsaved changes. Leave anyway?')) return;
              router.push('/admin/products');
            }}
            className="px-5 py-3 rounded-xl font-bold text-gray-600 hover:bg-gray-200 transition-colors text-xs"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-7 py-3 rounded-xl font-bold text-xs shadow hover:bg-[#0f2d22] transition-colors disabled:opacity-50 shrink-0"
          >
            <Save className="w-4 h-4 text-[#c5a059]" />
            <span>{saving ? 'Saving Product Record...' : 'Save Product Record'}</span>
          </button>
        </div>
      </form>

      <MediaSelectModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelect={(url) => handleSelectFromMediaLibrary(url)}
        categoryFilter="products"
        title="Select Product Gallery Image"
      />
    </div>
  );
}
