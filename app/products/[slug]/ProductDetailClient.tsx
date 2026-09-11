'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, ProductVariant, ProductMediaItem } from '@/lib/types';
import { filterValidActiveVariants } from '@/lib/growth/product-catalog-governance';
import { INITIAL_FAQ_ITEMS } from '@/lib/data-store';
import { getClientSiteSettings } from '@/lib/api-client';
import { useCart } from '@/context/CartContext';
import {
  trackProductView,
  trackAddToCart,
  trackWhatsAppClick,
} from '@/lib/analytics';
import {
  MessageCircle,
  Shield,
  CheckCircle,
  Truck,
  Sparkles,
  ArrowLeft,
  Share2,
  Minus,
  Plus,
  Leaf,
  Check,
  ShoppingBag,
  X,
  Maximize2,
  HelpCircle,
  ChevronDown,
  BookOpen,
  Loader2,
  MapPin,
  RotateCcw,
  Play,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import WholesaleSavingsCard from '@/components/WholesaleSavingsCard';
import { resolveProductWholesaleUnits, formatWholesaleTierUnit } from '@/lib/wholesale-units';
import { resolveCanonicalWholesalePricing } from '@/lib/wholesale-pricing-resolver';
import {
  resolveAuthoritativeProductMedia,
  validateExternalVideoUrl,
} from '@/lib/growth/product-media-governance';

interface ProductDetailClientProps {
  product: Product;
  whatsappNumber: string;
  whatsappTemplate?: string;
  brandName?: string;
  faqItems?: any[];
  relevantGuides?: any[];
  categoryName?: string;
}

export default function ProductDetailClient({
  product,
  whatsappNumber,
  whatsappTemplate,
  brandName = 'Musky Dose',
  faqItems,
  relevantGuides = [],
  categoryName,
}: ProductDetailClientProps) {
  const router = useRouter();
  const { addToCart, openCart, closeCart } = useCart();
  const mediaResolution = React.useMemo(() => {
    return resolveAuthoritativeProductMedia(product);
  }, [product]);

  const allMediaItems: ProductMediaItem[] = React.useMemo(() => {
    return mediaResolution.allMedia || [];
  }, [mediaResolution]);
  const initialMedia = allMediaItems[0] || null;
  const [selectedMediaId, setSelectedMediaId] = useState<string>(initialMedia?.id || '');

  React.useEffect(() => {
    if (allMediaItems.length > 0 && (!selectedMediaId || !allMediaItems.some((m: ProductMediaItem) => m.id === selectedMediaId))) {
      setSelectedMediaId(allMediaItems[0].id);
    }
  }, [allMediaItems, selectedMediaId]);

  const activeMedia: ProductMediaItem | null = React.useMemo(() => {
    return allMediaItems.find((m: ProductMediaItem) => m.id === selectedMediaId) || allMediaItems[0] || null;
  }, [allMediaItems, selectedMediaId]);

  const activeVariants = React.useMemo(() => {
    return filterValidActiveVariants(product);
  }, [product]);

  const defaultVariant = React.useMemo(() => {
    if (activeVariants.length === 0) return null;
    return activeVariants.find((v) => v.isDefault) || activeVariants[0];
  }, [activeVariants]);

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(defaultVariant);

  React.useEffect(() => {
    if (defaultVariant && (!selectedVariant || !activeVariants.some((v) => v.id === selectedVariant.id))) {
      setSelectedVariant(defaultVariant);
    }
  }, [defaultVariant, activeVariants, selectedVariant]);

  const activePrice = selectedVariant?.price ?? product.price;
  const activeComparePrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const activeWeight = selectedVariant?.weight ?? product.quantityOrWeight;
  const activeSku = selectedVariant?.sku ?? product.sku;
  const activeStockStatus = selectedVariant?.stockStatus ?? product.stockStatus;
  const isOutOfStock = activeStockStatus === 'out_of_stock';

  const [quantity, setQuantity] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [hasPurchasedBefore, setHasPurchasedBefore] = useState(false);
  const [bulkRules, setBulkRules] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    description: true,
    howToUse: false,
    ingredients: false,
    specifications: false,
    faq: false,
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  React.useEffect(() => {
    fetch('/api/bulk-pricing')
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.rules)) {
          const matching = data.rules.filter(
            (r: any) => r.isActive && (!r.productId || r.productId === 'global' || r.productId === product.id)
          );
          setBulkRules(matching);
        }
      })
      .catch((err) => console.warn('Failed to load bulk pricing rules for product:', err));
  }, [product.id]);

  const wholesaleUnits = React.useMemo(() => resolveProductWholesaleUnits(product), [product]);
  const sortedBulkRules = React.useMemo(() => {
    return [...bulkRules].sort((a, b) => Number(a.minQuantity || 0) - Number(b.minQuantity || 0));
  }, [bulkRules]);

  const [customBulkQuantity, setCustomBulkQuantity] = useState<string>(
    () => `${wholesaleUnits.minWholesaleQuantity || 5} ${wholesaleUnits.wholesaleUnit || 'kg'}`
  );
  const [faqs, setFaqs] = useState<any[]>(() =>
    Array.isArray(faqItems)
      ? faqItems.filter((f) => f.enabled !== false)
      : INITIAL_FAQ_ITEMS
  );

  // Question Modal State
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [questionName, setQuestionName] = useState('');
  const [questionPhone, setQuestionPhone] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [questionError, setQuestionError] = useState('');
  const [isQuestionSubmitting, setIsQuestionSubmitting] = useState(false);

  // Bulk Price Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkName, setBulkName] = useState('');
  const [bulkPhone, setBulkPhone] = useState('');
  const [bulkReqText, setBulkReqText] = useState('');
  const [bulkError, setBulkError] = useState('');
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const handleOpenQuestionModal = () => {
    setQuestionError('');
    setQuestionName('');
    setQuestionPhone('');
    setQuestionText('');
    setShowQuestionModal(true);
  };

  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuestionError('');

    const cleanName = questionName.trim();
    if (!cleanName || cleanName.length < 2) {
      setQuestionError('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanPhone = questionPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setQuestionError('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }

    const cleanText = questionText.trim();
    if (!cleanText || cleanText.length < 3) {
      setQuestionError('Please enter your question (at least 3 characters).');
      return;
    }

    setIsQuestionSubmitting(true);

    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          productsRequired: `Question: ${product.name} (SKU: ${product.sku || 'N/A'})`,
          approxQuantity: 'N/A (Question)',
          notes: cleanText,
          enquiryType: 'product_question',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to record your question on the server. Please try again.');
      }

      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const msg = `Customer Question:\nName: ${cleanName}\nMobile: ${cleanPhone}\nProduct: ${product.name}\nQuestion: ${cleanText}\n\nProduct URL: ${currentUrl}`;
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
      trackWhatsAppClick({ source: 'Product Detail Question Modal', productId: product.id });
      setShowQuestionModal(false);
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch (err: any) {
      setQuestionError(err.message || 'Unable to save your question. Please try again.');
    } finally {
      setIsQuestionSubmitting(false);
    }
  };

  const handleOpenBulkModal = () => {
    setBulkError('');
    setShowBulkModal(true);
  };

  const handleSendBulkInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBulkSubmitting) return; // Prevent duplicate submissions
    setBulkError('');

    const cleanName = bulkName.trim();
    if (!cleanName || cleanName.length < 2) {
      setBulkError('Please enter your full name (at least 2 characters).');
      return;
    }

    const cleanPhone = bulkPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setBulkError('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }

    const cleanQty = customBulkQuantity.trim();
    if (!cleanQty) {
      setBulkError('Please enter requested quantity.');
      return;
    }

    const cleanReq = bulkReqText.trim();
    if (!cleanReq) {
      setBulkError('Please specify your actual requirement or business notes.');
      return;
    }

    setIsBulkSubmitting(true);

    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          productsRequired: `${product.name} (SKU: ${product.sku || 'N/A'})`,
          approxQuantity: cleanQty,
          notes: cleanReq,
          enquiryType: 'bulk_inquiry',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to record your bulk inquiry on the server. Please try again.');
      }

      const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
      const msg = `Bulk Inquiry:\nCustomer Name: ${cleanName}\nPhone / WhatsApp: ${cleanPhone}\nProduct: ${product.name} (SKU: ${product.sku || 'N/A'})\nRequested Quantity: ${cleanQty}\nRequirement / Message: ${cleanReq}\nProduct Link: ${currentUrl}`;
      const url = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
      trackWhatsAppClick({ source: 'Product Detail Bulk Modal', productId: product.id });
      setShowBulkModal(false);
      if (typeof window !== 'undefined') {
        window.location.href = url;
      }
    } catch (err: any) {
      setBulkError(err.message || 'Unable to save your bulk inquiry. Please try again.');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const [displayPhone, setDisplayPhone] = useState<string>('+91 82337 03080');

  React.useEffect(() => {
    getClientSiteSettings().then((siteSettings) => {
      if (siteSettings?.displayPhone) {
        setDisplayPhone(siteSettings.displayPhone);
      }
      if (Array.isArray(siteSettings?.faqItems)) {
        const enabledFaqs = siteSettings.faqItems
          .filter((f: any) => f.enabled !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        setFaqs(enabledFaqs);
      }
    });
  }, []);

  React.useEffect(() => {
    trackProductView({
      id: product.id,
      name: product.name,
      category: product.categoryName,
      price: product.price,
    });

    try {
      const saved = localStorage.getItem('musky_recent_orders');
      if (saved) {
        const orders = JSON.parse(saved);
        if (Array.isArray(orders)) {
          const bought = orders.some((o: any) =>
            Array.isArray(o.items) && o.items.some((i: any) => i.productId === product.id)
          );
          setHasPurchasedBefore(bought);
        }
      }
    } catch {}
  }, [product]);

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: product.shortDescription || product.name,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or dismissed native share dialog
        return;
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (err) {
        console.warn('Clipboard write failed:', err);
      }
    }
  };

  return (
    <div className="space-y-10 pb-pdp-mobile lg:pb-0">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#626c66] font-medium">
        <Link href="/" className="hover:text-[#1b4332]">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#1b4332]">Products</Link>
        <span>/</span>
        <span className="text-[#0f2d22] font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Image & Video Media Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div 
            className={`relative aspect-square rounded-2xl overflow-hidden border border-[#e8e2d5] shadow-xs group ${
              activeMedia?.type === 'video' ? 'bg-black' : 'bg-[#faf8f5]'
            }`}
          >
            {activeMedia?.type === 'video' ? (
              activeMedia.embedUrl ? (
                <iframe
                  src={activeMedia.embedUrl}
                  title={activeMedia.title || activeMedia.altText || product.name}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video
                  src={activeMedia.url}
                  poster={activeMedia.posterUrl}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              )
            ) : (
              <div
                onClick={() => setShowLightbox(true)}
                className="w-full h-full relative cursor-zoom-in bg-[#faf8f5]"
              >
                <Image
                  src={activeMedia?.url || product.images?.[0] || '/images/fallback.svg'}
                  alt={activeMedia?.altText || product.name}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
              <span className="bg-[#0f2d22]/90 text-[#faf5e8] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs border border-[#c5a059]/30 flex items-center gap-1 shadow-xs">
                <Shield className="w-3.5 h-3.5 text-[#c5a059]" /> Sojat Original
              </span>
              {discountPercent > 0 && (
                <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-xs self-start">
                  SAVE {discountPercent}%
                </span>
              )}
            </div>

            {activeMedia?.type !== 'video' && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowLightbox(true);
                }}
                className="absolute bottom-3 right-3 bg-white/95 hover:bg-white text-[#0f2d22] px-2.5 py-1.5 rounded-xl shadow-2xs transition-colors backdrop-blur-xs flex items-center gap-1 text-[11px] font-semibold border border-[#e8e2d5] cursor-pointer touch-manipulation"
                title="Click to expand image"
              >
                <Maximize2 className="w-3.5 h-3.5 text-[#1b4332]" />
                <span>Zoom</span>
              </button>
            )}
          </div>

          {/* Thumbnails */}
          {allMediaItems.length > 1 && (
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none">
              {allMediaItems.map((item: ProductMediaItem, idx: number) => {
                const isCurrent = activeMedia?.id === item.id;
                return (
                  <button
                    key={item.id || idx}
                    type="button"
                    onClick={() => setSelectedMediaId(item.id)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer touch-manipulation ${
                      isCurrent
                        ? 'border-[#1b4332] ring-2 ring-[#c5a059]/50 opacity-100 scale-102 shadow-xs'
                        : 'border-[#e8e2d5] opacity-75 hover:opacity-100 hover:border-[#1b4332]/40 bg-[#faf8f5]'
                    }`}
                    title={item.title || item.altText || `${product.name} item ${idx + 1}`}
                  >
                    <Image
                      src={item.type === 'video' ? (item.posterUrl || '/images/fallback.svg') : item.url}
                      alt={item.altText || `${product.name} preview ${idx + 1}`}
                      fill
                      className="object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {item.type === 'video' && (
                      <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-[#1b4332] text-white flex items-center justify-center shadow-xs">
                          <Play className="w-3 h-3 fill-current ml-0.5 text-[#c5a059]" />
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Details & Ordering */}
        <div className="lg:col-span-6 space-y-6">
          {/* TITLE */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-[#e8f3ed] text-[#1b4332] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {categoryName || product.categoryName || 'Sojat Henna'}
                </span>
                {hasPurchasedBefore && (
                  <span className="inline-flex items-center gap-1 bg-[#faf5e8] text-[#c5a059] border border-[#c5a059]/40 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shadow-2xs">
                    <RotateCcw className="w-3 h-3 text-[#c5a059]" />
                    <span>Bought Before</span>
                  </span>
                )}
              </div>
              <button
                onClick={handleShare}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-[#1b4332] p-1.5 rounded-md hover:bg-gray-100"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
                <span>{copied ? 'Link Copied' : 'Share'}</span>
              </button>
            </div>

            <h1 className="font-momo-display text-3xl sm:text-4xl lg:text-5xl font-normal text-[#0f2d22] leading-tight">
              {product.name}
            </h1>

            <p className="text-xs text-[#626c66] mt-1 font-mono">
              SKU: {activeSku} | Pack: <strong className="text-[#0f2d22]">{activeWeight}</strong>
            </p>
          </div>

          {/* SHORT DESCRIPTION */}
          {product.shortDescription && (
            <p className="text-sm text-[#2b302c] leading-relaxed border-l-2 border-[#c5a059]/50 pl-3 py-0.5">
              {product.shortDescription}
            </p>
          )}

          {/* PRICE */}
          <div className="p-4 rounded-xl bg-[#f5f1e8] border border-[#e8e2d5] flex items-baseline justify-between">
            <div>
              <div className="text-xs text-[#626c66] font-medium mb-1">Price per Pack</div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-[#1b4332]">
                  ₹{activePrice}
                </span>
                {activeComparePrice && activeComparePrice > activePrice && (
                  <span className="text-base text-gray-400 line-through">
                    ₹{activeComparePrice}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-2xs">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
            </div>
            <div className="text-right">
              {product.stockStatus === 'out_of_stock' ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5 text-amber-600" /> Pre-Order / Enquire
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                  <CheckCircle className="w-3.5 h-3.5" /> In Stock & Ready
                </span>
              )}
              {typeof product.stockQuantity === 'number' && product.stockQuantity <= (product.lowStockThreshold || 10) && product.stockQuantity > 0 && (
                <div className="text-[10px] text-red-700 font-bold mt-1">Only {product.stockQuantity} packs left!</div>
              )}
              <div className="text-[10px] text-gray-500 mt-1">Dispatches from Sojat, Rajasthan</div>
            </div>
          </div>

          {/* PACK / VARIANT */}
          {activeVariants.length > 0 && (
            <div className="space-y-2.5 p-3.5 bg-white rounded-xl border border-[#e8e2d5] shadow-2xs">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5">
                  <span>Select Pack Size:</span>
                  <span className="text-[10px] text-gray-500 font-normal">
                    ({activeVariants.length} Sizes)
                  </span>
                </span>
                <span className="font-bold text-[#1b4332] bg-[#f5f1e8] px-2 py-0.5 rounded-md">
                  {activeWeight}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeVariants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isVarSoldOut = v.stockStatus === 'out_of_stock';
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariant(v)}
                      aria-pressed={isSelected}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#1b4332] text-white border-[#1b4332] shadow-xs ring-1 ring-[#1b4332]'
                          : 'bg-[#fcfbf7] text-[#0f2d22] border-[#e8e2d5] hover:border-[#1b4332]'
                      } ${isVarSoldOut ? 'opacity-60' : ''}`}
                    >
                      <span>{v.weight}</span>
                      <span className={isSelected ? 'text-[#c5a059]' : 'text-emerald-800'}>
                        ₹{v.price}
                      </span>
                      {v.compareAtPrice && v.compareAtPrice > v.price && (
                        <span className={`text-[10px] line-through ${isSelected ? 'text-white/60' : 'text-gray-400'}`}>
                          ₹{v.compareAtPrice}
                        </span>
                      )}
                      {isVarSoldOut && (
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 rounded font-normal">
                          Sold Out
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* QUANTITY */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider block">
              Select Quantity:
            </label>
            <div className="flex items-center gap-4">
              <div className="flex items-center border border-[#e8e2d5] rounded-xl bg-[#fcfbf7]">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-[#0f2d22] hover:bg-[#f5f1e8] active:scale-90 rounded-l-xl transition-all cursor-pointer touch-manipulation"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-bold text-base text-[#0f2d22] select-none">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-[#0f2d22] hover:bg-[#f5f1e8] active:scale-90 rounded-r-xl transition-all cursor-pointer touch-manipulation"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#626c66]">
                Subtotal: <strong className="text-lg font-bold text-[#1b4332]">₹{activePrice * quantity}</strong>
              </div>
            </div>
          </div>

          {/* ┌──────────────┬──────────────┐
              │     CART     │     BUY      │
              └──────────────┴──────────────┘ */}
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <button
                disabled={isOutOfStock || isAddingToCart}
                onClick={() => {
                  if (isOutOfStock || isAddingToCart) return;
                  setIsAddingToCart(true);
                  addToCart(
                    { ...product, price: activePrice, quantityOrWeight: activeWeight, sku: activeSku, stockStatus: activeStockStatus },
                    quantity,
                    selectedVariant
                  );
                  trackAddToCart({
                    id: product.id,
                    name: product.name,
                    price: activePrice,
                    quantity,
                  });
                  openCart();
                  setTimeout(() => setIsAddingToCart(false), 800);
                }}
                className={`w-full h-12 flex items-center justify-center rounded-xl font-extrabold text-xs sm:text-sm tracking-wide border transition-all shadow-xs cursor-pointer touch-manipulation active:scale-[0.98] ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : isAddingToCart
                    ? 'bg-[#1b4332] text-[#c5a059] border-[#1b4332] opacity-70 cursor-wait'
                    : 'bg-[#1b4332] hover:bg-[#0f2d22] text-[#faf5e8] border-[#1b4332]'
                }`}
              >
                <span>CART</span>
              </button>

              <Link
                href="/checkout"
                onClick={(e) => {
                  if (isOutOfStock) {
                    e.preventDefault();
                    return;
                  }
                  addToCart(
                    { ...product, price: activePrice, quantityOrWeight: activeWeight, sku: activeSku, stockStatus: activeStockStatus },
                    quantity,
                    selectedVariant
                  );
                }}
                className={`w-full h-12 flex items-center justify-center rounded-xl font-extrabold text-xs sm:text-sm tracking-wide border transition-all shadow-xs cursor-pointer touch-manipulation active:scale-[0.98] ${
                  isOutOfStock
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed pointer-events-none'
                    : 'bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] border-[#c5a059]'
                }`}
              >
                <span>BUY</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleOpenQuestionModal}
              className="w-full flex items-center justify-center gap-2 bg-[#f2fcf5] hover:bg-[#e2f7e7] text-[#1b4332] border border-[#25D366]/40 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all active:scale-[0.99] cursor-pointer touch-manipulation"
            >
              <MessageCircle className="w-4 h-4 fill-[#25D366] text-[#25D366]" />
              <span>Ask Question on WhatsApp</span>
            </button>

            <p className="text-[11px] text-center text-gray-500">
              Orders placed via Checkout are recorded securely in our database before opening WhatsApp.
            </p>
          </div>

          {/* TRUST */}
          <div className="pt-4 border-t border-[#e8e2d5]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#faf8f5] border border-[#ede7dc]">
                <Shield className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
                <span className="font-semibold text-[11px] text-[#0f2d22]">100% Pure Henna</span>
              </div>
              <Link
                href="/sojat-henna"
                className="flex items-center gap-2 p-2.5 rounded-lg bg-[#faf8f5] border border-[#ede7dc] hover:border-[#1b4332] transition-colors group"
              >
                <MapPin className="w-3.5 h-3.5 text-[#1b4332] shrink-0" />
                <span className="font-semibold text-[11px] text-[#0f2d22] group-hover:underline">Sojat Origin &rarr;</span>
              </Link>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#faf8f5] border border-[#ede7dc]">
                <Truck className="w-3.5 h-3.5 text-[#1b4332] shrink-0" />
                <span className="font-semibold text-[11px] text-[#0f2d22]">Fast Dispatch</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#faf8f5] border border-[#ede7dc]">
                <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                <span className="font-semibold text-[11px] text-[#0f2d22]">WhatsApp Help</span>
              </div>
            </div>
          </div>

          {/* WHOLESALE */}
          <div className="space-y-3 pt-2">
            <WholesaleSavingsCard
              product={product}
              bulkRules={bulkRules}
              onSelectQuote={(s) => {
                setCustomBulkQuantity(`${s.quantity} ${s.unit}`);
                setShowBulkModal(true);
              }}
            />

            {sortedBulkRules.length > 0 && (
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0f2d22]">
                    <Sparkles className="w-4 h-4 text-[#c5a059]" />
                    <span>Volume Tier Breakdown</span>
                  </div>
                  <Link
                    href="/wholesale"
                    className="text-[11px] font-bold text-[#1b4332] hover:underline shrink-0"
                  >
                    Custom B2B Rates &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {sortedBulkRules.map((rule) => {
                    const unitLabel = formatWholesaleTierUnit(wholesaleUnits.wholesaleUnit, rule.minQuantity);
                    let discountLabel = '';
                    if (rule.discountType === 'percentage') {
                      const rawVal = Number(rule.discountValue);
                      const pctStr = Number.isInteger(rawVal) ? `${rawVal}%` : `${Number(rawVal.toFixed(2))}%`;
                      discountLabel = `${pctStr} OFF`;
                    } else {
                      const tierPricing = resolveCanonicalWholesalePricing({
                        product,
                        quantity: rule.minQuantity,
                        rules: [rule],
                        units: wholesaleUnits,
                      });
                      discountLabel = tierPricing.display.formattedSavingsPercent;
                    }
                    return (
                      <div
                        key={rule.id}
                        className="bg-white p-2 rounded-lg border border-emerald-100 flex items-center justify-between shadow-2xs"
                      >
                        <span className="text-[#0f2d22] font-bold text-xs">
                          {rule.minQuantity} {unitLabel}
                        </span>
                        <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded text-[11px]">
                          {discountLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editorial Information Sections (Modern Indian Botanical Accordion System) */}
      <div className="mt-12 bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden divide-y divide-[#f5f1e8]">
        {/* Section 1: Description & Heritage Story */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('description')}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-[#faf8f5] transition-colors group"
            aria-expanded={expandedSections.description}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#1b4332] group-hover:text-[#faf5e8] transition-colors">
                01
              </span>
              <div>
                <h3 className="font-momo-display text-lg sm:text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                  Description & Heritage Story
                </h3>
                <p className="text-[11px] sm:text-xs text-[#626c66] mt-0.5">
                  Origin, botanical profile, and traditional Sojat cultivation
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#faf8f5] border border-[#e8e2d5] text-[#1b4332] group-hover:border-[#1b4332]/40 transition-colors shrink-0 ml-3">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedSections.description ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.description && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 text-[#2b302c] text-sm leading-relaxed border-t border-[#f5f1e8] space-y-4">
                  {product.fullDescription && product.fullDescription.length > 50 ? (
                    <p className="whitespace-pre-line">{product.fullDescription}</p>
                  ) : (
                    <>
                      <p>
                        <strong>{product.name}</strong> is pure, sun-cured botanical powder harvested from the arid river basins of Sojat, Rajasthan—the global capital of high-lawsone henna. Farmed naturally with zero synthetic additives, our leaves are triple cloth-sifted to ensure microscopic fineness for silky smooth paste formulation.
                      </p>
                      <p>
                        Whether prepared for elaborate bridal mehndi body art or steeped for hair revitalization, our fresh-harvest botanical powder guarantees deep natural color staining and intensive nourishing conditioning.
                      </p>
                    </>
                  )}

                  <div className="bg-[#faf8f5] p-4 rounded-xl border border-[#e8e2d5] text-xs space-y-2 mt-3">
                    <div className="font-bold text-[#0f2d22] uppercase tracking-wider text-[11px]">
                      Intended Uses & Botanical Metadata:
                    </div>
                    <ul className="list-disc list-inside space-y-1.5 text-[#556059]">
                      <li>
                        <strong className="text-[#0f2d22]">Mehndi & Body Art:</strong> Micro-filtered cloth sifting creates stringy, non-clogging cone paste with high lawsone dye release.
                      </li>
                      <li>
                        <strong className="text-[#0f2d22]">Hair Care & Conditioning:</strong> Natural plant tannins coat hair cuticles to deliver natural volume, glossy luster, and rich herbal tint.
                      </li>
                      <li>
                        <strong className="text-[#0f2d22]">Geographic Authenticity:</strong> Certified Sojat origin (Rajasthan, India), famous for arid mineral-rich soil and sunlight.
                      </li>
                      <li>
                        <strong className="text-[#0f2d22]">Active Selected Pack:</strong> {activeWeight} sealed pouch preserving natural freshness and essential phytocompounds.
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 2: How To Use / Application Guide */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('howToUse')}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-[#faf8f5] transition-colors group"
            aria-expanded={expandedSections.howToUse}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#1b4332] group-hover:text-[#faf5e8] transition-colors">
                02
              </span>
              <div>
                <h3 className="font-momo-display text-lg sm:text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                  How To Use / Application Guide
                </h3>
                <p className="text-[11px] sm:text-xs text-[#626c66] mt-0.5">
                  Step-by-step instructions for cone preparation, hair conditioning, and dye release
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#faf8f5] border border-[#e8e2d5] text-[#1b4332] group-hover:border-[#1b4332]/40 transition-colors shrink-0 ml-3">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedSections.howToUse ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.howToUse && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 text-[#2b302c] text-sm leading-relaxed border-t border-[#f5f1e8] space-y-4">
                  {product.usageInstructions ? (
                    <div className="bg-[#faf8f5] p-5 rounded-xl border border-[#e8e2d5] text-xs text-[#2b302c] leading-relaxed whitespace-pre-line">
                      {product.usageInstructions}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-[#faf8f5] p-4 sm:p-5 rounded-xl border border-[#e8e2d5] space-y-2">
                        <div className="font-bold text-[#1b4332] text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">A</span>
                          Bridal & Body Art Mehndi Paste
                        </div>
                        <ol className="text-xs text-[#556059] space-y-2 list-decimal list-inside leading-relaxed">
                          <li><strong>Mixing:</strong> Combine 100g powder with warm water, 15-20ml eucalyptus or tea tree essential oil, and 2 tsp sugar.</li>
                          <li><strong>Dye Release:</strong> Cover paste airtight with cling wrap and let sit at room temperature for 8 to 12 hours until surface darkens.</li>
                          <li><strong>Cone Filling:</strong> Strain paste through stocking cloth if needed, fill into applicator cones, and seal tightly.</li>
                          <li><strong>Staining:</strong> Leave paste on skin for 4–8 hours. Scrape off without water; keep hands dry for 12 hours for deep maroon stains.</li>
                        </ol>
                      </div>

                      <div className="bg-[#faf8f5] p-4 sm:p-5 rounded-xl border border-[#e8e2d5] space-y-2">
                        <div className="font-bold text-[#1b4332] text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[11px] font-bold">B</span>
                          Hair Nourishment & Conditioning Mask
                        </div>
                        <ol className="text-xs text-[#556059] space-y-2 list-decimal list-inside leading-relaxed">
                          <li><strong>Blend:</strong> Mix powder in an iron or glass bowl with warm black tea liquor or curd until yogurt-like consistency.</li>
                          <li><strong>Resting:</strong> Allow paste to stand for 2 to 4 hours for herbal infusion.</li>
                          <li><strong>Application:</strong> Section dry, clean hair and apply generously from roots to tips using gloves.</li>
                          <li><strong>Rinse:</strong> Leave on for 90 to 120 minutes. Rinse thoroughly with plain water; avoid shampoo for 24 hours for maximum color bonding.</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 3: Pure Ingredients & Botanical Benefits */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('ingredients')}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-[#faf8f5] transition-colors group"
            aria-expanded={expandedSections.ingredients}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#1b4332] group-hover:text-[#faf5e8] transition-colors">
                03
              </span>
              <div>
                <h3 className="font-momo-display text-lg sm:text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                  Pure Ingredients & Botanical Benefits
                </h3>
                <p className="text-[11px] sm:text-xs text-[#626c66] mt-0.5">
                  100% natural, chemical-free botanical formulation
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#faf8f5] border border-[#e8e2d5] text-[#1b4332] group-hover:border-[#1b4332]/40 transition-colors shrink-0 ml-3">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedSections.ingredients ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.ingredients && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 text-[#2b302c] border-t border-[#f5f1e8]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
                    {/* Ingredients Column */}
                    <div className="space-y-3">
                      <h4 className="font-momo-display text-lg font-normal text-[#0f2d22] flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-[#1b4332]" />
                        Pure Botanical Composition
                      </h4>
                      <ul className="space-y-2 text-xs">
                        {(product.ingredients && product.ingredients.length > 0
                          ? product.ingredients
                          : [
                              '100% Pure Lawsonia Inermis (Natural Henna Leaf Powder)',
                              'Zero Paraphenylenediamine (0% PPD)',
                              'Zero Ammonia & Synthetic Bleaches',
                              'Zero Heavy Metals & Artificial Preservatives',
                            ]
                        ).map((ing, idx) => (
                          <li
                            key={idx}
                            className="flex items-center gap-2.5 bg-[#faf8f5] p-2.5 rounded-lg text-[#0f2d22] font-semibold border border-[#e8e2d5]"
                          >
                            <CheckCircle className="w-4 h-4 text-[#1b4332] shrink-0" />
                            <span>{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Benefits Column */}
                    <div className="space-y-3">
                      <h4 className="font-momo-display text-lg font-normal text-[#0f2d22] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#c5a059]" />
                        Key Botanical Benefits
                      </h4>
                      <ul className="space-y-2.5 text-xs text-[#2b302c]">
                        {(product.benefits && product.benefits.length > 0
                          ? product.benefits
                          : [
                              'Deep Cooling Effect: Natural herbal astringent providing scalp relaxation and cooling comfort.',
                              'Intensive Conditioning: Binds with keratin to strengthen hair shafts and minimize split ends.',
                              'Vibrant Natural Color: Delivers deep, rich natural color stains that mature safely over 48 hours.',
                              'Microscopic Cloth Sift: Silky smooth texture that mixes effortlessly without gritty lumps.',
                            ]
                        ).map((ben, idx) => (
                          <li key={idx} className="flex items-start gap-2 bg-[#faf8f5] p-2.5 rounded-lg border border-[#e8e2d5]">
                            <Check className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                            <span>{ben}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 4: Product Specifications */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('specifications')}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-[#faf8f5] transition-colors group"
            aria-expanded={expandedSections.specifications}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#1b4332] group-hover:text-[#faf5e8] transition-colors">
                04
              </span>
              <div>
                <h3 className="font-momo-display text-lg sm:text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                  Product Specifications
                </h3>
                <p className="text-[11px] sm:text-xs text-[#626c66] mt-0.5">
                  Verified batch metadata, origin certification, and shelf life
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#faf8f5] border border-[#e8e2d5] text-[#1b4332] group-hover:border-[#1b4332]/40 transition-colors shrink-0 ml-3">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedSections.specifications ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.specifications && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 text-[#2b302c] border-t border-[#f5f1e8]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">SKU / Batch Code</span>
                      <span className="font-mono font-bold text-[#0f2d22]">{activeSku}</span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Active Pack Size</span>
                      <span className="font-bold text-[#0f2d22]">{activeWeight}</span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Botanical Name</span>
                      <span className="italic font-bold text-[#1b4332]">
                        {(product.name || '').toLowerCase().includes('indigo')
                          ? 'Indigofera Tinctoria'
                          : (product.name || '').toLowerCase().includes('amla')
                          ? 'Phyllanthus Emblica'
                          : 'Lawsonia Inermis'}
                      </span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Geographic Origin</span>
                      <span className="font-bold text-[#0f2d22]">Sojat, Rajasthan, India</span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Form / Processing</span>
                      <span className="font-bold text-[#0f2d22]">{product.productType || 'Triple Cloth-Sifted Micro Powder'}</span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Chemicals & Purity</span>
                      <span className="font-bold text-emerald-800">100% Pure Plant (0% PPD/Ammonia)</span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Shelf Life</span>
                      <span className="font-bold text-[#0f2d22]">24 Months from Packaging</span>
                    </div>
                    <div className="bg-[#faf8f5] p-3.5 rounded-xl border border-[#e8e2d5] flex items-center justify-between">
                      <span className="text-[#626c66] font-medium">Storage Advice</span>
                      <span className="font-bold text-[#0f2d22]">Airtight in Cool, Dry, Dark Place</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section 5: FAQ & Sojat Quality Assurance */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('faq')}
            className="w-full flex items-center justify-between p-5 sm:p-6 text-left hover:bg-[#faf8f5] transition-colors group"
            aria-expanded={expandedSections.faq}
          >
            <div className="flex items-center gap-3.5 sm:gap-4">
              <span className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#f5f1e8] text-[#1b4332] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-[#1b4332] group-hover:text-[#faf5e8] transition-colors">
                05
              </span>
              <div>
                <h3 className="font-momo-display text-lg sm:text-xl font-normal text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                  Frequently Asked Questions & Sojat Assurance
                </h3>
                <p className="text-[11px] sm:text-xs text-[#626c66] mt-0.5">
                  Authenticity, fresh batch testing, WhatsApp ordering, and delivery
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-[#faf8f5] border border-[#e8e2d5] text-[#1b4332] group-hover:border-[#1b4332]/40 transition-colors shrink-0 ml-3">
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${
                  expandedSections.faq ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>
          <AnimatePresence initial={false}>
            {expandedSections.faq && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-6 sm:px-6 sm:pb-7 pt-2 text-[#2b302c] border-t border-[#f5f1e8] space-y-6">
                  {/* FAQ Accordion List */}
                  <div className="space-y-2.5">
                    {faqs.map((faq, idx) => {
                      const isOpen = openFaqIndex === idx;
                      const questionText = faq.question || faq.q;
                      const answerText = faq.answer || faq.a;
                      return (
                        <div
                          key={faq.id || idx}
                          className="border border-[#e8e2d5] rounded-xl overflow-hidden bg-[#faf8f5] transition-all"
                        >
                          <button
                            type="button"
                            onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                            className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left font-bold text-xs sm:text-sm text-[#0f2d22] hover:bg-[#f5f1e8]/60 transition-colors"
                          >
                            <span>{questionText}</span>
                            <ChevronDown
                              className={`w-4 h-4 text-[#1b4332] transition-transform duration-200 shrink-0 ml-2 ${
                                isOpen ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 pt-2 text-xs text-[#626c66] leading-relaxed border-t border-[#f5f1e8] bg-white">
                                  {answerText}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Contextual Botanical Educational Guides */}
                  {relevantGuides && relevantGuides.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-[#f5f1e8]">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#c5a059]" />
                        <h4 className="font-momo-display text-lg font-normal text-[#0f2d22]">
                          Botanical Guides & Tutorials
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {relevantGuides.map((guide) => (
                          <Link
                            key={guide.id || guide.slug}
                            href={`/guides/${guide.slug}`}
                            className="group bg-[#faf8f5] hover:bg-[#f5f1e8] p-4 rounded-xl border border-[#e8e2d5] hover:border-[#1b4332]/40 transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
                                Knowledge Base
                              </span>
                              <h5 className="font-bold text-xs text-[#0f2d22] group-hover:text-[#1b4332] transition-colors line-clamp-2">
                                {guide.title}
                              </h5>
                              {guide.shortIntro && (
                                <p className="text-[11px] text-gray-600 line-clamp-2 leading-relaxed">
                                  {guide.shortIntro}
                                </p>
                              )}
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#1b4332]">
                              <span>Read Step-by-Step Guide</span>
                              <span className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Universal Lightbox Modal (Images & Videos) */}
      <AnimatePresence>
        {showLightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowLightbox(false)}
            className="fixed inset-0 z-50 bg-[#0f2d22]/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full aspect-square max-h-[85vh] bg-black rounded-2xl overflow-hidden shadow-2xl border border-[#e8e2d5]/40 flex items-center justify-center"
            >
              {activeMedia?.type === 'video' ? (
                activeMedia.embedUrl ? (
                  <iframe
                    src={activeMedia.embedUrl}
                    title={activeMedia.title || activeMedia.altText || product.name}
                    className="w-full h-full aspect-video max-h-[80vh] border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={activeMedia.url}
                    poster={activeMedia.posterUrl}
                    controls
                    autoPlay
                    playsInline
                    className="max-w-full max-h-[80vh] object-contain"
                  />
                )
              ) : (
                <div className="relative w-full h-full bg-white">
                  <Image
                    src={activeMedia?.url || product.images?.[0] || '/images/fallback.svg'}
                    alt={activeMedia?.altText || product.name}
                    fill
                    priority
                    className="object-contain p-2"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setShowLightbox(false)}
                className="absolute top-4 right-4 bg-[#0f2d22] text-white p-2.5 rounded-full hover:bg-[#1b4332] shadow-lg transition-colors z-10"
                title="Close zoom preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Mobile Purchase CTA — P0/P1/G Fixed
          - Positioned above MobileBottomNav (which is at bottom-0)
          - Uses activePrice + activeStockStatus + selectedVariant (P1 fix)
          - CART | BUY split 50/50, equal height, no icons, no text overflow (G fix)
      */}
      <div
        className="fixed left-0 right-0 z-30 lg:hidden border-t border-[#e8e2d5] bg-[#0f2d22] shadow-lg"
        style={{ bottom: 'calc(var(--md-bottom-nav-h) + env(safe-area-inset-bottom, 0px))' }}
      >
        {/* Price summary row */}
        <div className="flex items-center justify-between px-4 pt-2 pb-0">
          <span className="text-[10px] text-[#c5a059]/80 uppercase tracking-widest font-bold truncate max-w-[55%]">
            {product.name}
          </span>
          <span className="text-sm font-extrabold text-[#faf5e8] tabular-nums">
            ₹{activePrice * quantity}
            {quantity > 1 && (
              <span className="text-[10px] font-normal text-[#c5a059]/70 ml-1">×{quantity}</span>
            )}
          </span>
        </div>

        {/* CART | BUY 50/50 row */}
        <div className="grid grid-cols-2 gap-0 px-3 pb-3 pt-1.5">
          {/* CART button */}
          <button
            type="button"
            disabled={isOutOfStock || isAddingToCart}
            onClick={() => {
              if (isOutOfStock || isAddingToCart) return;
              setIsAddingToCart(true);
              addToCart(
                selectedVariant
                  ? { ...product, price: activePrice, compareAtPrice: activeComparePrice, sku: activeSku, stockStatus: activeStockStatus }
                  : product,
                quantity,
                selectedVariant ?? undefined,
              );
              trackAddToCart({
                id: product.id,
                name: product.name,
                price: activePrice,
                quantity,
              });
              openCart();
              setTimeout(() => setIsAddingToCart(false), 800);
            }}
            className={`h-11 rounded-l-xl text-xs font-extrabold tracking-wide transition-all active:scale-95 touch-manipulation border border-r-[0.5px] whitespace-nowrap ${
              isOutOfStock
                ? 'bg-[#1a3528] text-[#626c66] border-[#2d4a3a] cursor-not-allowed'
                : isAddingToCart
                ? 'bg-[#1b4332] text-[#c5a059] border-[#2d5540] opacity-70 cursor-wait'
                : 'bg-[#1b4332] hover:bg-[#163828] text-[#faf5e8] border-[#2d5540] cursor-pointer'
            }`}
          >
            CART
          </button>

          {/* BUY button */}
          <Link
            href="/checkout"
            onClick={() => {
              if (isOutOfStock) return;
              addToCart(
                selectedVariant
                  ? { ...product, price: activePrice, compareAtPrice: activeComparePrice, sku: activeSku, stockStatus: activeStockStatus }
                  : product,
                quantity,
                selectedVariant ?? undefined,
              );
            }}
            className={`h-11 rounded-r-xl text-xs font-extrabold tracking-wide transition-all active:scale-95 touch-manipulation border border-l-[0.5px] whitespace-nowrap flex items-center justify-center ${
              isOutOfStock
                ? 'bg-[#c5a059]/30 text-[#626c66] border-[#9a7a3a] pointer-events-none'
                : 'bg-[#c5a059] hover:bg-[#b38e46] text-[#0f2d22] border-[#b38e46] cursor-pointer'
            }`}
          >
            BUY
          </Link>
        </div>
      </div>

      {/* ASK QUESTION MODAL */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-[#e8e2d5] shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Ask Question — {product.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowQuestionModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {questionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {questionError}
              </div>
            )}

            <form onSubmit={handleSendQuestion} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={questionName}
                  onChange={(e) => setQuestionName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  10-Digit Mobile / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={questionPhone}
                  onChange={(e) => setQuestionPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#0f2d22] mb-1">
                  Your Specific Question <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="e.g. Is this 100% organic? What is the recommended mixing ratio for hair dye?"
                  className="w-full p-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isQuestionSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{isQuestionSubmitting ? 'Saving...' : 'Send Question on WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASK BULK PRICE MODAL */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full border border-[#e8e2d5] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                Wholesale / Bulk Inquiry — {product.name}
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
              >
                ✕
              </button>
            </div>

            {bulkError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {bulkError}
              </div>
            )}

            <form onSubmit={handleSendBulkInquiry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bulkName}
                  onChange={(e) => setBulkName(e.target.value)}
                  placeholder="Your Full Name or Business Name"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Mobile / WhatsApp Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={bulkPhone}
                  onChange={(e) => setBulkPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Requested Quantity / Weight <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={customBulkQuantity}
                  onChange={(e) => setCustomBulkQuantity(e.target.value)}
                  placeholder="e.g. 25 kg, 100 kg, 500 packs"
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0f2d22] mb-1">
                  Business / Requirement Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={bulkReqText}
                  onChange={(e) => setBulkReqText(e.target.value)}
                  placeholder="Specify packaging requirements, target destination, or custom branding request..."
                  className="w-full p-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowBulkModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBulkSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>{isBulkSubmitting ? 'Saving Inquiry...' : 'Submit Bulk Inquiry on WhatsApp'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ACCESSIBLE FLOATING SHARE TOAST */}
      <AnimatePresence>
        {copied && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#0f2d22] text-[#faf5e8] px-4 py-2.5 rounded-full border border-[#c5a059]/40 shadow-xl flex items-center gap-2 text-xs font-bold pointer-events-none"
            role="status"
            aria-live="polite"
          >
            <CheckCircle className="w-4 h-4 text-[#c5a059]" />
            <span>Link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
