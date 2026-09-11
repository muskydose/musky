/**
 * ============================================================================
 * MUSKY DOSE — UNIVERSAL ENTITY GOVERNANCE REGISTRY (V1.0)
 *
 * Central registry binding all platform entities to their authoritative table,
 * validation policies, permission gates, lifecycle hooks, and revalidation rules.
 * Future features plug in here via registerGovernedEntity().
 * ============================================================================
 */

import { UniversalEntityType, GovernedEntityDefinition, GovernanceValidationResult } from './types';
import { pruneEntityReferences } from './reference-integrity';
import { CommerceGovernance } from './commerce-governance';

const ENTITY_REGISTRY = new Map<UniversalEntityType, GovernedEntityDefinition>();

/**
 * Registers a new entity type in the Universal Platform Governance system.
 */
export function registerGovernedEntity<T = any>(definition: GovernedEntityDefinition<T>): void {
  ENTITY_REGISTRY.set(definition.entityType, definition);
}

/**
 * Retrieves the governance definition for an entity type.
 */
export function getEntityDefinition<T = any>(entityType: UniversalEntityType): GovernedEntityDefinition<T> | undefined {
  return ENTITY_REGISTRY.get(entityType);
}

/**
 * Returns all currently registered entity types.
 */
export function getAllRegisteredEntities(): GovernedEntityDefinition[] {
  return Array.from(ENTITY_REGISTRY.values());
}

// ============================================================================
// CORE ENTITY PRE-REGISTRATIONS
// ============================================================================

// 1. PRODUCT
registerGovernedEntity({
  entityType: 'PRODUCT',
  displayName: 'Retail & Wholesale Product',
  tableName: 'products',
  requiresAdminAuth: true,
  requiresCsrf: true,
  allowedStates: ['AUTO', 'MANUAL', 'LOCKED', 'NEEDS_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED', 'DELETED'],
  defaultState: 'PUBLISHED',
  isSeoEligible: true,
  isAnalyticsEligible: true,
  validate: (product: any, isNew?: boolean): GovernanceValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!product || typeof product !== 'object') {
      return { isValid: false, errors: ['Invalid product payload.'], warnings: [] };
    }

    if (!product.name || !String(product.name).trim()) {
      errors.push('Product commercial name is required.');
    }

    const rawComparePrice = product.compareAtPrice !== undefined ? product.compareAtPrice : product.comparePrice;
    const pricingVal = CommerceGovernance.validateProductPricing(Number(product.price), rawComparePrice);
    errors.push(...pricingVal.errors);
    warnings.push(...pricingVal.warnings);

    if (Array.isArray(product.variants) && product.variants.length > 0) {
      const variantVal = CommerceGovernance.validateVariantMonotonicity(product.variants);
      errors.push(...variantVal.errors);
      warnings.push(...variantVal.warnings);
    }

    return { isValid: errors.length === 0, errors, warnings, sanitized: product };
  },
  getRevalidationTags: () => ['products', 'catalog'],
  getRevalidationPaths: (p: any) => [
    '/',
    '/products',
    '/categories',
    '/sitemap.xml',
    p?.slug ? `/products/${p.slug}` : '',
  ].filter(Boolean),
  onDeleted: async (id: string, slug?: string) => {
    await pruneEntityReferences('PRODUCT', id, slug);
  },
});

