'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Product, BulkPricingRule, SiteSettings } from '@/lib/types';
import { resolveProductWholesaleUnits } from '@/lib/wholesale-units';
import { resolveCanonicalWholesalePricing } from '@/lib/wholesale-pricing-resolver';
import { trackWholesaleInquiryStarted } from '@/lib/analytics';
import { BuyerPersona, PERSONA_CONFIGS } from './PersonaSwitcher';
import ProductCardPicker from './ProductCardPicker';
import QuantityStepper from './QuantityStepper';
import CommercialEstimateCard from './CommercialEstimateCard';
import { Calculator } from 'lucide-react';

interface WholesaleCalculatorRedesignProps {
  products: Product[];
  pricingRules: BulkPricingRule[];
  siteSettings?: SiteSettings | null;
  activePersona: BuyerPersona;
  initialProductId?: string | null;
  initialQuantity?: number | null;
  onSelectQuote: (data: {
    productName: string;
    quantity: number;
    quantityUnit: string;
    estimatedTotal: number;
    effectivePricePerUnit: number;
    pricingUnit: string;
    tierName: string;
    savingsAmount?: number;
    savingsPercent?: number;
  }) => void;
  onDirectWhatsApp: (data: {
    productName: string;
    quantity: number;
    quantityUnit: string;
    estimatedTotal: number;
    effectivePricePerUnit: number;
    pricingUnit: string;
    savingsAmount?: number;
    savingsPercent?: number;
  }) => void;
}

