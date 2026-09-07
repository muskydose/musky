/**
 * MUSKY DOSE — DYNAMIC CATEGORY INTELLIGENCE RESOLVER (P3)
 *
 * Core Mandates:
 * 1. GOVERNED & DYNAMIC: No slug switches or hardcoded per-slug dictionaries in UI components.
 * 2. SINGLE SOURCE OF TRUTH: Derives from database Category -> Canonical Entity Registry -> Product Catalog.
 * 3. UX & EDITORIAL PRESERVATION: Preserves rich legacy copy for existing categories via documented baseline layer.
 * 4. FUTURE CATEGORY READINESS: Automatically derives botanical insights for any recognized entity (e.g. Amla, Indigo, Rose).
 * 5. CLAIM SAFETY: Never fabricates Ayurvedic, medical, clinical, or botanical claims for unknown/non-botanical categories.
 */

import { Category, Product } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  CanonicalEntityRecord,
  resolveEntityByAlias,
  resolveCanonicalEntity,
} from './entity-registry';

export type CategoryInsightSource =
  | 'LEGACY_EDITORIAL'
  | 'CANONICAL_ENTITY'
  | 'DERIVED_PRODUCTS'
  | 'CATALOG_COMMERCIAL';

export interface CategoryInsight {
  title: string;
  points: string[];
  source: CategoryInsightSource;
  entityKey?: string;
  scientificName?: string;
  botanicalFamily?: string;
  associatedEntities?: string[];
}

/**
 * Historical legacy editorial cards preserved for backward compatibility
 * without requiring slug switches inside UI presentation components.
 */
export const LEGACY_CATEGORY_INSIGHT_REGISTRY: Record<string, CategoryInsight> = {
  henna: {
    title: 'Sojat Lawsonia Inermis Origin & Processing',
    points: [
      'Cultivated in the semi-arid soil of Sojat City, Rajasthan — naturally rich in pure Lawsone dye pigment.',
      'Ultra-fine cloth-sifted for silk-smooth cone paste and lump-free hair mixing.',
      '100% natural, unadulterated botanical powders with zero synthetic dyes, PPD, or metallic additives.',
    ],
    source: 'LEGACY_EDITORIAL',
    entityKey: 'HENNA_MEHNDI',
    scientificName: 'Lawsonia inermis',
    botanicalFamily: 'Lythraceae',
    associatedEntities: ['HENNA_MEHNDI'],
  },
  'hair-care': {
    title: 'Pure Plant-Based Hair Nourishment & 2-Step Color',
    points: [
      'Organic Indigofera Tinctoria (Indigo) formulated for permanent 2-step natural black and brown hair coloring.',
      'Ayurvedic fruit & leaf blends (Amla, Reetha, Shikakai, Hibiscus) that naturally restore scalp pH and strengthen hair roots.',
      'Safe for color-treated hair and sensitive scalps seeking genuine chemical-free alternatives.',
    ],
    source: 'LEGACY_EDITORIAL',
    associatedEntities: ['INDIGO', 'AMLA', 'SHIKAKAI', 'REETHA', 'HIBISCUS'],
  },
  'face-care': {
    title: 'Steam-Distilled Pure Floral Hydrosols',
    points: [
      'Hydro-distilled from freshly plucked Rajasthani Damask Rose petals capturing pure volatile floral waters.',
      'Acts as a natural hydrating facial mist, pore refiner, and soothing toner for all skin types.',
      'Free from artificial fragrances, parabens, alcohol, and synthetic solubilizers.',
    ],
    source: 'LEGACY_EDITORIAL',
    associatedEntities: ['ROSE', 'MULTANI_MITTI'],
  },
  'herbal-products': {
    title: 'Whole Dried Botanicals & Raw Herbs',
    points: [
      'Solar shade-dried raw leaves, pods, and herbs harvested at peak potency from Rajasthan.',
      'Ideal for traditional DIY oil infusions, herbal decoctions, and customized beauty recipes.',
      'Direct farm-to-dispatch traceability ensuring maximum botanical freshness.',
    ],
    source: 'LEGACY_EDITORIAL',
    associatedEntities: ['HENNA_MEHNDI', 'INDIGO', 'AMLA', 'NEEM'],
  },
};

/**
 * Builds a high-precision, governed insight card for a recognized canonical botanical entity.
 */
