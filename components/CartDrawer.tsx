'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { useCart } from '@/context/CartContext';
import { sanitizeImageUrl } from '@/lib/utils';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { getClientSiteSettings } from '@/lib/api-client';
import { trackViewCart, trackRemoveFromCart, trackWhatsAppClick, trackOrderEnquiryCreated } from '@/lib/analytics';
import {
  ShoppingBag,
  X,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Shield,
  CheckCircle,
  Truck,
  ArrowRight,
} from 'lucide-react';

interface CartDrawerProps {
  siteSettings?: SiteSettings;
}

export default function CartDrawer({ siteSettings: initialSettings }: CartDrawerProps) {
  const {
    cart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    totalAmount,
    isCartOpen,
    closeCart,
  } = useCart();

  const [settings, setSettings] = useState<Partial<SiteSettings> | undefined>(initialSettings);
  const [discountInfo, setDiscountInfo] = useState<{
    regularSubtotal: number;
    totalDiscountAmount: number;
    netSubtotal: number;
    itemBreakdown: any[];
  } | null>(null);

  useEffect(() => {
    if (cart.length === 0) {
      Promise.resolve().then(() => setDiscountInfo(null));
      return;
    }

    const items = cart.map((i) => ({ productId: i.product.id, quantity: i.quantity }));
    fetch('/api/bulk-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calculate', items }),
    })
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (data?.success && data.result) {
          setDiscountInfo(data.result);
        }
      })
      .catch(() => {});
  }, [cart]);

  useEffect(() => {
    if (isCartOpen) {
      trackViewCart(totalItems, totalAmount);
    }
  }, [isCartOpen, totalItems, totalAmount]);

  useEffect(() => {
    if (!initialSettings) {
      getClientSiteSettings().then((siteSettings) => {
        if (siteSettings) {
          setSettings(siteSettings);
        }
      });
    }
  }, [initialSettings]);

  const whatsappNumber = getConfiguredWhatsAppNumber(settings);
  const brandName = settings?.brandName || 'Musky Dose';
  const cms = getCmsText(settings);

  return (
    <AnimatePresence>
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeCart}
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
              <div className="p-2.5 bg-[#e8f3ed] rounded-xl text-[#1b4332]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif-heading font-extrabold text-lg text-[#0f2d22]">
                  {cms.cartTitle} ({totalItems})
                </h2>
                <p className="text-[11px] text-gray-500">
                  {cms.cartDrawerSubtitle || 'Consolidated WhatsApp order dispatch'}
                </p>
              </div>
            </div>

            <button
              onClick={closeCart}
              className="p-2 text-gray-400 hover:text-[#0f2d22] hover:bg-[#f5f1e8] rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length === 0 ? (
              <div className="text-center py-16 space-y-4">
                <div className="w-16 h-16 bg-[#f5f1e8] rounded-full flex items-center justify-center mx-auto text-[#1b4332]">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                    {cms.cartEmptyTitle}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                    {cms.cartEmptyDescription}
                  </p>
                </div>
                <Link
                  href="/products"
                  onClick={closeCart}
                  className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:bg-[#0f2d22] transition-all"
                >
                  <span>{cms.cartEmptyCtaText}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => {
                  const itemTotal = (item.product.price || 0) * item.quantity;
                  return (
                    <div
                      key={item.product.id}
                      className="bg-white p-4 rounded-xl border border-[#e8e2d5] shadow-2xs flex gap-4 items-center justify-between"
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#e8e2d5] bg-[#f5f1e8] shrink-0">
                        <Image
                          src={sanitizeImageUrl(item.product.images?.[0])}
                          alt={item.product.name}
                          fill
                          className="object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-xs text-[#0f2d22] truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          Pack: {item.product.quantityOrWeight || 'Standard'} | ₹{item.product.price} each
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="inline-flex items-center border border-[#e8e2d5] rounded-lg bg-[#fcfbf7]">
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                              className="p-1 hover:bg-[#f5f1e8] rounded-l-lg text-[#0f2d22]"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-7 text-center font-bold text-xs text-[#0f2d22]">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                              className="p-1 hover:bg-[#f5f1e8] rounded-r-lg text-[#0f2d22]"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="font-extrabold text-xs text-[#1b4332]">
                            ₹{itemTotal}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          trackRemoveFromCart({
                            id: item.product.id,
                            name: item.product.name,
                            price: item.product.price,
                          });
                          removeFromCart(item.product.id);
                        }}
                        className="p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}

              </div>
            )}
          </div>

          {/* Footer & Order Summary */}
          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-[#e8e2d5] space-y-4 shadow-lg">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>{cms.cartSubtotalLabel} ({totalItems} items):</span>
                  <span>₹{discountInfo ? discountInfo.regularSubtotal : totalAmount}</span>
                </div>
                {discountInfo && discountInfo.totalDiscountAmount > 0 && (
                  <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 p-2 rounded border border-emerald-200">
                    <span className="flex items-center gap-1">{cms.cartBulkDiscountLabel}</span>
                    <span>-₹{discountInfo.totalDiscountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600 font-medium">
                  <span>{cms.cartShippingLabel}:</span>
                  <span className="text-amber-800 font-bold">{cms.cartShippingCalculatedText}</span>
                </div>
                <div className="pt-2 border-t border-[#f5f1e8] flex justify-between text-base font-extrabold text-[#0f2d22]">
                  <span>{cms.cartTotalLabel}:</span>
                  <span className="text-[#1b4332] text-xl">
                    ₹{discountInfo ? discountInfo.netSubtotal : totalAmount}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 text-center italic">
                  {cms.cartShippingNotice}
                </p>
              </div>

              <div className="space-y-2">
                <Link
                  href="/checkout"
                  onClick={closeCart}
                  className="w-full flex items-center justify-center gap-2.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white py-3.5 rounded-xl font-bold text-sm tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>{cms.cartCheckoutButtonText} (₹{totalAmount})</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <div className="flex items-center justify-between text-[10px] text-gray-500 px-1 pt-1">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-[#c5a059]" /> Pure Sojat Henna
                  </span>
                  <span>Order via Secure Checkout & WhatsApp</span>
                </div>
              </div>
            </div>
          )}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
