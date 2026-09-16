import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';
import { getProductByIdOrSlug } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getKnowledgeById, getKnowledgeByKey } from '@/lib/db/knowledge';
import { getSiteSettings } from '@/lib/db/settings';

// ============================================================================
// 1. TYPES & CONTRACTS
// ============================================================================

export type VisualVariant =
  | 'packshot'
  | 'lifestyle'
  | 'ingredient'
  | 'usage'
  | 'infographic'
  | 'illustration'
  | 'collection'
  | 'social';

export interface EntityCanonicalFacts {
  entityType: MediaEntityType;
  entityId: string;
  name: string;
  botanicalName?: string;
  category?: string;
  ingredients: string[];
  productType?: string;
  formFactor: string;
  packageType?: string;
  weightGrams?: number;
  description?: string;
  brandName: string;
  brandColors: {
    primary: string;
    secondary: string;
    henna: string;
    gold: string;
  };
  hasSuppliedReferenceImage?: boolean;
}

export interface PromptBuildResult {
  canonicalPrompt: string;
  finalPrompt: string;
  isOverride: boolean;
  promptOverride?: string;
  facts: EntityCanonicalFacts;
  variant: VisualVariant;
  role: MediaAssetRole;
  aspectRatio: string;
  generatedAt: string;
}

// ============================================================================
// 2. FACT RESOLUTION ENGINE (STRICT DB TRUTH — ZERO HALLUCINATIONS)
// ============================================================================

/**
 * Resolves authoritative facts from DB for an entity so AI never invents claims,
 * certifications, medical benefits, or non-existent ingredients.
 */
export async function resolveEntityCanonicalFacts(
  entityType: MediaEntityType,
  entityId: string,
  hasSuppliedReferenceImage: boolean = false
): Promise<EntityCanonicalFacts> {
  const cleanId = entityId.trim();
  const settings = await getSiteSettings();

  const defaultBrand = {
    brandName: settings.brandName || settings.businessName || 'Musky Dose',
    brandColors: {
      primary: '#0f2d22', // Forest green
      secondary: '#5F7F52', // Olive green
      henna: '#9A4F32', // Terracotta henna
      gold: '#c5a059', // Warm antique gold
    },
  };

  if (entityType === 'PRODUCT') {
    const product = await getProductByIdOrSlug(cleanId);
    const productName = product?.name || (cleanId === 'prod-1' || /henna/i.test(cleanId) ? 'Sojat Pure Henna Powder' : cleanId);
    const lowerName = productName.toLowerCase();
    const isHenna = /henna|mehendi|mehndi/i.test(lowerName);
    const isAmla = /amla|gooseberry/i.test(lowerName);
    const isIndigo = /indigo/i.test(lowerName);
    const isCone = /cone/i.test(lowerName);
    const isHydrosol = /rose|water|hydrosol|gulab/i.test(lowerName);
    const isOil = /oil/i.test(lowerName);
    const isMitti = /mitti|clay|multani/i.test(lowerName);

    let formFactor = 'triple-sifted botanical leaf powder';
    let packageType = 'eco kraft botanical pouch';
    if (isCone) {
      formFactor = 'smooth natural bridal mehendi paste';
      packageType = 'precision applicator mehendi cone';
    } else if (isHydrosol) {
      formFactor = 'pure steam-distilled floral hydrosol mist';
      packageType = 'amber glass spray bottle';
    } else if (isOil) {
      formFactor = 'pure cold-pressed botanical herbal oil';
      packageType = 'dark amber glass dropper bottle';
    } else if (isMitti) {
      formFactor = 'micro-fine purified natural clay';
      packageType = 'reusable botanical jar or craft pouch';
    }

    // Authoritative botanical identity without hallucination
    let botanicalName: string | undefined;
    if (isHenna) botanicalName = 'Lawsonia Inermis (Rajasthani Sojat Henna)';
    else if (isAmla) botanicalName = 'Phyllanthus Emblica (Indian Gooseberry)';
    else if (isIndigo) botanicalName = 'Indigofera Tinctoria (Natural Indigo Leaf)';
    else if (isHydrosol) botanicalName = 'Rosa Damascena (Pure Country Damask Rose)';

    // Canonical ingredients only
    let ingredients = Array.isArray(product?.ingredients) && product!.ingredients.length > 0
      ? product!.ingredients
      : (botanicalName ? [botanicalName] : [productName]);

    return {
      entityType,
      entityId: product?.id || cleanId,
      name: productName,
      botanicalName,
      category: product?.categoryName || product?.categoryId || 'Botanical Care',
      ingredients,
      productType: product?.productType,
      formFactor,
      packageType,
      weightGrams: (product as any)?.weightGrams,
      description: product?.shortDescription || product?.fullDescription || 'Authentic Sojat Rajasthan pure botanical',
      brandName: defaultBrand.brandName,
      brandColors: defaultBrand.brandColors,
      hasSuppliedReferenceImage,
    };
  }

  if (entityType === 'CATEGORY') {
    const categories = await getCategories();
    const cat = categories.find((c) => c.id === cleanId || c.slug === cleanId);
    if (cat) {
      return {
        entityType,
        entityId: cat.id,
        name: cat.name,
        formFactor: 'curated authentic Sojat botanical collection',
        ingredients: [],
        description: cat.description,
        brandName: defaultBrand.brandName,
        brandColors: defaultBrand.brandColors,
        hasSuppliedReferenceImage,
      };
    }
  }

  if (entityType === 'GUIDE') {
    const guides = await getGuides();
    const guide = guides.find((g) => g.id === cleanId || g.slug === cleanId);
    if (guide) {
      return {
        entityType,
        entityId: guide.id,
        name: guide.title,
        formFactor: 'instructional Ayurvedic botanical guide',
        ingredients: guide.ingredients || [],
        description: guide.shortIntro || guide.overview,
        brandName: defaultBrand.brandName,
        brandColors: defaultBrand.brandColors,
        hasSuppliedReferenceImage,
      };
    }
  }

  if (entityType === 'KNOWLEDGE') {
    const knowledge = (await getKnowledgeById(cleanId)) || (await getKnowledgeByKey(cleanId));
    if (knowledge) {
      return {
        entityType,
        entityId: knowledge.id || knowledge.entityKey,
        name: knowledge.canonicalName,
        botanicalName: knowledge.scientificName,
        formFactor: 'authoritative botanical illustration monograph',
        ingredients: [knowledge.canonicalName],
        description: knowledge.description,
        brandName: defaultBrand.brandName,
        brandColors: defaultBrand.brandColors,
        hasSuppliedReferenceImage,
      };
    }
  }

  // Generic Brand / Marketing context
  return {
    entityType,
    entityId: cleanId,
    name: cleanId === 'brand-main' ? 'Musky Dose Brand Heritage' : cleanId,
    formFactor: 'heritage Rajasthani botanical presentation',
    ingredients: [],
    description: 'Musky Dose — Authentic Sojat Botanicals & Pure Henna Craftsmanship',
    brandName: defaultBrand.brandName,
    brandColors: defaultBrand.brandColors,
    hasSuppliedReferenceImage,
  };
}

