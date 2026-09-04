/**
 * MUSKY DOSE — STRUCTURED INTERNAL LINKING GRAPH (PHASE 6)
 * 
 * Production Domain: https://muskydose.in
 * 
 * Core Mandates:
 * 1. STRUCTURED ENTITY RELATIONSHIPS: Connects Knowledge Entities, Products, Categories, Guides,
 *    Sojat Hub, and Wholesale deterministically via canonical IDs and entity keys.
 * 2. NO BOTANICAL CONTAMINATION: Strict isolation between distinct botanical entities.
 *    (e.g. Henna products never link to Indigo as an ingredient, only as an optional two-step companion).
 * 3. NO SCOPE CONTAMINATION: Hair-only products never link to bridal mehndi cones or skin tattoo guides.
 * 4. PURE IN-MEMORY GRAPH: No database writes or schema dependencies.
 */

import { Product, Category, ProductGuide } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
  resolveCanonicalEntity,
  CanonicalEntityRecord,
} from './entity-registry';
import { ENTITY_KEY_TO_SLUG, getCanonicalKnowledgeUrl } from './search-intent-router';

export interface InternalGraphLink {
  sourceType: 'ENTITY' | 'PRODUCT' | 'GUIDE' | 'CATEGORY' | 'SOJAT_HUB' | 'WHOLESALE';
  sourceId: string;
  targetType: 'ENTITY' | 'PRODUCT' | 'GUIDE' | 'CATEGORY' | 'SOJAT_HUB' | 'WHOLESALE';
  targetId: string;
  targetUrl: string;
  anchorText: string;
  relationship:
    | 'CANONICAL_ENTITY'
    | 'PRODUCT_OF_ENTITY'
    | 'RELEVANT_CATEGORY'
    | 'AUTHORITY_GUIDE'
    | 'COMPANION_ENTITY'
    | 'ORIGIN_HUB'
    | 'B2B_WHOLESALE';
  confidence: 'HIGH' | 'MEDIUM';
  notes?: string;
}

export interface EntityInternalGraph {
  entityKey: string;
  canonicalUrl: string;
  products: { id: string; name: string; url: string; slug: string }[];
  categories: { id: string; name: string; url: string }[];
  guides: { id: string; title: string; url: string; slug: string }[];
  relatedEntities: { key: string; name: string; url: string }[];
  wholesaleUrl?: string;
  originHubUrl?: string;
  allLinks: InternalGraphLink[];
}

/**
 * Builds the complete structured internal link graph for a canonical entity.
 */
