'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  SiteSettings,
  WhyCard,
  TestimonialItem,
  HomepageSectionConfig,
  HomepageItemConfig,
  HomepageVideoConfig,
  AnnouncementItem,
  Product,
  Category,
} from '@/lib/types';
import {
  DEFAULT_WHY_CARDS,
  DEFAULT_TESTIMONIALS,
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_HOMEPAGE_VIDEO,
  DEFAULT_ANNOUNCEMENTS,
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
  Video,
  Megaphone,
  UploadCloud,
  Film,
  Play,
  Volume2,
  VolumeX,
  Radio,
  ExternalLink,
  Clock,
  Tag,
} from 'lucide-react';
import { sanitizeImageUrl } from '@/lib/utils';
import { uploadMediaFile } from '@/lib/media-upload';

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
  const [activeSubTab, setActiveSubTab] = useState<'sections' | 'products' | 'categories' | 'video' | 'announcements' | 'content'>('sections');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
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

  // ---------------------------------------------------------------------------
  // 5. ANNOUNCEMENTS & TICKER HANDLERS
  // ---------------------------------------------------------------------------
  const announcements: AnnouncementItem[] =
    settings.announcements && settings.announcements.length > 0
      ? settings.announcements
      : DEFAULT_ANNOUNCEMENTS;

  const handleAddAnnouncement = () => {
    const newAnn: AnnouncementItem = {
      id: `ann-${Date.now()}`,
      text: 'Direct Farm Dispatch from Sojat, Rajasthan • Pure Lawsonia Inermis',
      link: '/about',
      enabled: true,
      sortOrder: announcements.length + 1,
      badge: 'ORIGIN SOJAT',
      priority: 'NORMAL',
    };
    updateField('announcements', [...announcements, newAnn]);
  };

  const handleUpdateAnnouncement = (id: string, field: keyof AnnouncementItem, value: any) => {
    const updated = announcements.map((a) => (a.id === id ? { ...a, [field]: value } : a));
    updateField('announcements', updated);
  };

  const handleDeleteAnnouncement = (id: string) => {
    const updated = announcements.filter((a) => a.id !== id);
    updateField('announcements', updated);
  };

  const handleMoveAnnouncement = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= announcements.length) return;
    const updated = [...announcements];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;
    const reordered = updated.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));
    updateField('announcements', reordered);
  };

  // ---------------------------------------------------------------------------
  // 6. HOMEPAGE VIDEO SHOWCASE HANDLERS
  // ---------------------------------------------------------------------------
  const videoConfig: HomepageVideoConfig = settings.homepageVideo || DEFAULT_HOMEPAGE_VIDEO;

  const handleUpdateVideoField = (field: keyof HomepageVideoConfig, value: any) => {
    const updated: HomepageVideoConfig = {
      ...videoConfig,
      [field]: value,
    };
    updateField('homepageVideo', updated);

    // Keep the 'video' section in homepageSections synchronized if present
    if (field === 'enabled') {
      const secIdx = currentSections.findIndex((s) => s.id === 'video' || s.id === 'homepage_video');
      if (secIdx >= 0) {
        const updatedSecs = [...currentSections];
        updatedSecs[secIdx] = { ...updatedSecs[secIdx], enabled: Boolean(value) };
        updateField('homepageSections', updatedSecs);
      }
    }
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setUploadMessage(null);
    try {
      const res = await uploadMediaFile(file, 'videos');
      if (res.success && res.url) {
        handleUpdateVideoField('videoUrl', res.url);
        setUploadMessage({ type: 'success', text: 'Video uploaded and linked successfully!' });
      } else {
        setUploadMessage({ type: 'error', text: res.error || 'Failed to upload video.' });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: `Upload failed: ${err.message || String(err)}` });
    } finally {
      setUploadingVideo(false);
    }
  };

  const handlePosterFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPoster(true);
    setUploadMessage(null);
    try {
      const res = await uploadMediaFile(file, 'banners');
      if (res.success && res.url) {
        handleUpdateVideoField('posterUrl', res.url);
        setUploadMessage({ type: 'success', text: 'Poster image uploaded successfully!' });
      } else {
        setUploadMessage({ type: 'error', text: res.error || 'Failed to upload poster image.' });
      }
    } catch (err: any) {
      setUploadMessage({ type: 'error', text: `Upload failed: ${err.message || String(err)}` });
    } finally {
      setUploadingPoster(false);
    }
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
            Drag & drop products, categories, sections, video showcase, and announcements to visually control the customer storefront.
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
            onClick={() => setActiveSubTab('video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'video'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#0f2d22] hover:bg-white/60'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>Video Showcase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('announcements')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              activeSubTab === 'announcements'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'text-[#0f2d22] hover:bg-white/60'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Announcements ({announcements.length})</span>
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
            <span>Why & Reviews</span>
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

      {/* ========================================================================= */}
      {/* SUB-TAB: HOMEPAGE VIDEO SHOWCASE */}
      {/* ========================================================================= */}
      {activeSubTab === 'video' && (
        <div className="space-y-6">
          <div className="bg-[#fcfbf7] p-5 sm:p-6 rounded-2xl border border-[#e8e2d5] space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-4">
              <div>
                <h4 className="font-bold text-[#0f2d22] text-base flex items-center gap-2">
                  <Video className="w-5 h-5 text-[#c5a059]" />
                  <span>Homepage Video Showcase Section</span>
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  Configure the dedicated brand, harvesting, and traditional Sojat processing video showcase.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateVideoField('enabled', !videoConfig.enabled)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    videoConfig.enabled
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {videoConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>{videoConfig.enabled ? 'SECTION VISIBLE' : 'SECTION HIDDEN'}</span>
                </button>
              </div>
            </div>

            {uploadMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-semibold flex items-center justify-between ${
                  uploadMessage.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <span>{uploadMessage.text}</span>
                <button
                  type="button"
                  onClick={() => setUploadMessage(null)}
                  className="text-gray-500 hover:text-black text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Form Fields */}
              <div className="lg:col-span-7 space-y-4 text-xs">
                {/* Video Media Source */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-3">
                  <h5 className="font-bold text-[#0f2d22] text-xs flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-[#c5a059]" />
                    <span>Video Media Asset (MP4 / WebM)</span>
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Upload an MP4/WebM video file (up to 25MB) or enter an existing HTTPS URL.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="url"
                      placeholder="https://.../video.mp4 or /videos/sojat.mp4"
                      value={videoConfig.videoUrl || ''}
                      onChange={(e) => handleUpdateVideoField('videoUrl', e.target.value)}
                      className="flex-1 p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs font-mono"
                    />
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white rounded-lg font-bold text-xs cursor-pointer shrink-0 transition-colors">
                      <UploadCloud className="w-4 h-4 text-[#c5a059]" />
                      <span>{uploadingVideo ? 'Uploading...' : 'Upload Video'}</span>
                      <input
                        type="file"
                        accept="video/mp4,video/webm"
                        disabled={uploadingVideo}
                        onChange={handleVideoFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Poster / Thumbnail Image */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-3">
                  <h5 className="font-bold text-[#0f2d22] text-xs flex items-center gap-1.5">
                    <Play className="w-4 h-4 text-[#c5a059]" />
                    <span>Poster / Thumbnail Image</span>
                  </h5>
                  <p className="text-[11px] text-gray-500">
                    Lightweight image rendered on initial page load (zero video byte download before play).
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="/images/hero-1.webp or cloud URL"
                      value={videoConfig.posterUrl || ''}
                      onChange={(e) => handleUpdateVideoField('posterUrl', e.target.value)}
                      className="flex-1 p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs font-mono"
                    />
                    <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-[#FAF8F5] hover:bg-[#e8e2d5] text-[#0f2d22] border border-[#e8e2d5] rounded-lg font-bold text-xs cursor-pointer shrink-0 transition-colors">
                      <UploadCloud className="w-4 h-4 text-[#c5a059]" />
                      <span>{uploadingPoster ? 'Uploading...' : 'Upload Poster'}</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={uploadingPoster}
                        onChange={handlePosterFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Content & Headings */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-3">
                  <h5 className="font-bold text-[#0f2d22] text-xs">Section Text & Call to Action</h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Subheading / Eyebrow</label>
                      <input
                        type="text"
                        value={videoConfig.subheading || ''}
                        onChange={(e) => handleUpdateVideoField('subheading', e.target.value)}
                        placeholder="SOJAT HERITAGE IN MOTION"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Video Badge Overlay</label>
                      <input
                        type="text"
                        value={videoConfig.badgeText || ''}
                        onChange={(e) => handleUpdateVideoField('badgeText', e.target.value)}
                        placeholder="DIRECT FROM SOJAT FARMS"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Main Heading</label>
                      <input
                        type="text"
                        value={videoConfig.heading || ''}
                        onChange={(e) => handleUpdateVideoField('heading', e.target.value)}
                        placeholder="Behind The Scenes: Pure Sojat Henna Processing"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs font-bold"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Supporting Description</label>
                      <textarea
                        rows={2}
                        value={videoConfig.description || ''}
                        onChange={(e) => handleUpdateVideoField('description', e.target.value)}
                        placeholder="Experience the traditional harvest, solar drying, and fine micro-sifting of authentic Rajasthani Lawsonia Inermis henna in Sojat City."
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs leading-relaxed"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">CTA Button Text</label>
                      <input
                        type="text"
                        value={videoConfig.ctaText || ''}
                        onChange={(e) => handleUpdateVideoField('ctaText', e.target.value)}
                        placeholder="Explore Henna Collection"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">CTA Button URL</label>
                      <input
                        type="text"
                        value={videoConfig.ctaUrl || ''}
                        onChange={(e) => handleUpdateVideoField('ctaUrl', e.target.value)}
                        placeholder="/categories/henna"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Playback Controls & Performance Flags */}
                <div className="bg-white p-4 rounded-xl border border-[#e8e2d5] space-y-3">
                  <h5 className="font-bold text-[#0f2d22] text-xs">Playback Options & Performance</h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(videoConfig.autoplay)}
                        onChange={(e) => handleUpdateVideoField('autoplay', e.target.checked)}
                        className="rounded text-[#1b4332]"
                      />
                      <span className="font-bold text-[11px] text-[#0f2d22]">Autoplay (Deferred)</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={videoConfig.muted !== false}
                        onChange={(e) => handleUpdateVideoField('muted', e.target.checked)}
                        className="rounded text-[#1b4332]"
                      />
                      <span className="font-bold text-[11px] text-[#0f2d22]">Muted by Default</span>
                    </label>

                    <label className="flex items-center gap-2 p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(videoConfig.loop)}
                        onChange={(e) => handleUpdateVideoField('loop', e.target.checked)}
                        className="rounded text-[#1b4332]"
                      />
                      <span className="font-bold text-[11px] text-[#0f2d22]">Loop Playback</span>
                    </label>
                  </div>

                  <p className="text-[10px] text-gray-500 italic">
                    💡 Performance rule: Autoplay is disabled by default so initial page load transfers 0 KB of video data. Click-to-play ensures fastest Core Web Vitals.
                  </p>
                </div>
              </div>

              {/* Right Column: Live Interactive Preview */}
              <div className="lg:col-span-5 space-y-3">
                <h5 className="font-bold text-[#0f2d22] text-xs">Customer Storefront Preview</h5>
                <div className="bg-[#0f2d22] p-4 rounded-2xl border border-[#2d6a4f]/30 space-y-3 text-white">
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-black/60 border border-[#c5a059]/30 flex items-center justify-center">
                    {videoConfig.posterUrl ? (
                      <Image
                        src={sanitizeImageUrl(videoConfig.posterUrl, '/images/hero-1.webp')}
                        alt="Preview"
                        fill
                        className="object-cover opacity-80"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-3 text-center">
                      <div className="w-12 h-12 rounded-full bg-[#c5a059] text-[#0f2d22] flex items-center justify-center shadow-lg">
                        <Play className="w-6 h-6 fill-[#0f2d22] translate-x-0.5" />
                      </div>
                      <span className="text-[11px] font-bold text-white mt-2 drop-shadow-sm">
                        {videoConfig.videoUrl ? 'HTML5 Video Ready' : 'Poster Mode Active'}
                      </span>
                    </div>
                  </div>

                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-[#c5a059] font-bold uppercase tracking-wider block">
                      {videoConfig.subheading || 'SOJAT HERITAGE IN MOTION'}
                    </span>
                    <h6 className="font-serif-heading text-sm font-bold text-white truncate">
                      {videoConfig.heading || 'Behind The Scenes: Pure Sojat Henna Processing'}
                    </h6>
                    <p className="text-[10px] text-[#b2c8be] line-clamp-2">
                      {videoConfig.description || 'Experience the traditional harvest, solar drying, and fine micro-sifting of authentic Rajasthani Lawsonia Inermis henna in Sojat City.'}
                    </p>
                  </div>

                  {videoConfig.ctaText && (
                    <div className="text-center pt-1">
                      <span className="inline-block px-4 py-1.5 rounded-lg bg-[#c5a059] text-[#0f2d22] font-bold text-[10px] uppercase">
                        {videoConfig.ctaText}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB: ANNOUNCEMENTS & TICKER */}
      {/* ========================================================================= */}
      {activeSubTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-[#fcfbf7] p-5 sm:p-6 rounded-2xl border border-[#e8e2d5] space-y-6">
            {/* Top Bar Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e8e2d5] pb-4">
              <div>
                <h4 className="font-bold text-[#0f2d22] text-base flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#c5a059]" />
                  <span>Announcement Bar & Running Ticker</span>
                </h4>
                <p className="text-gray-500 text-xs mt-0.5">
                  Manage the top announcement line and multi-item CSS running marquee ticker across the storefront.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddAnnouncement}
                  className="px-3.5 py-1.5 rounded-xl bg-[#1b4332] text-white font-bold text-xs flex items-center gap-1.5 hover:bg-[#0f2d22] shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#c5a059]" />
                  <span>Add Announcement</span>
                </button>
              </div>
            </div>

            {/* Global Announcement Settings Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-[#e8e2d5] text-xs">
              <label className="flex items-center gap-2.5 p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcementEnabled !== false}
                  onChange={(e) => updateField('announcementEnabled', e.target.checked)}
                  className="rounded text-[#1b4332]"
                />
                <div>
                  <span className="font-bold text-[#0f2d22] block text-[11px]">Show Announcement Bar</span>
                  <span className="text-[10px] text-gray-500">Master visibility toggle in site header</span>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.announcementTickerEnabled !== false}
                  onChange={(e) => updateField('announcementTickerEnabled', e.target.checked)}
                  className="rounded text-[#1b4332]"
                />
                <div>
                  <span className="font-bold text-[#0f2d22] block text-[11px]">Running Marquee Ticker</span>
                  <span className="text-[10px] text-gray-500">Smooth CSS horizontal scroll for &gt;1 items</span>
                </div>
              </label>

              <div className="p-2.5 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg">
                <label className="font-bold text-[#0f2d22] block text-[11px] mb-1">Ticker Scroll Speed</label>
                <select
                  value={settings.announcementTickerSpeed || 'normal'}
                  onChange={(e) => updateField('announcementTickerSpeed', e.target.value)}
                  className="w-full p-1 bg-white border border-[#e8e2d5] rounded text-xs font-bold text-[#0f2d22]"
                >
                  <option value="slow">Slow & Relaxed (48s)</option>
                  <option value="normal">Normal (32s)</option>
                  <option value="fast">Fast (20s)</option>
                </select>
              </div>
            </div>

            {/* List of Announcements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#0f2d22]">
                <span>Configured Announcements ({announcements.length})</span>
                <span className="text-gray-500 font-normal text-[11px]">Hovering over the ticker pauses animation for readability</span>
              </div>

              {announcements.map((item, idx) => (
                <div key={item.id} className="p-4 bg-white border border-[#e8e2d5] rounded-xl space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-[#FAF8F5] border border-[#e8e2d5] text-[11px] font-bold text-[#1b4332] flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      {item.badge && (
                        <span className="px-2 py-0.5 rounded font-extrabold bg-[#c5a059] text-[#0f2d22] text-[10px] uppercase tracking-wider">
                          {item.badge}
                        </span>
                      )}
                      <span className="font-bold text-xs text-[#0f2d22] truncate max-w-sm">{item.text || 'Untitled Announcement'}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateAnnouncement(item.id, 'enabled', !item.enabled)}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          item.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {item.enabled ? 'ACTIVE' : 'DISABLED'}
                      </button>
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveAnnouncement(idx, 'up')}
                        className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === announcements.length - 1}
                        onClick={() => handleMoveAnnouncement(idx, 'down')}
                        className="p-1 rounded bg-[#FAF8F5] border border-[#e8e2d5] text-[#0f2d22] disabled:opacity-30 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnnouncement(item.id)}
                        className="p-1 rounded bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
                    <div className="sm:col-span-6">
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Announcement Text</label>
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => handleUpdateAnnouncement(item.id, 'text', e.target.value)}
                        placeholder="Direct Farm Dispatch from Sojat, Rajasthan • Pure Lawsonia Inermis"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Badge / Tag (Optional)</label>
                      <input
                        type="text"
                        value={item.badge || ''}
                        onChange={(e) => handleUpdateAnnouncement(item.id, 'badge', e.target.value)}
                        placeholder="ORIGIN SOJAT"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs font-bold uppercase"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block font-semibold text-[#0f2d22] text-[10px] mb-1">Link URL (Optional)</label>
                      <input
                        type="text"
                        value={item.link || ''}
                        onChange={(e) => handleUpdateAnnouncement(item.id, 'link', e.target.value)}
                        placeholder="/about or /wholesale"
                        className="w-full p-2 bg-[#FAF8F5] border border-[#e8e2d5] rounded-lg text-xs font-mono"
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
