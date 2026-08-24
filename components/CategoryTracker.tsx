'use client';

import { useEffect } from 'react';
import { trackCategoryView } from '@/lib/analytics';

interface CategoryTrackerProps {
  id: string;
  name: string;
}

export default function CategoryTracker({ id, name }: CategoryTrackerProps) {
  useEffect(() => {
    trackCategoryView({ id, name });
  }, [id, name]);

  return null;
}
