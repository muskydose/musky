'use client';

import React, { useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';
import { Search, CheckCircle2, Package, Layers, ArrowRight } from 'lucide-react';

interface ProductCardPickerProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
  preferredCategories?: string[];
}

export default function ProductCardPicker({
  products,
  selectedProduct,
  onSelectProduct,
  preferredCategories,
}: ProductCardPickerProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => !selectedProduct);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Compute dynamic category counts across the entire catalog
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      ALL: products.length,
    };
    products.forEach((p) => {
      const cat = p.categoryName || p.categoryId;
      if (cat) {
        counts[cat] = (counts[cat] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  // Extract sorted dynamic categories, placing preferred categories first
  const categories = useMemo(() => {
    const cats = Object.keys(categoryCounts).filter((k) => k !== 'ALL');

    if (preferredCategories && preferredCategories.length > 0) {
      cats.sort((a, b) => {
        const aPref = preferredCategories.some((pc) => a.toLowerCase().includes(pc.toLowerCase()));
        const bPref = preferredCategories.some((pc) => b.toLowerCase().includes(pc.toLowerCase()));
        if (aPref && !bPref) return -1;
        if (!aPref && bPref) return 1;
        return a.localeCompare(b);
      });
    } else {
      cats.sort((a, b) => a.localeCompare(b));
    }

    return ['ALL', ...cats];
  }, [categoryCounts, preferredCategories]);

  // Filter products by category and search across the entire catalog
  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const pCat = p.categoryName || p.categoryId || '';
      const matchesCat = activeCategory === 'ALL' || pCat === activeCategory;
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        pCat.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchesCat && matchesSearch;
    });
  }, [products, activeCategory, searchQuery]);

  // Selected product image resolver
  const selectedImgUrl = useMemo(() => {
    if (!selectedProduct) return null;
    const raw = selectedProduct.images?.[0] || selectedProduct.media?.find((m) => m.type === 'image')?.url || null;
    return raw ? sanitizeImageUrl(raw) : null;
  }, [selectedProduct]);

  return (
    <div className="space-y-3.5">
      {/* 1. COMPACT SELECTED PRODUCT STATE (Visible when collapsed and a product is selected) */}
      {!isExpanded && selectedProduct && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#626c66]">
            <span className="font-bold uppercase tracking-wider text-[#0f2d22] flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
              <span>Selected Product to Quote</span>
            </span>
            <span className="text-[11px] text-[#88908a]">
              {products.length} products available
            </span>
          </div>

          <div className="p-3 sm:p-3.5 rounded-xl border border-[#1b4332]/30 bg-[#f4f7f4] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 transition-all shadow-2xs">
            <div className="flex items-center gap-3 min-w-0">
              {selectedImgUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={selectedImgUrl}
                  alt={selectedProduct.name}
                  className="w-11 h-11 rounded-lg object-cover border border-[#e8e2d5] shrink-0 bg-white"
                />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-white border border-[#e8e2d5] flex items-center justify-center shrink-0 text-[#1b4332]">
                  <Package className="w-5 h-5 text-[#c5a059]" />
                </div>
              )}

              <div className="space-y-0.5 min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 fill-emerald-100" />
                  <span>SELECTED PRODUCT</span>
                  <span className="text-[#88908a]">•</span>
                  <span className="text-[#626c66]">{selectedProduct.categoryName || selectedProduct.categoryId || 'Botanical'}</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#0f2d22] leading-snug break-words">
                  {selectedProduct.name}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="px-3.5 py-2 rounded-lg bg-white hover:bg-[#FAF8F5] border border-[#1b4332]/30 hover:border-[#1b4332] text-[#0f2d22] font-semibold text-xs flex items-center justify-center gap-1.5 transition-all shadow-2xs shrink-0 cursor-pointer min-h-[38px]"
            >
              <span>Change Product</span>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-700" />
            </button>
          </div>
        </div>
      )}

      {/* 2. EXPANDED PRODUCT CATALOG SELECTOR */}
      {(isExpanded || !selectedProduct) && (
        <div className="space-y-3.5 animate-in fade-in duration-150">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
                <span className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider">
                  SELECT PRODUCT TO QUOTE
                </span>
                <span className="text-[11px] font-normal text-[#626c66]">
                  • {products.length} {products.length === 1 ? 'product' : 'products'} available
                </span>
              </div>
              <p className="text-[11px] text-[#626c66]">
                Browse all products or choose a category
              </p>
            </div>

            {selectedProduct && (
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="self-start sm:self-auto text-xs font-medium text-[#626c66] hover:text-[#0f2d22] px-2.5 py-1 rounded-lg border border-[#e8e2d5] bg-white hover:bg-[#FAF8F5] transition-colors cursor-pointer"
              >
                Close
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#88908a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name or category..."
              className="w-full pl-8.5 pr-3 py-2 text-xs rounded-xl border border-[#e8e2d5] bg-white text-[#1f2421] placeholder-[#88908a] focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
            />
          </div>

          {/* Category Navigation with Dynamic Counts */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const count = categoryCounts[cat] ?? 0;
              const isCatActive = activeCategory === cat;
              const label = cat === 'ALL' ? 'All Products' : cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors shrink-0 min-h-[32px] cursor-pointer inline-flex items-center gap-1.5 ${
                    isCatActive
                      ? 'bg-[#0f2d22] text-[#c5a059] shadow-2xs'
                      : 'bg-[#FAF8F5] text-[#626c66] hover:bg-[#e8e2d5]/60 hover:text-[#0f2d22] border border-[#e8e2d5]'
                  }`}
                >
                  <span>{label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                      isCatActive
                        ? 'bg-[#1b4332] text-[#c5a059]'
                        : 'bg-[#e8e2d5]/80 text-[#626c66]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Context Helper / Filter Indicator */}
          <div className="text-[11px] text-[#626c66] flex items-center justify-between px-0.5">
            <span>
              {activeCategory === 'ALL' ? (
                <>
                  Showing <strong>all {filteredProducts.length}</strong> wholesale catalog products
                </>
              ) : (
                <>
                  Showing <strong>{filteredProducts.length}</strong> products in <strong>{activeCategory}</strong>
                </>
              )}
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 hover:underline text-[11px] font-medium cursor-pointer"
              >
                Clear search
              </button>
            )}
          </div>

          {/* Responsive, Scalable Product Grid (Contained Scroll Container) */}
          {filteredProducts.length === 0 ? (
            <div className="p-6 rounded-xl bg-[#FAF8F5] border border-dashed border-[#e8e2d5] text-center text-xs text-[#626c66] space-y-2">
              <p>No products match your filter or search query.</p>
              {(searchQuery || activeCategory !== 'ALL') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('ALL');
                  }}
                  className="text-xs text-emerald-800 font-semibold underline underline-offset-2 hover:text-emerald-900 cursor-pointer"
                >
                  View All Products ({products.length})
                </button>
              )}
            </div>
          ) : (
            <div
              role="radiogroup"
              aria-label="Products for wholesale estimation"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin"
            >
              {filteredProducts.map((p) => {
                const isSelected = selectedProduct?.id === p.id;
                const rawImg = p.images?.[0] || p.media?.find((m) => m.type === 'image')?.url || null;
                const imgUrl = rawImg ? sanitizeImageUrl(rawImg) : null;

                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      onSelectProduct(p);
                      setIsExpanded(false);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative flex items-start gap-3 cursor-pointer min-h-[72px] ${
                      isSelected
                        ? 'border-[#1b4332] bg-[#f4f7f4] ring-2 ring-[#1b4332]/40 shadow-2xs'
                        : 'border-[#e8e2d5] bg-white hover:border-[#b2c8be] hover:bg-[#fafaf7]'
                    }`}
                  >
                    {/* Active checkmark indicator */}
                    {isSelected && (
                      <div className="absolute top-2.5 right-2.5 text-emerald-700 z-10">
                        <CheckCircle2 className="w-4 h-4 fill-emerald-700 text-white" />
                      </div>
                    )}

                    {/* Product Image / Icon */}
                    {imgUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={imgUrl}
                        alt={p.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[#e8e2d5] shrink-0 bg-[#FAF8F5]"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#FAF8F5] border border-[#e8e2d5] flex items-center justify-center shrink-0 text-[#1b4332]">
                        <Package className="w-5 h-5 text-[#c5a059]" />
                      </div>
                    )}

                    <div className="space-y-0.5 min-w-0 flex-1 pr-4">
                      {/* Category badge */}
                      <div className="text-[10px] font-bold text-[#88908a] uppercase tracking-wider truncate">
                        {p.categoryName || p.categoryId || 'Botanical'}
                      </div>

                      {/* Product Title - full product name without truncation or line-clamp */}
                      <div className="text-xs font-semibold text-[#0f2d22] leading-snug break-words">
                        {p.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