export function buildEntityInternalGraph(params: {
  entityKey: string;
  products?: Product[];
  categories?: Category[];
  guides?: ProductGuide[];
}): EntityInternalGraph | null {
  const { entityKey, products = [], categories = [], guides = [] } = params;
  const entityRecord = getEntity(entityKey);
  if (!entityRecord || entityRecord.status === 'UNKNOWN') return null;

  const entitySlug = ENTITY_KEY_TO_SLUG[entityKey];
  const canonicalUrl = `https://muskydose.in/knowledge/${entitySlug}`;
  const allLinks: InternalGraphLink[] = [];

  // 1. Related Active Products (Strictly matching entityKey)
  const matchedProducts: { id: string; name: string; url: string; slug: string }[] = [];
  for (const p of products) {
    if (p.isActive === false) continue;
    const pEntity = resolveCanonicalEntity(p);
    if (pEntity.entityKey === entityKey) {
      const pUrl = `/products/${p.slug}`;
      matchedProducts.push({
        id: String(p.id),
        name: p.name,
        url: pUrl,
        slug: p.slug,
      });

      allLinks.push({
        sourceType: 'ENTITY',
        sourceId: entityKey,
        targetType: 'PRODUCT',
        targetId: String(p.id),
        targetUrl: pUrl,
        anchorText: `Explore ${p.name}`,
        relationship: 'PRODUCT_OF_ENTITY',
        confidence: 'HIGH',
      });
    }
  }

  // 2. Relevant Categories
  const matchedCategories: { id: string; name: string; url: string }[] = [];
  for (const c of categories) {
    if (c.isActive === false) continue;
    const cSlug = c.slug.toLowerCase();
    const isRelevant =
      (entityKey === 'HENNA_MEHNDI' && (cSlug.includes('henna') || cSlug.includes('mehndi'))) ||
      (entityRecord.supportedScopes.includes('HAIR') && cSlug.includes('hair')) ||
      (entityRecord.supportedScopes.includes('SKIN') && (cSlug.includes('face') || cSlug.includes('skin'))) ||
      cSlug.includes('herbal');

    if (isRelevant) {
      const cUrl = `/categories/${c.slug}`;
      matchedCategories.push({
        id: String(c.id),
        name: c.name,
        url: cUrl,
      });

      allLinks.push({
        sourceType: 'ENTITY',
        sourceId: entityKey,
        targetType: 'CATEGORY',
        targetId: String(c.id),
        targetUrl: cUrl,
        anchorText: `Shop all ${c.name}`,
        relationship: 'RELEVANT_CATEGORY',
        confidence: 'HIGH',
      });
    }
  }

  // 3. Relevant Published Guides
  const matchedGuides: { id: string; title: string; url: string; slug: string }[] = [];
  for (const g of guides) {
    const gSlug = g.slug.toLowerCase();
    const gTitle = g.title.toLowerCase();
    // Strict isolation: only match guides that mention entity or aliases
    const mentionsEntity = entityRecord.normalizedAliases.some(
      (a) => gSlug.includes(a) || gTitle.includes(a)
    );

    if (mentionsEntity) {
      const gUrl = `/guides/${g.slug}`;
      matchedGuides.push({
        id: String(g.id || g.slug),
        title: g.title,
        url: gUrl,
        slug: g.slug,
      });

      allLinks.push({
        sourceType: 'ENTITY',
        sourceId: entityKey,
        targetType: 'GUIDE',
        targetId: String(g.id || g.slug),
        targetUrl: gUrl,
        anchorText: g.title,
        relationship: 'AUTHORITY_GUIDE',
        confidence: 'HIGH',
      });
    }
  }

  // 4. Related Companion Entities (Pure companion knowledge, not formulation contamination)
  const relatedEntities: { key: string; name: string; url: string }[] = [];
  for (const relKey of entityRecord.relatedEntities) {
    const relRecord = getEntity(relKey);
    const relSlug = ENTITY_KEY_TO_SLUG[relKey];
    if (relRecord && relSlug) {
      const relUrl = `/knowledge/${relSlug}`;
      relatedEntities.push({
        key: relKey,
        name: relRecord.canonicalName,
        url: relUrl,
      });

      allLinks.push({
        sourceType: 'ENTITY',
        sourceId: entityKey,
        targetType: 'ENTITY',
        targetId: relKey,
        targetUrl: relUrl,
        anchorText: relRecord.canonicalName,
        relationship: 'COMPANION_ENTITY',
        confidence: 'HIGH',
        notes: 'Botanical companion context. Does NOT imply ingredient formulation.',
      });
    }
  }

  // 5. Origin Hub & Wholesale Links (where applicable)
  let originHubUrl: string | undefined;
  if (entityKey === 'HENNA_MEHNDI') {
    originHubUrl = '/sojat-henna';
    allLinks.push({
      sourceType: 'ENTITY',
      sourceId: entityKey,
      targetType: 'SOJAT_HUB',
      targetId: 'sojat-henna',
      targetUrl: '/sojat-henna',
      anchorText: 'Sojat Henna Origin & Terroir Authority Hub',
      relationship: 'ORIGIN_HUB',
      confidence: 'HIGH',
    });
  }

  const wholesaleUrl = '/wholesale';
  allLinks.push({
    sourceType: 'ENTITY',
    sourceId: entityKey,
    targetType: 'WHOLESALE',
    targetId: 'wholesale',
    targetUrl: wholesaleUrl,
    anchorText: `B2B Wholesale & Bulk ${entityRecord.canonicalName}`,
    relationship: 'B2B_WHOLESALE',
    confidence: 'HIGH',
  });

  return {
    entityKey,
    canonicalUrl,
    products: matchedProducts,
    categories: matchedCategories,
    guides: matchedGuides,
    relatedEntities,
    wholesaleUrl,
    originHubUrl,
    allLinks,
  };
}

/**
 * Builds incoming and outgoing internal links for a product.
 */
export function buildProductInternalLinks(product: Product): {
  entityLink?: { url: string; anchorText: string };
  categoryLink?: { url: string; anchorText: string };
  wholesaleLink?: { url: string; anchorText: string };
} {
  const entityRes = resolveCanonicalEntity(product);
  const slug = ENTITY_KEY_TO_SLUG[entityRes.entityKey];

  return {
    entityLink: slug
      ? {
          url: `/knowledge/${slug}`,
          anchorText: `Learn more about ${entityRes.entityRecord.canonicalName}`,
        }
      : undefined,
    categoryLink: (product as any).categorySlug
      ? {
          url: `/categories/${(product as any).categorySlug}`,
          anchorText: `View all ${product.categoryName || 'Category'} products`,
        }
      : undefined,
    wholesaleLink:
      product.isWholesaleEligible || (product.intelligence as any)?.wholesaleEligible
        ? {
            url: '/wholesale',
            anchorText: 'Explore wholesale & bulk supply options',
          }
        : undefined,
  };
}
