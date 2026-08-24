'use client';

import React from 'react';
import { SiteSettings, TrustStripItem } from '@/lib/types';
import { DEFAULT_TRUST_STRIP_ITEMS } from '@/lib/data-store';
import { Leaf, ShieldCheck, Sparkles, Truck, Award, CheckCircle, Droplets, Factory, Heart, Star } from 'lucide-react';
import { FadeIn, StaggerContainer, StaggerItem } from '@/components/Motion';

interface TrustStripProps {
  siteSettings?: SiteSettings;
  heading?: string;
  subheading?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  Leaf: <Leaf className="w-5 h-5 text-[#183F2B]" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-[#9A4F32]" />,
  Sparkles: <Sparkles className="w-5 h-5 text-[#C49A55]" />,
  Truck: <Truck className="w-5 h-5 text-[#183F2B]" />,
  Award: <Award className="w-5 h-5 text-[#C49A55]" />,
  CheckCircle: <CheckCircle className="w-5 h-5 text-[#183F2B]" />,
  Droplets: <Droplets className="w-5 h-5 text-[#5F7F52]" />,
  Factory: <Factory className="w-5 h-5 text-[#9A4F32]" />,
  Heart: <Heart className="w-5 h-5 text-[#9A4F32]" />,
  Star: <Star className="w-5 h-5 text-[#C49A55]" />,
};

export default function TrustStrip({ siteSettings, heading, subheading }: TrustStripProps) {
  const items: TrustStripItem[] =
    siteSettings?.trustStripItems && siteSettings.trustStripItems.length > 0
      ? siteSettings.trustStripItems
      : DEFAULT_TRUST_STRIP_ITEMS;

  const activeItems = items
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (activeItems.length === 0) return null;

  return (
    <section className="py-6 sm:py-8 bg-[#F7F3E8] border-y border-[#e8e2d5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="text-center mb-4 sm:mb-6">
            {subheading && (
              <span className="text-[11px] font-bold text-[#C49A55] uppercase tracking-widest block mb-0.5">
                {subheading}
              </span>
            )}
            <h2 className="font-serif-heading text-xl sm:text-2xl font-bold text-[#183F2B]">
              {heading}
            </h2>
          </div>
        )}

        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6" staggerDelay={0.08}>
          {activeItems.map((item) => (
            <StaggerItem
              key={item.id}
              className="bg-[#FFFDF8] p-3.5 sm:p-5 rounded-2xl border border-[#e8e2d5] flex items-center gap-3 shadow-2xs hover:shadow-md transition-all"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F7F3E8] border border-[#e8e2d5] flex items-center justify-center shrink-0">
                {item.icon && iconMap[item.icon] ? iconMap[item.icon] : <Leaf className="w-5 h-5 text-[#183F2B]" />}
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-[#22231F] leading-snug">
                  {item.title}
                </h3>
                <p className="text-[11px] text-[#626c66] mt-0.5 line-clamp-2 leading-tight">
                  {item.description}
                </p>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </section>
  );
}
