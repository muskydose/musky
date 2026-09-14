import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { MediaEntityType, MediaAssetRole, MediaAsset, saveMediaAsset } from '@/lib/db/media';
import { getProductByIdOrSlug, getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getKnowledgeById, getKnowledgeByKey, getAllKnowledgeEntitiesAdmin } from '@/lib/db/knowledge';
import { getSupabaseAdmin } from '@/lib/supabase';

// ============================================================================
// 1. CONTRACTS & INTERFACES
// ============================================================================

export type VisualVariant =
  | 'packshot'
  | 'infographic'
  | 'illustration'
  | 'collection'
  | 'lifestyle'
  | 'ingredient'
  | 'usage'
  | 'social';

export interface VisualGenerationRequest {
  entityType: MediaEntityType;
  entityId: string;
  role?: MediaAssetRole;
  variant?: VisualVariant;
  promptOverride?: string;
}

export interface GeneratedVisualResult {
  buffer: Buffer;
  mimeType: string;
  width: number;
  height: number;
  aspectRatio: string;
  fileName: string;
  promptUsed: string;
  modelName: string;
  provider: string;
}

export interface VisualProvider {
  name: string;
  isAvailable(): Promise<boolean> | boolean;
  generateImage(
    prompt: string,
    options?: { aspectRatio?: string; width?: number; height?: number }
  ): Promise<GeneratedVisualResult>;
}

// ============================================================================
// 2. PROVIDER ABSTRACTION — GOOGLE GEMINI IMAGEN PROVIDER
// ============================================================================

export class GeminiImagenProvider implements VisualProvider {
  public name = 'Google Gemini Imagen';

  public isAvailable(): boolean {
    const key = process.env.GEMINI_API_KEY?.trim();
    return Boolean(key && key.length > 5);
  }

  public async generateImage(
    prompt: string,
    options?: { aspectRatio?: string; width?: number; height?: number }
  ): Promise<GeneratedVisualResult> {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        'Gemini Image Generation is unavailable: GEMINI_API_KEY environment variable is not configured.'
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const aspectRatio = options?.aspectRatio || '1:1';

    try {
      // Use Gemini Imagen 3 model via @google/genai SDK
      // Valid Imagen aspect ratios: "1:1", "3:4", "4:3", "9:16", "16:9"
      const response = await (ai.models as any).generateImages({
        model: 'imagen-3.0-generate-002',
        prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio,
        },
      });

      const generatedImages = response?.generatedImages;
      if (!generatedImages || generatedImages.length === 0) {
        throw new Error('Gemini API returned an empty image generation response.');
      }

      const firstImage = generatedImages[0];
      const imageBytesBase64 = firstImage.image?.imageBytes;
      if (!imageBytesBase64) {
        throw new Error('Gemini API returned no image byte payload.');
      }

      const buffer = Buffer.from(imageBytesBase64, 'base64');
      const width = options?.width || (aspectRatio === '16:9' ? 1280 : 1024);
      const height = options?.height || (aspectRatio === '16:9' ? 720 : 1024);

      return {
        buffer,
        mimeType: 'image/jpeg',
        width,
        height,
        aspectRatio,
        fileName: `gemini-imagen-${Date.now()}.jpg`,
        promptUsed: prompt,
        modelName: 'imagen-3.0-generate-002',
        provider: this.name,
      };
    } catch (err: any) {
      throw new Error(
        `Gemini Imagen API generation failed: ${err?.message || 'Unknown provider error'}`
      );
    }
  }
}

// ============================================================================
// 3. PROVIDER REGISTRY
// ============================================================================

let activeProvider: VisualProvider = new GeminiImagenProvider();

export function setVisualProvider(provider: VisualProvider): void {
  activeProvider = provider;
}

export function getActiveVisualProvider(): VisualProvider {
  return activeProvider;
}

// ============================================================================
// 4. ENTITY FACT RESOLVER & ANTI-HALLUCINATION PROMPT BUILDER
// ============================================================================

export interface EntityCanonicalContext {
  entityType: MediaEntityType;
  entityId: string;
  name: string;
  botanicalName?: string;
  category?: string;
  ingredients: string[];
  productType?: string;
  formFactor: string; // e.g., 'triple-sifted leaf powder', 'ready-to-use mehendi cone', 'pure floral hydrosol'
  description?: string;
}

/**
 * Resolves authoritative facts from DB for an entity so AI never invents claims.
 */
