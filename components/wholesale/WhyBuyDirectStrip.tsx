'use client';

import React from 'react';
import { Factory, Layers, Percent, Truck, FileSpreadsheet } from 'lucide-react';

export default function WhyBuyDirectStrip() {
  const benefits = [
    {
      title: 'Direct Factory Origin',
      desc: 'Processed directly at our Sojat City mill in Rajasthan (Pincode: 306104).',
      icon: Factory,
    },
    {
      title: 'Commercial Pack Sizes',
      desc: 'Standard 5kg–25kg master cartons and 50kg multi-wall woven sacks.',
      icon: Layers,
    },
    {
      title: 'Live Volume Tiers',
      desc: 'Transparent bulk benefit pricing with instant calculator estimates.',
      icon: Percent,
    },
    {
      title: 'Pan-India Freight',
      desc: 'Insured road cargo and express commercial dispatch nationwide.',
      icon: Truck,
    },
    {
      title: 'B2B GST Invoicing',
      desc: 'Full tax invoices with appropriate HSN code for Input Tax Credit (ITC).',
      icon: FileSpreadsheet,
    },
  ];

  return (
    <section aria-labelledby="why-buy-direct-heading" className="space-y-3.5">
      <div className="bg-[#FAF8F5] border border-[#e8e2d5] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
            Manufacturer Advantage
          </span>
          <h2 id="why-buy-direct-heading" className="font-momo-display text-xl sm:text-2xl font-normal text-[#0f2d22]">
            Why Source Direct From Sojat Mills?
          </h2>
          <p className="text-xs text-[#626c66] leading-relaxed">
            Eliminate middleman markups and secure fresh batch consistency direct from the global capital of natural henna.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
          {benefits.map((b) => {
            const Icon = b.icon;
            return (
              <div
                key={b.title}
                className="bg-white border border-[#e8e2d5] rounded-xl p-3.5 space-y-2 hover:border-[#1b4332]/40 transition-colors shadow-2xs flex flex-col justify-between"
              >
                <div className="w-8 h-8 rounded-lg bg-[#FAF8F5] border border-[#e8e2d5] flex items-center justify-center text-[#1b4332]">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#0f2d22] leading-tight">
                    {b.title}
                  </h3>
                  <p className="text-[10px] text-[#626c66] leading-normal mt-1">
                    {b.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

