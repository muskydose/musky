'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useUI } from '@/context/UIContext';
import SideDrawer from '@/components/ui/SideDrawer';
import { Product } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';
import { trackSearchOpen, trackSearchSubmit } from '@/lib/analytics';
import { unifiedSearchProducts } from '@/lib/search/unified-search';
import { resolveEntityFromQuery } from '@/lib/growth/entities';
import {
  Search,
  X,
  TrendingUp,
  Sparkles,
  ArrowRight,
  ChevronRight,
  History,
  Grid,
  Leaf,
  ShoppingBag,
  Loader2,
  CheckCircle,
  BookOpen,
} from 'lucide-react';

const TRENDING_SEARCHES = [
  { label: 'Sojat Henna Powder', query: 'sojat henna powder', tag: 'Best Seller' },
  { label: 'Bridal Mehndi Cones', query: 'bridal mehndi cone', tag: 'Fast Color' },
  { label: 'Pure Indigo Powder', query: 'indigo powder', tag: '100% Herbal' },
  { label: 'Organic Amla Powder', query: 'amla powder', tag: 'Hair Care' },
  { label: 'Beetroot Face Pack', query: 'beetroot powder', tag: 'Glow' },
  { label: 'Multani Mitti', query: 'multani mitti', tag: 'Skin Care' },
  { label: 'Wholesale Henna Bulks', query: 'wholesale henna', tag: 'B2B 20kg+' },
];

const POPULAR_CATEGORIES = [
  { name: 'Henna & Mehndi', href: '/categories/henna', icon: '🌿' },
  { name: 'Herbal Powders', href: '/categories/herbal-products', icon: '✨' },
  { name: 'Hair Care Packs', href: '/categories/hair-care', icon: '💇‍♀️' },
  { name: 'Face Packs & Clay', href: '/categories/face-care', icon: '🌸' },
  { name: 'Wholesale & B2B', href: '/wholesale', icon: '📦' },
];

