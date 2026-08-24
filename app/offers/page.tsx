'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CountdownTimer from '@/components/CountdownTimer';
import { Campaign, Product, SiteSettings } from '@/lib/types';
import { getCmsText } from '@/lib/cms';
import { getClientSiteSettings } from '@/lib/api-client';
import { Sparkles, Tag, Copy, Check, Clock, ShoppingBag, ArrowRight } from 'lucide-react';

export default function OffersPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<SiteSettings | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function loadOffersData() {
      try {
        const [cRes, pRes, siteSettings] = await Promise.all([
          fetch('/api/campaigns').then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null)).catch(() => null),
          fetch('/api/products').then((r) => (r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : null)).catch(() => null),
          getClientSiteSettings(),
        ]);

        if (cRes && cRes.success) {
          setCampaigns(cRes.campaigns || []);
        }
        if (pRes && pRes.success) {
          setProducts(pRes.products || []);
        }
        if (siteSettings) {
          setSettings(siteSettings);
        }
      } catch {
        // Silently handle
      } finally {
        setLoading(false);
      }
    }

    loadOffersData();
  }, []);

  const cms = getCmsText(settings);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f9f6f0] text-[#1f2421] flex flex-col">
      <Navbar siteSettings={settings} />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 w-full space-y-12">
        {/* Hero Section */}
        <div className="bg-gradient-to-br from-[#0f2d22] via-[#1b4332] to-[#0f2d22] text-white rounded-3xl p-6 sm:p-10 border border-[#c5a059]/40 shadow-2xl relative overflow-hidden text-center sm:text-left">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-[#c5a059]/10 to-transparent pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#c5a059] text-[#0f2d22] font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              {cms.offersHeroBadge}
            </span>

            <h1 className="font-momo-display font-normal text-3xl sm:text-5xl text-white leading-tight">
              {cms.offersHeroTitle}
            </h1>

            <p className="text-stone-200 text-sm sm:text-base leading-relaxed max-w-2xl">
              {cms.offersHeroSubtitle}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-16 text-center text-stone-500 font-medium">Loading active festival offers...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-200 shadow-xs space-y-4 max-w-xl mx-auto">
            <Tag className="w-12 h-12 mx-auto text-[#c5a059]" />
            <h2 className="font-momo-display font-normal text-2xl text-[#0f2d22]">{cms.offersEmptyTitle}</h2>
            <p className="text-sm text-stone-600">
              {cms.offersEmptyDescription}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#1b4332] text-white font-semibold text-sm hover:bg-[#0f2d22] transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{cms.navAllProductsText || 'Explore All Products'}</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            {campaigns.map((camp) => {
              // Eligible products filtering
              const eligibleProducts = products.filter((prod) => {
                const isExcluded = camp.excludedProductIds && camp.excludedProductIds.includes(prod.id);
                if (isExcluded) return false;

                if (camp.targetType === 'storewide') return true;
                if (camp.targetType === 'categories') {
                  return camp.targetCategoryIds ? camp.targetCategoryIds.includes(prod.categoryId) : false;
                }
                if (camp.targetType === 'products') {
                  return camp.targetProductIds ? camp.targetProductIds.includes(prod.id) : false;
                }
                return true;
              });

              return (
                <section
                  key={camp.id}
                  className="bg-white rounded-3xl border border-stone-200 shadow-lg overflow-hidden p-6 sm:p-8 space-y-6"
                >
                  {/* Campaign Header & Details */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-stone-200">
                    <div className="space-y-2 max-w-2xl">
                      <div className="flex items-center gap-2">
                        {camp.festivalName && (
                          <span className="px-3 py-1 bg-[#1b4332]/10 text-[#1b4332] font-bold text-xs rounded-full uppercase tracking-wider">
                            {camp.festivalName}
                          </span>
                        )}
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full uppercase">
                          {camp.discountType === 'percentage' && `${camp.discountValue}% OFF`}
                          {camp.discountType === 'fixed_amount' && `₹${camp.discountValue} OFF`}
                          {camp.discountType === 'fixed_price' && `Flat ₹${camp.discountValue}`}
                          {camp.discountType === 'free_shipping' && 'Free Shipping'}
                        </span>
                      </div>

                      <h2 className="font-momo-display font-normal text-2xl sm:text-3xl text-[#0f2d22]">
                        {camp.publicHeading}
                      </h2>

                      {camp.publicSubtitle && (
                        <p className="text-sm font-medium text-[#c5a059]">{camp.publicSubtitle}</p>
                      )}

                      {camp.publicDescription && (
                        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                          {camp.publicDescription}
                        </p>
                      )}
                    </div>

                    {/* Countdown & Coupon CTA Box */}
                    <div className="bg-[#f5f1e8] p-5 rounded-2xl border border-stone-300 space-y-3 shrink-0 md:min-w-[280px]">
                      {camp.showCountdown && (
                        <div>
                          <p className="text-[10px] uppercase font-bold text-stone-500 tracking-wider mb-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#c5a059]" /> Offer Ends Soon
                          </p>
                          <CountdownTimer endDate={camp.endDate} />
                        </div>
                      )}

                      {camp.couponCode && (
                        <div className="pt-2">
                          <p className="text-xs font-semibold text-stone-700 mb-1">Coupon Code:</p>
                          <div className="flex items-center gap-2">
                            <div className="px-3 py-1.5 bg-white border border-stone-300 rounded-xl font-mono font-bold text-sm text-[#0f2d22] flex-1 text-center tracking-wider">
                              {camp.couponCode}
                            </div>
                            <button
                              onClick={() => handleCopyCode(camp.couponCode!)}
                              className="px-3 py-1.5 bg-[#1b4332] hover:bg-[#0f2d22] text-white rounded-xl text-xs font-medium flex items-center gap-1 shadow-xs transition-all shrink-0"
                            >
                              {copiedCode === camp.couponCode ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {camp.minOrderValue ? (
                        <p className="text-[11px] text-stone-500 italic">
                          * Minimum order value ₹{camp.minOrderValue}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Eligible Products Grid */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-serif-heading font-bold text-lg text-[#0f2d22]">
                        Eligible Products ({eligibleProducts.length})
                      </h3>
                      <Link
                        href="/products"
                        className="text-xs font-semibold text-[#1b4332] hover:underline flex items-center gap-1"
                      >
                        <span>View All Shop</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                      {eligibleProducts.slice(0, 8).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </main>

      <Footer siteSettings={settings} />
    </div>
  );
}
