'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { SiteSettings, Product, BulkPricingRule } from '@/lib/types';
import { getClientSiteSettings } from '@/lib/api-client';
import { getConfiguredWhatsAppNumber, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import WholesaleHero from '@/components/wholesale/WholesaleHero';
import CommercialProcessStrip from '@/components/wholesale/CommercialProcessStrip';
import WholesaleCalculatorRedesign from '@/components/wholesale/WholesaleCalculatorRedesign';
import WholesaleInquiryForm from '@/components/wholesale/WholesaleInquiryForm';
import FactoryDeskPanel from '@/components/wholesale/FactoryDeskPanel';
import WhyBuyDirectStrip from '@/components/wholesale/WhyBuyDirectStrip';
import CommercialSpecsSection from '@/components/wholesale/CommercialSpecsSection';
import WholesaleFaqSection from '@/components/wholesale/WholesaleFaqSection';
import SmartMobileCtaBar from '@/components/wholesale/SmartMobileCtaBar';
import { BuyerPersona } from '@/components/wholesale/PersonaSwitcher';

interface WholesaleClientProps {
  initialSiteSettings?: SiteSettings | null;
  initialProducts?: Product[];
  initialPricingRules?: BulkPricingRule[];
  initialMode?: string;
  initialPersona?: BuyerPersona;
  initialProductId?: string;
  initialQuantity?: number;
}

export default function WholesaleClient({
  initialSiteSettings,
  initialProducts = [],
  initialPricingRules = [],
  initialMode,
  initialPersona,
  initialProductId,
  initialQuantity,
}: WholesaleClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Settings & catalog state (seeded from SSR props)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialSiteSettings || null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pricingRules, setPricingRules] = useState<BulkPricingRule[]>(initialPricingRules);

  const isBulkMode = initialMode === 'bulk';

  // Active persona state
  const [activePersona, setActivePersona] = useState<BuyerPersona>(() => {
    if (initialPersona && ['salon', 'artist', 'bulk'].includes(initialPersona)) {
      return initialPersona;
    }
    return 'bulk';
  });

  // Fallback client fetch ONLY if server props were empty
  useEffect(() => {
    if (!siteSettings) {
      getClientSiteSettings().then((s: SiteSettings | null) => setSiteSettings(s));
    }
    if (products.length === 0) {
      fetch('/api/products')
        .then((res) => res.json())
        .then((d) => {
          if (d?.products) setProducts(d.products);
        })
        .catch(() => {});
    }
    if (pricingRules.length === 0) {
      fetch('/api/bulk-pricing')
        .then((res) => res.json())
        .then((d) => {
          if (d?.rules) setPricingRules(d.rules);
        })
        .catch(() => {});
    }
  }, [siteSettings, products.length, pricingRules.length]);

  // Handle persona change with URL synchronization without triggering Suspense
  const handlePersonaChange = (newPersona: BuyerPersona) => {
    setActivePersona(newPersona);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('persona', newPersona);
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Scroll to form smoothly
  const scrollToForm = useCallback(() => {
    if (typeof document !== 'undefined') {
      const target = document.getElementById('wholesale-inquiry-form');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // Scroll to calculator smoothly
  const scrollToCalculator = useCallback(() => {
    if (typeof document !== 'undefined') {
      const target = document.getElementById('wholesale-calculator');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  // Direct WhatsApp launch
  const handleOpenWhatsAppDirect = useCallback(() => {
    const destNum = getConfiguredWhatsAppNumber(siteSettings);
    const text = `Hello Musky Dose, I am inquiring regarding wholesale & commercial supply from your Sojat factory.`;
    const url = getWhatsAppDirectUrl(destNum, text);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }, [siteSettings]);

  // State for quote handoff from calculator to form
  const [externalQuoteData, setExternalQuoteData] = useState<{
    productName: string;
    quantity: number;
    quantityUnit: string;
    estimatedTotal: number;
    effectivePricePerUnit: number;
    pricingUnit: string;
    tierName: string;
    savingsAmount?: number;
    savingsPercent?: number;
  } | null>(null);

  const handleSelectQuote = (quote: typeof externalQuoteData) => {
    setExternalQuoteData(quote);
    scrollToForm();
  };

  const handleDirectWhatsAppFromCalc = (data: {
    productName: string;
    quantity: number;
    quantityUnit: string;
    estimatedTotal: number;
    effectivePricePerUnit: number;
    pricingUnit: string;
    savingsAmount?: number;
    savingsPercent?: number;
  }) => {
    const destNum = getConfiguredWhatsAppNumber(siteSettings);
    const savingsLine =
      data.savingsAmount && data.savingsAmount > 0
        ? `\nEstimated Savings: ~₹${Math.round(data.savingsAmount)} (${Math.round(data.savingsPercent || 0)}% OFF)`
        : '';
    const text = `MUSKY DOSE WHOLESALE / BULK ESTIMATE

Product: ${data.productName}
Quantity: ${data.quantity} ${data.quantityUnit}
Estimated Rate: ₹${Math.round(data.effectivePricePerUnit)}/${data.quantityUnit || data.pricingUnit}
Estimated Total: ~₹${Math.round(data.estimatedTotal)}${savingsLine}

Please provide commercial terms and dispatch schedule. Thank you!`;

    const url = getWhatsAppDirectUrl(destNum, text);
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#1f2421] flex flex-col">
      {/* 1. Global Navigation */}
      <Navbar siteSettings={siteSettings || undefined} />

      <main className="flex-1 pb-16">
        {/* 2. Compact B2B Hero with Persona Switcher */}
        <WholesaleHero
          siteSettings={siteSettings}
          activePersona={activePersona}
          onPersonaChange={handlePersonaChange}
          isBulkMode={isBulkMode}
          onScrollToForm={scrollToForm}
          onScrollToCalculator={scrollToCalculator}
        />

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {/* 3. Commercial Wholesale Process Strip (3 Steps) */}
          <CommercialProcessStrip />

          {/* 4. Universal Wholesale Calculator */}
          <WholesaleCalculatorRedesign
            products={products}
            pricingRules={pricingRules}
            siteSettings={siteSettings}
            activePersona={activePersona}
            initialProductId={initialProductId}
            initialQuantity={initialQuantity}
            onSelectQuote={handleSelectQuote}
            onDirectWhatsApp={handleDirectWhatsAppFromCalc}
          />

          {/* 5. B2B Action Grid: Form (7 cols) + Factory Desk (5 cols) */}
          <section
            id="wholesale-inquiry-form"
            aria-labelledby="inquiry-form-heading"
            className="scroll-mt-20"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Quotation Form */}
              <div className="lg:col-span-7">
                <WholesaleInquiryForm
                  siteSettings={siteSettings}
                  activePersona={activePersona}
                  externalQuoteData={externalQuoteData}
                />
              </div>

              {/* Right Column: Factory Direct Desk */}
              <div className="lg:col-span-5 lg:sticky lg:top-24">
                <FactoryDeskPanel siteSettings={siteSettings} />
              </div>
            </div>
          </section>

          {/* 6. Why Source Direct From Our Sojat Factory? (5 Manufacturer Advantages) */}
          <WhyBuyDirectStrip />

          {/* 7. Universal Commercial Specifications */}
          <CommercialSpecsSection />

          {/* 8. Visible Schema-Synchronized FAQ */}
          <WholesaleFaqSection />
        </div>
      </main>

      {/* 7. Global Footer */}
      <Footer siteSettings={siteSettings || undefined} />

      {/* Persistent WhatsApp Float */}
      <WhatsAppFloat />

      {/* 8. Smart Mobile CTA Bar (Hides when inquiry form is in viewport) */}
      <SmartMobileCtaBar
        onScrollToForm={scrollToForm}
        onDirectWhatsApp={handleOpenWhatsAppDirect}
      />
    </div>
  );
}
