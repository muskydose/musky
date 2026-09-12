'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { SiteSettings, Product, BulkPricingRule } from '@/lib/types';
import { getClientSiteSettings } from '@/lib/api-client';
import { getConfiguredWhatsAppNumber, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import WholesaleHero from '@/components/wholesale/WholesaleHero';
import WholesaleCalculatorRedesign from '@/components/wholesale/WholesaleCalculatorRedesign';
import WholesaleInquiryForm from '@/components/wholesale/WholesaleInquiryForm';
import FactoryDeskPanel from '@/components/wholesale/FactoryDeskPanel';
import CommercialSpecsSection from '@/components/wholesale/CommercialSpecsSection';
import WholesaleFaqSection from '@/components/wholesale/WholesaleFaqSection';
import SmartMobileCtaBar from '@/components/wholesale/SmartMobileCtaBar';
import { BuyerPersona } from '@/components/wholesale/PersonaSwitcher';
import { Loader2 } from 'lucide-react';

interface WholesaleClientProps {
  initialSiteSettings?: SiteSettings | null;
  initialProducts?: Product[];
  initialPricingRules?: BulkPricingRule[];
}

function WholesaleContent({
  initialSiteSettings,
  initialProducts = [],
  initialPricingRules = [],
}: WholesaleClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Settings state (seeded from SSR props)
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(initialSiteSettings || null);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [pricingRules, setPricingRules] = useState<BulkPricingRule[]>(initialPricingRules);

  // URL search params
  const isBulkMode = searchParams.get('mode') === 'bulk';
  const urlPersona = searchParams.get('persona') as BuyerPersona | null;
  const initialProductId = searchParams.get('product');
  const initialQty = searchParams.get('qty') ? parseInt(searchParams.get('qty')!, 10) : null;

  // Active persona state
  const [activePersona, setActivePersona] = useState<BuyerPersona>(() => {
    if (urlPersona && ['salon', 'artist', 'bulk'].includes(urlPersona)) {
      return urlPersona;
    }
    if (isBulkMode) return 'bulk';
    return 'salon';
  });

  // Sync active persona when search param changes externally
  useEffect(() => {
    if (urlPersona && ['salon', 'artist', 'bulk'].includes(urlPersona) && urlPersona !== activePersona) {
      setActivePersona(urlPersona);
    }
  }, [urlPersona, activePersona]);

  // Fallback fetch only if initial server props were empty
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

  // Handle persona change with URL synchronization
  const handlePersonaChange = (newPersona: BuyerPersona) => {
    setActivePersona(newPersona);
    const params = new URLSearchParams(searchParams.toString());
    params.set('persona', newPersona);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
  }) => {
    const destNum = getConfiguredWhatsAppNumber(siteSettings);
    const text = `MUSKY DOSE WHOLESALE / BULK ESTIMATE

Product: ${data.productName}
Quantity: ${data.quantity} ${data.quantityUnit}
Estimated Rate: ₹${Math.round(data.effectivePricePerUnit)}/${data.pricingUnit}
Estimated Total: ~₹${Math.round(data.estimatedTotal)}

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
        />

        {/* Main Content Container */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
          {/* 3. Universal Wholesale Calculator */}
          <WholesaleCalculatorRedesign
            products={products}
            pricingRules={pricingRules}
            siteSettings={siteSettings}
            activePersona={activePersona}
            initialProductId={initialProductId}
            initialQuantity={initialQty}
            onSelectQuote={handleSelectQuote}
            onDirectWhatsApp={handleDirectWhatsAppFromCalc}
          />

          {/* 4. B2B Action Grid: Form (7 cols) + Factory Desk (5 cols) */}
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

          {/* 5. Universal Commercial Specifications */}
          <CommercialSpecsSection />

          {/* 6. Visible Schema-Synchronized FAQ */}
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

export default function WholesaleClient(props: WholesaleClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0f2d22] flex items-center justify-center p-8 text-[#c5a059]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <WholesaleContent {...props} />
    </Suspense>
  );
}
