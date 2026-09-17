'use client';

import React from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'motion/react';
import { isSafeInternalMediaUrl } from '@/lib/db/media';
import { sanitizeImageUrl } from '@/lib/utils';
import { BrandedMediaPlaceholder } from './BrandedMediaPlaceholder';

export type AspectRatioToken = '1:1' | '4:5' | '16:9' | '9:16' | '1.91:1' | '4:3';

export interface ImageFrameProps {
  src?: string | null;
  alt: string;
  aspectRatio?: AspectRatioToken;
  zoomOnHover?: boolean;
  priority?: boolean;
  sizes?: string;
  role?: string;
  entityName?: string;
  className?: string;
}

const ratioStyles: Record<AspectRatioToken, string> = {
  '1:1': 'aspect-square',
  '4:5': 'aspect-[4/5]',
  '16:9': 'aspect-[16/9]',
  '9:16': 'aspect-[9/16]',
  '1.91:1': 'aspect-[1.91/1]',
  '4:3': 'aspect-[4/3]',
};

export const ImageFrame: React.FC<ImageFrameProps> = ({
  src,
  alt,
  aspectRatio = '1:1',
  zoomOnHover = true,
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  role = 'PRIMARY',
  entityName,
  className = '',
}) => {
  const shouldReduceMotion = useReducedMotion();
  const [hasError, setHasError] = React.useState(false);

  const isValidUrl = Boolean(src && isSafeInternalMediaUrl(src) && !src.includes('fallback.svg') && !hasError);

  if (!isValidUrl) {
    return (
      <div className={`relative w-full ${ratioStyles[aspectRatio]} overflow-hidden ${className}`}>
        <BrandedMediaPlaceholder
          role={role}
          slotName={`${role} (${aspectRatio})`}
          entityName={entityName || alt}
          aspectRatio={aspectRatio}
          className="w-full h-full"
        />
      </div>
    );
  }

  return (
    <div className={`relative w-full ${ratioStyles[aspectRatio]} overflow-hidden bg-[#faf5e8] ${className}`}>
      <Image
        src={sanitizeImageUrl(src!)}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        onError={() => setHasError(true)}
        className={`object-cover ${
          zoomOnHover && !shouldReduceMotion ? 'group-hover:scale-105 transition-transform duration-500 ease-out' : ''
        }`}
      />
    </div>
  );
};

export default ImageFrame;

