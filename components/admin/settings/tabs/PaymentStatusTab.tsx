'use client';

import React from 'react';
import { CreditCard, CheckCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function PaymentStatusTab() {
  return (
    <div className="space-y-6">
          <div className="space-y-6">
            <div className="border-b border-[#e8e2d5] pb-3">
              <h3 className="font-serif-heading text-xl font-bold text-[#0f2d22]">Payment Architecture & Channel Status</h3>
              <p className="text-gray-500 mt-1">Review active checkout channels and future payment gateway architecture.</p>
            </div>

            <div className="bg-[#e8f3ed] border border-[#2d6a4f]/30 p-5 rounded-2xl space-y-3">
              <div className="flex items-center gap-2 text-[#1b4332] font-bold text-sm">
                <CheckCircle className="w-5 h-5 text-[#25D366] fill-[#25D366]" />
                <span>PRIMARY ORDER METHOD: WHATSAPP DIRECT (ACTIVE)</span>
              </div>
              <p className="text-[#1b4332] text-xs leading-relaxed">
                Customers place orders via pre-filled WhatsApp messages. Orders are saved in Supabase database before redirecting to WhatsApp.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-gray-700 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span>ONLINE PAYMENT CHANNEL: OFF (DISABLED BY DEFAULT)</span>
                </div>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full uppercase">
                  Future-Ready
                </span>
              </div>
              <p className="text-gray-600 text-xs leading-relaxed">
                Online payment processing remains disabled in accordance with business instructions. The payment gateway architecture is prepared for seamless activation when required.
              </p>
            </div>
          </div>
    </div>
  );
}