export default function SearchDrawer() {
  const { isSearchOpen, closeSearch } = useUI();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened & load recents from localStorage
  useEffect(() => {
    if (isSearchOpen) {
      trackSearchOpen();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      try {
        const saved = localStorage.getItem('muskydose_recent_searches');
        if (saved) {
          setRecentSearches(JSON.parse(saved).slice(0, 5));
        }
      } catch {}
    }
  }, [isSearchOpen]);

  // Debounced live search with Unified Search Engine
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setLiveProducts([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      fetch('/api/products')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.success && Array.isArray(data.products)) {
            const ranked = unifiedSearchProducts(data.products, trimmed, 15).slice(0, 6);
            setLiveProducts(ranked);
            trackSearchSubmit(trimmed, ranked.length);
          }
        })
        .catch(() => {})
        .finally(() => setIsSearching(false));
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const clean = term.trim();
    const updated = [clean, ...recentSearches.filter((s) => s.toLowerCase() !== clean.toLowerCase())].slice(0, 6);
    setRecentSearches(updated);
    try {
      localStorage.setItem('muskydose_recent_searches', JSON.stringify(updated));
    } catch {}
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem('muskydose_recent_searches');
    } catch {}
  };

  const handleSearchSubmit = (e?: React.FormEvent, directTerm?: string) => {
    if (e) e.preventDefault();
    const term = directTerm || query;
    if (!term.trim()) return;

    saveRecentSearch(term);
    closeSearch();

    // Check smart route API first or navigate to products with search query
    fetch(`/api/search/smart-route?q=${encodeURIComponent(term)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.destinationUrl) {
          router.push(data.destinationUrl);
        } else {
          router.push(`/products?search=${encodeURIComponent(term)}`);
        }
      })
      .catch(() => {
        router.push(`/products?search=${encodeURIComponent(term)}`);
      });
  };

  return (
    <SideDrawer
      isOpen={isSearchOpen}
      onClose={closeSearch}
      side="right"
      widthClassName="w-full sm:w-[480px] max-w-full"
      icon={<Search className="w-4 h-4 text-[#c5a059]" />}
      title="Search Musky Dose"
      subtitle="Find Sojat Henna, Herbal Botanicals & Wholesale"
      footer={
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-[#1b4332]" /> Direct from Sojat, Rajasthan
          </span>
          <Link
            href="/products"
            onClick={closeSearch}
            className="font-bold text-[#1b4332] hover:text-[#0f2d22] flex items-center gap-1"
          >
            <span>All Products</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      }
    >
      {/* Search Input Form */}
      <form onSubmit={handleSearchSubmit} className="relative mb-4">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 pointer-events-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search herbal powder, mehndi cones, henna..."
            className="w-full pl-10 pr-20 py-3 bg-white border border-[#e8e2d5] rounded-xl text-sm text-[#0f2d22] placeholder-gray-400 focus:outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/10 shadow-2xs font-medium"
          />
          {query ? (
            <div className="absolute right-2 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full cursor-pointer"
                aria-label="Clear query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <button
                type="submit"
                className="bg-[#1b4332] text-[#c5a059] px-2.5 py-1.5 rounded-lg text-xs font-bold shadow-2xs hover:bg-[#0f2d22] cursor-pointer"
              >
                Go
              </button>
            </div>
          ) : (
            <span className="absolute right-3 text-[11px] text-gray-400 font-mono hidden sm:inline">
              ↵ Enter
            </span>
          )}
        </div>
      </form>

      {/* Live Search Results (when query length >= 2) */}
      {query.trim().length >= 2 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#0f2d22] font-bold px-0.5">
            <span className="flex items-center gap-1.5">
              {isSearching ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1b4332]" />
              ) : (
                <ShoppingBag className="w-3.5 h-3.5 text-[#c5a059]" />
              )}
              <span>{isSearching ? 'Searching...' : `Matching Products (${liveProducts.length})`}</span>
            </span>
            <button
              type="button"
              onClick={() => handleSearchSubmit()}
              className="text-[11px] text-[#1b4332] hover:underline cursor-pointer font-bold"
            >
              See all results &rarr;
            </button>
          </div>

          {/* Entity Shortcut Pill */}
          {(() => {
            const matchedEntity = resolveEntityFromQuery(query);
            if (!matchedEntity) return null;
            return (
              <div className="flex items-center justify-between p-2.5 bg-[#e8f3ed] border border-[#c2ded0] rounded-xl text-xs text-[#1b4332]">
                <span className="font-bold flex items-center gap-1.5 truncate">
                  <Leaf className="w-3.5 h-3.5 text-[#1b4332] shrink-0" />
                  <span>{matchedEntity.canonicalName} / Mehndi Collection</span>
                </span>
                <Link
                  href={`/categories/${matchedEntity.categorySlug}`}
                  onClick={closeSearch}
                  className="font-extrabold text-[11px] bg-[#1b4332] text-white px-2.5 py-1 rounded-lg hover:bg-[#0f2d22] transition-colors shrink-0"
                >
                  Category &rarr;
                </Link>
              </div>
            );
          })()}

          {liveProducts.length > 0 ? (
            <div className="space-y-2">
              {liveProducts.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/products/${prod.slug || prod.id}`}
                  onClick={closeSearch}
                  className="flex items-center justify-between p-2.5 bg-white hover:bg-[#e8f3ed] rounded-xl border border-[#e8e2d5] transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-[#e8e2d5] bg-[#f5f1e8] shrink-0">
                      <Image
                        src={sanitizeImageUrl(prod.images?.[0])}
                        alt={prod.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-[#0f2d22] group-hover:text-[#1b4332] truncate">
                        {prod.name}
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-[#1b4332]">₹{prod.price}</span>
                        {prod.compareAtPrice && prod.compareAtPrice > prod.price && (
                          <span className="line-through text-gray-400">₹{prod.compareAtPrice}</span>
                        )}
                        <span>• {prod.categoryName || 'Sojat Henna'}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#1b4332] shrink-0 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}

              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="w-full py-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-bold text-xs rounded-xl shadow-2xs transition-all active:scale-[0.99] cursor-pointer"
              >
                View Full Results for &quot;{query}&quot;
              </button>
            </div>
          ) : !isSearching ? (
            <div className="text-center py-8 px-4 bg-white rounded-xl border border-[#e8e2d5]">
              <p className="text-xs font-bold text-[#0f2d22]">No direct product title matches</p>
              <p className="text-[11px] text-gray-500 mt-1">Press &apos;Go&apos; to search entire catalog & descriptions.</p>
              <button
                type="button"
                onClick={() => handleSearchSubmit()}
                className="mt-3 px-4 py-2 bg-[#1b4332] text-[#c5a059] text-xs font-bold rounded-lg shadow-xs"
              >
                Search Catalog &rarr;
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-5">
        {/* Recent Searches (if any) */}
        {recentSearches.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-[#0f2d22] mb-2 px-0.5">
              <span className="flex items-center gap-1.5 text-gray-700">
                <History className="w-3.5 h-3.5 text-gray-400" />
                Recent Searches
              </span>
              <button
                type="button"
                onClick={clearRecentSearches}
                className="text-[10px] text-gray-400 hover:text-rose-600 cursor-pointer"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((term) => (
                <button
                  key={term}
                  type="button"
                  onClick={() => handleSearchSubmit(undefined, term)}
                  className="px-2.5 py-1 bg-white hover:bg-[#f5f1e8] text-[#0f2d22] border border-[#e8e2d5] rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
                >
                  <Search className="w-3 h-3 text-gray-400" />
                  <span>{term}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Trending & Popular Searches */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2d22] mb-2 px-0.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>Trending Botanical Searches</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {TRENDING_SEARCHES.map((item) => (
              <button
                key={item.query}
                type="button"
                onClick={() => handleSearchSubmit(undefined, item.query)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white hover:bg-[#e8f3ed] border border-[#e8e2d5] hover:border-[#b7dfcb] rounded-xl text-left transition-all group shadow-2xs cursor-pointer active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-gray-400 group-hover:text-[#1b4332]" />
                  <span className="text-xs font-bold text-[#0f2d22] group-hover:text-[#1b4332]">
                    {item.label}
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-[#fcfbf7] text-[#c5a059] border border-[#e8e2d5] rounded-md group-hover:bg-[#1b4332] group-hover:text-[#c5a059] group-hover:border-[#1b4332] transition-colors">
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Categories */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0f2d22] mb-2 px-0.5">
            <Grid className="w-3.5 h-3.5 text-[#1b4332]" />
            <span>Browse Categories</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {POPULAR_CATEGORIES.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                onClick={closeSearch}
                className="flex items-center gap-2 p-2.5 bg-white hover:bg-[#f5f1e8] border border-[#e8e2d5] rounded-xl transition-all shadow-2xs group"
              >
                <span className="text-base shrink-0">{cat.icon}</span>
                <span className="text-xs font-bold text-[#0f2d22] group-hover:text-[#1b4332] truncate">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Wholesale Fast Banner */}
        <div className="p-3 bg-[#0f2d22] rounded-xl text-white flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#c5a059]">
              <Sparkles className="w-3.5 h-3.5" />
              Wholesale & Bulk Orders
            </div>
            <p className="text-[10.5px] text-gray-300 mt-0.5">
              Direct factory tier pricing for salons & distributors (5kg to 1000kg+)
            </p>
          </div>
          <Link
            href="/wholesale"
            onClick={closeSearch}
            className="shrink-0 px-3 py-1.5 bg-[#c5a059] hover:bg-[#b08d46] text-[#0f2d22] text-xs font-extrabold rounded-lg shadow-xs transition-colors"
          >
            Inquire
          </Link>
        </div>
      </div>
      )}
    </SideDrawer>
  );
}

