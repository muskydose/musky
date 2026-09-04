import { ProductVariant } from '@/lib/types';

/**
 * ============================================================================
 * UNIVERSAL PRODUCT INTELLIGENCE CONTRACT V1.1
 * Project: Musky Dose (https://muskydose.in)
 * Phase 1: Clean Architecture Types & Interfaces
 * 
 * CORE PRINCIPLES:
 * 1. Admin Commercial Name != SEO Title != Canonical Entity.
 * 2. Never silently rewrite admin product names.
 * 3. Verified attributes require explicit verification source (no inferred claims).
 * 4. Unknown products default to intelligenceStatus = 'NEEDS_REVIEW',
 *    preserve admin name, have zero unverified claims, and use minimal safe taxonomy.
 * 5. Henna/Mehndi entity is unified under HENNA_MEHNDI with spelling aliases,
 *    without hardcoded "Triple Shifted" or Henna-only assumptions.
 * ============================================================================
 */

export type IntelligenceStatus = 'AUTO' | 'MANUAL' | 'LOCKED' | 'NEEDS_REVIEW';

export type ProductFamily =
  | 'BOTANICAL_SINGLE'
  | 'HERBAL_BLEND'
  | 'DISTILLATE_HYDROSOL'
  | 'ESSENTIAL_OIL'
  | 'CARRIER_OIL'
  | 'COSMETIC_BASE'
  | 'ACCESSORY_SUPPLY'
  | 'UNKNOWN';

export type ProductPhysicalForm =
  | 'POWDER'
  | 'LIQUID'
  | 'OIL'
  | 'LEAVES'
  | 'PASTE'
  | 'SOLID'
  | 'CONE'
  | 'ACCESSORY';

export type ProductScope =
  | 'HAIR'
  | 'SKIN'
  | 'BODY_ART'
  | 'COSMETIC_FORMULATION'
  | 'AROMATHERAPY'
  | 'HERBAL';

export type AudienceType =
  | 'HOME_CONSUMER'
  | 'MEHNDI_ARTIST'
  | 'SALON_PROFESSIONAL'
  | 'HERBAL_RESELLER'
  | 'COSMETIC_MANUFACTURER'
  | 'BULK_EXPORTER'
  | 'AYURVEDIC_PRACTITIONER'
  | 'GENERAL_BUYER';

export type AttributeVerificationSource =
  | 'ADMIN_EXPLICIT'     // Admin explicitly checked/confirmed the attribute in Admin UI
  | 'LAB_CERTIFICATE'     // Backed by a verified Certificate of Analysis (COA) / Lab test document
  | 'BATCH_SPECIFICATION' // Stored in confirmed batch production/milling record
  | 'LEGAL_REGISTRATION'; // Licensed certification (e.g. Ayush license, Organic NPOP)

export type VerifiedAttributeSlug =
  | 'pure'
  | 'baq'
  | 'fine'
  | 'micro-fine'
  | 'triple-sifted'
  | 'organic'
  | 'lab-tested'
  | 'steam-distilled'
  | 'cold-pressed'
  | (string & {});

export interface VerifiedAttribute {
  id: string;
  slug: VerifiedAttributeSlug;
  displayName: string;
  category: 'PURITY' | 'PROCESSING' | 'GRADE' | 'CERTIFICATION' | 'EXTRACTION';
  verificationSource: AttributeVerificationSource;
  verificationRef?: string;
  verifiedAt: string;
  verifiedBy?: string;
  allowInSeoTitle: boolean;
}

export interface ProductOrigin {
  region: string; // e.g. "Sojat", "Pali", "Marwar"
  state: string;  // e.g. "Rajasthan"
  country: string; // e.g. "India"
  isGeographicIndicator?: boolean;
  verificationSource: AttributeVerificationSource;
}

export interface ContractIngredient {
  name: string;
  botanicalName?: string;
  percentage?: number;
  origin?: string;
  isKeyActive: boolean;
}