// 2. CATEGORY
registerGovernedEntity({
  entityType: 'CATEGORY',
  displayName: 'Catalog Category Taxonomy',
  tableName: 'categories',
  requiresAdminAuth: true,
  requiresCsrf: true,
  allowedStates: ['MANUAL', 'PUBLISHED', 'UNPUBLISHED', 'DELETED'],
  defaultState: 'PUBLISHED',
  isSeoEligible: true,
  isAnalyticsEligible: true,
  validate: (category: any): GovernanceValidationResult => {
    const errors: string[] = [];
    if (!category?.name?.trim()) errors.push('Category name is required.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  },
  getRevalidationTags: () => ['categories', 'catalog'],
  getRevalidationPaths: (c: any) => [
    '/',
    '/products',
    '/categories',
    '/sitemap.xml',
    c?.slug ? `/categories/${c.slug}` : '',
  ].filter(Boolean),
  onDeleted: async (id: string, slug?: string) => {
    await pruneEntityReferences('CATEGORY', id, slug);
  },
});

// 3. GUIDE
registerGovernedEntity({
  entityType: 'GUIDE',
  displayName: 'Educational Product Guide',
  tableName: 'product_guides',
  requiresAdminAuth: true,
  requiresCsrf: true,
  allowedStates: ['AUTO', 'MANUAL', 'NEEDS_REVIEW', 'PUBLISHED', 'UNPUBLISHED', 'DELETED'],
  defaultState: 'PUBLISHED',
  isSeoEligible: true,
  isAnalyticsEligible: true,
  validate: (guide: any): GovernanceValidationResult => {
    const errors: string[] = [];
    if (!guide?.title?.trim()) errors.push('Guide title is required.');
    if (!guide?.slug?.trim()) errors.push('Guide slug is required.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  },
  getRevalidationTags: () => ['guides'],
  getRevalidationPaths: (g: any) => [
    '/guides',
    '/sitemap.xml',
    g?.slug ? `/guides/${g.slug}` : '',
  ].filter(Boolean),
  onDeleted: async (id: string, slug?: string) => {
    await pruneEntityReferences('GUIDE', id, slug);
  },
});

// 4. CUSTOM PAGE
registerGovernedEntity({
  entityType: 'PAGE',
  displayName: 'Custom Marketing / Legal Page',
  tableName: 'site_settings',
  requiresAdminAuth: true,
  requiresCsrf: true,
  allowedStates: ['MANUAL', 'PUBLISHED', 'UNPUBLISHED', 'DELETED'],
  defaultState: 'PUBLISHED',
  isSeoEligible: true,
  isAnalyticsEligible: false,
  validate: (page: any): GovernanceValidationResult => {
    const errors: string[] = [];
    if (!page?.title?.trim()) errors.push('Page title is required.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  },
  getRevalidationTags: () => ['site_settings', 'pages'],
  getRevalidationPaths: (p: any) => [
    '/sitemap.xml',
    p?.slug ? `/${p.slug}` : '',
  ].filter(Boolean),
  onDeleted: async (id: string, slug?: string) => {
    await pruneEntityReferences('PAGE', id, slug);
  },
});

// 5. BUSINESS DOCUMENT
registerGovernedEntity({
  entityType: 'BUSINESS_DOCUMENT',
  displayName: 'Official Business Certificate & Test Report',
  tableName: 'site_settings',
  requiresAdminAuth: true,
  requiresCsrf: true,
  allowedStates: ['MANUAL', 'PUBLISHED', 'UNPUBLISHED', 'DELETED'],
  defaultState: 'PUBLISHED',
  isSeoEligible: false,
  isAnalyticsEligible: false,
  validate: (doc: any): GovernanceValidationResult => {
    const errors: string[] = [];
    if (!doc?.title?.trim()) errors.push('Document title is required.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  },
  getRevalidationTags: () => ['site_settings', 'documents'],
  getRevalidationPaths: () => ['/documents', '/about', '/factory'],
  onDeleted: async (id: string, slug?: string) => {
    await pruneEntityReferences('BUSINESS_DOCUMENT', id, slug);
  },
});

// 6. ORDER
registerGovernedEntity({
  entityType: 'ORDER',
  displayName: 'Commercial Customer Order',
  tableName: 'orders',
  requiresAdminAuth: false, // Public checkout creates orders
  requiresCsrf: false,
  allowedStates: ['MANUAL', 'NEEDS_REVIEW', 'ARCHIVED'],
  defaultState: 'MANUAL',
  isSeoEligible: false,
  isAnalyticsEligible: true,
  validate: (order: any): GovernanceValidationResult => {
    const errors: string[] = [];
    if (!order?.customerName?.trim()) errors.push('Customer name is required.');
    const contactPhone = order?.customerPhone?.trim() || order?.phone?.trim();
    if (!contactPhone) errors.push('Contact phone is required.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  },
  getRevalidationTags: () => ['orders'],
  getRevalidationPaths: () => [],
});

// 7. WHOLESALE INQUIRY
registerGovernedEntity({
  entityType: 'LEAD',
  displayName: 'B2B Wholesale Inquiry & Lead',
  tableName: 'wholesale_inquiries',
  requiresAdminAuth: false, // Public wholesale form creates leads
  requiresCsrf: false,
  allowedStates: ['MANUAL', 'NEEDS_REVIEW', 'ARCHIVED', 'DELETED'],
  defaultState: 'NEEDS_REVIEW',
  isSeoEligible: false,
  isAnalyticsEligible: true,
  validate: (lead: any): GovernanceValidationResult => {
    const errors: string[] = [];
    if (!lead?.customerName?.trim()) errors.push('Customer name is required.');
    if (!lead?.phone?.trim()) errors.push('Contact phone is required.');
    return { isValid: errors.length === 0, errors, warnings: [] };
  },
  getRevalidationTags: () => ['leads'],
  getRevalidationPaths: () => [],
});

// 8. SITE SETTING
registerGovernedEntity({
  entityType: 'SETTING',
  displayName: 'Platform Global Configuration',
  tableName: 'site_settings',
  requiresAdminAuth: true,
  requiresCsrf: true,
  allowedStates: ['MANUAL', 'LOCKED'],
  defaultState: 'MANUAL',
  isSeoEligible: false,
  isAnalyticsEligible: false,
  validate: (setting: any): GovernanceValidationResult => {
    return { isValid: Boolean(setting && typeof setting === 'object'), errors: [], warnings: [] };
  },
  getRevalidationTags: () => ['site_settings', 'business_settings'],
  getRevalidationPaths: () => ['/', '/sitemap.xml'],
});
