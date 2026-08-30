'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { sanitizeImageUrl } from '@/lib/utils';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getClientSiteSettings } from '@/lib/api-client';
import SideDrawer from '@/components/ui/SideDrawer';
import {
  Heart,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface WishlistDrawerProps {
  siteSettings?: SiteSettings;
}

export default function WishlistDrawer({ siteSettings: initialSettings }: WishlistDrawerProps) {
  const { wishlist, removeFromWishlist, isWishlistOpen, closeWishlist, totalWishlistItems } = useWishlist();
  const { addToCart, openCart } = useCart();
  const [settings, setSettings] = useState<SiteSettings | undefined>(initialSettings);

  useEffect(() => {
    if (!initialSettings && typeof window !== 'undefined') {
      getClientSiteSettings().then((siteSettings) => {
        if (siteSettings) {
          setSettings(siteSettings);
        }
      });
    }
  }, [initialSettings]);

  const cms = getCmsText(settings);

  return (
    <SideDrawer
      isOpen={isWishlistOpen}
      onClose={closeWishlist}
      side="right"
      widthClassName="w-full sm:w-[420px] max-w-full"
      icon={<Heart className="w-4 h-4 text-rose-500 fill-rose-500" />}
      title={
        <div className="flex items-center gap-2">
          <span className="font-serif-heading font-extrabold text-sm sm:text-base text-white tracking-tight">
            {cms.wishlistDrawerTitle || 'Your Wishlist'}
          </span>
          <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
            {totalWishlistItems} {totalWishlistItems === 1 ? 'item' : 'items'}
          </span>
        </div>
      }
      subtitle={cms.wishlistDrawerSubtitle || 'Saved botanical and herbal selections'}
      footer={
        wishlist.length > 0 ? (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                wishlist.forEach((item) => {
                  addToCart(item);
                });
                closeWishlist();
                openCart();
              }}
              className="w-full flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-md active:scale-[0.99] transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
              <span>MOVE ALL TO CART</span>
              <ArrowRight className="w-4 h-4 text-[#c5a059]" />
            </button>
            <p className="text-[10px] text-gray-500 text-center font-medium">
              Items remain saved in your browser wishlist until purchased or removed.
            </p>
          </div>
        ) : null
      }
    >
      {wishlist.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
          <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-500">
            <Heart className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
              {cms.wishlistEmptyTitle || 'Your Wishlist is Empty'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              {cms.wishlistEmptySubtitle || 'Save your favorite henna powders, mehndi cones, and herbal botanicals for later.'}
            </p>
          </div>
          <Link
            href="/products"
            onClick={closeWishlist}
            className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all mt-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>DISCOVER SOJAT PRODUCTS</span>
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {wishlist.map((product) => (
            <div
              key={product.id}
              className="bg-white p-3 rounded-xl border border-[#e8e2d5] shadow-2xs flex gap-3 items-center justify-between"
            >
              <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#e8e2d5] bg-[#f5f1e8] shrink-0">
                <Image
                  src={sanitizeImageUrl(product.images?.[0])}
                  alt={product.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="flex-1 min-w-0">
                <Link
                  href={`/products/${product.slug}`}
                  onClick={closeWishlist}
                  className="font-bold text-xs text-[#0f2d22] hover:text-[#1b4332] truncate block"
                >
                  {product.name}
                </Link>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-extrabold text-xs text-[#1b4332]">
                    ₹{product.price}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="text-[10px] text-gray-400 line-through">
                      ₹{product.compareAtPrice}
                    </span>
                  )}
                  {product.quantityOrWeight && (
                    <span className="text-[9.5px] text-gray-500 bg-[#f5f1e8] px-1.5 py-0.5 rounded-md">
                      {product.quantityOrWeight}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      addToCart(product);
                      removeFromWishlist(product.id);
                    }}
                    className="inline-flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-3 py-1 rounded-lg text-[11px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer"
                  >
                    <ShoppingBag className="w-3 h-3 text-[#c5a059]" />
                    <span>Add to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => removeFromWishlist(product.id)}
                    className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    aria-label={`Remove ${product.name} from wishlist`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </SideDrawer>
  );
}
