'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useWishlist } from '@/context/WishlistContext';
import { useCart } from '@/context/CartContext';
import { sanitizeImageUrl } from '@/lib/utils';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { Heart, X, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';

import { getClientSiteSettings } from '@/lib/api-client';

interface WishlistDrawerProps {
  siteSettings?: SiteSettings;
}

export default function WishlistDrawer({ siteSettings: initialSettings }: WishlistDrawerProps) {
  const { wishlist, removeFromWishlist, isWishlistOpen, closeWishlist, totalWishlistItems } = useWishlist();
  const { addToCart } = useCart();
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
    <AnimatePresence>
      {isWishlistOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeWishlist}
            className="absolute inset-0 bg-[#0f2d22]/60 backdrop-blur-xs transition-opacity"
          />

          <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="pointer-events-auto w-screen max-w-md bg-[#fcfbf7] border-l border-[#e8e2d5] shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 bg-white border-b border-[#e8e2d5] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600">
                    <Heart className="w-5 h-5 fill-rose-600" />
                  </div>
                  <div>
                    <h2 className="font-serif-heading font-extrabold text-lg text-[#0f2d22]">
                      {cms.wishlistDrawerTitle} ({totalWishlistItems})
                    </h2>
                    <p className="text-[11px] text-gray-500">
                      {cms.wishlistDrawerSubtitle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={closeWishlist}
                  className="p-2 text-gray-400 hover:text-[#0f2d22] hover:bg-[#f5f1e8] rounded-xl transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {wishlist.length === 0 ? (
                  <div className="text-center py-16 space-y-4">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
                      <Heart className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                        {cms.wishlistEmptyTitle}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                        {cms.wishlistEmptySubtitle}
                      </p>
                    </div>
                    <Link
                      href="/products"
                      onClick={closeWishlist}
                      className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs hover:bg-[#0f2d22] transition-all"
                    >
                      <span>{cms.wishlistExploreCta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wishlist.map((product) => (
                      <div
                        key={product.id}
                        className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs flex gap-4 items-center justify-between"
                      >
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e8e2d5] bg-[#f5f1e8] shrink-0">
                          <Image
                            src={sanitizeImageUrl(product.images?.[0])}
                            alt={product.name}
                            fill
                            className="object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-[#0f2d22] truncate">
                            {product.name}
                          </h4>
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            ₹{product.price} {product.quantityOrWeight ? `| ${product.quantityOrWeight}` : ''}
                          </p>

                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => {
                                addToCart(product, 1);
                                removeFromWishlist(product.id);
                              }}
                              className="px-3 py-1 bg-[#1b4332] hover:bg-[#0f2d22] text-white text-[11px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                            >
                              <ShoppingBag className="w-3 h-3" />
                              <span>{cms.wishlistMoveToCartText}</span>
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={() => removeFromWishlist(product.id)}
                          className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                          title="Remove from wishlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {wishlist.length > 0 && (
                <div className="p-6 bg-white border-t border-[#e8e2d5]">
                  <button
                    onClick={() => {
                      wishlist.forEach((prod) => addToCart(prod, 1));
                      closeWishlist();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white py-3 rounded-xl font-bold text-xs shadow-md transition-all"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>ADD ALL TO CART ({totalWishlistItems} ITEMS)</span>
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
