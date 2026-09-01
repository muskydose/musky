'use client';

import React, { useState } from 'react';
import { CouponValidationResult } from '@/lib/types';
import { Tag, Check, X, Loader2 } from 'lucide-react';

interface CouponInputProps {
  cartItems: Array<{ productId: string; quantity: number }>;
  customerPhone?: string;
  onCouponApplied: (result: CouponValidationResult | null) => void;
  appliedCouponResult?: CouponValidationResult | null;
}

export default function CouponInput({
  cartItems,
  customerPhone,
  onCouponApplied,
  appliedCouponResult,
}: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode || !couponCode.trim()) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: couponCode.trim().toUpperCase(),
          items: cartItems,
          customerPhone,
        }),
      });

      let data: any = null;
      if (res.headers.get('content-type')?.includes('application/json')) {
        data = await res.json().catch(() => null);
      }

      if (res.ok && data?.valid) {
        onCouponApplied(data);
        setErrorMessage(null);
      } else {
        onCouponApplied(null);
        setErrorMessage(data?.message || 'Invalid coupon code.');
      }
    } catch (err: any) {
      setErrorMessage('Failed to validate coupon.');
      onCouponApplied(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setErrorMessage(null);
    onCouponApplied(null);
  };

  if (appliedCouponResult && appliedCouponResult.valid) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-mono font-bold tracking-wider text-sm uppercase">
              {appliedCouponResult.campaign?.couponCode}
            </span>
            <p className="text-[11px] font-medium text-emerald-700">
              {appliedCouponResult.message}
            </p>
          </div>
        </div>

        <button
          onClick={handleRemoveCoupon}
          className="p-1 hover:bg-emerald-100 active:scale-90 rounded-lg text-emerald-700 font-semibold text-xs transition-all cursor-pointer touch-manipulation"
          title="Remove Coupon"
          aria-label="Remove Coupon"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <form onSubmit={handleApplyCoupon} className="flex gap-2">
        <div className="relative flex-1">
          <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Festival Coupon Code..."
            value={couponCode}
            onChange={(e) => {
              setCouponCode(e.target.value.toUpperCase());
              setErrorMessage(null);
            }}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono font-semibold uppercase rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-[#1b4332] bg-white"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !couponCode.trim()}
          className="px-4 py-2 bg-[#1b4332] text-white text-xs font-semibold rounded-xl hover:bg-[#0f2d22] active:scale-95 transition-all disabled:opacity-50 shrink-0 flex items-center gap-1.5 cursor-pointer touch-manipulation"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
        </button>
      </form>

      {errorMessage && (
        <p className="text-[11px] text-red-600 font-medium pl-1">{errorMessage}</p>
      )}
    </div>
  );
}
