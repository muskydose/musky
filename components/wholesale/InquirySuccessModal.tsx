'use client';

import React, { useState } from 'react';
import { WholesaleEnquiry } from '@/lib/types';
import { CheckCircle2, MessageCircle, Copy, Check, RotateCcw, Building2 } from 'lucide-react';

interface InquirySuccessModalProps {
  enquiry: WholesaleEnquiry;
  whatsappUrl: string;
  onReset: () => void;
}

export default function InquirySuccessModal({
  enquiry,
  whatsappUrl,
  onReset,
}: InquirySuccessModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyRef = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(enquiry.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleOpenWhatsApp = () => {
    if (whatsappUrl && typeof window !== 'undefined') {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      role="region"
      aria-label="Inquiry Submission Confirmation"
      className="p-6 md:p-8 rounded-2xl bg-white border border-[#e8e2d5] shadow-sm text-center space-y-5 animate-in fade-in duration-300"
    >
      {/* Icon Badge */}
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8" />
      </div>

      {/* Main Title & Reference */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200 inline-block">
          Commercial Inquiry Registered
        </span>
        <h3 className="font-momo-display text-2xl font-normal text-[#0f2d22]">
          Thank You, {enquiry.customerName}
        </h3>
        <p className="text-xs text-[#626c66] max-w-md mx-auto">
          Your wholesale quotation request has been recorded. Reference Reference ID:
        </p>

        {/* Copyable Reference Chip */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] text-xs font-mono font-bold text-[#1b4332] mt-1">
          <span>{enquiry.id}</span>
          <button
            type="button"
            onClick={handleCopyRef}
            aria-label="Copy reference ID to clipboard"
            className="p-1 hover:bg-[#e8e2d5] rounded text-[#626c66] transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Summary Box */}
      <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#e8e2d5] text-left text-xs space-y-2 max-w-md mx-auto text-[#2b302c]">
        {enquiry.businessName && (
          <div className="flex items-center gap-1.5 text-[#0f2d22] font-semibold">
            <Building2 className="w-3.5 h-3.5 text-[#c5a059]" />
            <span>{enquiry.businessName}</span>
          </div>
        )}
        <div>
          <strong className="text-[#0f2d22]">Requirement:</strong> {enquiry.productsRequired}
        </div>
        <div>
          <strong className="text-[#0f2d22]">Volume / Quantity:</strong> {enquiry.approxQuantity}
        </div>
        <div>
          <strong className="text-[#0f2d22]">Contact Phone:</strong> {enquiry.phone}
        </div>
        {enquiry.city && (
          <div>
            <strong className="text-[#0f2d22]">Destination:</strong> {enquiry.city}
            {enquiry.state ? `, ${enquiry.state}` : ''}
          </div>
        )}
      </div>

      {/* Status Notice */}
      <p className="text-[11px] text-[#626c66] max-w-md mx-auto leading-relaxed">
        Our Sojat sales desk reviews wholesale requests during business hours. Connect on WhatsApp to expedite quotation review.
      </p>

      {/* Action Buttons */}
      <div className="pt-2 space-y-2.5 max-w-md mx-auto">
        {whatsappUrl && (
          <button
            type="button"
            onClick={handleOpenWhatsApp}
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer min-h-[44px]"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Open WhatsApp Conversation (New Tab)</span>
          </button>
        )}

        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-1 text-xs text-[#1b4332] underline hover:text-[#0f2d22] font-semibold cursor-pointer py-1"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Submit Another Wholesale Inquiry</span>
        </button>
      </div>
    </div>
  );
}