export async function resolveEntityCanonicalFacts(
  entityType: MediaEntityType,
  entityId: string
): Promise<EntityCanonicalContext> {
  const cleanId = entityId.trim();

  if (entityType === 'PRODUCT') {
    const product = await getProductByIdOrSlug(cleanId);
    if (product) {
      const isHenna = /henna|mehendi|mehndi/i.test(product.name);
      const isAmla = /amla|gooseberry/i.test(product.name);
      const isIndigo = /indigo/i.test(product.name);
      const isCone = /cone/i.test(product.name);
      const isHydrosol = /rose|water|hydrosol|gulab/i.test(product.name);
      const isOil = /oil/i.test(product.name);

      let formFactor = 'triple-sifted botanical powder in eco craft pouch';
      if (isCone) formFactor = 'ready-to-use smooth bridal mehendi cone with precision applicator tip';
      else if (isHydrosol) formFactor = 'steam-distilled floral mist in amber spray bottle';
      else if (isOil) formFactor = 'cold-pressed herbal hair oil in dark glass dropper bottle';

      let botanicalName = '';
      if (isHenna) botanicalName = 'Lawsonia Inermis (Rajasthani Sojat Henna)';
      else if (isAmla) botanicalName = 'Phyllanthus Emblica (Indian Gooseberry)';
      else if (isIndigo) botanicalName = 'Indigofera Tinctoria (Natural Indigo Leaf)';
      else if (isHydrosol) botanicalName = 'Rosa Damascena (Pure Country Rose)';

      return {
        entityType,
        entityId: product.id,
        name: product.name,
        botanicalName,
        category: product.categoryName || product.categoryId,
        ingredients: product.ingredients || (botanicalName ? [botanicalName] : []),
        productType: product.productType,
        formFactor,
        description: product.shortDescription || product.fullDescription,
      };
    }
  }

  if (entityType === 'CATEGORY') {
    const categories = await getCategories();
    const cat = categories.find((c) => c.id === cleanId || c.slug === cleanId);
    if (cat) {
      return {
        entityType,
        entityId: cat.id,
        name: cat.name,
        formFactor: 'curated premium Rajasthani botanical collection',
        ingredients: [],
        description: cat.description,
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
        formFactor: 'step-by-step instructional botanical guide',
        ingredients: guide.ingredients || [],
        description: guide.shortIntro || guide.overview,
      };
    }
  }

  if (entityType === 'KNOWLEDGE') {
    const knowledge = (await getKnowledgeById(cleanId)) || (await getKnowledgeByKey(cleanId));
    if (knowledge) {
      return {
        entityType,
        entityId: knowledge.id,
        name: knowledge.canonicalName,
        botanicalName: knowledge.scientificName,
        formFactor: 'educational botanical illustration & field monograph',
        ingredients: [knowledge.canonicalName],
        description: knowledge.description,
      };
    }
  }

  // Fallback generic context for BRAND / MARKETING
  return {
    entityType,
    entityId: cleanId,
    name: cleanId,
    formFactor: 'authentic Ayurvedic botanical presentation',
    ingredients: [],
    description: 'Musky Dose — Premium Sojat Botanicals & Organic Mehendi',
  };
}

/**
 * Builds an authentic, grounded prompt without hallucinated claims.
 */
export function buildVisualPrompt(
  context: EntityCanonicalContext,
  variant: VisualVariant = 'packshot',
  customOverride?: string
): string {
  if (customOverride && customOverride.trim().length > 10) {
    return customOverride.trim();
  }

  const baseStyle =
    'Professional commercial studio product photography for luxury Ayurvedic wellness brand "Musky Dose" in Sojat, Rajasthan. Elegant earthy color palette of deep forest green (#0f2d22), soft warm gold (#c5a059), terracotta, and natural linen. Soft natural diffused lighting, crisp focus, clean composition, zero artificial neon hues.';

  switch (variant) {
    case 'packshot':
      return `${baseStyle} Centered clean packshot of ${context.name}. The product is presented as ${context.formFactor}. Elegant minimal packaging label featuring subtle botanical line-art with the name "${context.name}". Resting on a polished organic sandstone or warm teakwood surface, shallow depth of field, pure commercial catalog quality.`;

    case 'lifestyle':
      return `${baseStyle} Warm atmospheric lifestyle setting for ${context.name}. Placed on a sunlit Rajasthani courtyard table with traditional brass accents, hand-woven textile, soft morning sunlight casting gentle shadows. Organic, grounded, peaceful Ayurvedic ritual setting.`;

    case 'ingredient':
      return `${baseStyle} Raw botanical ingredient still life for ${context.name} (${context.botanicalName || context.name}). Displayed alongside natural raw sun-dried botanical elements in an antique stone or brass mortar. Fresh organic textures, authentic Sojat farm harvest atmosphere, macro botanical detail.`;

    case 'usage':
      return `${baseStyle} Elegant authentic demonstration of applying or preparing ${context.name}. Gentle hands preparing the smooth natural paste or fine mist, surrounded by raw organic botanical elements. Calm, educational, authentic Ayurvedic self-care ritual.`;

    case 'infographic':
      return `${baseStyle} Clean editorial educational composition for ${context.name}. Visual breakdown of pure botanical layers: pure leaves, traditional stone milling, fine silk-cloth sifting, and final pure product. Informative, elegant, museum-grade aesthetic.`;

    case 'illustration':
      return `Botanical scientific monograph illustration of ${context.name} (${context.botanicalName || 'Ayurvedic botanical'}). Vintage naturalist watercolor and fine ink style on textured cream parchment. Detailed botanical anatomy of leaves, flowers, and seeds with elegant calligraphy. Brand palette of dark green and antique gold.`;

    case 'collection':
      return `${baseStyle} Harmonious collection display for category "${context.name}". Multiple complementary botanical items neatly arranged on a rustic marble and wood surface. Subtle warm sunlight, premium boutique shelf display.`;

    case 'social':
    default:
      return `${baseStyle} Hero social media editorial visual showcasing ${context.name}. Striking visual composition, beautiful negative space for text overlay, premium luxury aesthetic celebrating Sojat Rajasthan agricultural craftsmanship.`;
  }
}

