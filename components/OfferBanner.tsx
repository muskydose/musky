'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Campaign } from '@/lib/types';
import CountdownTimer from './CountdownTimer';
import { Sparkles, Tag, ArrowRight, X } from 'lucide-react';

interface OfferBannerProps {
  position?: 'announcement_bar' | 'homepage_hero' | 'offers_page';
}

export default function OfferBanner({ position = 'announcement_bar' }: OfferBannerProps) {
  const [activeCampaign, setActiveCampaign] = useState<Campaign | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/campaigns')
      .then((res) => (res.ok && res.headers.get('content-type')?.includes('application/json') ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.success && Array.isArray(data.campaigns)) {
          // Find first campaign matching position and showBanner
          const match = data.campaigns.find(
            (c: Campaign) =>
              c.status === 'active' &&
              c.showBanner &&
              (position === 'announcement_bar'
                ? c.bannerPosition === 'announcement_bar' || !c.bannerPosition
                : c.bannerPosition === position)
          );
          if (match) {
            setActiveCampaign(match);
          }
        }
      })
      .catch(() => {
        // Silently handle component unmount or transient network error
      });

    return () => {
      isMounted = false;
    };
  }, [position]);

  if (!activeCampaign || dismissed) return null;

  if (position === 'announcement_bar') {
    return (
      <div className="top-campaign-banner bg-gradient-to-r from-[#0f2d22] via-[#1b4332] to-[#0f2d22] text-white py-1.5 sm:py-2 px-3 sm:px-4 border-b border-[#c5a059]/30 relative text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-hidden mx-auto sm:mx-0">
            <span className="p-1 bg-[#c5a059] text-[#0f2d22] rounded-full shrink-0">
              <Sparkles className="w-3.5 h-3.5" />
            </span>
            <span className="font-medium truncate">
              {activeCampaign.bannerHeading || activeCampaign.publicHeading}
            </span>
            {activeCampaign.couponCode && (
              <span className="hidden sm:inline-block px-2 py-0.5 bg-white/10 text-[#c5a059] font-mono text-xs rounded border border-[#c5a059]/40 font-bold shrink-0">
                Code: {activeCampaign.couponCode}
              </span>
            )}
          </div>

          <div className="hidden md:flex items-center gap-4 shrink-0">
            {activeCampaign.showCountdown && (
              <CountdownTimer endDate={activeCampaign.endDate} compact />
            )}
            <Link
              href={activeCampaign.bannerCtaLink || '/offers'}
              className="inline-flex items-center gap-1 font-semibold text-[#c5a059] hover:underline"
            >
              <span>{activeCampaign.bannerCtaText || 'View Offer'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-stone-300 hover:text-white shrink-0 sm:hidden"
            aria-label="Close Announcement"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#0f2d22] to-[#1b4332] text-white p-6 sm:p-8 rounded-3xl border border-[#c5a059]/40 shadow-xl relative overflow-hidden my-6">
      <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-[#c5a059]/10 to-transparent pointer-events-none" />

      <div className="relative z-10 max-w-2xl space-y-4">
        {activeCampaign.festivalName && (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#c5a059] text-[#0f2d22] font-bold text-xs rounded-full uppercase tracking-wider">
            <Tag className="w-3 h-3" />
            {activeCampaign.festivalName}
          </span>
        )}

        <h2 className="font-momo-display font-bold text-2xl sm:text-3xl text-white">
          {activeCampaign.bannerHeading || activeCampaign.publicHeading}
        </h2>

        {activeCampaign.bannerSubtitle && (
          <p className="text-stone-200 text-sm sm:text-base font-medium">
            {activeCampaign.bannerSubtitle}
          </p>
        )}

        {activeCampaign.showCountdown && (
          <div className="pt-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-[#c5a059] mb-1.5">
              Offer Ends In:
            </p>
            <CountdownTimer endDate={activeCampaign.endDate} />
          </div>
        )}

        <div className="pt-3 flex flex-wrap items-center gap-3">
          <Link
            href={activeCampaign.bannerCtaLink || '/offers'}
            className="px-6 py-2.5 rounded-xl bg-[#c5a059] text-[#0f2d22] font-bold text-sm hover:bg-[#b08b46] shadow-lg transition-all inline-flex items-center gap-2"
          >
            <span>{activeCampaign.bannerCtaText || 'Claim Offer Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          {activeCampaign.couponCode && (
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-xs font-mono font-semibold text-[#c5a059]">
              Use Code: <span className="text-white text-sm tracking-wider font-bold">{activeCampaign.couponCode}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
