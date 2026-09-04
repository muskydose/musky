import {
  IntelligenceStatus,
  ProductScope,
  VerifiedAttribute,
  VerifiedAttributeSlug,
  AttributeVerificationSource,
  ProductFamily,
} from './universal-product-contract';
import { ProductIntelligenceMetadata } from '@/lib/types';
import {
  CANONICAL_ENTITY_REGISTRY,
  resolveCanonicalEntity,
} from './entity-registry';

export interface CanonicalEntityDefinition {
  key: string;
  displayName: string;
  scientificName?: string;
  family: ProductFamily;
  defaultScopes: ProductScope[];
  aliases: string[];
  description: string;
}

export const CANONICAL_ENTITIES: Record<string, CanonicalEntityDefinition> = Object.fromEntries(
  Object.entries(CANONICAL_ENTITY_REGISTRY).map(([key, entity]) => [
    key,
    {
      key: entity.entityKey,
      displayName: entity.canonicalName,
      scientificName: entity.scientificName,
      family: entity.productFamily,
      defaultScopes: entity.supportedScopes,
      aliases: entity.aliases,
      description: entity.description,
    },
  ])
);

export const ALLOWED_SCOPES: ProductScope[] = [
  'HAIR',
  'SKIN',
  'BODY_ART',
  'COSMETIC_FORMULATION',
  'AROMATHERAPY',
  'HERBAL',
];

export interface VerifiedAttributeSpec {
  slug: VerifiedAttributeSlug;
  displayName: string;
  category: 'PURITY' | 'PROCESSING' | 'GRADE' | 'CERTIFICATION' | 'EXTRACTION';
  allowedSources: AttributeVerificationSource[];
  description: string;
  requiresReference?: boolean;
}

export const VERIFIED_ATTRIBUTE_SPECS: Record<string, VerifiedAttributeSpec> = {
  pure: {
    slug: 'pure',
    displayName: '100% Pure Botanical',
    category: 'PURITY',
    allowedSources: ['ADMIN_EXPLICIT', 'LAB_CERTIFICATE'],
    description: 'Single botanical ingredient without preservatives, artificial fragrance, or filler.',
  },
  baq: {
    slug: 'baq',
    displayName: 'Body Art Quality (BAQ)',
    category: 'GRADE',
    allowedSources: ['ADMIN_EXPLICIT', 'BATCH_SPECIFICATION', 'LAB_CERTIFICATE'],
    description: 'Micro-sifted high-lawsone henna powder suitable for ultra-fine 0.3mm cone pins without clogging.',
  },
  fine: {
    slug: 'fine',
    displayName: 'Fine Sifted',
    category: 'PROCESSING',
    allowedSources: ['ADMIN_EXPLICIT', 'BATCH_SPECIFICATION'],
    description: 'Evenly sifted botanical powder providing smooth blending consistency.',
  },
  'micro-fine': {
    slug: 'micro-fine',
    displayName: 'Micro-Fine Mesh',
    category: 'PROCESSING',
    allowedSources: ['ADMIN_EXPLICIT', 'BATCH_SPECIFICATION'],
    description: 'High-mesh mechanical sifting (>120 mesh) for silky smooth application.',
  },
  'triple-sifted': {
    slug: 'triple-sifted',
    displayName: 'Triple Sifted Process',
    category: 'PROCESSING',
    allowedSources: ['ADMIN_EXPLICIT', 'BATCH_SPECIFICATION'],
    description: 'Verified 3-stage cloth/vibro screening process removing coarse plant fibers.',
  },
  organic: {
    slug: 'organic',
    displayName: 'Certified Organic',
    category: 'CERTIFICATION',
    allowedSources: ['LEGAL_REGISTRATION', 'LAB_CERTIFICATE'],
    requiresReference: true,
    description: 'Grown and processed under recognized organic agricultural standards. Requires valid registration or cert.',
  },
  'lab-tested': {
    slug: 'lab-tested',
    displayName: 'Lab Tested / Heavy Metal Tested',
    category: 'CERTIFICATION',
    allowedSources: ['LAB_CERTIFICATE'],
    requiresReference: true,
    description: 'Verified by an accredited analytical laboratory with Certificate of Analysis (COA) on record.',
  },
  'steam-distilled': {
    slug: 'steam-distilled',
    displayName: 'Steam Distilled',
    category: 'EXTRACTION',
    allowedSources: ['ADMIN_EXPLICIT', 'BATCH_SPECIFICATION'],
    description: 'Extracted via pure alembic steam distillation without synthetic chemical solvents.',
  },
  'cold-pressed': {
    slug: 'cold-pressed',
    displayName: 'Cold Pressed',
    category: 'EXTRACTION',
    allowedSources: ['ADMIN_EXPLICIT', 'BATCH_SPECIFICATION'],
    description: 'Mechanically expeller pressed below 45°C to preserve natural botanical nutrients.',
  },
};

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Deterministically validates Product Intelligence Metadata against contract rules.
 */
