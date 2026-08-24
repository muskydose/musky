'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { sanitizeImageUrl } from '@/lib/utils';
import { SiteSettings } from '@/lib/types';
import { getConfiguredWhatsAppNumber } from '@/lib/whatsapp';
import { trackViewCart, trackRemoveFromCart, trackWhatsAppClick } from '@/lib/analytics';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  Shield,
  MessageCircle,
  Sparkles,
  Truck,
} from 'lucide-react';

interface CartViewClientProps {
  siteSettings: SiteSettings;
}

export default function CartViewClient({ siteSettings }: CartViewClientProps) {
  const { cart, removeFromCart, updateQuantity, totalItems, totalAmount } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
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
    trackViewCart(totalItems, totalAmount);
  }, [totalItems, totalAmount]);

  const whatsappNumber = getConfiguredWhatsAppNumber(siteSettings);
  const brandName = siteSettings?.brandName || 'Musky Dose';

  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e8e2d5] p-12 text-center space-y-6 my-8 shadow-xs max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-[#f5f1e8] rounded-full flex items-center justify-center mx-auto text-[#1b4332]">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif-heading text-2xl font-bold text-[#0f2d22]">
            Your Cart is Currently Empty
          </h2>
          <p className="text-xs text-[#626c66] max-w-md mx-auto leading-relaxed">
            Explore our pure Sojat Henna powder, Indigo, and natural herbal care collections to add items to your cart.
          </p>
        </div>
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 bg-[#1b4332] text-white px-6 py-3 rounded-xl text-xs font-bold shadow hover:bg-[#0f2d22] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>CONTINUE SHOPPING</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Cart Items List */}
      <div className="lg:col-span-8 space-y-4">
        <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-4">
            <h2 className="font-serif-heading font-extrabold text-xl text-[#0f2d22]">
              Cart Items ({totalItems})
            </h2>
            <Link
              href="/products"
              className="text-xs text-[#1b4332] hover:underline font-bold flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Continue Shopping</span>
            </Link>
          </div>

          <div className="divide-y divide-[#f5f1e8]">
            {cart.map((item) => {
              const itemTotal = (item.product.price || 0) * item.quantity;
              return (
                <div key={item.product.id} className="py-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-[#e8e2d5] bg-[#f5f1e8] shrink-0">
                      <Image
                        src={sanitizeImageUrl(item.product.images?.[0])}
                        alt={item.product.name}
                        fill
                        className="object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/products/${item.product.slug || item.product.id}`}
                        className="font-serif-heading font-bold text-sm text-[#0f2d22] hover:text-[#1b4332] transition-colors block truncate"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-[#626c66] mt-0.5">
                        Pack: <strong className="text-[#0f2d22]">{item.product.quantityOrWeight || 'Standard'}</strong> | ₹{item.product.price} each
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between w-full sm:w-auto gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-[#f5f1e8]">
                    {/* Quantity Controls */}
                    <div className="inline-flex items-center border border-[#e8e2d5] rounded-xl bg-[#fcfbf7]">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        className="p-2 hover:bg-[#f5f1e8] rounded-l-xl text-[#0f2d22] transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center font-bold text-xs text-[#0f2d22]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                        className="p-2 hover:bg-[#f5f1e8] rounded-r-xl text-[#0f2d22] transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="font-extrabold text-sm text-[#1b4332]">
                      ₹{itemTotal}
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
                      className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Summary Column */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 shadow-xs space-y-5 sticky top-24">
          <h2 className="font-serif-heading font-extrabold text-lg text-[#0f2d22] border-b border-[#e8e2d5] pb-3">
            Order Summary
          </h2>

          <div className="space-y-2.5 text-xs text-[#626c66]">
            <div className="flex justify-between font-medium">
              <span>Items Subtotal ({totalItems} packs):</span>
              <span className="font-bold text-[#0f2d22]">₹{discountInfo ? discountInfo.regularSubtotal : totalAmount}</span>
            </div>

            {discountInfo && discountInfo.totalDiscountAmount > 0 && (
              <div className="flex justify-between font-bold text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#c5a059]" /> Bulk Volume Discount:
                </span>
                <span>-₹{discountInfo.totalDiscountAmount}</span>
              </div>
            )}

            <div className="flex justify-between font-medium">
              <span>Shipping (Factory Direct):</span>
              <span className="text-amber-800 font-bold">Extra (Calculated on Order)</span>
            </div>

            <div className="pt-3 border-t border-[#f5f1e8] flex justify-between items-baseline text-base font-extrabold text-[#0f2d22]">
              <span>Product Subtotal:</span>
              <span className="text-[#1b4332] text-2xl font-extrabold">
                ₹{discountInfo ? discountInfo.netSubtotal : totalAmount}
              </span>
            </div>
            <p className="text-[10px] text-gray-400 italic text-center">
              * Exact shipping charges determined based on total parcel weight and destination PIN code.
            </p>
          </div>

          <div className="space-y-2.5 pt-2">
            <Link
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-[#1b4332] hover:bg-[#0f2d22] text-white py-4 rounded-xl font-extrabold text-xs tracking-wider shadow-md hover:shadow-lg transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>PROCEED TO CHECKOUT (₹{discountInfo ? discountInfo.netSubtotal : totalAmount})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="bg-[#fcfbf7] p-3.5 rounded-xl border border-[#e8e2d5] space-y-1.5 text-[11px] text-[#626c66]">
            <div className="flex items-center gap-1.5 font-bold text-[#0f2d22]">
              <Shield className="w-3.5 h-3.5 text-[#c5a059]" /> Sojat Heritage Quality
            </div>
            <p>Direct factory dispatch from Sojat, Rajasthan. 100% natural and unadulterated herbal powders.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
