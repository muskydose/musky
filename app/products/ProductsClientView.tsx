'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';
import { Product, Category, SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { Search, SlidersHorizontal, PackageX, Sparkles, X, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';

interface ProductsClientViewProps {
  initialProducts: Product[];
  categories: Category[];
  whatsappNumber?: string;
  siteSettings?: SiteSettings;
}

export default function ProductsClientView({
  initialProducts,
  categories,
  whatsappNumber: propWhatsappNumber,
  siteSettings,
}: ProductsClientViewProps) {
  const cms = getCmsText(siteSettings);
  const activeWhatsAppNumber = getConfiguredWhatsAppNumber(siteSettings) || propWhatsappNumber || '918233703080';

  const [searchQuery, setSearchQuery] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('search') || '';
    }
    return '';
  });

  const [selectedCategory, setSelectedCategory] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlCategory = params.get('category');
      if (urlCategory) {
        const matchingCat = categories.find(
          (c) => c.id === urlCategory || c.slug === urlCategory || c.name.toLowerCase() === urlCategory.toLowerCase()
        );
        return matchingCat ? matchingCat.id : urlCategory;
      }
    }
    return 'all';
  });

  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'newest' | 'name-az'>('featured');
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Custom Requirement State
  const [reqName, setReqName] = useState<string>('');
  const [reqPhone, setReqPhone] = useState<string>('');
  const [customRequirement, setCustomRequirement] = useState<string>('');
  const [reqError, setReqError] = useState<string>('');

  // Zero Result Search State
  const [zeroName, setZeroName] = useState<string>('');
  const [zeroPhone, setZeroPhone] = useState<string>('');
  const [zeroResultInput, setZeroResultInput] = useState<string>('');
  const [zeroResultError, setZeroResultError] = useState<string>('');

  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [isSubmittingZero, setIsSubmittingZero] = useState(false);

  const handleSendCustomRequirement = async () => {
    setReqError('');
    const cleanName = reqName.trim();
    if (!cleanName || cleanName.length < 2) {
      setReqError('Please enter your full name (at least 2 characters).');
      return;
    }
    const cleanPhone = reqPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setReqError('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }
    const reqText = customRequirement.trim();
    if (!reqText || reqText.length < 3) {
      setReqError('Please enter your actual product requirement (at least 3 characters).');
      return;
    }

    setIsSubmittingReq(true);
    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          productsRequired: reqText,
          approxQuantity: 'N/A (Custom Requirement)',
          notes: `Submitted via Products page custom requirement bar by ${cleanName} (${cleanPhone}).`,
          enquiryType: 'custom_requirement',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to save your requirement. Please try again.');
      }

      const msg = `Hello Musky Dose, I have a custom product requirement:\nName: ${cleanName}\nMobile: ${cleanPhone}\nRequirement: ${reqText}\n\nPlease share availability and pricing from Sojat.`;
      const url = `https://wa.me/${activeWhatsAppNumber}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setReqError(err.message || 'Unable to save your requirement. Please try again.');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleSendZeroResultInquiry = async () => {
    setZeroResultError('');
    const cleanName = zeroName.trim();
    if (!cleanName || cleanName.length < 2) {
      setZeroResultError('Please enter your full name (at least 2 characters).');
      return;
    }
    const cleanPhone = zeroPhone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length !== 10) {
      setZeroResultError('Please enter a valid 10-digit mobile / WhatsApp number.');
      return;
    }
    const queryText = (zeroResultInput.trim() || searchQuery.trim());
    if (!queryText || queryText.length < 3) {
      setZeroResultError('Please enter the product name or requirement you are looking for (at least 3 characters).');
      return;
    }

    setIsSubmittingZero(true);
    try {
      const res = await fetch('/api/wholesale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: cleanName,
          phone: cleanPhone,
          productsRequired: queryText,
          approxQuantity: 'N/A (Search Enquiry)',
          notes: `Zero result search query for "${queryText}" by ${cleanName} (${cleanPhone}).`,
          enquiryType: 'zero_result_search',
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Unable to save your query. Please try again.');
      }

      const msg = `Hello Musky Dose, I could not find the product "${queryText}" on your website.\nName: ${cleanName}\nMobile: ${cleanPhone}\nPlease help me find or order it.`;
      const url = `https://wa.me/${activeWhatsAppNumber}?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setZeroResultError(err.message || 'Unable to save your query. Please try again.');
    } finally {
      setIsSubmittingZero(false);
    }
  };

  const filterKey = `${searchQuery}-${selectedCategory}-${stockFilter}-${sortBy}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);

  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setVisibleCount(24);
  }

  // Count products per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    initialProducts.forEach((p) => {
      const catKey = p.categoryId || p.categoryName || 'other';
      counts[catKey] = (counts[catKey] || 0) + 1;
    });
    return counts;
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    let result = [...initialProducts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.shortDescription || '').toLowerCase().includes(q) ||
          (p.sku || '').toLowerCase().includes(q) ||
          (p.categoryName || '').toLowerCase().includes(q) ||
          (p.ingredients && p.ingredients.some((i) => i.toLowerCase().includes(q)))
      );
    }

    if (selectedCategory !== 'all') {
      const selectedCatObj = categories.find(
        (c) => c.id === selectedCategory || c.slug === selectedCategory
      );
      const targetCatId = selectedCatObj ? selectedCatObj.id : selectedCategory;
      const targetCatName = selectedCatObj ? selectedCatObj.name.toLowerCase() : selectedCategory.toLowerCase();
      const targetCatSlug = selectedCatObj ? selectedCatObj.slug.toLowerCase() : selectedCategory.toLowerCase();

      result = result.filter(
        (p) =>
          p.categoryId === targetCatId ||
          (p.categoryName && p.categoryName.toLowerCase() === targetCatName) ||
          (p.categoryId && p.categoryId.toLowerCase() === targetCatSlug)
      );
    }

    if (stockFilter === 'in_stock') {
      result = result.filter((p) => p.stockStatus !== 'out_of_stock');
    } else if (stockFilter === 'out_of_stock') {
      result = result.filter((p) => p.stockStatus === 'out_of_stock');
    }

    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sortBy === 'name-az') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    }

    return result;
  }, [initialProducts, categories, searchQuery, selectedCategory, stockFilter, sortBy]);

  const displayedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  return (
    <div className="space-y-8">
      {/* Search & Filter Bar */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#e8e2d5] shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search products, henna, indigo, rose water..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-8 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">All Categories ({initialProducts.length})</option>
              {categories.map((cat) => {
                const count = categoryCounts[cat.id] || categoryCounts[cat.name] || 0;
                return (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* Stock Filter */}
          <div className="md:col-span-2">
            <select
              value={stockFilter}
              onChange={(e: any) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
            >
              <option value="all">All Items</option>
              <option value="in_stock">In Stock Only</option>
              <option value="out_of_stock">Pre-Order Only</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="md:col-span-2">
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-semibold text-[#0f2d22] focus:outline-none focus:border-[#1b4332]"
            >
              <option value="featured">Featured First</option>
              <option value="newest">Newest Arrivals</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-az">Name: A to Z</option>
            </select>
          </div>

        </div>

        {/* Quick Category Pills */}
        <div className="pt-2 flex flex-wrap items-center gap-2 border-t border-[#f5f1e8]">
          <span className="text-[11px] font-bold text-[#c5a059] uppercase tracking-wider mr-1">
            Quick Category:
          </span>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#1b4332] text-white shadow-xs'
                : 'bg-[#f5f1e8] text-[#0f2d22] hover:bg-[#e8e2d5]'
            }`}
          >
            All ({initialProducts.length})
          </button>
          {categories.map((cat) => {
            const count = categoryCounts[cat.id] || categoryCounts[cat.name] || 0;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#1b4332] text-white shadow-xs'
                    : 'bg-[#f5f1e8] text-[#0f2d22] hover:bg-[#e8e2d5]'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Header */}
      <div className="flex items-center justify-between text-xs text-[#626c66] font-medium px-1">
        <span>
          Showing <strong className="text-[#0f2d22] font-bold">{displayedProducts.length}</strong> of{' '}
          <strong className="text-[#0f2d22] font-bold">{filteredProducts.length}</strong> products
        </span>
        {(searchQuery || selectedCategory !== 'all' || stockFilter !== 'all') && (
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setStockFilter('all');
            }}
            className="text-rose-600 hover:underline font-semibold text-xs"
          >
            Reset all filters
          </button>
        )}
      </div>

      {/* Grid of Products */}
      {filteredProducts.length > 0 ? (
        <div className="space-y-8">
          {(() => {
            const layoutControls = siteSettings?.layoutControls || {};
            const mobileCols = layoutControls.mobileGridColumns === 1 ? 'grid-cols-1' : 'grid-cols-2';
            const desktopCols =
              layoutControls.desktopGridColumns === 3
                ? 'lg:grid-cols-3'
                : layoutControls.desktopGridColumns === 5
                ? 'lg:grid-cols-5'
                : 'lg:grid-cols-4';
            const gridClass = `grid ${mobileCols} sm:grid-cols-3 md:grid-cols-3 ${desktopCols} gap-2.5 sm:gap-6 lg:gap-8`;

            return (
              <motion.div layout className={gridClass}>
                <AnimatePresence>
                  {displayedProducts.map((product) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.25 }}
                      className="h-full flex flex-col"
                    >
                      <ProductCard
                        product={product}
                        whatsappNumber={activeWhatsAppNumber}
                        siteSettings={siteSettings}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            );
          })()}

          {/* Load More Button */}
          {visibleCount < filteredProducts.length && (
            <div className="text-center pt-6 pb-2">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 24)}
                className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white font-extrabold text-xs tracking-wider uppercase px-8 py-3.5 rounded-xl shadow-md transition-all hover:scale-105"
              >
                <span>Load More Products ({filteredProducts.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Zero-Result Search Experience */
        <div className="bg-white rounded-2xl border border-[#e8e2d5] p-8 sm:p-12 text-center space-y-6 my-6 shadow-xs max-w-2xl mx-auto">
          <PackageX className="w-14 h-14 text-[#c5a059] mx-auto" />
          <div className="space-y-2">
            <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
              Can&apos;t find what you&apos;re looking for?
            </h3>
            <p className="text-sm text-[#556059] leading-relaxed">
              Tell Musky Dose what product you need and we will help you find it.
            </p>
          </div>

          {zeroResultError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 text-left">
              {zeroResultError}
            </div>
          )}

          <div className="space-y-3 pt-2 text-left">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Full Name *"
                value={zeroName}
                onChange={(e) => {
                  setZeroName(e.target.value);
                  if (zeroResultError) setZeroResultError('');
                }}
                className="w-full px-4 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
              />
              <input
                type="tel"
                placeholder="10-Digit Mobile / WhatsApp *"
                value={zeroPhone}
                onChange={(e) => {
                  setZeroPhone(e.target.value);
                  if (zeroResultError) setZeroResultError('');
                }}
                className="w-full px-4 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
              />
            </div>
            <input
              type="text"
              placeholder="Type the product name or requirement you are searching for *"
              value={zeroResultInput || searchQuery}
              onChange={(e) => {
                setZeroResultInput(e.target.value);
                if (zeroResultError) setZeroResultError('');
              }}
              className="w-full px-4 py-3 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-xs font-medium text-[#1f2421] focus:outline-none focus:border-[#1b4332]"
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-1">
              <button
                type="button"
                disabled={isSubmittingZero}
                onClick={handleSendZeroResultInquiry}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3.5 rounded-xl font-extrabold text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-50 cursor-pointer"
              >
                <span>{isSubmittingZero ? 'Saving & Launching...' : 'Ask Musky Dose on WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setZeroResultInput('');
                  setZeroName('');
                  setZeroPhone('');
                  setZeroResultError('');
                  setSelectedCategory('all');
                  setStockFilter('all');
                }}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#f5f1e8] hover:bg-[#e8e2d5] text-[#0f2d22] px-6 py-3.5 rounded-xl font-bold text-xs transition-colors border border-[#e8e2d5]"
              >
                Reset Search & Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Requirement / B2B Enquiry Card */}
      <div className="bg-gradient-to-br from-[#0f2d22] to-[#1b4332] rounded-2xl p-6 sm:p-8 text-white space-y-4 shadow-xl border border-[#c5a059]/30 mt-12">
        <div className="flex items-center gap-2 text-[#c5a059] font-bold text-xs uppercase tracking-widest">
          <Sparkles className="w-4 h-4" />
          <span>Custom Product Enquiry & Direct Factory Orders</span>
        </div>

        <div className="space-y-1">
          <h3 className="font-momo-display text-xl sm:text-2xl font-normal text-white">
            Looking for something specific?
          </h3>
          <p className="text-xs sm:text-sm text-[#d0ded7] leading-relaxed max-w-2xl">
            We have a wide range of henna and herbal products. If you cannot find exactly what you need, ask us directly from our Sojat manufacturing facility.
          </p>
        </div>

        {reqError && (
          <div className="p-3 bg-rose-500/20 border border-rose-300/40 rounded-xl text-xs font-semibold text-rose-100">
            {reqError}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Full Name *"
              value={reqName}
              onChange={(e) => {
                setReqName(e.target.value);
                if (reqError) setReqError('');
              }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/60 focus:outline-none focus:border-[#c5a059]"
            />
            <input
              type="tel"
              placeholder="10-Digit Mobile / WhatsApp *"
              value={reqPhone}
              onChange={(e) => {
                setReqPhone(e.target.value);
                if (reqError) setReqError('');
              }}
              className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/60 focus:outline-none focus:border-[#c5a059]"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Type your product requirement (e.g., Triple Sifted Rajasthani Henna 25kg, Pure Indigo)... *"
              value={customRequirement}
              onChange={(e) => {
                setCustomRequirement(e.target.value);
                if (reqError) setReqError('');
              }}
              className="flex-grow bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-xs text-white placeholder-white/60 focus:outline-none focus:border-[#c5a059]"
            />
            <button
              type="button"
              disabled={isSubmittingReq}
              onClick={handleSendCustomRequirement}
              className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3 rounded-xl font-extrabold text-xs uppercase tracking-wider shrink-0 shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <span>{isSubmittingReq ? 'Saving & Launching...' : 'Send Requirement on WhatsApp'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