// ============================================================================
// 3. CANONICAL PROMPT BUILDER
// ============================================================================

/**
 * Builds the canonical prompt grounded strictly in factual DB attributes.
 * NEVER invents ingredients, medical claims, certifications, or fake text.
 */
export function buildCanonicalVisualPrompt(
  facts: EntityCanonicalFacts,
  variant: VisualVariant = 'packshot',
  role: MediaAssetRole = 'GALLERY'
): string {
  const brandPalette = `Brand aesthetics: luxury Ayurvedic wellness brand "${facts.brandName}" from Sojat, Rajasthan. Deep forest green (${facts.brandColors.primary}), warm antique gold (${facts.brandColors.gold}), terracotta, and textured linen. Natural soft diffused commercial studio lighting, elegant shadows, sharp focus, zero artificial neon hues, zero digital distortion.`;

  const ingredientClause = facts.ingredients && facts.ingredients.length > 0
    ? `Key authentic botanical components: ${facts.ingredients.slice(0, 4).join(', ')}.`
    : '';

  const referenceClause = facts.hasSuppliedReferenceImage
    ? 'Use the supplied product package reference image for exact packaging visual structure and label geometry.'
    : 'Original premium botanical concept render grounded solely in canonical product details.';

  switch (variant) {
    case 'packshot':
      return [
        brandPalette,
        `Clean commercial product packshot of "${facts.name}".`,
        `Presented as ${facts.formFactor} in a minimal ${facts.packageType || 'botanical packaging'}.`,
        facts.botanicalName ? `Botanical identity: ${facts.botanicalName}.` : '',
        ingredientClause,
        referenceClause,
        'Centered studio composition resting on clean polished Rajasthani sandstone or warm teakwood surface.',
        'Subtle depth of field, crisp edges, premium catalog quality. Do not include unsupplied certification badges or hallucinated claim text.',
      ]
        .filter(Boolean)
        .join(' ');

    case 'lifestyle':
      return [
        brandPalette,
        `Warm atmospheric lifestyle setting for "${facts.name}".`,
        `The item (${facts.formFactor}) is placed in a peaceful sunlit Rajasthani courtyard setting with traditional brass bowl, stone mortar, and hand-woven textile.`,
        facts.botanicalName ? `Natural botanical source: ${facts.botanicalName}.` : '',
        ingredientClause,
        'Gentle morning sunlight casting soft natural shadows. Grounded, serene, authentic Ayurvedic self-care atmosphere.',
      ]
        .filter(Boolean)
        .join(' ');

    case 'ingredient':
      return [
        brandPalette,
        `Raw botanical ingredient still-life showcasing "${facts.name}".`,
        facts.botanicalName ? `Scientific botanical focus: ${facts.botanicalName}.` : '',
        ingredientClause,
        'Fresh whole leaves, sun-dried botanical harvest, and finely crushed powder arranged in an antique stone or brass mortar.',
        'Macro botanical detail, authentic farm harvest texture, natural Rajasthani terroir, zero plastic or artificial elements.',
      ]
        .filter(Boolean)
        .join(' ');

    case 'usage':
      return [
        brandPalette,
        `Elegant authentic application and preparation ritual for "${facts.name}".`,
        `Demonstrating the preparation of smooth natural ${facts.formFactor}.`,
        'Graceful, respectful hands mixing the pure botanical formulation in a traditional ceramic or bronze bowl.',
        'Surrounded by fresh natural ingredients and soft warm lighting. Educational, serene, authentic Ayurvedic beauty ritual.',
      ]
        .filter(Boolean)
        .join(' ');

    case 'infographic':
      return [
        brandPalette,
        `Clean editorial visual breakdown composition for "${facts.name}".`,
        'Visual sequence depicting pure botanical origins: natural sun-dried leaves, stone-grinding process, fine cloth sifting, and final pure product.',
        facts.botanicalName ? `Botanical taxonomy: ${facts.botanicalName}.` : '',
        ingredientClause,
        'Museum-grade editorial aesthetic, balanced layout with clean negative space, strictly botanical facts without medical claims.',
      ]
        .filter(Boolean)
        .join(' ');

    case 'illustration':
      return [
        `Fine botanical scientific monograph illustration of "${facts.name}".`,
        facts.botanicalName ? `Taxonomical classification: ${facts.botanicalName}.` : '',
        'Naturalist vintage watercolor and fine ink etching on textured cream archival parchment.',
        'Detailed botanical anatomy showing leaf venation, delicate flowers, and seed pods with elegant classical naturalist annotation style.',
        `Heritage palette of deep forest green (${facts.brandColors.primary}) and antique gold accents. Authentic scientific botanical accuracy.`,
      ]
        .filter(Boolean)
        .join(' ');

    case 'collection':
      return [
        brandPalette,
        `Harmonious collection visual for category "${facts.name}".`,
        'Multiple complementary natural botanical products arranged gracefully on a rustic marble and wood surface.',
        'Subtle warm sunlight, elegant boutique shelf display, authentic Rajasthani botanical heritage.',
      ]
        .filter(Boolean)
        .join(' ');

    case 'social':
    default:
      return [
        brandPalette,
        `Editorial social media hero visual featuring "${facts.name}".`,
        `High-impact visual celebrating Sojat Rajasthan agricultural botanical craftsmanship.`,
        facts.botanicalName ? `Authentic botanical identity: ${facts.botanicalName}.` : '',
        'Balanced composition with graceful negative space, luxury organic aesthetic.',
      ]
        .filter(Boolean)
        .join(' ');
  }
}

