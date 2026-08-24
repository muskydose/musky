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
  const [activeTab, setActiveTab] = useState<'basic' | 'pricing' | 'content' | 'media' | 'display'>('basic');
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
    isActive: initialProduct?.isActive ?? true,
    sortOrder: initialProduct?.sortOrder ?? 1,
  });

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
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCategoryChange = (catId: string) => {
    const selected = categories.find((c) => c.id === catId);
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      categoryId: catId,
      categoryName: selected?.name || 'Sojat Herbal',
    }));
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

      const res = await uploadMediaFile(file, 'products');
      if (res.success && res.url) {
        setIsDirty(true);
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), res.url],
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

      {successMsg && (
        <div className="bg-emerald-100 border border-emerald-400 text-emerald-800 text-xs p-4 rounded-xl font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

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
                  placeholder="e.g. Sojat Pure Triple-Shifted Henna Powder"
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
                <select
                  value={formData.productType || 'POWDER'}
                  onChange={(e) => updateForm('productType', e.target.value)}
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                >
                  <option value="POWDER">POWDER (Henna & Herbal Powders)</option>
                  <option value="RAW">RAW (Whole Leaves & Raw Materials)</option>
                  <option value="FINISHED">FINISHED (Cones, Spray, Oil, Shampoos)</option>
                </select>
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

        {/* Tab 5: Visibility & Display */}
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
