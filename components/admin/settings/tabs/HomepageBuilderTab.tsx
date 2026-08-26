'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  SiteSettings,
  WhyCard,
  TestimonialItem,
  HomepageSectionConfig,
  HomepageItemConfig,
  Product,
  Category,
} from '@/lib/types';
import {
  DEFAULT_WHY_CARDS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_HOMEPAGE_SECTIONS,
} from '@/lib/data-store';
import {
  Layout,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Sparkles,
  Layers,
  ShoppingBag,
  Star,
  GripVertical,
  Search,
  Filter,
  FolderTree,
} from 'lucide-react';
import { sanitizeImageUrl } from '@/lib/utils';

interface HomepageBuilderTabProps {
  settings: SiteSettings;
  updateField: (key: keyof SiteSettings, value: any) => void;
  setSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  setMediaModalTarget: (target: 'logoUrl' | 'faviconUrl' | 'heroImageUrl' | 'factoryImageUrl' | 'ogImageUrl' | null) => void;
  products?: Product[];
  categories?: Category[];
}

export default function HomepageBuilderTab({
  settings,
  updateField,
  setSettings,
  products: propProducts = [],
  categories: propCategories = [],
}: HomepageBuilderTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sections' | 'products' | 'categories' | 'content'>('sections');
  
  // Local products & categories state with client fallback fetching
  const [allProducts, setAllProducts] = useState<Product[]>(propProducts);
  const [allCategories, setAllCategories] = useState<Category[]>(propCategories);
  const [searchProductQuery, setSearchProductQuery] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');

  // Drag state
  const [draggedSectionIndex, setDraggedSectionIndex] = useState<number | null>(null);
  const [draggedProductIndex, setDraggedProductIndex] = useState<number | null>(null);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  // Sync prop changes or fetch if empty
  useEffect(() => {
    if (propProducts.length > 0) {
      setAllProducts(propProducts);
    } else {
      fetch('/api/products?all=true')
        .then((r) => r.json())
        .then((data) => {
          if (data?.data?.products || data?.products) {
            setAllProducts(data.data?.products || data.products);
          }
        })
        .catch(() => {});
    }
  }, [propProducts]);

  useEffect(() => {
    if (propCategories.length > 0) {
      setAllCategories(propCategories);
    } else {
      fetch('/api/categories')
        .then((r) => r.json())
        .then((data) => {
          if (data?.data?.categories || data?.categories) {
            setAllCategories(data.data?.categories || data.categories);
          }
        })
        .catch(() => {});
    }
  }, [propCategories]);

  // Why Cards & Testimonials
  const whyCards = settings.whyCards && settings.whyCards.length > 0 ? settings.whyCards : DEFAULT_WHY_CARDS;
  const testimonials = settings.testimonials && settings.testimonials.length > 0 ? settings.testimonials : DEFAULT_TESTIMONIALS;

  // ---------------------------------------------------------------------------
  // 1. SECTION ORDERING & MERCHANDISING
  // ---------------------------------------------------------------------------
  const currentSections: HomepageSectionConfig[] =
    settings.homepageSections && settings.homepageSections.length > 0
      ? [...settings.homepageSections].sort((a, b) => a.sortOrder - b.sortOrder)
      : DEFAULT_HOMEPAGE_SECTIONS;

  const handleToggleSection = (secId: string) => {
    const updated = currentSections.map((s) => (s.id === secId ? { ...s, enabled: !s.enabled } : s));
    updateField('homepageSections', updated);
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentSections.length) return;

    const list = [...currentSections];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reordered = list.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    updateField('homepageSections', reordered);
  };

  const handleDropSection = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= currentSections.length || toIndex >= currentSections.length) return;
    const list = [...currentSections];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const reordered = list.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    updateField('homepageSections', reordered);
    setDraggedSectionIndex(null);
  };

  const handleSectionDetailChange = (secId: string, field: keyof HomepageSectionConfig, val: any) => {
    const updated = currentSections.map((s) => (s.id === secId ? { ...s, [field]: val } : s));
    updateField('homepageSections', updated);
  };

  // ---------------------------------------------------------------------------
  // 2. PRODUCT ORDERING & MERCHANDISING
  // ---------------------------------------------------------------------------
  const mergedProducts = React.useMemo(() => {
    const configuredMap = new Map<string, HomepageItemConfig>(
      (settings.homepageProducts || []).map((p) => [p.id, p])
    );

    return [...allProducts].map((prod, index) => {
      const config = configuredMap.get(prod.id);
      return {
        product: prod,
        enabled: config ? config.enabled !== false : true,
        sortOrder: config ? config.sortOrder : index + 1,
        isFeatured: config?.isFeatured !== undefined ? config.isFeatured : prod.isFeatured ?? false,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [allProducts, settings.homepageProducts]);

  const handleToggleProductVisibility = (prodId: string) => {
    const updatedConfigs: HomepageItemConfig[] = mergedProducts.map((item) => ({
      id: item.product.id,
      enabled: item.product.id === prodId ? !item.enabled : item.enabled,
      sortOrder: item.sortOrder,
      isFeatured: item.isFeatured,
    }));
    updateField('homepageProducts', updatedConfigs);
  };

  const handleToggleProductFeatured = (prodId: string) => {
    const updatedConfigs: HomepageItemConfig[] = mergedProducts.map((item) => ({
      id: item.product.id,
      enabled: item.enabled,
      sortOrder: item.sortOrder,
      isFeatured: item.product.id === prodId ? !item.isFeatured : item.isFeatured,
    }));
    updateField('homepageProducts', updatedConfigs);
  };

  const handleMoveProduct = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mergedProducts.length) return;

    const list = [...mergedProducts];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reorderedConfigs: HomepageItemConfig[] = list.map((item, idx) => ({
      id: item.product.id,
      enabled: item.enabled,
      sortOrder: idx + 1,
      isFeatured: item.isFeatured,
    }));

    updateField('homepageProducts', reorderedConfigs);
  };

  const handleDropProduct = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= mergedProducts.length || toIndex >= mergedProducts.length) return;
    const list = [...mergedProducts];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const reorderedConfigs: HomepageItemConfig[] = list.map((item, idx) => ({
      id: item.product.id,
      enabled: item.enabled,
      sortOrder: idx + 1,
      isFeatured: item.isFeatured,
    }));

    updateField('homepageProducts', reorderedConfigs);
    setDraggedProductIndex(null);
  };

  // ---------------------------------------------------------------------------
  // 3. CATEGORY ORDERING & MERCHANDISING
  // ---------------------------------------------------------------------------
  const mergedCategories = React.useMemo(() => {
    const configuredMap = new Map<string, HomepageItemConfig>(
      (settings.homepageCategories || []).map((c) => [c.id, c])
    );

    return [...allCategories].map((cat, index) => {
      const config = configuredMap.get(cat.id);
      return {
        category: cat,
        enabled: config ? config.enabled !== false : true,
        sortOrder: config ? config.sortOrder : index + 1,
      };
    }).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [allCategories, settings.homepageCategories]);

  const handleToggleCategoryVisibility = (catId: string) => {
    const updatedConfigs: HomepageItemConfig[] = mergedCategories.map((item) => ({
      id: item.category.id,
      enabled: item.category.id === catId ? !item.enabled : item.enabled,
      sortOrder: item.sortOrder,
    }));
    updateField('homepageCategories', updatedConfigs);
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= mergedCategories.length) return;

    const list = [...mergedCategories];
    const [moved] = list.splice(index, 1);
    list.splice(targetIndex, 0, moved);

    const reorderedConfigs: HomepageItemConfig[] = list.map((item, idx) => ({
      id: item.category.id,
      enabled: item.enabled,
      sortOrder: idx + 1,
    }));

    updateField('homepageCategories', reorderedConfigs);
  };

  const handleDropCategory = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0 || fromIndex >= mergedCategories.length || toIndex >= mergedCategories.length) return;
    const list = [...mergedCategories];
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);

    const reorderedConfigs: HomepageItemConfig[] = list.map((item, idx) => ({
      id: item.category.id,
      enabled: item.enabled,
      sortOrder: idx + 1,
    }));

    updateField('homepageCategories', reorderedConfigs);
    setDraggedCategoryIndex(null);
  };

  // ---------------------------------------------------------------------------
  // 4. VALUE PROPOSITIONS & REVIEWS HANDLERS
  // ---------------------------------------------------------------------------
  const handleAddWhyCard = () => {
    const newCard: WhyCard = {
      id: `why-${Date.now()}`,
      title: 'New Value Proposition',
      description: 'Highlight a core strength of Musky Dose products and Sojat manufacturing.',
      icon: 'ShieldCheck',
      enabled: true,
      sortOrder: whyCards.length + 1,
    };
    setSettings((prev) => ({ ...prev, whyCards: [...(prev.whyCards || DEFAULT_WHY_CARDS), newCard] }));
  };

  const handleUpdateWhyCard = (id: string, field: keyof WhyCard, value: any) => {
    const updated = whyCards.map((c) => (c.id === id ? { ...c, [field]: value } : c));
    setSettings((prev) => ({ ...prev, whyCards: updated }));
  };

  const handleDeleteWhyCard = (id: string) => {
    const updated = whyCards.filter((c) => c.id !== id);
    setSettings((prev) => ({ ...prev, whyCards: updated }));
  };

  const handleMoveWhyCard = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= whyCards.length) return;
    const updated = [...whyCards];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSettings((prev) => ({ ...prev, whyCards: updated }));
  };

  const handleAddTestimonial = () => {
    const newTestimonial: TestimonialItem = {
      id: `test-${Date.now()}`,
      customerName: 'Customer Name',
      location: 'Verified Buyer',
      reviewText: 'Authentic feedback praising pure Sojat henna quality, fast delivery, and results.',
      rating: 5,
      enabled: true,
      sortOrder: testimonials.length + 1,
    };
    setSettings((prev) => ({ ...prev, testimonials: [...(prev.testimonials || DEFAULT_TESTIMONIALS), newTestimonial] }));
  };

  const handleUpdateTestimonial = (id: string, field: keyof TestimonialItem, value: any) => {
    const updated = testimonials.map((t) => (t.id === id ? { ...t, [field]: value } : t));
    setSettings((prev) => ({ ...prev, testimonials: updated }));
  };

  const handleDeleteTestimonial = (id: string) => {
    const updated = testimonials.filter((t) => t.id !== id);
    setSettings((prev) => ({ ...prev, testimonials: updated }));
  };

  const handleMoveTestimonial = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= testimonials.length) return;
    const updated = [...testimonials];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    setSettings((prev) => ({ ...prev, testimonials: updated }));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-[#e8e2d5] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#0f2d22] flex items-center gap-2">
            <Layout className="w-6 h-6 text-[#c5a059]" />
            <span>Homepage Merchandising & Builder</span>
          </h3>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Drag & drop products, categories, and sections to visually control the customer homepage layout.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-[#f5f1e8] rounded-xl border border-[#e8e2d5] flex-wrap">
          <button
            type="button"
            onClick={() => setActiveSubTab('sections')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'sections'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#0f2d22] hover:bg-white/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sections ({currentSections.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('products')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'products'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#0f2d22] hover:bg-white/60'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Products ({allProducts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#0f2d22] hover:bg-white/60'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Categories ({allCategories.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('content')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'content'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#0f2d22] hover:bg-white/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Content & Reviews</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: HOMEPAGE SECTIONS */}
      {/* ========================================================================= */}
      {activeSubTab === 'sections' && (
        <div className="space-y-5">
          <div className="bg-[#fcfbf7] p-5 sm:p-6 rounded-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
              <div>
                <h4 className="font-bold text-[#0f2d22] text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#c5a059]" />
                  <span>Homepage Section Order & Display</span>
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  Drag sections using the handle (☰) or use Up/Down arrow buttons to reorder.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const missing = DEFAULT_HOMEPAGE_SECTIONS.filter((d) => !currentSections.some((c) => c.id === d.id));
                    if (missing.length === 0) {
                      alert('All default sections are already present.');
                      return;
                    }
                    const updated = [...currentSections, ...missing].map((s, idx) => ({ ...s, sortOrder: idx + 1 }));
                    updateField('homepageSections', updated);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-[#e8e2d5] bg-white text-[#1b4332] font-bold text-xs hover:bg-[#f5f1e8] cursor-pointer"
                >
                  + Restore Defaults
                </button>
                <button
                  type="button"
                  onClick={() => updateField('homepageSections', DEFAULT_HOMEPAGE_SECTIONS)}
                  className="text-xs text-red-700 hover:text-red-900 font-semibold underline px-2 py-1 cursor-pointer"
                >
                  Reset All
                </button>
              </div>
            </div>

            {/* Sections Draggable List */}
            <div className="space-y-3">
              {currentSections.map((sec, idx) => {
                const isDragging = draggedSectionIndex === idx;
                return (
                  <div
                    key={sec.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      setDraggedSectionIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      handleDropSection(isNaN(from) ? (draggedSectionIndex ?? idx) : from, idx);
                    }}
                    onDragEnd={() => setDraggedSectionIndex(null)}
                    className={`p-4 rounded-xl border transition-all ${
                      isDragging
                        ? 'opacity-40 border-dashed border-[#1b4332] bg-emerald-50'
                        : sec.enabled
                        ? 'bg-white border-[#e8e2d5] shadow-2xs hover:border-[#c5a059]'
                        : 'bg-gray-100/80 border-gray-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                      {/* Left: Drag Handle, Position & Name */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#1b4332] p-1"
                          title="Drag to reorder section"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

                        <span className="w-7 h-7 rounded-lg bg-[#f5f1e8] text-[#0f2d22] font-bold text-xs flex items-center justify-center shrink-0 border border-[#e8e2d5]">
                          {idx + 1}
                        </span>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h5 className="font-bold text-[#0f2d22] text-sm truncate">{sec.name}</h5>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                sec.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                              }`}
                            >
                              {sec.enabled ? 'Visible' : 'Hidden'}
                            </span>
                          </div>
                          <p className="text-[#c5a059] font-medium text-[11px] truncate">
                            Section ID: <span className="font-mono">{sec.id}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Controls (Visibility Toggle + Up/Down Fallback) */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleToggleSection(sec.id)}
                          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                            sec.enabled
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                          }`}
                        >
                          {sec.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{sec.enabled ? 'Enabled' : 'Hidden'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveSection(idx, 'up')}
                          className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] text-[#0f2d22] hover:bg-[#e8e2d5] disabled:opacity-30 cursor-pointer"
                          title="Move section up"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === currentSections.length - 1}
                          onClick={() => handleMoveSection(idx, 'down')}
                          className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] text-[#0f2d22] hover:bg-[#e8e2d5] disabled:opacity-30 cursor-pointer"
                          title="Move section down"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Section Editable Details if visible */}
                    {sec.enabled && (
                      <div className="mt-3 pt-3 border-t border-[#f0ece1] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                        <div>
                          <label className="block text-[10px] font-bold text-[#0f2d22] mb-1">Section Heading</label>
                          <input
                            type="text"
                            value={sec.heading || ''}
                            onChange={(e) => handleSectionDetailChange(sec.id, 'heading', e.target.value)}
                            placeholder="Optional section heading"
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22]"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-[#0f2d22] mb-1">Section Subheading</label>
                          <input
                            type="text"
                            value={sec.subheading || ''}
                            onChange={(e) => handleSectionDetailChange(sec.id, 'subheading', e.target.value)}
                            placeholder="Optional eyebrow / badge"
                            className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22]"
                          />
                        </div>

                        {(sec.id === 'bestsellers' || sec.id === 'other_products' || sec.id === 'categories') && (
                          <div>
                            <label className="block text-[10px] font-bold text-[#0f2d22] mb-1">Item Display Limit</label>
                            <select
                              value={sec.itemLimit ?? (sec.id === 'categories' ? 6 : 8)}
                              onChange={(e) => handleSectionDetailChange(sec.id, 'itemLimit', parseInt(e.target.value, 10))}
                              className="w-full p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-bold text-[#0f2d22]"
                            >
                              <option value={4}>Show 4 Items</option>
                              <option value={6}>Show 6 Items</option>
                              <option value={8}>Show 8 Items</option>
                              <option value={12}>Show 12 Items</option>
                              <option value={24}>Show 24 Items</option>
                            </select>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: HOMEPAGE PRODUCTS MERCHANDISING */}
      {/* ========================================================================= */}
      {activeSubTab === 'products' && (
        <div className="space-y-5">
          <div className="bg-[#fcfbf7] p-5 sm:p-6 rounded-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
              <div>
                <h4 className="font-bold text-[#0f2d22] text-base flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#c5a059]" />
                  <span>Homepage Product Ordering & Merchandising</span>
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  Drag products to change their display order on the homepage. Position 1 appears first.
                </p>
              </div>

              {/* Reset to Catalog Default */}
              <button
                type="button"
                onClick={() => {
                  const defaultConfigs: HomepageItemConfig[] = allProducts.map((p, idx) => ({
                    id: p.id,
                    enabled: true,
                    sortOrder: idx + 1,
                    isFeatured: p.isFeatured ?? false,
                  }));
                  updateField('homepageProducts', defaultConfigs);
                }}
                className="px-3 py-1.5 rounded-lg border border-[#e8e2d5] bg-white text-[#1b4332] font-bold text-xs hover:bg-[#f5f1e8] self-start sm:self-auto cursor-pointer"
              >
                Reset Product Order
              </button>
            </div>

            {/* Product Filtering Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-[#e8e2d5]">
              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search products to reorder..."
                  value={searchProductQuery}
                  onChange={(e) => setSearchProductQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs text-[#0f2d22]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-[#c5a059]" />
                <select
                  value={productCategoryFilter}
                  onChange={(e) => setProductCategoryFilter(e.target.value)}
                  className="p-2 bg-[#fcfbf7] border border-[#e8e2d5] rounded-lg text-xs font-semibold text-[#0f2d22]"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products Draggable List */}
            <div className="space-y-2.5">
              {mergedProducts
                .filter((item) => {
                  const matchSearch =
                    !searchProductQuery.trim() ||
                    item.product.name.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
                    item.product.sku?.toLowerCase().includes(searchProductQuery.toLowerCase());
                  const matchCat =
                    productCategoryFilter === 'all' ||
                    item.product.categoryId === productCategoryFilter;
                  return matchSearch && matchCat;
                })
                .map((item, idx) => {
                  const isDragging = draggedProductIndex === idx;
                  const isDraft = item.product.isActive === false;

                  return (
                    <div
                      key={item.product.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', idx.toString());
                        setDraggedProductIndex(idx);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                        handleDropProduct(isNaN(from) ? (draggedProductIndex ?? idx) : from, idx);
                      }}
                      onDragEnd={() => setDraggedProductIndex(null)}
                      className={`p-3 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap ${
                        isDragging
                          ? 'opacity-40 border-dashed border-[#1b4332] bg-emerald-50'
                          : item.enabled
                          ? 'bg-white border-[#e8e2d5] shadow-2xs hover:border-[#c5a059]'
                          : 'bg-gray-100/70 border-gray-200 opacity-60'
                      }`}
                    >
                      {/* Left: Drag Handle, Position, Thumbnail & Product Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#1b4332] p-1"
                          title="Drag to reorder product"
                        >
                          <GripVertical className="w-5 h-5" />
                        </div>

                        <span className="w-7 h-7 rounded-lg bg-[#f5f1e8] text-[#0f2d22] font-bold text-xs flex items-center justify-center shrink-0 border border-[#e8e2d5]">
                          #{item.sortOrder}
                        </span>

                        <div className="w-10 h-10 rounded-lg bg-[#faf8f5] border border-[#e8e2d5] overflow-hidden relative shrink-0">
                          <Image
                            src={sanitizeImageUrl(item.product.images?.[0])}
                            alt={item.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h5 className="font-bold text-[#0f2d22] text-xs sm:text-sm truncate">
                              {item.product.name}
                            </h5>
                            {item.isFeatured && (
                              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[9px] font-bold">
                                ⭐ Featured
                              </span>
                            )}
                            {isDraft && (
                              <span className="px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[9px] font-bold">
                                Inactive Draft (Hidden from Public Storefront)
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                            <span className="font-bold text-[#1b4332]">₹{item.product.price}</span>
                            <span>•</span>
                            <span>{item.product.quantityOrWeight || 'Unit'}</span>
                            <span>•</span>
                            <span className="text-[#c5a059]">{item.product.categoryName || 'Category'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Controls */}
                      <div className="flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0">
                        {/* Featured Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductFeatured(item.product.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            item.isFeatured
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                          }`}
                          title="Toggle Featured Badge"
                        >
                          <Star className="w-3.5 h-3.5 inline mr-1" />
                          <span>{item.isFeatured ? 'Featured' : 'Standard'}</span>
                        </button>

                        {/* Homepage Visibility Toggle */}
                        <button
                          type="button"
                          onClick={() => handleToggleProductVisibility(item.product.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                            item.enabled
                              ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                          }`}
                        >
                          {item.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          <span>{item.enabled ? 'On Homepage' : 'Hidden'}</span>
                        </button>

                        {/* Up / Down Fallback */}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveProduct(idx, 'up')}
                          className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] text-[#0f2d22] hover:bg-[#e8e2d5] disabled:opacity-30 cursor-pointer"
                          title="Move product up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          disabled={idx === mergedProducts.length - 1}
                          onClick={() => handleMoveProduct(idx, 'down')}
                          className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] text-[#0f2d22] hover:bg-[#e8e2d5] disabled:opacity-30 cursor-pointer"
                          title="Move product down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: HOMEPAGE CATEGORIES MERCHANDISING */}
      {/* ========================================================================= */}
      {activeSubTab === 'categories' && (
        <div className="space-y-5">
          <div className="bg-[#fcfbf7] p-5 sm:p-6 rounded-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-3">
              <div>
                <h4 className="font-bold text-[#0f2d22] text-base flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-[#c5a059]" />
                  <span>Homepage Category Ordering & Display</span>
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  Drag categories to reorder them on the homepage. Position 1 appears first.
                </p>
              </div>

              {/* Display Limit Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-[#0f2d22]">Homepage Limit:</label>
                <select
                  value={settings.homepageCategoryCount ?? 6}
                  onChange={(e) => updateField('homepageCategoryCount', parseInt(e.target.value, 10))}
                  className="p-1.5 bg-white border border-[#e8e2d5] rounded-lg text-xs font-bold text-[#0f2d22]"
                >
                  <option value={4}>4 Categories</option>
                  <option value={6}>6 Categories</option>
                  <option value={8}>8 Categories</option>
                  <option value={12}>12 Categories</option>
                  <option value={999}>All Active</option>
                </select>
              </div>
            </div>

            {/* Categories Draggable List */}
            <div className="space-y-2.5">
              {mergedCategories.map((item, idx) => {
                const isDragging = draggedCategoryIndex === idx;
                return (
                  <div
                    key={item.category.id}
                    draggable={true}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                      setDraggedCategoryIndex(idx);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      handleDropCategory(isNaN(from) ? (draggedCategoryIndex ?? idx) : from, idx);
                    }}
                    onDragEnd={() => setDraggedCategoryIndex(null)}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap ${
                      isDragging
                        ? 'opacity-40 border-dashed border-[#1b4332] bg-emerald-50'
                        : item.enabled
                        ? 'bg-white border-[#e8e2d5] shadow-2xs hover:border-[#c5a059]'
                        : 'bg-gray-100/70 border-gray-200 opacity-60'
                    }`}
                  >
                    {/* Left: Drag Handle, Position & Info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#1b4332] p-1"
                        title="Drag to reorder category"
                      >
                        <GripVertical className="w-5 h-5" />
                      </div>

                      <span className="w-7 h-7 rounded-lg bg-[#f5f1e8] text-[#0f2d22] font-bold text-xs flex items-center justify-center shrink-0 border border-[#e8e2d5]">
                        #{idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-[#0f2d22] text-sm truncate">{item.category.name}</h5>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              item.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {item.enabled ? 'Visible' : 'Hidden'}
                          </span>
                        </div>
                        <p className="text-[#c5a059] font-medium text-[11px] truncate">
                          Slug: <span className="font-mono">/categories/{item.category.slug}</span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleToggleCategoryVisibility(item.category.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          item.enabled
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'
                        }`}
                      >
                        {item.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        <span>{item.enabled ? 'Enabled' : 'Hidden'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveCategory(idx, 'up')}
                        className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] text-[#0f2d22] hover:bg-[#e8e2d5] disabled:opacity-30 cursor-pointer"
                        title="Move category up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={idx === mergedCategories.length - 1}
                        onClick={() => handleMoveCategory(idx, 'down')}
                        className="p-1.5 rounded-lg border border-[#e8e2d5] bg-[#fcfbf7] text-[#0f2d22] hover:bg-[#e8e2d5] disabled:opacity-30 cursor-pointer"
                        title="Move category down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: CONTENT & REVIEWS */}
      {/* ========================================================================= */}
      {activeSubTab === 'content' && (
        <div className="space-y-6">
          {/* Why Musky Dose / Brand Promise */}
          <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                <span className="font-bold text-[#0f2d22] text-sm">Value Propositions & Brand Promise ({whyCards.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddWhyCard}
                className="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#0f2d22] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#c5a059]" /> Add Card
              </button>
            </div>

            <div className="space-y-3">
              {whyCards.map((card, idx) => (
                <div key={card.id} className="p-3.5 bg-white border border-[#e8e2d5] rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FAF8F5] border border-[#e8e2d5] text-[10px] font-bold text-[#1b4332] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs text-[#0f2d22]">{card.title}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateWhyCard(card.id, 'enabled', !card.enabled)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          card.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {card.enabled ? 'VISIBLE' : 'HIDDEN'}
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveWhyCard(idx, 'up')}
                        className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === whyCards.length - 1}
                        onClick={() => handleMoveWhyCard(idx, 'down')}
                        className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWhyCard(card.id)}
                        className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px]">Title</label>
                      <input
                        type="text"
                        value={card.title}
                        onChange={(e) => handleUpdateWhyCard(card.id, 'title', e.target.value)}
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px]">Description</label>
                      <input
                        type="text"
                        value={card.description}
                        onChange={(e) => handleUpdateWhyCard(card.id, 'description', e.target.value)}
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="bg-[#fcfbf7] p-5 rounded-2xl border border-[#e8e2d5] space-y-4">
            <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#c5a059]" />
                <span className="font-bold text-[#0f2d22] text-sm">Customer Testimonials & Reviews ({testimonials.length})</span>
              </div>
              <button
                type="button"
                onClick={handleAddTestimonial}
                className="px-3 py-1.5 rounded-lg bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1 hover:bg-[#0f2d22] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#c5a059]" /> Add Review
              </button>
            </div>

            <div className="space-y-3">
              {testimonials.map((item, idx) => (
                <div key={item.id} className="p-3.5 bg-white border border-[#e8e2d5] rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#FAF8F5] border border-[#e8e2d5] text-[10px] font-bold text-[#1b4332] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-xs text-[#0f2d22]">{item.customerName || 'Anonymous Customer'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleUpdateTestimonial(item.id, 'enabled', !item.enabled)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {item.enabled ? 'VISIBLE' : 'HIDDEN'}
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveTestimonial(idx, 'up')}
                        className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === testimonials.length - 1}
                        onClick={() => handleMoveTestimonial(idx, 'down')}
                        className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteTestimonial(item.id)}
                        className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px]">Customer Name</label>
                      <input
                        type="text"
                        value={item.customerName}
                        onChange={(e) => handleUpdateTestimonial(item.id, 'customerName', e.target.value)}
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px]">Location / City</label>
                      <input
                        type="text"
                        value={item.location}
                        onChange={(e) => handleUpdateTestimonial(item.id, 'location', e.target.value)}
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px]">Rating</label>
                      <select
                        value={item.rating}
                        onChange={(e) => handleUpdateTestimonial(item.id, 'rating', parseInt(e.target.value))}
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg font-bold text-xs"
                      >
                        <option value={5}>5 Stars (★★★★★)</option>
                        <option value={4}>4 Stars (★★★★☆)</option>
                        <option value={3}>3 Stars (★★★☆☆)</option>
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-[#0f2d22] text-[10px]">Review Text</label>
                      <textarea
                        rows={2}
                        value={item.reviewText}
                        onChange={(e) => handleUpdateTestimonial(item.id, 'reviewText', e.target.value)}
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
