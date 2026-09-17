import React from 'react';
import { Leaf, Flower2, Droplets, Heart, Sparkles, Package, LucideIcon } from 'lucide-react';
import { Category } from '@/lib/types';

/**
 * Universal Botanical Category Presentation Registry
 * Data-driven icon and theme mapping decoupled from component renderers.
 */
export const UNIVERSAL_CATEGORY_ICONS: Record<string, LucideIcon> = {
  henna: Flower2,
  floral: Flower2,
  oil: Droplets,
  liquid: Droplets,
  wellness: Heart,
  beauty: Sparkles,
  raw: Package,
  bulk: Package,
  botanical: Leaf,
  default: Leaf,
};

export interface CategoryPresentationConfig {
  icon: LucideIcon;
  badgeText: string;
}

/**
 * Universal Data-Driven Category Presentation Resolver
 * Resolves presentation metadata from category configuration or canonical fallback.
 * Guarantees that future categories render cleanly without touching CategoryCard.
 */
export function resolveCategoryPresentation(
  category: Partial<Category> & { iconKey?: string; presentationIcon?: LucideIcon }
): CategoryPresentationConfig {
  // 1. Explicit presentation icon override
  if (category.presentationIcon) {
    return {
      icon: category.presentationIcon,
      badgeText: 'Sojat Botanical',
    };
  }

  // 2. Data-driven icon key from category record
  if (category.iconKey && UNIVERSAL_CATEGORY_ICONS[category.iconKey]) {
    return {
      icon: UNIVERSAL_CATEGORY_ICONS[category.iconKey],
      badgeText: 'Sojat Botanical',
    };
  }

  // 3. Universal Fallback Strategy:
  // Decoupled from hardcoded component logic. Always returns universal brand botanical mark.
  const icon = UNIVERSAL_CATEGORY_ICONS.default;
  return {
    icon,
    badgeText: 'Sojat Botanical',
  };
}

