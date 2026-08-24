'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { INITIAL_FAQ_ITEMS } from '@/lib/data-store';
import { getClientSiteSettings } from '@/lib/api-client';
import { useCart } from '@/context/CartContext';
import {
  trackProductView,
  trackAddToCart,
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductDetailClientProps {
  product: Product;
  whatsappNumber: string;
  whatsappTemplate?: string;
  brandName?: string;
  faqItems?: any[];
}

export default function ProductDetailClient({
  product,
  whatsappNumber,
  whatsappTemplate,
  brandName = 'Musky Dose',
  faqItems,
}: ProductDetailClientProps) {
  const { addToCart } = useCart();
  const [selectedImage, setSelectedImage] = useState<string>(
    product.images?.[0] || '/images/fallback.svg'
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [bulkRules, setBulkRules] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/bulk-pricing')
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.rules)) {
          const matching = data.rules.filter(
            (r: any) => r.isActive && (!r.productId || r.productId === product.id)
          );
          setBulkRules(matching);
        }
      })
      .catch((err) => console.warn('Failed to load bulk pricing rules for product:', err));
  }, [product.id]);

  const [customBulkQuantity, setCustomBulkQuantity] = useState<string>('25 kg');
  const [faqs, setFaqs] = useState<any[]>(() =>
    Array.isArray(faqItems) && faqItems.length > 0
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
      setShowQuestionModal(false);
      window.open(url, '_blank', 'noopener,noreferrer');
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
      setShowBulkModal(false);
      window.open(url, '_blank', 'noopener,noreferrer');
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
      if (siteSettings?.faqItems) {
        const enabledFaqs = siteSettings.faqItems
          .filter((f: any) => f.enabled !== false)
          .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        if (enabledFaqs.length > 0) {
          setFaqs(enabledFaqs);
        }
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
  }, [product]);

  const discountPercent =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round(
          ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
        )
      : 0;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: product.shortDescription,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-10 pb-24 lg:pb-0">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-[#626c66] font-medium">
        <Link href="/" className="hover:text-[#1b4332]">Home</Link>
        <span>/</span>
        <Link href="/products" className="hover:text-[#1b4332]">Products</Link>
        <span>/</span>
        <span className="text-[#0f2d22] font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left Column: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div 
            onClick={() => setShowLightbox(true)}
            className="relative aspect-square rounded-2xl overflow-hidden border border-[#e8e2d5] bg-white shadow-sm cursor-zoom-in group"
          >
            <Image
              src={selectedImage}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="object-cover group-hover:scale-105 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5">
              <span className="bg-[#1b4332]/95 text-white text-[10px] font-bold px-3 py-1 rounded-md tracking-wider uppercase backdrop-blur-sm shadow flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-[#c5a059]" /> Sojat Original
              </span>
              {discountPercent > 0 && (
                <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-extrabold px-2.5 py-1 rounded-md shadow">
                  SAVE {discountPercent}%
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
              className="absolute bottom-3 right-3 bg-white/90 hover:bg-white text-[#0f2d22] p-2 rounded-xl shadow-xs transition-colors backdrop-blur-xs flex items-center gap-1 text-[11px] font-semibold"
              title="Click to expand image"
            >
              <Maximize2 className="w-3.5 h-3.5 text-[#1b4332]" />
              <span>Zoom</span>
            </button>
          </div>

          {/* Thumbnails */}
          {product.images && product.images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-2">
              {product.images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(img)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    selectedImage === img
                      ? 'border-[#1b4332] ring-2 ring-[#c5a059]/40 opacity-100 scale-105'
                      : 'border-[#e8e2d5] opacity-70 hover:opacity-100'
                  }`}
                >
                  <Image
                    src={img}
                    alt={`${product.name} preview ${idx + 1}`}
                    fill
                    className="object-cover"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Ordering */}
        <div className="lg:col-span-6 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="bg-[#e8f3ed] text-[#1b4332] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                {product.categoryName || 'Sojat Henna'}
              </span>
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
              SKU: {product.sku} | Pack: <strong className="text-[#0f2d22]">{product.quantityOrWeight}</strong>
            </p>
          </div>

          {/* Pricing Box */}
          <div className="p-4 rounded-xl bg-[#f5f1e8] border border-[#e8e2d5] flex items-baseline justify-between">
            <div>
              <div className="text-xs text-[#626c66] font-medium mb-1">Price per Pack</div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-extrabold text-[#1b4332]">
                  ₹{product.price}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-base text-gray-400 line-through">
                    ₹{product.compareAtPrice}
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
              <div className="text-[10px] text-gray-500 mt-1">Dispatches from Sojat, Rajasthan</div>
            </div>
          </div>

          {/* Bulk Tier Discounts Table */}
          {bulkRules.length > 0 && (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#0f2d22]">
                  <Sparkles className="w-4 h-4 text-[#c5a059]" />
                  <span>Bulk & Wholesale Volume Discounts</span>
                </div>
                <Link
                  href="/wholesale"
                  className="text-[11px] font-bold text-[#1b4332] hover:underline"
                >
                  Custom B2B Rates &rarr;
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {bulkRules.map((rule) => {
                  const maxLabel = rule.maxQuantity ? `${rule.maxQuantity} packs` : 'or more';
                  const discountLabel =
                    rule.discountType === 'percentage'
                      ? `${rule.discountValue}% OFF`
                      : rule.discountType === 'fixed_amount'
                      ? `₹${rule.discountValue} OFF`
                      : `Fixed ₹${rule.discountValue} / pack`;

                  return (
                    <div
                      key={rule.id}
                      className="bg-white p-2.5 rounded-lg border border-emerald-100 flex items-center justify-between shadow-2xs"
                    >
                      <span className="text-[#0f2d22] font-medium">
                        Buy {rule.minQuantity} {maxLabel}:
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

          <p className="text-sm text-[#2b302c] leading-relaxed">
            {product.shortDescription}
          </p>

          {/* Quantity Selector */}
          <div className="space-y-3 pt-2">
            <label className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider block">
              Select Quantity:
            </label>
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center border border-[#e8e2d5] rounded-xl bg-white shadow-xs">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-3 text-[#0f2d22] hover:bg-[#f5f1e8] rounded-l-xl transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-bold text-base text-[#0f2d22]">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="p-3 text-[#0f2d22] hover:bg-[#f5f1e8] rounded-r-xl transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="text-xs text-[#626c66]">
                Subtotal: <strong className="text-lg font-bold text-[#1b4332]">₹{product.price * quantity}</strong>
              </div>
            </div>
          </div>

          {/* Bulk Quantity Enquiry Card */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-[#faf7f0] to-[#f4eee0] border border-[#e2d7c3] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#c5a059]" /> Need Bulk Quantity or Custom Pack?
              </span>
              <span className="text-[10px] font-bold text-[#1b4332] bg-[#e8f3ed] px-2 py-0.5 rounded-full">
                Sojat Wholesale
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-gray-600 text-[11px]">Quick Packs:</span>
              {(/oil|water|spray|liquid|serum|bottle|ml/i.test(`${product.name} ${product.categoryName || ''} ${product.quantityOrWeight || ''}`)
                ? ['10 Packs', '25 Packs', '50 Packs', '100+ Packs', 'Bulk Liters']
                : ['5 kg', '10 kg', '25 kg', '50 kg', '100+ kg']
              ).map((qtyOption) => (
                <button
                  key={qtyOption}
                  type="button"
                  onClick={() => setCustomBulkQuantity(qtyOption)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    customBulkQuantity === qtyOption
                      ? 'bg-[#1b4332] text-white shadow-xs'
                      : 'bg-white text-[#0f2d22] hover:bg-[#e8e2d5] border border-[#e8e2d5]'
                  }`}
                >
                  {qtyOption}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customBulkQuantity}
                onChange={(e) => setCustomBulkQuantity(e.target.value)}
                placeholder="Or type custom weight/quantity..."
                className="flex-grow px-3 py-2 bg-white border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
              />
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="inline-flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white text-xs font-extrabold px-4 py-2 rounded-xl transition-all shadow-xs shrink-0"
              >
                <MessageCircle className="w-3.5 h-3.5 text-[#c5a059]" />
                <span>Ask Bulk Price</span>
              </button>
            </div>
          </div>
          <div className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={product.stockStatus === 'out_of_stock'}
                onClick={() => {
                  if (product.stockStatus === 'out_of_stock') return;
                  addToCart(product, quantity);
                  trackAddToCart({
                    id: product.id,
                    name: product.name,
                    price: product.price,
                    quantity,
                  });
                }}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-xs tracking-wider border transition-all shadow-2xs ${
                  product.stockStatus === 'out_of_stock'
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] border-[#e8e2d5]'
                }`}
              >
                <ShoppingBag className="w-4 h-4 text-[#1b4332]" />
                <span>{product.stockStatus === 'out_of_stock' ? 'OUT OF STOCK' : 'ADD TO CART'}</span>
              </button>

              <Link
                href="/checkout"
                onClick={() => {
                  if (product.stockStatus === 'out_of_stock') return;
                  addToCart(product, quantity);
                }}
                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-extrabold text-xs tracking-wider transition-all shadow-md ${
                  product.stockStatus === 'out_of_stock'
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
                    : 'bg-[#1b4332] hover:bg-[#0f2d22] text-white'
                }`}
              >
                <span>PROCEED TO CHECKOUT</span>
              </Link>
            </div>

            <button
              type="button"
              onClick={handleOpenQuestionModal}
              className="w-full flex items-center justify-center gap-2 bg-[#f2fcf5] hover:bg-[#e2f7e7] text-[#1b4332] border border-[#25D366]/40 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all"
            >
              <MessageCircle className="w-4 h-4 text-[#25D366]" />
              <span>ASK QUESTION ON WHATSAPP ({displayPhone})</span>
            </button>

            <p className="text-[11px] text-center text-gray-500">
              Orders placed via Checkout are recorded securely in our database before opening WhatsApp.
            </p>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-[#e8e2d5] text-xs text-[#626c66]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#c5a059]" />
              <span>100% Pure & Unadulterated</span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1b4332]" />
              <span>Pan-India Fast Dispatch</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Description, Ingredients, Benefits, Usage */}
      <div className="mt-12 bg-white rounded-2xl border border-[#e8e2d5] p-6 sm:p-8 space-y-8 shadow-xs">
        <div>
          <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22] border-b border-[#e8e2d5] pb-3 mb-4">
            Full Product Description
          </h3>
          <p className="text-sm text-[#2b302c] leading-relaxed whitespace-pre-line">
            {product.fullDescription}
          </p>
        </div>

        {/* Ingredients & Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {product.ingredients && product.ingredients.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-momo-display text-xl font-normal text-[#0f2d22] flex items-center gap-2">
                <Leaf className="w-5 h-5 text-[#1b4332]" /> Pure Ingredients
              </h4>
              <ul className="space-y-2 text-xs">
                {product.ingredients.map((ing, idx) => (
                  <li key={idx} className="flex items-center gap-2 bg-[#f5f1e8] p-2.5 rounded-lg text-[#0f2d22] font-semibold">
                    <CheckCircle className="w-4 h-4 text-[#1b4332]" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.benefits && product.benefits.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-momo-display text-xl font-normal text-[#0f2d22] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#c5a059]" /> Key Benefits
              </h4>
              <ul className="space-y-2 text-xs text-[#2b302c]">
                {product.benefits.map((ben, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
                    <span>{ben}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Usage Instructions */}
        {product.usageInstructions && (
          <div className="space-y-3 pt-4 border-t border-[#f5f1e8]">
            <h4 className="font-momo-display text-xl font-normal text-[#0f2d22]">
              How To Use / Application Guide
            </h4>
            <div className="bg-[#fcfbf7] p-5 rounded-xl border border-[#e8e2d5] text-xs text-[#2b302c] leading-relaxed">
              {product.usageInstructions}
            </div>
          </div>
        )}
      </div>

      {/* Verified FAQ & Sojat Assurance Section */}
      <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-[#e8e2d5] pb-4">
          <HelpCircle className="w-6 h-6 text-[#1b4332]" />
          <div>
            <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
              Frequently Asked Questions & Sojat Quality Assurance
            </h3>
            <p className="text-xs text-[#626c66] mt-0.5">
              Verified facts about our origin, pure herbal ingredients, and WhatsApp ordering process.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            const questionText = faq.question || faq.q;
            const answerText = faq.answer || faq.a;
            return (
              <div
                key={faq.id || idx}
                className="border border-[#e8e2d5] rounded-xl overflow-hidden bg-[#fcfbf7] transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 text-left font-serif-heading font-bold text-sm text-[#0f2d22] hover:bg-[#f5f1e8]/60 transition-colors"
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
                      <div className="p-4 pt-0 text-xs text-[#626c66] leading-relaxed border-t border-[#f5f1e8] bg-white">
                        {answerText}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lightbox Image Modal */}
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
              className="relative max-w-4xl w-full aspect-square max-h-[85vh] bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#e8e2d5]"
            >
              <Image
                src={selectedImage}
                alt={product.name}
                fill
                priority
                className="object-contain p-2"
                referrerPolicy="no-referrer"
              />
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

      {/* Sticky Mobile WhatsApp Order CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md p-3 border-t border-[#e8e2d5] shadow-lg lg:hidden flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold truncate">
            {product.name}
          </div>
          <div className="text-sm font-extrabold text-[#1b4332]">
            ₹{product.price * quantity}{' '}
            <span className="text-[10px] font-normal text-gray-500">
              ({quantity} {quantity === 1 ? 'pack' : 'packs'})
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={product.stockStatus === 'out_of_stock'}
            onClick={() => {
              if (product.stockStatus === 'out_of_stock') return;
              addToCart(product, quantity);
            }}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              product.stockStatus === 'out_of_stock'
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22]'
            }`}
          >
            + Cart
          </button>
          <Link
            href="/checkout"
            onClick={() => {
              if (product.stockStatus === 'out_of_stock') return;
              addToCart(product, quantity);
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold shadow-md flex items-center gap-1.5 transition-transform active:scale-95 ${
              product.stockStatus === 'out_of_stock'
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed pointer-events-none'
                : 'bg-[#1b4332] hover:bg-[#0f2d22] text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4 text-white" />
            <span>Checkout</span>
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

    </div>
  );
}
