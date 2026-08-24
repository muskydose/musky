'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Category } from '@/lib/types';
import { sanitizeImageUrl } from '@/lib/utils';
import { ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';

interface CategoryCardProps {
  category: Category;
}

export default function CategoryCard({ category }: CategoryCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="h-full"
    >
      <Link
        href={`/products?category=${category.slug}`}
        className="group relative block rounded-2xl overflow-hidden aspect-[4/3] shadow-sm hover:shadow-xl border border-[#e8e2d5] transition-all duration-300 h-full"
      >
        <Image
          src={sanitizeImageUrl(category.image)}
          alt={category.name}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out brightness-[0.85] group-hover:brightness-75"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f2d22]/90 via-[#0f2d22]/30 to-transparent p-3.5 sm:p-6 flex flex-col justify-end text-white">
          <div className="flex items-start sm:items-center justify-between gap-2 mb-1">
            <h3 className="font-momo-display text-base sm:text-2xl font-normal tracking-tight text-white group-hover:text-[#c5a059] transition-colors line-clamp-2 leading-snug flex items-center min-h-[2.25rem] sm:min-h-0">
              {category.name}
            </h3>
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#1b4332]/80 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-[#c5a059] group-hover:text-[#0f2d22] group-hover:rotate-12 transition-all duration-300 shrink-0 mt-0.5 sm:mt-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
          {category.description && (
            <p className="text-[10px] sm:text-xs text-[#d3e2da] line-clamp-1 leading-tight font-sans truncate">
              {category.description}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
