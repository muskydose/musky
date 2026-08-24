'use client';

import React from 'react';
import { getSiteLogo } from '@/lib/brand-assets';

interface BrandLogoProps {
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'custom';
  className?: string;
  alt?: string;
  priority?: boolean;
}

const heightClasses = {
  sm: 'h-7 sm:h-8',
  md: 'h-9 sm:h-11',
  lg: 'h-11 sm:h-14',
  xl: 'h-14 sm:h-18',
  '2xl': 'h-18 sm:h-22',
  custom: '',
};

export default function BrandLogo({
  logoUrl,
  size = 'md',
  className = '',
  alt = 'Musky Dose - Pure Henna & Herbal Care',
  priority = false,
}: BrandLogoProps) {
  const finalLogoUrl = getSiteLogo({ logoUrl });
  const heightClass = heightClasses[size] || heightClasses.md;

  return (
    <div
      className={`brand-logo-wrapper relative inline-flex items-center shrink-0 ${heightClass} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={finalLogoUrl}
        alt={alt}
        className="brand-logo-img h-full w-auto max-h-full object-contain select-none"
        loading={priority ? 'eager' : 'lazy'}
      />
    </div>
  );
}