function buildEntityInsightCard(entity: CanonicalEntityRecord, categoryName: string): CategoryInsight {
  const baseDisplayName = entity.searchRepresentations?.canonical || entity.canonicalName.replace(/\s*\(.*?\)\s*/g, '').trim();
  const scientific = entity.scientificName ? ` (${entity.scientificName})` : '';
  const family = entity.botanicalFamily ? ` belonging to the ${entity.botanicalFamily} botanical family` : '';

  const points: string[] = [
    `Authentic botanical origin${family}${scientific ? ` (*${entity.scientificName}*)` : ''}, verified under canonical specifications.`,
  ];

  if (Array.isArray(entity.safeUseCases) && entity.safeUseCases.length > 0) {
    const useCaseText = entity.safeUseCases.slice(0, 2).join(' and ');
    points.push(`Recognized for safe traditional applications: ${useCaseText}.`);
  } else {
    points.push('Formulated for gentle, traditional personal care applications.');
  }

  points.push(
    'Natural single-origin botanical formulation with zero synthetic dyes or prohibited additives.'
  );

  return {
    title: `${baseDisplayName}${scientific} Origin & Botanical Specifications`,
    points,
    source: 'CANONICAL_ENTITY',
    entityKey: entity.entityKey,
    scientificName: entity.scientificName,
    botanicalFamily: entity.botanicalFamily,
    associatedEntities: [entity.entityKey],
  };
}

/**
 * Deterministically resolves the intelligence insight card for a category.
 *
 * Precedence:
 * 1. Legacy Editorial Baseline (preserves existing 4 legacy categories without regression)
 * 2. Direct Category-to-Entity Match (e.g. "Amla", "Indigo", "Damask Rose")
 * 3. Product-Derived Entity Aggregation (aggregates canonical entities across products in category)
 * 4. Factual Commercial / Catalog Insight (for non-botanical products; zero fabricated health claims)
 * 5. Safe Omission (returns null when category is unknown and empty)
 */
export function resolveCategoryIntelligence(
  category: Category | null | undefined,
  products: Product[] = []
): CategoryInsight | null {
  if (!category || category.isActive === false) {
    return null;
  }

  const categorySlug = (category.slug || '').trim().toLowerCase();
  const categoryName = (category.name || '').trim();

  // 1. Explicit Legacy Editorial Baseline Layer
  if (categorySlug && LEGACY_CATEGORY_INSIGHT_REGISTRY[categorySlug]) {
    return { ...LEGACY_CATEGORY_INSIGHT_REGISTRY[categorySlug] };
  }

  // 2. Direct Category-to-Entity Resolution
  const directEntity =
    resolveEntityByAlias(categoryName) || (categorySlug ? resolveEntityByAlias(categorySlug) : null);

  if (directEntity && directEntity.entityKey !== 'UNKNOWN') {
    return buildEntityInsightCard(directEntity, categoryName);
  }

  // 3. Product-Derived Entity Aggregation
  const activeProducts = Array.isArray(products) ? products.filter((p) => p && p.name) : [];
  if (activeProducts.length > 0) {
    const resolvedEntitiesMap = new Map<string, CanonicalEntityRecord>();

    for (const prod of activeProducts) {
      const resolved = resolveCanonicalEntity(prod);
      if (resolved && resolved.entityRecord && resolved.entityRecord.entityKey !== 'UNKNOWN') {
        resolvedEntitiesMap.set(resolved.entityRecord.entityKey, resolved.entityRecord);
      }
    }

    const uniqueEntities = Array.from(resolvedEntitiesMap.values());

    if (uniqueEntities.length === 1) {
      return buildEntityInsightCard(uniqueEntities[0], categoryName);
    }

    if (uniqueEntities.length > 1) {
      const topEntities = uniqueEntities.slice(0, 4);
      const topNames = topEntities.map((e) => e.canonicalName).join(', ');

      const useCasesSet = new Set<string>();
      uniqueEntities.forEach((e) => {
        if (Array.isArray(e.safeUseCases)) {
          e.safeUseCases.forEach((uc) => useCasesSet.add(uc));
        }
      });
      const sampleUseCases = Array.from(useCasesSet).slice(0, 2);

      const points: string[] = [
        `Botanical collection featuring verified canonical ingredients: ${topNames}.`,
      ];

      if (sampleUseCases.length > 0) {
        points.push(`Formulated for complementary traditional applications including ${sampleUseCases.join(' and ')}.`);
      } else {
        points.push('Formulated with complementary natural botanicals for traditional personal care.');
      }

      points.push(
        'Natural botanical powders and extracts verified free of synthetic dyes and prohibited additives.'
      );

      return {
        title: `${categoryName} Botanical Ingredients & Specifications`,
        points,
        source: 'DERIVED_PRODUCTS',
        associatedEntities: uniqueEntities.map((e) => e.entityKey),
      };
    }

    // 4. Commercial / Product-Type Fallback for Non-Botanical Products
    // When products exist but none are recognized botanicals, NEVER fabricate botanical/health claims.
    const points: string[] = [
      `Authentic collection of ${categoryName.toLowerCase()} products crafted for high-performance use.`,
      'Subject to rigorous batch inspection, clean packaging standards, and direct dispatch verification.',
      'Guaranteed authentic sourcing backed by Musky Dose direct manufacturer quality controls.',
    ];

    return {
      title: `${categoryName} Quality & Sourcing Standards`,
      points,
      source: 'CATALOG_COMMERCIAL',
    };
  }

  // 5. Empty product set & unrecognized category:
  // Zero fabricated claims. Return null so no empty or misleading card is shown.
  return null;
}