// ============================================================================
// 5. ENGINE EXECUTION — ASYNC & ADMIN TRIGGERED ONLY
// ============================================================================

export async function generateAndSaveVisualForEntity(
  request: VisualGenerationRequest
): Promise<{
  asset: MediaAsset;
  promptUsed: string;
  provider: string;
}> {
  const provider = getActiveVisualProvider();

  // 1. Verify provider availability (fail-closed, never invent placeholder)
  const isAvail = await provider.isAvailable();
  if (!isAvail) {
    throw new Error(
      `Visual Engine Provider "${provider.name}" is unconfigured or unavailable. Set the required API credentials to generate AI visuals.`
    );
  }

  // 2. Resolve canonical facts to ground prompt
  const facts = await resolveEntityCanonicalFacts(request.entityType, request.entityId);
  const variant = request.variant || 'packshot';
  const prompt = buildVisualPrompt(facts, variant, request.promptOverride);

  // 3. Generate visual via provider
  const result = await provider.generateImage(prompt, {
    aspectRatio: request.role === 'HERO' ? '16:9' : '1:1',
  });

  // 4. Compute SHA-256 binary hash for deduplication
  const fileHash = crypto.createHash('sha256').update(result.buffer).digest('hex');

  // 5. Storage Upload
  let publicUrl = '';
  let storagePath = `ai-generated/${request.entityType.toLowerCase()}/${request.entityId}/${Date.now()}-${variant}.jpg`;
  const bucketName = 'product-images';

  const supabaseAdmin = getSupabaseAdmin();
  if (supabaseAdmin) {
    try {
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, result.buffer, {
          contentType: result.mimeType,
          upsert: true,
        });

      if (!uploadError && uploadData) {
        const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath);
        publicUrl = urlData.publicUrl;
      }
    } catch (storageErr) {
      console.warn('Storage upload exception in Visual Engine:', storageErr);
    }
  }

  // Fallback data URL if storage is unconfigured (allows offline testing/dev)
  if (!publicUrl) {
    publicUrl = `data:${result.mimeType};base64,${result.buffer.toString('base64')}`;
  }

  // 6. Save through canonical Media DAL
  // CRITICAL GOVERNANCE RULES:
  // - source = 'AI_GENERATED'
  // - status = 'suggested' (NEVER auto-approved, NEVER auto-published!)
  // - isLocked = false
  // - anti-hallucination locking guard in saveMediaAsset() prevents overwriting locked manual primary
  const role = request.role || 'GALLERY';
  const { asset } = await saveMediaAsset({
    entityType: request.entityType,
    entityId: request.entityId,
    url: publicUrl,
    storageBucket: bucketName,
    storagePath,
    fileHash,
    fileName: `${request.entityType.toLowerCase()}-${request.entityId}-${variant}.jpg`,
    mimeType: result.mimeType,
    fileSizeBytes: result.buffer.length,
    width: result.width,
    height: result.height,
    aspectRatio: result.aspectRatio,
    role,
    source: 'AI_GENERATED',
    status: 'suggested', // STRICTLY SUGGESTED!
    isLocked: false,
    title: `AI Generated ${variant.toUpperCase()} — ${facts.name}`,
    altText: `AI suggested ${variant} visual for ${facts.name}`,
    caption: `Generated with ${result.modelName}`,
    visualContext: {
      variant,
      facts,
      formFactor: facts.formFactor,
    },
    aiMetadata: {
      provider: result.provider,
      model: result.modelName,
      promptUsed: result.promptUsed,
      generatedAt: new Date().toISOString(),
      variant,
    },
    sortOrder: 150,
  });

  return {
    asset,
    promptUsed: result.promptUsed,
    provider: result.provider,
  };
}
