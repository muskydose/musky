'use client';

import React from 'react';
import { PackageSearch, Calculator, FileCheck2 } from 'lucide-react';

export default function CommercialProcessStrip() {
  const steps = [
    {
      step: '01',
      title: 'Choose Product',
      description: 'Select pure Sojat henna, cones, or botanical extracts from our live B2B catalog.',
      icon: PackageSearch,
    },
    {
      step: '02',
      title: 'Calculate Quantity',
      description: 'Preview instant volume tier discounts, regular catalog comparisons, and live savings.',
      icon: Calculator,
    },
    {
      step: '03',
      title: 'Get Factory Quote',
      description: 'Lock your wholesale estimate and connect with our Sojat sales desk for dispatch terms.',
      icon: FileCheck2,
    },
  ];

  return (
    <section aria-label="Commercial Wholesale Order Process" className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="relative p-4 sm:p-5 rounded-2xl bg-white border border-[#e8e2d5] shadow-2xs hover:border-[#c5a059]/60 transition-all flex items-start gap-3.5 group"
            >
              {/* Step Number & Icon Capsule */}
              <div className="flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-mono font-extrabold text-[#c5a059] bg-[#FAF8F5] border border-[#e8e2d5] px-2 py-0.5 rounded-full mb-1.5">
                  {item.step}
                </span>
                <div className="w-9 h-9 rounded-xl bg-[#FAF8F5] group-hover:bg-[#1b4332] text-[#1b4332] group-hover:text-[#c5a059] border border-[#e8e2d5] flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              {/* Text */}
              <div className="space-y-0.5">
                <h3 className="text-xs sm:text-sm font-bold text-[#0f2d22] group-hover:text-[#1b4332] transition-colors">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#626c66] leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Connector line for desktop */}
              {idx < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-[1px] bg-[#e8e2d5] z-10 pointer-events-none" />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

