'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Product, BulkPricingRule, SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import {
  Calculator,
  Sparkles,
  Package,
  ArrowRight,
  TrendingDown,
  Info,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Leaf,
} from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRINGS } from '@/lib/motion';
import { trackWholesaleInquiryStarted } from '@/lib/analytics';

interface WholesaleCalculatorProps {
  siteSettings?: SiteSettings;
  onSelectQuote?: (data: {
    productName: string;
    quantityKg: number;
    estimatedTotal: number;
    effectivePricePerKg: number;
    tierName: string;
  }) => void;
}

const PRESET_QUANTITIES = [5, 10, 25, 50, 100, 250, 500, 1000];

export default function WholesaleCalculator({ siteSettings, onSelectQuote }: WholesaleCalculatorProps) {
  const cms = getCmsText(siteSettings);
  const shouldReduceMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [rules, setRules] = useState<BulkPricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantityKg, setQuantityKg] = useState<number>(25);

  const fetchPricingData = async () => {
    setLoading(true);
    setError(false);
    try {
      const [prodRes, rulesRes] = await Promise.all([
        fetch('/api/products').then((r) => (r.ok ? r.json() : null)),
        fetch('/api/bulk-pricing').then((r) => (r.ok ? r.json() : null)),
      ]);

      const loadedProducts: Product[] = prodRes?.products || [];
      const loadedRules: BulkPricingRule[] = rulesRes?.rules || [];

      setProducts(loadedProducts);
      setRules(loadedRules);

      if (loadedProducts.length > 0) {
        // Default to first henna or botanical powder product if available
        const defaultProd =
          loadedProducts.find(
            (p) =>
              p.name.toLowerCase().includes('henna') ||
              p.name.toLowerCase().includes('mehendi') ||
              p.categoryName?.toLowerCase().includes('henna')
          ) || loadedProducts[0];
        setSelectedProductId(defaultProd.id);
      }
    } catch (err) {
      console.warn('Failed to load wholesale pricing data:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();
  }, []);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Authoritative Pricing Calculation
  const calculation = useMemo(() => {
    if (!selectedProduct) {
      return {
        basePricePerKg: 0,
        effectivePricePerKg: 0,
        regularTotal: 0,
        estimatedTotal: 0,
        totalSavings: 0,
        discountPercent: 0,
        tierName: 'Standard Wholesale',
        matchedRule: undefined as BulkPricingRule | undefined,
      };
    }

    // Base retail price per kg (assuming retail pack normalized or base price)
    const basePricePerKg = Number(selectedProduct.price) || 250;
    const qty = Math.max(1, Math.min(10000, Math.floor(quantityKg || 1)));
    const regularTotal = basePricePerKg * qty;

    // Check database rules first
    let matchedRule = rules.find((r) => {
      if (r.productId !== selectedProduct.id) return false;
      const minOk = qty >= r.minQuantity;
      const maxOk = !r.maxQuantity || qty <= r.maxQuantity;
      return minOk && maxOk;
    });

    if (!matchedRule) {
      matchedRule = rules.find((r) => {
        if (r.productId && r.productId !== 'global') return false;
        const minOk = qty >= r.minQuantity;
        const maxOk = !r.maxQuantity || qty <= r.maxQuantity;
        return minOk && maxOk;
      });
    }

    let unitDiscount = 0;
    let tierName = 'Standard Base Rate';

    if (matchedRule) {
      if (matchedRule.discountType === 'percentage') {
        unitDiscount = (basePricePerKg * matchedRule.discountValue) / 100;
        tierName = `Active Tier (${matchedRule.discountValue}% Off: ${matchedRule.minQuantity}${
          matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
        }kg)`;
      } else if (matchedRule.discountType === 'fixed_amount') {
        unitDiscount = matchedRule.discountValue;
        tierName = `Active Tier (₹${matchedRule.discountValue}/kg Off: ${matchedRule.minQuantity}${
          matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
        }kg)`;
      } else if (matchedRule.discountType === 'fixed_price') {
        unitDiscount = Math.max(0, basePricePerKg - matchedRule.discountValue);
        tierName = `Fixed Special Tier (₹${matchedRule.discountValue}/kg: ${matchedRule.minQuantity}${
          matchedRule.maxQuantity ? `–${matchedRule.maxQuantity}` : '+'
        }kg)`;
      }
    } else {
      // Strictly canonical: If no database rule matches, do not invent artificial discounts
      unitDiscount = 0;
      tierName = 'Base Rate / Custom Quote Required';
    }

    unitDiscount = Math.min(basePricePerKg, Math.max(0, unitDiscount));
    const effectivePricePerKg = Math.max(1, Math.round(basePricePerKg - unitDiscount));
    const totalSavings = Math.round(unitDiscount * qty);
    const estimatedTotal = Math.max(0, regularTotal - totalSavings);
    const discountPercent = regularTotal > 0 ? Math.round((totalSavings / regularTotal) * 100) : 0;

    return {
      basePricePerKg,
      effectivePricePerKg,
      regularTotal,
      estimatedTotal,
      totalSavings,
      discountPercent,
      tierName,
      matchedRule,
    };
  }, [selectedProduct, quantityKg, rules]);

  const handleApplyQuote = () => {
    if (!onSelectQuote || !selectedProduct) return;
    trackWholesaleInquiryStarted('Wholesale Calculator');
    onSelectQuote({
      productName: selectedProduct.name,
      quantityKg: Math.max(5, quantityKg),
      estimatedTotal: calculation.estimatedTotal,
      effectivePricePerKg: calculation.effectivePricePerKg,
      tierName: calculation.tierName,
    });
  };

  if (loading) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-[#e8e2d5] shadow-xs flex flex-col items-center justify-center text-center space-y-3 min-h-[280px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#1b4332]" />
        <p className="text-xs font-semibold text-gray-600">Loading live factory wholesale pricing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <div>
          <h3 className="font-bold text-sm text-rose-900">Wholesale pricing could not be loaded</h3>
          <p className="text-xs text-rose-700 mt-0.5">Please check your connection and try again.</p>
        </div>
        <button
          type="button"
          onClick={fetchPricingData}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Loading</span>
        </button>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-[#e8e2d5] shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-5 sm:p-6 bg-gradient-to-r from-[#0f2d22] via-[#143d2e] to-[#1b4332] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#2d6a4f]">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#1b4332] text-[#c5a059] border border-[#c5a059]/30 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive Estimator</span>
          </div>
          <h2 className="font-serif-heading text-lg sm:text-2xl font-bold text-white">
            Wholesale Quantity & Tier Calculator
          </h2>
          <p className="text-xs text-[#b2c8be] max-w-xl">
            Select your required botanical powder and target quantity (kg) to view estimated volume tier pricing directly from Sojat.
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 bg-[#0f2d22]/80 px-3 py-2 rounded-xl border border-[#c5a059]/30 text-xs">
          <Sparkles className="w-4 h-4 text-[#c5a059] shrink-0" />
          <span className="text-[#c5a059] font-bold">5kg – 10,000kg+ Sourcing</span>
        </div>
      </div>

      <div className="p-5 sm:p-7 space-y-6">
        {/* Step 1: Product Selection */}
        <div className="space-y-2">
          <label htmlFor="wholesale-product-select" className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider">
            1. Select Botanical Powder / Product
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {products.slice(0, 6).map((p) => {
              const isSelected = p.id === selectedProductId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedProductId(p.id)}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#1b4332] bg-[#e8f3ed] shadow-2xs'
                      : 'border-[#e8e2d5] bg-[#fcfbf7] hover:border-[#1b4332]/40 hover:bg-white'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-[#0f2d22]' : 'text-gray-800'}`}>
                      {p.name}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                      Base: ₹{p.price}/kg • {p.quantityOrWeight || 'Bulk Pack'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-[#1b4332] shrink-0" />}
                </button>
              );
            })}
          </div>

          {products.length > 6 && (
            <div className="pt-1">
              <select
                id="wholesale-product-select"
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 rounded-lg border border-[#e8e2d5] bg-[#FAF8F5] text-xs font-medium text-[#0f2d22] focus:outline-none focus:ring-2 focus:ring-[#1b4332]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price}/kg)
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Step 2: Quantity Selection & Quick Chips */}
        <div className="space-y-3 pt-2 border-t border-[#e8e2d5]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label htmlFor="wholesale-quantity-input" className="block text-xs font-bold text-[#0f2d22] uppercase tracking-wider">
              2. Target Quantity in Kilograms (kg)
            </label>
            <span className="text-[11px] text-gray-500">
              Minimum order: <strong className="text-[#0f2d22]">5 kg</strong> • Maximum input: 10,000 kg
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4">
            <div className="relative w-full sm:w-56 sm:max-w-xs">
              <input
                id="wholesale-quantity-input"
                type="number"
                min={5}
                max={10000}
                value={quantityKg}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantityKg(isNaN(val) ? 0 : Math.max(0, Math.min(10000, val)));
                }}
                className="w-full pl-4 pr-14 py-2.5 bg-[#fcfbf7] border border-[#e8e2d5] rounded-xl text-base font-bold text-[#0f2d22] tabular-nums focus:outline-none focus:border-[#1b4332] focus:ring-2 focus:ring-[#1b4332]/20 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-[#e8f3ed] text-[#1b4332] text-xs font-extrabold select-none pointer-events-none tracking-tight">
                kg
              </span>
            </div>

            <div className="text-xs text-[#626c66] flex items-center gap-1.5 flex-wrap">
              <span>≈</span>
              <span className="font-semibold text-[#0f2d22] bg-[#f5f1e8] px-2 py-0.5 rounded-md border border-[#e8e2d5]/60">
                {Math.floor(quantityKg * 10).toLocaleString('en-IN')} pouches (100g)
              </span>
              <span>or</span>
              <span className="font-semibold text-[#0f2d22] bg-[#f5f1e8] px-2 py-0.5 rounded-md border border-[#e8e2d5]/60">
                {(quantityKg / 25).toFixed(1)} bags (25kg)
              </span>
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {PRESET_QUANTITIES.map((qty) => (
              <button
                key={qty}
                type="button"
                onClick={() => setQuantityKg(qty)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  quantityKg === qty
                    ? 'bg-[#1b4332] text-[#c5a059] shadow-xs'
                    : 'bg-[#FAF8F5] text-gray-700 border border-[#e8e2d5] hover:bg-[#e8f3ed]'
                }`}
              >
                {qty} kg
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Estimated Output Cards */}
        <div className="p-4 sm:p-5 rounded-xl bg-[#fcfbf7] border border-[#e8e2d5] space-y-4">
          <div className="flex items-center justify-between border-b border-[#e8e2d5] pb-3">
            <div className="flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#1b4332]" />
              <span className="text-xs font-bold text-[#0f2d22]">Estimated Wholesale Rate & Savings</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md ${
                calculation.matchedRule
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-900'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5" />
              {calculation.tierName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-3 bg-white rounded-xl border border-[#e8e2d5]">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Quantity</span>
              <span className="text-base sm:text-lg font-extrabold text-[#0f2d22]">{quantityKg} kg</span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#e8e2d5]">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">
                {calculation.matchedRule ? 'Effective Rate' : 'Catalog Rate'}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base sm:text-lg font-extrabold text-[#0f2d22]">
                  ₹{calculation.effectivePricePerKg}
                </span>
                <span className="text-[10px] text-gray-400">/ kg</span>
              </div>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#e8e2d5]">
              <span className="text-[10px] text-gray-500 uppercase font-bold block">Estimated Savings</span>
              <span
                className={`text-base sm:text-lg font-extrabold ${
                  calculation.totalSavings > 0 ? 'text-emerald-700' : 'text-gray-500 text-sm font-semibold'
                }`}
              >
                {calculation.totalSavings > 0
                  ? `₹${calculation.totalSavings} (${calculation.discountPercent}%)`
                  : 'Quote on Request'}
              </span>
            </div>

            <div className="p-3 bg-white rounded-xl border border-[#1b4332]/30 bg-emerald-50/40">
              <span className="text-[10px] text-[#0f2d22] uppercase font-bold block">Estimated Total</span>
              <span className="text-base sm:text-lg font-extrabold text-[#1b4332]">
                ₹{calculation.estimatedTotal.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Transparency Disclaimer */}
          <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-white p-3 rounded-lg border border-[#e8e2d5]">
            <Info className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
            <p>
              <strong>Pricing Notice:</strong> {cms.wholesaleCalculatorDisclaimer}
            </p>
          </div>

          {/* Action CTA Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-[#0f2d22] font-medium">
              Ready to proceed with this requirement?
            </div>

            <button
              type="button"
              onClick={handleApplyQuote}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#1b4332] hover:bg-[#0f2d22] text-[#c5a059] font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <span>{cms.wholesaleInquiryCtaText}</span>
              <ArrowRight className="w-4 h-4 text-[#c5a059]" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
