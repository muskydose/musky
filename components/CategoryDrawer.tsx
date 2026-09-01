'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUI } from '@/context/UIContext';
import SideDrawer from '@/components/ui/SideDrawer';
import { Category } from '@/lib/types';
import {
  Grid,
  ChevronRight,
  ShoppingBag,
  Sparkles,
  Leaf,
  Layers,
  Heart,
  Droplets,
  Flower2,
  Package,
} from 'lucide-react';

const FALLBACK_CATEGORIES: Array<Partial<Category> & { icon: React.ElementType; badge?: string }> = [
  {
    id: 'cat-henna',
    name: 'Sojat Henna & Mehndi',
    slug: 'henna-mehndi',
    description: 'Triple-sifted Rajasthani bridal henna powder & fresh cones.',
    icon: Leaf,
    badge: 'Popular',
  },
  {
    id: 'cat-herbal',
    name: 'Herbal Hair Care Packs',
    slug: 'hair-care',
    description: 'Indigo, Amla, Reetha, Shikakai, Bhringraj & Brahmi.',
    icon: Layers,
    badge: '100% Pure',
  },
  {
    id: 'cat-face',
    name: 'Face Packs & Natural Clays',
    slug: 'face-packs',
    description: 'Multani Mitti, Beetroot powder, Sandalwood & Rose Petal.',
    icon: Flower2,
  },
  {
    id: 'cat-oils',
    name: 'Botanical Herbal Oils',
    slug: 'herbal-oils',
    description: 'Pure cold-pressed carrier & herbal infused wellness oils.',
    icon: Droplets,
  },
  {
    id: 'cat-wholesale',
    name: 'Bulk Supply & Wholesale',
    slug: 'wholesale',
    description: 'Direct factory pricing for salons, artists & distributors (5kg - 1000kg+).',
    icon: Package,
    badge: 'B2B Tier',
  },
];

export default function CategoryDrawer() {
  const { isCategoryOpen, closeCategory } = useUI();
  const pathname = usePathname();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (isCategoryOpen && categories.length === 0) {
      fetch('/api/categories')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.categories) && data.categories.length > 0) {
            setCategories(data.categories.filter((c: Category) => c.isActive !== false));
          }
        })
        .catch(() => {});
    }
  }, [isCategoryOpen, categories.length]);

  const getCategoryIcon = (slug: string, name: string) => {
    const s = (slug + ' ' + name).toLowerCase();
    if (s.includes('oil')) return Droplets;
    if (s.includes('face') || s.includes('clay') || s.includes('skin') || s.includes('rose')) return Flower2;
    if (s.includes('hair') || s.includes('amla') || s.includes('indigo') || s.includes('shikakai')) return Layers;
    if (s.includes('wholesale') || s.includes('bulk') || s.includes('b2b')) return Package;
    return Leaf;
  };

  const displayList = categories.length > 0 ? categories : (FALLBACK_CATEGORIES as Category[]);

  return (
    <SideDrawer
      isOpen={isCategoryOpen}
      onClose={closeCategory}
      side="right"
      widthClassName="w-full sm:w-[440px] max-w-full"
      icon={<Grid className="w-4 h-4 text-[#c5a059]" />}
      title="Product Categories"
      subtitle="Explore Pure Sojat Henna & Botanical Ranges"
      footer={
        <div className="space-y-2">
          <Link
            href="/products"
            onClick={closeCategory}
            className="w-full flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-md active:scale-[0.99] transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
            <span>VIEW COMPLETE CATALOG (200+ PRODUCTS)</span>
          </Link>
          <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
            <Link
              href="/categories"
              onClick={closeCategory}
              className="text-[#1b4332] font-semibold hover:underline"
            >
              All Category Pages &rarr;
            </Link>
            <Link
              href="/wholesale"
              onClick={closeCategory}
              className="text-[#c5a059] font-bold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              <span>Wholesale Rates</span>
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-2">
        {/* All Products Quick Filter Tile */}
        <Link
          href="/products"
          onClick={closeCategory}
          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-2xs group min-h-[48px] touch-manipulation cursor-pointer active:scale-[0.98] ${
            pathname === '/products'
              ? 'bg-[#1b4332] text-white border-[#1b4332]'
              : 'bg-white hover:bg-[#e8f3ed] border-[#e8e2d5] text-[#0f2d22]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-2 rounded-lg ${pathname === '/products' ? 'bg-[#2d6a4f] text-[#c5a059]' : 'bg-[#f5f1e8] text-[#1b4332]'}`}>
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight truncate">
                  All Products
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pathname === '/products' ? 'bg-[#c5a059] text-[#0f2d22]' : 'bg-[#e8f3ed] text-[#1b4332]'}`}>
                  Full Catalog
                </span>
              </div>
              <p className={`text-xs mt-0.5 line-clamp-1 ${pathname === '/products' ? 'text-gray-200' : 'text-gray-500'}`}>
                Browse complete range of henna, cones & botanicals.
              </p>
            </div>
          </div>
          <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${pathname === '/products' ? 'text-[#c5a059]' : 'text-gray-400'}`} />
        </Link>

        {/* Dynamic Category List */}
        {displayList.map((cat) => {
          const Icon = getCategoryIcon(cat.slug, cat.name);
          const targetUrl = cat.slug === 'wholesale' ? '/wholesale' : `/products?category=${encodeURIComponent(cat.slug || cat.id)}`;
          const isSelected = pathname.includes(cat.slug);

          return (
            <Link
              key={cat.id || cat.slug}
              href={targetUrl}
              onClick={closeCategory}
              className={`flex items-center justify-between p-3.5 rounded-xl border transition-all shadow-2xs group min-h-[48px] touch-manipulation cursor-pointer active:scale-[0.98] ${
                isSelected
                  ? 'bg-[#1b4332] text-white border-[#1b4332]'
                  : 'bg-white hover:bg-[#e8f3ed] border-[#e8e2d5] text-[#0f2d22]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2 rounded-lg ${isSelected ? 'bg-[#2d6a4f] text-[#c5a059]' : 'bg-[#f5f1e8] text-[#1b4332]'}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm tracking-tight truncate">
                      {cat.name}
                    </span>
                    {(cat as any).badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isSelected ? 'bg-[#c5a059] text-[#0f2d22]' : 'bg-[#f5f1e8] text-[#c5a059] border border-[#e8e2d5]'}`}>
                        {(cat as any).badge}
                      </span>
                    )}
                  </div>
                  {cat.description && (
                    <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-gray-200' : 'text-gray-500'}`}>
                      {cat.description}
                    </p>
                  )}
                </div>
              </div>
              <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${isSelected ? 'text-[#c5a059]' : 'text-gray-400'}`} />
            </Link>
          );
        })}
      </div>
    </SideDrawer>
  );
}
