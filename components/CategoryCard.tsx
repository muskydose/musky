'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';
import { isSafeInternalMediaUrl } from '@/lib/db/media';
import { ArrowUpRight } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { universalCardHoverMotion } from '@/lib/design-system/motion';
import { resolveCategoryPresentation } from '@/lib/design-system/category-presentation';

interface CategoryCardProps {
  category: Category;
  canonicalImage?: string;
  icon?: React.ReactNode;
}

export default function CategoryCard({ category, canonicalImage, icon }: CategoryCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const candidateImage = canonicalImage || (category as any)?.canonicalPrimaryUrl || category.image || '';
  const rawImage = isSafeInternalMediaUrl(candidateImage) ? candidateImage : '';
  const isCustomImage = Boolean(rawImage && !rawImage.endsWith('.svg') && !rawImage.includes('fallback.svg'));
  const presentation = React.useMemo(() => resolveCategoryPresentation(category as any), [category]);
  const FallbackIcon = presentation.icon;

  return (
    <motion.div
      whileHover={shouldReduceMotion ? undefined : universalCardHoverMotion.hover}
      className="h-full"
    >
      <Link
        href={`/products?category=${category.slug}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[4/3] shadow-xs hover:shadow-xl border border-[#e8e2d5] hover:border-[#c5a059]/60 transition-colors duration-300 h-full bg-[#0f2d22]"
      >
        {isCustomImage ? (
          <Image
            src={sanitizeImageUrl(rawImage)}
            alt={category.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out brightness-[0.85] group-hover:brightness-75"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1b4332] via-[#0f2d22] to-[#0a1f17] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-xs border border-[#c5a059]/30 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-[#c5a059] transition-transform duration-300">
              {icon || <FallbackIcon className="w-8 h-8 text-[#c5a059]" />}
            </div>
            <div className="text-[10px] font-bold text-[#c5a059] uppercase tracking-widest">
              {presentation.badgeText}
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
          <div className="min-h-[2rem] sm:min-h-0 flex items-start">
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
        </div>
      </Link>
    </motion.div>
  );
}
