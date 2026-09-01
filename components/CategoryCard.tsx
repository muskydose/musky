'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';
import { ArrowUpRight, Leaf, Sparkles, Droplets, Heart, Flower2, Package } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { SPRINGS } from '@/lib/motion';

interface CategoryCardProps {
  category: Category;
}

function getCategoryIcon(slugOrName: string) {
  const s = (slugOrName || '').toLowerCase();
  if (s.includes('henna') || s.includes('mehendi')) return <Flower2 className="w-8 h-8 text-[#c5a059]" />;
  if (s.includes('hair') || s.includes('indigo') || s.includes('oil')) return <Droplets className="w-8 h-8 text-[#c5a059]" />;
  if (s.includes('face') || s.includes('rose') || s.includes('skin')) return <Heart className="w-8 h-8 text-[#c5a059]" />;
  if (s.includes('beauty')) return <Sparkles className="w-8 h-8 text-[#c5a059]" />;
  if (s.includes('raw') || s.includes('leaf') || s.includes('bulk')) return <Package className="w-8 h-8 text-[#c5a059]" />;
  return <Leaf className="w-8 h-8 text-[#c5a059]" />;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const rawImage = category.image || '';
  const isCustomImage = rawImage && !rawImage.endsWith('.svg') && !rawImage.includes('fallback.svg');

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : { y: -4 }}
      transition={SPRINGS.card}
      className="h-full"
    >
      <Link
        href={`/products?category=${category.slug}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[4/3] shadow-xs hover:shadow-xl border border-[#e8e2d5] hover:border-[#c5a059]/60 transition-colors duration-300 h-full bg-[#0f2d22]"
      >
        {isCustomImage ? (
          <Image
            src={sanitizeImageUrl(category.image)}
            alt={category.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out brightness-[0.85] group-hover:brightness-75"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1b4332] via-[#0f2d22] to-[#0a1f17] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs border border-[#c5a059]/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-[#c5a059] transition-transform duration-300">
              {getCategoryIcon(category.slug || category.name)}
            </div>
            <div className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest">
              Sojat Botanical
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2d22]/95 via-[#0f2d22]/40 to-transparent p-3.5 sm:p-5 flex flex-col justify-end text-white">
          <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
            <h3 className="font-momo-display text-base sm:text-2xl font-normal tracking-tight text-white group-hover:text-[#c5a059] transition-colors line-clamp-2 leading-snug flex items-center min-h-[2.25rem] sm:min-h-0">
              {category.name}
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#1b4332]/90 border border-[#c5a059]/30 backdrop-blur-xs flex items-center justify-center text-[#c5a059] group-hover:bg-[#c5a059] group-hover:text-[#0f2d22] group-hover:rotate-12 transition-all duration-300 shrink-0 mt-0.5 sm:mt-0 shadow-xs">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          {category.description ? (
            <p className="text-[11px] sm:text-xs text-[#d3e2da] line-clamp-2 leading-relaxed font-sans">
              {category.description}
            </p>
          ) : (
            <p className="text-[11px] sm:text-xs text-[#d3e2da] line-clamp-1 leading-relaxed font-sans opacity-80">
              Explore authentic Sojat {category.name}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
