'use client';

import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

export const WHOLESALE_FAQ_ITEMS = [
  {
    id: 'moq',
    question: 'What is the minimum wholesale order quantity (MOQ)?',
    answer:
      'Wholesale orders start at 5kg for packaged retail sizes and 25kg for bulk commercial sacks. Smaller trial samples can be requested through our sales team.',
  },
  {
    id: 'sojat-origin',
    question: 'Do you supply genuine Sojat-grown henna powder?',
    answer:
      'Yes. All our Lawsonia Inermis henna is cultivated and processed directly in Sojat City, Pali district, Rajasthan — known globally for high natural Lawsone dye content.',
  },
  {
    id: 'delivery-coverage',
    question: 'Do you deliver wholesale orders Pan-India?',
    answer:
      'Yes. We provide insured, trackable commercial dispatch across all states and union territories in India via trusted surface and express freight partners.',
  },
  {
    id: 'custom-rates',
    question: 'Can salons and bridal mehndi artists get custom bulk rates?',
    answer:
      'Yes. We have dedicated volume discount tiers for professional mehndi artists and beauty salons requiring smooth, triple-cloth-sifted BAQ henna powder.',
  },
];

export default function WholesaleFaqSection() {
  // First item open by default
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    moq: true,
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <section id="wholesale-faq" aria-labelledby="faq-heading" className="space-y-4">
      <div className="bg-white rounded-2xl border border-[#e8e2d5] p-6 sm:p-7 space-y-5 shadow-2xs">
        <div className="border-b border-[#e8e2d5] pb-3">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#c5a059]" />
            <h2 id="faq-heading" className="font-momo-display text-xl sm:text-2xl font-normal text-[#0f2d22]">
              Wholesale & Commercial Sourcing FAQ
            </h2>
          </div>
          <p className="text-xs text-[#626c66] mt-0.5">
            Key operational details on minimum order quantities, Sojat milling origin, and pan-India commercial logistics.
          </p>
        </div>

        <div className="space-y-2.5">
          {WHOLESALE_FAQ_ITEMS.map((item) => {
            const isOpen = Boolean(openItems[item.id]);

            return (
              <div
                key={item.id}
                className="border border-[#e8e2d5] rounded-xl overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${item.id}`}
                  id={`faq-question-${item.id}`}
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-3.5 sm:p-4 text-left flex items-center justify-between gap-3 bg-[#FAF8F5] hover:bg-[#f5f1e8] transition-colors cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-[#0f2d22] leading-snug">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#1b4332] shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isOpen && (
                  <div
                    id={`faq-answer-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-question-${item.id}`}
                    className="p-3.5 sm:p-4 bg-white text-xs text-[#626c66] leading-relaxed border-t border-[#e8e2d5] animate-in fade-in duration-150"
                  >
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

