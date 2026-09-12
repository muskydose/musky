'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { ShieldCheck, Phone, MapPin, Package, FileText, CheckCircle2, Clock } from 'lucide-react';

interface FactoryDeskPanelProps {
  siteSettings?: SiteSettings | null;
}

export default function FactoryDeskPanel({ siteSettings }: FactoryDeskPanelProps) {
  const phone = siteSettings?.displayPhone || '+91 82337 03080';

  return (
    <div className="bg-[#0f2d22] text-white p-6 sm:p-7 rounded-2xl border border-[#2d6a4f] shadow-xs space-y-5">
      <div>
        <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
          Direct Mill Origin
        </span>
        <h3 className="font-momo-display text-xl font-normal text-white mt-0.5">
          Sojat Factory Supply Desk
        </h3>
        <p className="text-xs text-[#b2c8be] leading-relaxed mt-1">
          Musky Dose operates direct processing facilities in Sojat City. We fulfill commercial orders for salons, artists, and distributors nationwide.
        </p>
      </div>

      <div className="space-y-3.5 pt-1 text-xs border-t border-[#2d6a4f]/70">
        <div className="flex items-start gap-3">
          <MapPin className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Manufacturing Origin:</strong>
            <div className="text-[#b2c8be] text-[11px]">Sojat City, Pali District, Rajasthan (Pincode: 306104).</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Botanical Purity Standard:</strong>
            <div className="text-[#b2c8be] text-[11px]">
              100% natural dried plant leaves. Zero synthetic dyes, zero PPD, zero chemical additives.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">Commercial Packaging Tiers:</strong>
            <div className="text-[#b2c8be] text-[11px]">
              Retail master cartons (100g, 250g, 500g, 1kg) and commercial multi-wall sacks (5kg, 25kg, 50kg).
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div>
            <strong className="text-white">B2B Tax Invoicing:</strong>
            <div className="text-[#b2c8be] text-[11px]">
              Full GST invoices generated with appropriate HSN classification for Input Tax Credit claims.
            </div>
          </div>
        </div>
      </div>

      {/* Direct Factory Dialer */}
      <div className="pt-3 border-t border-[#2d6a4f]/70 space-y-2">
        <div className="text-xs font-bold text-white flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Urgent Wholesale / Mandi Inquiries?</span>
        </div>
        <div className="text-[11px] text-[#b2c8be]">
          Speak directly with our factory commercial desk:
        </div>
        <a
          href={`tel:${phone}`}
          className="inline-flex items-center gap-2 text-base font-mono font-bold text-[#c5a059] hover:underline"
        >
          {phone}
        </a>
        <div className="text-[10px] text-[#88908a] flex items-center gap-1 pt-0.5">
          <Clock className="w-3 h-3 text-[#c5a059]" />
          <span>Desk Hours: Monday – Saturday (9:00 AM – 7:30 PM IST)</span>
        </div>
      </div>
    </div>
  );
}

