'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { sanitizeImageUrl } from '@/lib/utils';
import { Heart, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';

export default function WishlistViewClient() {
  const { wishlist, removeFromWishlist, totalWishlistItems } = useWishlist();
  const { addToCart } = useCart();

  if (wishlist.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e2d5] p-12 text-center space-y-6 my-8 shadow-xs max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
          <Heart className="w-8 h-8 fill-rose-500" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
            Your Wishlist is Empty
          </h2>
          <p className="text-xs text-[#626c66] max-w-md mx-auto leading-relaxed">
            Click the heart icon on any product while browsing our pure Sojat Henna catalog to save items for future orders.
          </p>
        </div>
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-6 py-3 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>EXPLORE PRODUCTS</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-600 fill-rose-600" />
          <h2 className="font-serif-heading font-extrabold text-xl text-[#0f2d22]">
            Saved Items ({totalWishlistItems})
          </h2>
        </div>

        <button
          onClick={() => {
            wishlist.forEach((p) => addToCart(p, 1));
          }}
          className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-4 py-2 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] transition-colors"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>Move All to Cart</span>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
        {wishlist.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-2xl border border-[#e8e2d5] p-4 shadow-xs flex flex-col justify-between space-y-4 hover:border-[#1b4332]/40 transition-all"
          >
            <div className="space-y-3">
              <div className="relative aspect-square rounded-xl overflow-hidden bg-[#f5f1e8] border border-[#e8e2d5]">
                <Image
                  src={sanitizeImageUrl(product.images?.[0])}
                  alt={product.name}
                  fill
                  className="object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => removeFromWishlist(product.id)}
                  className="absolute top-2.5 right-2.5 p-2 bg-white/90 backdrop-blur-xs text-gray-400 hover:text-rose-600 rounded-full shadow-xs transition-colors"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div>
                <Link
                  href={`/products/${product.slug || product.id}`}
                  className="font-serif-heading font-bold text-sm text-[#0f2d22] hover:text-[#1b4332] transition-colors line-clamp-1 block"
                >
                  {product.name}
                </Link>
                <p className="text-xs text-[#626c66] mt-0.5 line-clamp-1 truncate">
                  {product.shortDescription}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-extrabold text-base text-[#1b4332]">
                    ₹{product.price}
                  </span>
                  {product.compareAtPrice && product.compareAtPrice > product.price && (
                    <span className="text-xs text-gray-400 line-through">
                      ₹{product.compareAtPrice}
                    </span>
                  )}
                  {product.quantityOrWeight && (
                    <span className="text-[10px] text-gray-500 font-medium">
                      ({product.quantityOrWeight})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  addToCart(product, 1);
                  removeFromWishlist(product.id);
                }}
                className="w-full flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Move to Cart</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
