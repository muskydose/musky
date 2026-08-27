'use client';

import React from 'react';
import Link from 'next/link';
import { Sparkles, ArrowRight, ShieldCheck, Truck, Package, Heart, Award } from 'lucide-react';
import { AnnouncementItem } from '@/lib/types';

interface AnnouncementTickerProps {
  announcements?: AnnouncementItem[];
  fallbackText?: string;
  fallbackLink?: string;
  fallbackBadge?: string;
  speed?: 'slow' | 'normal' | 'fast';
  enabled?: boolean;
}

export default function AnnouncementTicker({
  announcements = [],
  fallbackText,
  fallbackLink = '/products',
  fallbackBadge = 'SOJAT ORIGIN',
  speed = 'normal',
  enabled = true,
}: AnnouncementTickerProps) {
  if (!enabled) return null;

  const activeItems = announcements
    .filter((item) => item.enabled !== false && item.text?.trim())
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  // Determine animation class based on speed setting
  const animationClass =
    speed === 'slow'
      ? 'animate-ticker-marquee-slow'
      : speed === 'fast'
      ? 'animate-ticker-marquee-fast'
      : 'animate-ticker-marquee';

  // Fallback single item rendering
  if (activeItems.length === 0) {
    if (!fallbackText) return null;
    return (
      <div className="w-full overflow-hidden py-1 px-3 text-center">
        <Link
          href={fallbackLink}
          className="inline-flex items-center gap-1.5 hover:text-[#c5a059] transition-colors leading-tight text-[11px] sm:text-xs font-semibold"
        >
          <span className="inline-flex items-center justify-center font-extrabold bg-[#c5a059] text-[#0f2d22] px-2 py-0.5 rounded text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0">
            {fallbackBadge}
          </span>
          <span className="truncate max-w-[280px] sm:max-w-none">{fallbackText}</span>
        </Link>
      </div>
    );
  }

  // Single active item static view
  if (activeItems.length === 1) {
    const item = activeItems[0];
    const content = (
      <div className="inline-flex items-center gap-2 hover:text-[#c5a059] transition-colors text-[11px] sm:text-xs font-semibold py-0.5">
        {item.badge && (
          <span className="inline-flex items-center justify-center font-extrabold bg-[#c5a059] text-[#0f2d22] px-2 py-0.5 rounded text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0">
            {item.badge}
          </span>
        )}
        <span className="truncate max-w-[280px] sm:max-w-none">{item.text}</span>
        {item.link && <ArrowRight className="w-3 h-3 text-[#c5a059] shrink-0" />}
      </div>
    );

    return (
      <div className="w-full overflow-hidden py-1 px-3 text-center">
        {item.link ? <Link href={item.link}>{content}</Link> : content}
      </div>
    );
  }

  // Multi-item continuous running ticker
  // We duplicate the list twice to achieve smooth, continuous 0-gap infinite marquee loop in CSS
  const renderItemPill = (item: AnnouncementItem, keyPrefix: string, index: number) => {
    const itemContent = (
      <div className="inline-flex items-center gap-2 px-4 py-0.5 hover:text-[#c5a059] transition-colors text-[11px] sm:text-xs font-semibold shrink-0">
        {item.badge && (
          <span className="inline-flex items-center justify-center font-extrabold bg-[#c5a059] text-[#0f2d22] px-2 py-0.5 rounded text-[10px] sm:text-[11px] uppercase tracking-wider shrink-0 shadow-2xs">
            {item.badge}
          </span>
        )}
        <span className="whitespace-nowrap">{item.text}</span>
        {item.link && <ArrowRight className="w-3 h-3 text-[#c5a059] shrink-0" />}
        <span className="text-[#2d6a4f] select-none ml-2">•</span>
      </div>
    );

    if (item.link) {
      return (
        <Link
          key={`${keyPrefix}-${item.id || index}`}
          href={item.link}
          className="focus:outline-hidden focus:ring-1 focus:ring-[#c5a059] rounded"
        >
          {itemContent}
        </Link>
      );
    }

    return (
      <div key={`${keyPrefix}-${item.id || index}`}>
        {itemContent}
      </div>
    );
  };

  return (
    <div
      className="w-full overflow-hidden py-0.5 group relative select-none"
      role="region"
      aria-label="Store Announcements"
    >
      <div className={animationClass}>
        {/* First track copy */}
        <div className="flex items-center shrink-0">
          {activeItems.map((item, idx) => renderItemPill(item, 'track-1', idx))}
        </div>
        {/* Second track copy for seamless loop */}
        <div className="flex items-center shrink-0" aria-hidden="true">
          {activeItems.map((item, idx) => renderItemPill(item, 'track-2', idx))}
        </div>
      </div>
    </div>
  );
}

