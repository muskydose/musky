'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { sanitizeImageUrl } from '@/lib/utils';
import { SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getClientSiteSettings } from '@/lib/api-client';
import { trackViewCart, trackRemoveFromCart } from '@/lib/analytics';
import SideDrawer from '@/components/ui/SideDrawer';
import {
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Shield,
  Truck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface CartDrawerProps {
  siteSettings?: SiteSettings;
}

export default function CartDrawer({ siteSettings: initialSettings }: CartDrawerProps) {
  const {
    cart,
    removeFromCart,
    updateQuantity,
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
    if (!initialSettings && typeof window !== 'undefined') {
      getClientSiteSettings().then((siteSettings) => {
        if (siteSettings) {
          setSettings(siteSettings);
        }
      });
    }
  }, [initialSettings]);

  const cms = getCmsText(settings);
  const freeShippingThreshold = 999;
  const progressToFreeShipping = Math.min(100, (totalAmount / freeShippingThreshold) * 100);
  const amountNeededForFreeShipping = Math.max(0, freeShippingThreshold - totalAmount);

  return (
    <SideDrawer
      isOpen={isCartOpen}
      onClose={closeCart}
      side="right"
      widthClassName="w-full sm:w-[440px] max-w-full"
      icon={<ShoppingBag className="w-4 h-4 text-[#c5a059]" />}
      title={
        <div className="flex items-center gap-2">
          <span className="font-serif-heading font-extrabold text-sm sm:text-base text-white tracking-tight">
            {cms.cartTitle || 'Your Shopping Cart'}
          </span>
          <span className="bg-[#c5a059] text-[#0f2d22] text-[10px] font-black px-2 py-0.5 rounded-full">
            {totalItems} {totalItems === 1 ? 'item' : 'items'}
          </span>
        </div>
      }
      subtitle={cms.cartDrawerSubtitle || 'Direct harvest from Sojat, Rajasthan'}
      footer={
        cart.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600 font-medium">
                <span>{cms.cartSubtotalLabel || 'Subtotal'}:</span>
                <span className="font-bold text-[#0f2d22]">
                  ₹{discountInfo ? discountInfo.regularSubtotal : totalAmount}
                </span>
              </div>

              {discountInfo && discountInfo.totalDiscountAmount > 0 && (
                <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-xs">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    {cms.cartBulkDiscountLabel || 'Wholesale Bulk Savings'}:
                  </span>
                  <span>-₹{discountInfo.totalDiscountAmount}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600 font-medium">
                <span>{cms.cartShippingLabel || 'Shipping'}:</span>
                <span className="text-emerald-700 font-bold">
                  {amountNeededForFreeShipping === 0 ? 'FREE Shipping' : 'Calculated at checkout'}
                </span>
              </div>

              <div className="pt-2 border-t border-[#e8e2d5] flex items-center justify-between">
                <span className="font-bold text-sm text-[#0f2d22]">{cms.cartTotalLabel || 'Total Payable'}:</span>
                <span className="text-[#1b4332] text-lg font-extrabold">
                  ₹{discountInfo ? discountInfo.netSubtotal : totalAmount}
                </span>
              </div>
            </div>

            <Link
              href="/checkout"
              onClick={closeCart}
              className="w-full flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] py-3 rounded-xl font-bold text-xs sm:text-sm tracking-wide shadow-md active:scale-[0.99] transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-[#c5a059]" />
              <span>{cms.cartCheckoutButtonText || 'PROCEED TO CHECKOUT'} (₹{discountInfo ? discountInfo.netSubtotal : totalAmount})</span>
              <ArrowRight className="w-4 h-4 text-[#c5a059]" />
            </Link>

            <div className="flex items-center justify-between text-[10.5px] text-gray-500 pt-0.5">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-[#c5a059]" /> 100% Pure Sojat Henna
              </span>
              <span>Fast Pan-India Delivery</span>
            </div>
          </div>
        ) : null
      }
    >
      {/* Free Shipping Progress Alert */}
      {cart.length > 0 && (
        <div className="mb-3.5 p-2.5 bg-[#e8f3ed] border border-[#b7dfcb] rounded-xl">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-bold text-[#1b4332] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-[#1b4332]" />
              {amountNeededForFreeShipping === 0
                ? '🎉 You unlocked FREE Shipping!'
                : `Add ₹${amountNeededForFreeShipping} more for FREE Shipping`}
            </span>
            <span className="text-[10px] font-extrabold text-[#1b4332]">
              {Math.round(progressToFreeShipping)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-white rounded-full overflow-hidden">
            <div
              className="h-full bg-[#1b4332] transition-all duration-300 rounded-full"
              style={{ width: `${progressToFreeShipping}%` }}
            />
          </div>
        </div>
      )}

      {/* Cart Items List */}
      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 px-4 space-y-3">
          <div className="w-14 h-14 bg-[#f5f1e8] rounded-full flex items-center justify-center text-[#1b4332]">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div>
            <h3 className="font-serif-heading font-bold text-base text-[#0f2d22]">
              {cms.cartEmptyTitle || 'Your Cart is Empty'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
              {cms.cartEmptyDescription || 'Explore our pure organic Rajasthani henna powders, bridal mehndi cones, and botanical hair care.'}
            </p>
          </div>
          <Link
            href="/products"
            onClick={closeCart}
            className="inline-flex items-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all mt-2"
          >
            <span>{cms.cartEmptyCtaText || 'EXPLORE CATALOG'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-2.5">
          {cart.map((item) => {
            const itemTotal = (item.product.price || 0) * item.quantity;
            return (
              <div
                key={item.product.id}
                className="bg-white p-3 rounded-xl border border-[#e8e2d5] shadow-2xs flex gap-3 items-center justify-between"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-[#e8e2d5] bg-[#f5f1e8] shrink-0">
                  <Image
                    src={sanitizeImageUrl(item.product.images?.[0])}
                    alt={item.product.name}
                    fill
                    sizes="56px"
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
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-1 hover:bg-[#f5f1e8] rounded-l-lg text-[#0f2d22] cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-[#0f2d22]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-1 hover:bg-[#f5f1e8] rounded-r-lg text-[#0f2d22] cursor-pointer"
                        aria-label="Increase quantity"
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
                  type="button"
                  onClick={() => {
                    trackRemoveFromCart({
                      id: item.product.id,
                      name: item.product.name,
                      price: item.product.price,
                    });
                    removeFromCart(item.product.id);
                  }}
                  className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0 cursor-pointer"
                  aria-label={`Remove ${item.product.name} from cart`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </SideDrawer>
  );
}
