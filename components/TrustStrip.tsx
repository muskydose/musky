'use client';

import React from 'react';
import { SiteSettings, TrustStripItem } from '@/lib/types';
import { DEFAULT_TRUST_STRIP_ITEMS } from '@/lib/data-store';
import { Leaf, ShieldCheck, Sparkles, Truck, Award, CheckCircle, Droplets, Factory, Heart, Star } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRINGS } from '@/lib/motion';

interface TrustStripProps {
  siteSettings?: SiteSettings;
  heading?: string;
  subheading?: string;
}

const iconMap: Record<string, React.ReactNode> = {
  Leaf: <Leaf className="w-5 h-5 text-[#1b4332]" />,
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-[#c5a059]" />,
  Sparkles: <Sparkles className="w-5 h-5 text-[#c5a059]" />,
  Truck: <Truck className="w-5 h-5 text-[#1b4332]" />,
  Award: <Award className="w-5 h-5 text-[#c5a059]" />,
  CheckCircle: <CheckCircle className="w-5 h-5 text-[#1b4332]" />,
  Droplets: <Droplets className="w-5 h-5 text-[#1b4332]" />,
  Factory: <Factory className="w-5 h-5 text-[#c5a059]" />,
  Heart: <Heart className="w-5 h-5 text-[#c5a059]" />,
  Star: <Star className="w-5 h-5 text-[#c5a059]" />,
};

export default function TrustStrip({ siteSettings, heading, subheading }: TrustStripProps) {
  const shouldReduceMotion = useReducedMotion();
  const items: TrustStripItem[] =
    siteSettings?.trustStripItems && siteSettings.trustStripItems.length > 0
      ? siteSettings.trustStripItems
      : DEFAULT_TRUST_STRIP_ITEMS;

  const activeItems = items
    .filter((item) => item.enabled !== false)
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  if (activeItems.length === 0) return null;

  return (
    <section className="py-5 sm:py-8 bg-[#faf8f5] border-y border-[#e8e2d5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {heading && (
          <div className="text-center mb-4 sm:mb-6">
            {subheading && (
              <span className="text-[10px] sm:text-xs font-bold text-[#c5a059] uppercase tracking-widest block mb-1 font-sans">
                {subheading}
              </span>
            )}
            <h2 className="font-momo-display text-xl sm:text-2xl font-normal text-[#0f2d22]">
              {heading}
            </h2>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-6">
          {activeItems.map((item) => (
            <motion.div
              key={item.id}
              whileHover={shouldReduceMotion ? undefined : { y: -3 }}
              transition={SPRINGS.card}
              className="bg-white p-3 sm:p-4 lg:p-5 rounded-2xl border border-[#e8e2d5] flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:shadow-md transition-shadow"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-[#e8f3ed] border border-[#2d6a4f]/20 flex items-center justify-center shrink-0">
                {item.icon && iconMap[item.icon] ? iconMap[item.icon] : <Leaf className="w-5 h-5 text-[#1b4332]" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-sans font-bold text-xs sm:text-sm text-[#0f2d22] leading-snug">
                  {item.title}
                </h3>
                <p className="font-sans text-[10px] sm:text-xs text-[#626c66] mt-0.5 line-clamp-2 leading-tight">
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