export default function WholesaleCalculatorRedesign({
  products,
  pricingRules,
  siteSettings,
  activePersona,
  initialProductId,
  initialQuantity,
  onSelectQuote,
  onDirectWhatsApp,
}: WholesaleCalculatorRedesignProps) {
  // Selected product state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    if (initialProductId && products.length > 0) {
      const match = products.find((p) => p.id === initialProductId || p.slug === initialProductId);
      if (match) return match;
    }
    return products[0] || null;
  });

  // Ensure selected product is synced if products array loads/changes
  useEffect(() => {
    if (!selectedProduct && products.length > 0) {
      if (initialProductId) {
        const match = products.find((p) => p.id === initialProductId || p.slug === initialProductId);
        if (match) {
          setSelectedProduct(match);
          return;
        }
      }
      setSelectedProduct(products[0]);
    }
  }, [products, initialProductId, selectedProduct]);

  // Resolve dynamic unit family & labels
  const unitInfo = useMemo(() => {
    if (!selectedProduct) return null;
    return resolveProductWholesaleUnits(selectedProduct);
  }, [selectedProduct]);

  const unitLabel = unitInfo?.wholesaleUnit || 'kg';

  // Persona-aware preset quantities
  const presetQuantities = useMemo(() => {
    const personaConfig = PERSONA_CONFIGS[activePersona];
    if (personaConfig && personaConfig.defaultPresetQuantities?.length > 0) {
      return personaConfig.defaultPresetQuantities;
    }
    return unitInfo?.presetQuantities || [5, 10, 25, 50, 100];
  }, [activePersona, unitInfo]);

  // Quantity state
  const [quantity, setQuantity] = useState<number>(() => {
    if (initialQuantity && initialQuantity > 0) return initialQuantity;
    return presetQuantities[0] || 5;
  });

  // When persona changes, adjust initial default quantity if appropriate
  useEffect(() => {
    if (presetQuantities.length > 0) {
      setQuantity((prev) => (presetQuantities.includes(prev) ? prev : presetQuantities[0]));
    }
  }, [presetQuantities]);

  // Calculate canonical wholesale pricing
  const pricingResult = useMemo(() => {
    if (!selectedProduct) return null;
    return resolveCanonicalWholesalePricing({
      product: selectedProduct,
      quantity,
      rules: pricingRules,
      units: unitInfo || undefined,
    });
  }, [selectedProduct, quantity, pricingRules, unitInfo]);

  // Apply quote to form handler
  const handleApplyToForm = () => {
    if (!selectedProduct || !pricingResult) return;
    trackWholesaleInquiryStarted('Wholesale Calculator');
    onSelectQuote({
      productName: selectedProduct.name,
      quantity,
      quantityUnit: pricingResult.unit,
      estimatedTotal: pricingResult.effectiveTotal,
      effectivePricePerUnit: pricingResult.effectiveWholesaleRate,
      pricingUnit: pricingResult.unit,
      tierName: pricingResult.tierName || 'Standard Tier',
      savingsAmount: pricingResult.savingsAmount,
      savingsPercent: pricingResult.savingsPercent,
    });
  };

  // Direct WhatsApp quote request
  const handleWhatsAppQuote = () => {
    if (!selectedProduct || !pricingResult) return;
    onDirectWhatsApp({
      productName: selectedProduct.name,
      quantity,
      quantityUnit: pricingResult.unit,
      estimatedTotal: pricingResult.effectiveTotal,
      effectivePricePerUnit: pricingResult.effectiveWholesaleRate,
      pricingUnit: pricingResult.unit,
      savingsAmount: pricingResult.savingsAmount,
      savingsPercent: pricingResult.savingsPercent,
    });
  };

  if (!products || products.length === 0 || !selectedProduct || !pricingResult) {
    return (
      <div className="p-8 rounded-2xl bg-white border border-[#e8e2d5] text-center text-xs text-[#626c66]">
        Loading wholesale catalog products...
      </div>
    );
  }

  const personaConfig = PERSONA_CONFIGS[activePersona];

  return (
    <section
      id="wholesale-calculator"
      aria-labelledby="calculator-heading"
      className="scroll-mt-20 space-y-4"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#c5a059]" />
            <h2 id="calculator-heading" className="font-momo-display text-2xl sm:text-3xl font-normal text-[#0f2d22]">
              Interactive B2B Tier Calculator
            </h2>
          </div>
          <p className="text-xs text-[#626c66] mt-0.5">
            {personaConfig?.tagline || 'Select any catalog item and volume to preview factory rates.'}
          </p>
        </div>
      </div>

      {/* Two-Column Responsive Calculator Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Product Selection & Quantity Controls (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#e8e2d5] rounded-2xl p-5 shadow-2xs space-y-5">
          {/* Step 1: Product Selection */}
          <ProductCardPicker
            products={products}
            selectedProduct={selectedProduct}
            onSelectProduct={(p) => setSelectedProduct(p)}
            preferredCategories={personaConfig?.preferredCategories}
          />

          <hr className="border-[#e8e2d5]" />

          {/* Step 2: Quantity Controls */}
          <QuantityStepper
            quantity={quantity}
            unitLabel={unitLabel}
            presetQuantities={presetQuantities}
            onChange={(q) => setQuantity(q)}
            min={1}
            step={1}
          />
        </div>

        {/* Right Column: Sticky Estimate Card & Confidence Panel (5 Cols) */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-3">
          <CommercialEstimateCard
            pricingResult={pricingResult}
            productName={selectedProduct.name}
            quantity={quantity}
            unitLabel={pricingResult.unit}
            minWholesaleQuantity={unitInfo?.minWholesaleQuantity || 1}
            onApplyToForm={handleApplyToForm}
            onDirectWhatsApp={handleWhatsAppQuote}
            ctaLabel={personaConfig?.ctaLabel || 'Lock Estimate & Populate Form Below ↓'}
          />

          {/* Compact Commercial Confidence Card */}
          <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] text-[11px] text-[#626c66] space-y-1.5 shadow-2xs">
            <div className="text-[10px] font-bold text-[#0f2d22] uppercase tracking-wider flex items-center justify-between">
              <span>Factory Direct Supply Signals</span>
              <span className="text-emerald-700 font-extrabold font-mono">100% Verified</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1 border-t border-[#e8e2d5]/60">
              <span className="flex items-center gap-1 text-[#0f2d22]">
                ✓ Sojat Mill Origin
              </span>
              <span className="flex items-center gap-1 text-[#0f2d22]">
                ✓ B2B GST Invoicing
              </span>
              <span className="flex items-center gap-1 text-[#0f2d22]">
                ✓ Pan-India Dispatch
              </span>
              <span className="flex items-center gap-1 text-[#0f2d22]">
                ✓ Fresh Batch Sifted
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