export function validateProductIntelligence(meta: ProductIntelligenceMetadata): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Entity validation
  if (!meta.entityKey || !meta.entityKey.trim()) {
    errors.push('Canonical Entity is required.');
  } else if (!CANONICAL_ENTITIES[meta.entityKey]) {
    errors.push(`Canonical Entity "${meta.entityKey}" is not recognized.`);
  }

  // 2. Scope validation
  if (!Array.isArray(meta.scopes) || meta.scopes.length === 0) {
    errors.push('At least one Product Scope must be selected.');
  } else {
    for (const scope of meta.scopes) {
      if (!ALLOWED_SCOPES.includes(scope)) {
        errors.push(`Invalid product scope: "${scope}". Allowed scopes: ${ALLOWED_SCOPES.join(', ')}`);
      }
    }
  }

  // 3. Needs Review State Check
  if (meta.entityKey === 'UNKNOWN' && meta.status !== 'NEEDS_REVIEW') {
    warnings.push('Products with UNKNOWN entity should be set to "NEEDS_REVIEW" governance state.');
  }

  // 4. Verified Attributes Validation
  const seenSlugs = new Set<string>();
  for (const attr of meta.verifiedAttributes || []) {
    if (seenSlugs.has(attr.slug)) {
      errors.push(`Duplicate verified attribute: "${attr.slug}".`);
      continue;
    }
    seenSlugs.add(attr.slug);

    const spec = VERIFIED_ATTRIBUTE_SPECS[attr.slug];
    if (!spec) {
      errors.push(`Unsupported attribute slug: "${attr.slug}".`);
      continue;
    }

    if (!attr.verificationSource) {
      errors.push(`Attribute "${spec.displayName}" requires an explicit verification source.`);
      continue;
    }

    if (!spec.allowedSources.includes(attr.verificationSource)) {
      errors.push(
        `Attribute "${spec.displayName}" cannot be verified via "${attr.verificationSource}". Allowed sources: ${spec.allowedSources.join(', ')}.`
      );
    }

    if (attr.slug === 'organic' && attr.verificationSource !== 'LEGAL_REGISTRATION' && attr.verificationSource !== 'LAB_CERTIFICATE') {
      errors.push('Organic attribute strictly requires LEGAL_REGISTRATION or LAB_CERTIFICATE.');
    }

    if (attr.slug === 'lab-tested' && attr.verificationSource !== 'LAB_CERTIFICATE') {
      errors.push('Lab-Tested attribute strictly requires LAB_CERTIFICATE verification.');
    }

    if (spec.requiresReference && !attr.verificationRef?.trim()) {
      warnings.push(`Attribute "${spec.displayName}" recommends providing a verification document reference or license number.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Derives safe temporary defaults in application memory for products without intelligence metadata.
 * NEVER auto-asserts any verified attributes (verifiedAttributes starts as empty array).
 */
export function deriveSafeIntelligenceDefaults(product: {
  name?: string;
  categoryName?: string;
}): ProductIntelligenceMetadata {
  const resolved = resolveCanonicalEntity({
    name: product.name,
    categoryName: product.categoryName,
  });

  if (resolved.entityKey === 'UNKNOWN' || resolved.confidence === 'NEEDS_REVIEW') {
    return {
      status: 'NEEDS_REVIEW',
      entityKey: 'UNKNOWN',
      family: 'UNKNOWN',
      scopes: ['HERBAL'],
      verifiedAttributes: [],
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    status: 'AUTO',
    entityKey: resolved.entityKey,
    family: resolved.entityRecord.productFamily,
    scopes: [...resolved.effectiveScopes],
    verifiedAttributes: [],
    updatedAt: new Date().toISOString(),
  };
}

