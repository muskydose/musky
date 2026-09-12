'use client';

import React, { useMemo, useState } from 'react';
import { Product } from '@/lib/types';
import { resolveProductWholesaleUnits, calculateProductBaseWholesaleRate } from '@/lib/wholesale-units';
import { formatPrice } from '@/lib/utils';
import { Search, CheckCircle2, Package, Layers } from 'lucide-react';

interface ProductCardPickerProps {
  products: Product[];
  selectedProduct: Product | null;
  onSelectProduct: (product: Product) => void;
}

export default function ProductCardPicker({
  products,
  selectedProduct,
  onSelectProduct,
}: ProductCardPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  // Extract dynamic categories from products
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = p.categoryName || p.categoryId;
      if (cat) set.add(cat);
    });
    return ['ALL', ...Array.from(set)];
  }, [products]);

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

        <div className="relative min-w-[200px]">
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
            const unitInfo = resolveProductWholesaleUnits(p);
            const unitLabel = unitInfo.wholesaleUnit;
            const baseWholesaleRate = calculateProductBaseWholesaleRate(p, unitInfo);
            const packSize = p.quantityOrWeight || `${unitInfo.packQuantity}${unitInfo.packUnit}`;

            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSelectProduct(p)}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer min-h-[108px] ${
                  isSelected
                    ? 'border-[#1b4332] bg-[#f4f7f4] ring-2 ring-[#1b4332]/40 shadow-xs'
                    : 'border-[#e8e2d5] bg-white hover:border-[#b2c8be] hover:bg-[#fafaf7]'
                }`}
              >
                {/* Active checkmark */}
                {isSelected && (
                  <div className="absolute top-2 right-2 text-[#1b4332]">
                    <CheckCircle2 className="w-4 h-4 fill-[#1b4332] text-white" />
                  </div>
                )}

                <div className="space-y-1">
                  {/* Category / Unit badge */}
                  <div className="flex items-center gap-1 text-[10px] font-bold text-[#88908a] uppercase tracking-wider">
                    <Package className="w-3 h-3 text-[#c5a059]" />
                    <span className="truncate">{p.categoryName || p.categoryId || 'Botanical'}</span>
                  </div>

                  {/* Product Title */}
                  <div className="text-xs font-semibold text-[#0f2d22] line-clamp-2 leading-tight pr-4">
                    {p.name}
                  </div>
                </div>

                {/* Pricing & Unit Info */}
                <div className="mt-2 pt-1.5 border-t border-[#e8e2d5]/60 flex flex-col gap-0.5 text-[11px]">
                  <div className="flex items-center justify-between text-[#626c66]">
                    <span>Pack:</span>
                    <span className="font-medium text-[#1f2421]">
                      {formatPrice(p.price)} <span className="text-[10px] text-[#88908a]">({packSize})</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[#1b4332]">
                    <span className="font-medium">Wholesale:</span>
                    <span className="font-bold">{formatPrice(baseWholesaleRate)}/{unitLabel}</span>
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

