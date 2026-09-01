'use client';

import { useEffect } from 'react';
import { trackGuideView, trackGuideProductClick } from '@/lib/analytics';

interface GuideTrackerProps {
  guide: {
    slug: string;
    title: string;
    category?: string;
  };
}

export default function GuideTracker({ guide }: GuideTrackerProps) {
  useEffect(() => {
    if (guide?.slug) {
      trackGuideView({
        slug: guide.slug,
        title: guide.title,
        category: guide.category || 'Guides',
      });
    }
  }, [guide]);

  return null;
}

export function GuideProductClickTracker({
  guideSlug,
  productId,
  productSlug,
  productName,
  price,
  children,
  className,
}: {
  guideSlug: string;
  productId: string;
  productSlug?: string;
  productName?: string;
  price?: number;
  children: React.ReactNode;
  className?: string;
}) {
  const handleClick = () => {
    trackGuideProductClick({
      guideSlug,
      productId,
      productSlug,
      productName,
      price,
    });
  };

  return (
    <div onClick={handleClick} className={className}>
      {children}
    </div>
  );
}

