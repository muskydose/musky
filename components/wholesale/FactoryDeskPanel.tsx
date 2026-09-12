'use client';

import React from 'react';
import { SiteSettings } from '@/lib/types';
import { getConfiguredWhatsAppNumber, getWhatsAppDirectUrl } from '@/lib/whatsapp';
import { ShieldCheck, Phone, MapPin, Package, FileText, MessageCircle, Clock, CheckCircle2 } from 'lucide-react';

interface FactoryDeskPanelProps {
  siteSettings?: SiteSettings | null;
}

export default function FactoryDeskPanel({ siteSettings }: FactoryDeskPanelProps) {
  const rawPhone = siteSettings?.displayPhone || '+91 8233703080';
  const phoneDigits = rawPhone.replace(/\D/g, '');
  const formattedPhone = phoneDigits.endsWith('8233703080')
    ? '+91 8233703080'
    : rawPhone.replace(/\s+/g, ' ').trim();
  const phoneTel = `+${phoneDigits.length > 10 ? phoneDigits : '91' + phoneDigits}`;

  const destNum = getConfiguredWhatsAppNumber(siteSettings);
  const whatsappUrl = getWhatsAppDirectUrl(
    destNum,
    'Hello Musky Dose Sojat Factory Desk, I am inquiring regarding wholesale supply and dispatch schedules.'
  );

  return (
    <div className="bg-[#0f2d22] text-white p-4 sm:p-7 rounded-2xl border border-[#2d6a4f] shadow-md space-y-5">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-[#c5a059] uppercase tracking-wider block">
            Direct Factory Operation
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800 shrink-0 whitespace-nowrap">
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
          <div className="min-w-0">
            <strong className="text-white">Manufacturing Origin:</strong>
            <div className="text-[#b2c8be] text-[11px] leading-relaxed">Sojat City, Pali District, Rajasthan (Pincode: 306104).</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <ShieldCheck className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <strong className="text-white">Botanical Processing:</strong>
            <div className="text-[#b2c8be] text-[11px] leading-relaxed">
              Whole-leaf processing and mechanical sifting without synthetic dye additives.
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Package className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <strong className="text-white">Commercial Supply Tiers:</strong>
            <div className="text-[#b2c8be] text-[11px] leading-relaxed">
              Retail master cartons (100g, 250g, 500g, 1kg) and commercial multi-wall sacks (5kg, 25kg, 50kg).
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <FileText className="w-4 h-4 text-[#c5a059] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <strong className="text-white">B2B Tax Invoicing:</strong>
            <div className="text-[#b2c8be] text-[11px] leading-relaxed">
              Full GST invoices generated with appropriate HSN classification for Input Tax Credit claims.
            </div>
          </div>
        </div>
      </div>

      {/* Direct Factory Action Buttons & Contact Block */}
      <div className="pt-3.5 border-t border-[#2d6a4f]/70 space-y-3">
        <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5 text-center sm:text-left">
          <Phone className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
          <span>Business Enquiries &amp; Mandi Logistics</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 max-w-sm sm:max-w-none mx-auto sm:mx-0 w-full">
          <a
            href={`tel:${phoneTel}`}
            className="min-h-[44px] py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center shadow-2xs"
            aria-label={`Call Musky Dose Factory Desk at ${formattedPhone}`}
          >
            <Phone className="w-3.5 h-3.5 text-[#c5a059] shrink-0" />
            <span className="whitespace-nowrap">Call Desk</span>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm text-center"
            aria-label="Contact Musky Dose Factory Desk on WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">WhatsApp</span>
          </a>
        </div>

        {/* Mobile: Centered Stacked Layout (< sm) */}
        <div className="flex sm:hidden flex-col items-center justify-center text-center space-y-1 pt-1">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#88908a]">
            <Clock className="w-3 h-3 text-[#c5a059] shrink-0" />
            <span>Desk Hours: Mon–Sat (9 AM–7:30 PM IST)</span>
          </div>
          <a
            href={`tel:${phoneTel}`}
            className="font-mono text-xs text-[#c5a059] hover:text-white font-semibold transition-colors whitespace-nowrap tracking-wide py-0.5"
            aria-label={`Dial ${formattedPhone}`}
          >
            {formattedPhone}
          </a>
        </div>

        {/* Desktop / Tablet: Compact Justify-Between Layout (sm+) */}
        <div className="hidden sm:flex items-center justify-between text-[10px] text-[#88908a] pt-0.5">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-[#c5a059] shrink-0" />
            <span>Desk Hours: Mon–Sat (9 AM–7:30 PM IST)</span>
          </span>
          <a
            href={`tel:${phoneTel}`}
            className="font-mono text-[#b2c8be] hover:text-white transition-colors whitespace-nowrap"
            aria-label={`Dial ${formattedPhone}`}
          >
            {formattedPhone}
          </a>
        </div>
      </div>
    </div>
  );
}

