'use client';

import React, { useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';
import { Search, CheckCircle2, Package, Layers } from 'lucide-react';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Extract dynamic categories from products, placing preferred categories first
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = p.categoryName || p.categoryId;
      if (cat) set.add(cat);
    });
    const allCats = Array.from(set);

    if (preferredCategories && preferredCategories.length > 0) {
      allCats.sort((a, b) => {
        const aPref = preferredCategories.some((pc) => a.toLowerCase().includes(pc.toLowerCase()));
        const bPref = preferredCategories.some((pc) => b.toLowerCase().includes(pc.toLowerCase()));
        if (aPref && !bPref) return -1;
        if (!aPref && bPref) return 1;
        return a.localeCompare(b);
      });
    }

    return ['ALL', ...allCats];
  }, [products, preferredCategories]);

  // Filter products by category and search
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

  return (
    <div className="space-y-3.5">
      {/* Search & Category Filter Header */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <label className="text-xs font-bold text-[#0f2d22] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Select Product to Quote</span>
          <span className="text-[11px] font-normal text-[#626c66]">
            ({filteredProducts.length} available)
          </span>
        </label>

        <div className="relative w-full sm:w-auto sm:min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#88908a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#e8e2d5] bg-white text-[#1f2421] placeholder-[#88908a] focus:outline-none focus:ring-1 focus:ring-[#1b4332]"
          />
        </div>
      </div>

      {/* Category Pills */}
      {categories.length > 2 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-colors shrink-0 min-h-[32px] cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#0f2d22] text-[#c5a059]'
                  : 'bg-[#FAF8F5] text-[#626c66] hover:bg-[#e8e2d5]/60 hover:text-[#0f2d22] border border-[#e8e2d5]'
              }`}
            >
              {cat === 'ALL' ? 'All Products' : cat}
            </button>
          ))}
        </div>
      )}

      {/* Responsive Product Grid / Carousel */}
      {filteredProducts.length === 0 ? (
        <div className="p-6 rounded-xl bg-[#FAF8F5] border border-dashed border-[#e8e2d5] text-center text-xs text-[#626c66]">
          No products match your filter. Try adjusting your search query.
        </div>
      ) : (
        <div
          role="radiogroup"
          aria-label="Products for wholesale estimation"
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin"
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
                onClick={() => onSelectProduct(p)}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-center cursor-pointer min-h-[76px] ${
                  isSelected
                    ? 'border-[#1b4332] bg-[#f4f7f4] ring-2 ring-[#1b4332]/40 shadow-xs'
                    : 'border-[#e8e2d5] bg-white hover:border-[#b2c8be] hover:bg-[#fafaf7]'
                }`}
              >
                {/* Active checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 text-[#1b4332] z-10">
                    <CheckCircle2 className="w-4 h-4 fill-[#1b4332] text-white" />
                  </div>
                )}

                <div className="flex items-start gap-2.5 w-full pr-4">
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

                  <div className="space-y-0.5 min-w-0 flex-1">
                    {/* Category badge */}
                    <div className="text-[10px] font-bold text-[#88908a] uppercase tracking-wider truncate">
                      {p.categoryName || p.categoryId || 'Botanical'}
                    </div>

                    {/* Product Title */}
                    <div className="text-xs font-semibold text-[#0f2d22] line-clamp-2 leading-tight">
                      {p.name}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