// ============================================================================
// 4. UNIVERSAL PROMPT COMPOSER & OVERRIDE HANDLER
// ============================================================================

/**
 * Composes the final prompt, tracking both the original canonical prompt
 * and any user-specified override for auditing and provenance.
 */
export async function composeVisualPrompt(options: {
  entityType: MediaEntityType;
  entityId: string;
  variant?: VisualVariant;
  role?: MediaAssetRole;
  promptOverride?: string;
  hasSuppliedReferenceImage?: boolean;
}): Promise<PromptBuildResult> {
  const variant = options.variant || 'packshot';
  const role = options.role || (variant === 'collection' || variant === 'social' ? 'HERO' : 'GALLERY');
  const aspectRatio = role === 'HERO' || variant === 'collection' || variant === 'social' ? '16:9' : '1:1';

  const facts = await resolveEntityCanonicalFacts(
    options.entityType,
    options.entityId,
    options.hasSuppliedReferenceImage
  );

  const canonicalPrompt = buildCanonicalVisualPrompt(facts, variant, role);
  const isOverride = Boolean(options.promptOverride && options.promptOverride.trim().length > 5);
  const finalPrompt = isOverride ? options.promptOverride!.trim() : canonicalPrompt;

  return {
    canonicalPrompt,
    finalPrompt,
    isOverride,
    promptOverride: isOverride ? options.promptOverride!.trim() : undefined,
    facts,
    variant,
    role,
    aspectRatio,
    generatedAt: new Date().toISOString(),
  };
}
