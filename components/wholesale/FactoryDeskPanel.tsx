'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { getConfiguredWhatsAppNumber, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { ShieldCheck, Phone, MapPin, Package, FileText, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';

interface FactoryDeskPanelProps {
  siteSettings?: SiteSettings | null;
}

export default function FactoryDeskPanel({ siteSettings }: FactoryDeskPanelProps) {
  const phone = siteSettings?.displayPhone || '+91 82337 03080';
  const destNum = getConfiguredWhatsAppNumber(siteSettings);
  const whatsappUrl = getWhatsAppDirectUrl(
    destNum,
    'Hello Musky Dose Sojat Factory Desk, I am inquiring regarding wholesale supply and dispatch schedules.'
  );

  return (
    <div className="bg-[#0f2d22] text-white p-6 sm:p-7 rounded-2xl border border-[#2d6a4f] shadow-md space-y-5">
      <div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
            Direct Mill Operation
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Live Desk
          </span>
        </div>
        <h3 className="font-momo-display text-xl sm:text-2xl font-normal text-white mt-1">
          SOJAT FACTORY DESK
        </h3>
        <p className="text-xs text-[#b2c8be] leading-relaxed mt-1">
          Musky Dose operates direct processing facilities in Sojat City. We fulfill commercial supply orders for salons, artists, and regional distributors nationwide.
        </p>
      </div>

      <div className="space-y-3 pt-2 text-xs border-t border-[#2d6a4f]/70">
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
            <strong className="text-white">Commercial Supply Tiers:</strong>
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

      {/* Direct Factory Action Buttons */}
      <div className="pt-3 border-t border-[#2d6a4f]/70 space-y-3">
        <div className="text-xs font-bold text-white flex items-center gap-1.5">
          <Phone className="w-3.5 h-3.5 text-[#c5a059]" />
          <span>Business Enquiries & Mandi Logistics</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <a
            href={`tel:${phone}`}
            className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
          >
            <Phone className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>Call Desk</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm text-center"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </a>
        </div>

        <div className="text-[10px] text-[#88908a] flex items-center justify-between pt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-[#c5a059]" />
            <span>Desk Hours: Mon–Sat (9 AM–7:30 PM IST)</span>
          </span>
          <span className="font-mono text-[#b2c8be]">{phone}</span>
        </div>
      </div>
    </div>
  );
}

