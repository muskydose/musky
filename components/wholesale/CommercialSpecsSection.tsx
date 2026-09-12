'use client';

import React from 'react';
import { Leaf, Package, Truck, Award, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function CommercialSpecsSection() {
  return (
    <section aria-labelledby="specs-heading" className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 sm:p-7 space-y-6 shadow-2xs">
        <div className="border-b border-[#e8e2d5] pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
              Commercial Standards & Logistics
            </span>
            <h2 id="specs-heading" className="font-momo-display text-xl sm:text-2xl font-normal text-[#0f2d22] mt-0.5">
              Direct Mill Supply Standards & Specifications
            </h2>
            <p className="text-xs text-[#626c66] mt-1 max-w-2xl leading-relaxed">
              Factory processing and commercial dispatch from Sojat City, Rajasthan. We supply natural botanical powders, cold-pressed plant extracts, and ready applicators in standardized B2B trade formats.
            </p>
          </div>

          <Link
            href="/sojat-henna"
            className="text-xs font-bold text-[#1b4332] hover:text-[#0f2d22] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>Learn about our Sojat heritage</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#2b302c]">
          {/* Card 1: Purity & Sifting Grades */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-2.5">
            <div className="font-serif-heading font-bold text-[#0f2d22] text-sm flex items-center gap-2">
              <Leaf className="w-4 h-4 text-[#1b4332]" />
              <span>Sifting & Purity Standards</span>
            </div>
            <ul className="space-y-1.5 text-[#626c66] text-xs">
              <li>
                <strong className="text-[#0f2d22]">Botanical Care Grade:</strong> Triple-sifted whole-leaf powders for hair & scalp treatments.
              </li>
              <li>
                <strong className="text-[#0f2d22]">Body Art Quality (BAQ):</strong> Micro-sifted for smooth, clog-free cone and applicator flow.
              </li>
              <li>
                <strong className="text-[#0f2d22]">Botanical Extracts:</strong> Cold-pressed plant oils and steam-distilled botanical hydrosols.
              </li>
            </ul>
          </div>

          {/* Card 2: Packaging Tiers */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-2.5">
            <div className="font-serif-heading font-bold text-[#0f2d22] text-sm flex items-center gap-2">
              <Package className="w-4 h-4 text-[#1b4332]" />
              <span>Packaging Tiers</span>
            </div>
            <ul className="space-y-1.5 text-[#626c66] text-xs">
              <li>
                <strong className="text-[#0f2d22]">Master Retail Packs:</strong> 100g, 250g, 500g, 1kg retail boxes (5kg–25kg master cartons).
              </li>
              <li>
                <strong className="text-[#0f2d22]">Commercial Multi-Wall Bags:</strong> 5kg, 10kg, 25kg moisture-barrier lined kraft bags.
              </li>
              <li>
                <strong className="text-[#0f2d22]">Industrial Bulk Sacks:</strong> 50kg standard woven sacks for high-volume repackers.
              </li>
            </ul>
          </div>

          {/* Card 3: Logistics & Freight */}
          <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] space-y-2.5">
            <div className="font-serif-heading font-bold text-[#0f2d22] text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#1b4332]" />
              <span>Logistics & Dispatch Origin</span>
            </div>
            <ul className="space-y-1.5 text-[#626c66] text-xs">
              <li>
                <strong className="text-[#0f2d22]">Dispatch Location:</strong> Sojat City, Pali District, Rajasthan (Pincode: 306104).
              </li>
              <li>
                <strong className="text-[#0f2d22]">Transport Coverage:</strong> Surface road cargo, express courier, and regional logistics across all Indian states.
              </li>
              <li>
                <strong className="text-[#0f2d22]">Tax Invoicing:</strong> Registered GST bills with applicable HSN classification.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

