'use client';

import React from 'react';
import { Campaign } from '@/lib/types';
import { Sparkles, Calendar, Clock, Percent, IndianRupee, Tag, CheckCircle2 } from 'lucide-react';

interface OffersStatsCardsProps {
  campaigns: Campaign[];
}

export default function OffersStatsCards({ campaigns }: OffersStatsCardsProps) {
  const activeCount = campaigns.filter((c) => c.status === 'active' && !c.isManuallyDisabled).length;
  const scheduledCount = campaigns.filter((c) => c.status === 'scheduled').length;
  const expiredCount = campaigns.filter((c) => c.status === 'expired').length;
  const couponCount = campaigns.filter((c) => !!c.couponCode).length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
          <span>Active Campaigns</span>
          <Sparkles className="w-4 h-4 text-[#183F2B]" />
        </div>
        <div className="text-2xl font-bold text-[#0f2d22]">{activeCount}</div>
        <p className="text-[11px] text-[#626c66]">Currently live across storefront</p>
      </div>

      <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
          <span>Scheduled Upcoming</span>
          <Calendar className="w-4 h-4 text-amber-600" />
        </div>
        <div className="text-2xl font-bold text-amber-700">{scheduledCount}</div>
        <p className="text-[11px] text-[#626c66]">Ready for future release</p>
      </div>

      <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
          <span>Active Coupon Codes</span>
          <Tag className="w-4 h-4 text-[#9A4F32]" />
        </div>
        <div className="text-2xl font-bold text-[#9A4F32]">{couponCount}</div>
        <p className="text-[11px] text-[#626c66]">Applicable at checkout</p>
      </div>

      <div className="p-5 bg-white border border-[#e8e2d5] rounded-2xl shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[#626c66]">
          <span>Past / Expired</span>
          <Clock className="w-4 h-4 text-gray-400" />
        </div>
        <div className="text-2xl font-bold text-gray-700">{expiredCount}</div>
        <p className="text-[11px] text-[#626c66]">Completed campaign archives</p>
      </div>
    </div>
  );
}