export interface WholesaleContractProfile {
  isEligible: boolean;
  wholesaleUnit: 'kg' | 'Litre' | 'Box' | 'Piece' | 'Bag';
  minimumOrderQuantity: number;
  standardTiers: number[];
  requiresQuote: boolean;
}

export interface ProductSeoContract {
  primaryKeyword: string;
  secondaryKeywords: string[];
  longTailKeywords: string[];
  seoTitle: string;
  metaDescription: string;
  canonicalSlug: string;
  robotsIndex: boolean;
  robotsFollow: boolean;
  structuredDataType: 'Product';
}

export interface ProductFaqContract {
  universalFaqs: Array<{
    question: string;
    answer: string;
    category: 'INGREDIENTS' | 'USAGE' | 'STORAGE' | 'PACKAGING' | 'COMMERCE' | 'SAFETY';
  }>;
  entityFaqs: Array<{
    question: string;
    answer: string;
    category: string;
  }>;
  adminCustomFaqs: Array<{
    question: string;
    answer: string;
  }>;
}

export interface ProductGuideContract {
  suggestedGuideSlugs: string[];
  topicClusters: string[];
  primaryGuideType: 'HOW_TO' | 'PURITY_SOURCING' | 'FORMULATION' | 'BUYING_GUIDE' | 'GENERAL';
}

export interface AudienceResolutionContract {
  commercialIntent: 'RETAIL_PERSONAL' | 'BULK_COMMERCIAL';
  verifiedAudiences: AudienceType[];
  resolutionSignal: 'ADMIN_SELECTION' | 'B2B_LEAD_PROFILE' | 'AUTHENTICATED_BUYER' | 'DEFAULT_SAFE';
}

export interface UnknownProductHandling {
  fallbackEntity: 'UNKNOWN_BOTANICAL';
  intelligenceStatus: 'NEEDS_REVIEW';
  titleGenerationPolicy: 'PRESERVE_ADMIN_NAME_STRICT';
  attributePolicy: 'ZERO_UNVERIFIED_CLAIMS';
  taxonomyPolicy: 'MINIMAL_SAFE_BASE';
}

export interface UniversalProductContract {
  // 1. Core Source-of-Truth Identity
  id: string;
  adminName: string; // Sacred commercial display name (never overwritten)
  slug: string;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  intelligenceStatus: IntelligenceStatus;

  // 2. Taxonomy & Entity Grounding
  family: ProductFamily;
  entityKey: string; // Canonical entity identifier, e.g. "HENNA_MEHNDI"
  aliases: string[];
  scientificIdentity?: {
    genusSpecies: string;
    family: string;
    commonNames: {
      hindi: string[];
      english: string[];
      ayurvedic?: string[];
    };
  };

  // 3. Physical Formulation & Form
  form: ProductPhysicalForm;
  primaryUnit: 'g' | 'kg' | 'ml' | 'L' | 'pcs';
  ingredients: ContractIngredient[];

  // 4. Quality, Provenance & Verified Claims
  origin: ProductOrigin;
  verifiedAttributes: VerifiedAttribute[];

  // 5. Commercial Application & Audience
  scopes: ProductScope[];
  targetUseCases: string[];
  targetAudiences: AudienceType[];

  // 6. Commerce & Fulfillment
  retailVariants: ProductVariant[];
  wholesaleProfile: WholesaleContractProfile;

  // 7. Intelligence Ecosystem Connections
  seoConfig: ProductSeoContract;
  faqConfig: ProductFaqContract;
  guideMappings: ProductGuideContract;
  unknownHandling?: UnknownProductHandling;
}

/**
 * Standard Canonical Entity Key for unified Henna / Mehndi
 * Covers all spelling variants without duplicate entities.
 */
export const CANONICAL_HENNA_ENTITY = {
  key: 'HENNA_MEHNDI',
  genusSpecies: 'Lawsonia inermis',
  family: 'Lythraceae',
  aliases: [
    'henna',
    'mehndi',
    'mehendi',
    'mehandi',
    'heena',
    'hina',
    'lawsonia inermis',
    'madayantika',
  ],
} as const;

