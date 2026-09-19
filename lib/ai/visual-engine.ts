import crypto from 'crypto';
import { GoogleGenAI } from '@google/genai';
import { MediaEntityType, MediaAssetRole, MediaAsset, saveMediaAsset } from '@/lib/db/media';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateImageBinary } from '@/lib/ai/image-integrity';
import sharp from 'sharp';
import {
  VisualVariant,
  EntityCanonicalFacts,
  PromptBuildResult,
  composeVisualPrompt,
  resolveEntityCanonicalFacts,
  buildCanonicalVisualPrompt,
} from '@/lib/growth/visual-prompt-engine';

// Re-export visual variant and context types for consumption across the app
export type { VisualVariant, EntityCanonicalFacts, PromptBuildResult };
export { composeVisualPrompt, resolveEntityCanonicalFacts, buildCanonicalVisualPrompt };

/**
 * Backward-compatible helper for building visual prompts directly from fact dictionaries.
 */
export function buildVisualPrompt(
  facts: any,
  variant: VisualVariant = 'packshot',
  customOverride?: string
): string {
  if (customOverride && customOverride.trim().length > 10) {
    return customOverride.trim();
  }
  const completeFacts: EntityCanonicalFacts = {
    entityType: facts.entityType || 'PRODUCT',
    entityId: facts.entityId || 'test',
    name: facts.name || 'Botanical Care',
    botanicalName: facts.botanicalName,
    category: facts.category,
    ingredients: facts.ingredients || [],
    formFactor: facts.formFactor || 'triple-sifted botanical powder',
    brandName: facts.brandName || 'Musky Dose',
    brandColors: facts.brandColors || {
      primary: '#0f2d22',
      secondary: '#5F7F52',
      henna: '#9A4F32',
      gold: '#c5a059',
    },
  };
  return buildCanonicalVisualPrompt(completeFacts, variant);
}

// ============================================================================
// 1. PROVIDER TIERS & CAPABILITY CONTRACTS
// ============================================================================

export type ProviderTier = 'FREE' | 'LOCAL' | 'PAID' | 'UNAVAILABLE';

export interface ProviderCapability {
  id: string;
  name: string;
  tier: ProviderTier;
  isAvailable: boolean;
  costPerImage: string;
  requiresApiKey: boolean;
  endpointConfigured?: string;
  description: string;
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
  providerId?: string;
  tier?: ProviderTier;
}

export interface VisualProvider {
  id?: string;
  name: string;
  tier?: ProviderTier;
  costPerImage?: string;
  requiresApiKey?: boolean;
  getCapability?(): Promise<ProviderCapability> | ProviderCapability;
  isAvailable(): Promise<boolean> | boolean;
  generateImage(
    prompt: string,
    options?: {
      aspectRatio?: string;
      width?: number;
      height?: number;
      imageBuffer?: Buffer;
      imageMimeType?: string;
      imageFileName?: string;
    }
  ): Promise<GeneratedVisualResult>;
}

// ============================================================================
// 2. PROVIDER IMPLEMENTATIONS
// ============================================================================

/**
 * PROVIDER 1: Free AI Studio / Manual Import (Tier: FREE, ₹0)
 * Allows admins to use our grounded prompt generator with any free AI generator
 * (ChatGPT Free, Bing Image Creator, HuggingFace, Fooocus, etc.) and import
 * directly with zero mandatory API costs. Always available out of the box.
 */
export class ManualAiStudioProvider implements VisualProvider {
  public id = 'manual-studio';
  public name = 'Free AI Studio / Manual Import';
  public tier: ProviderTier = 'FREE';
  public costPerImage = '₹0 (Completely Free)';
  public requiresApiKey = false;

  public getCapability(): ProviderCapability {
    return {
      id: this.id,
      name: this.name,
      tier: this.tier,
      isAvailable: true,
      costPerImage: this.costPerImage,
      requiresApiKey: this.requiresApiKey,
      description:
        'Zero-cost visual creation. Use the grounded factual prompt generator with any external free AI tool, then import the resulting image directly into the canonical media system.',
    };
  }

  public isAvailable(): boolean {
    return true;
  }

  public async generateImage(
    prompt: string,
    options?: {
      aspectRatio?: string;
      width?: number;
      height?: number;
      imageBuffer?: Buffer;
      imageMimeType?: string;
      imageFileName?: string;
    }
  ): Promise<GeneratedVisualResult> {
    if (!options?.imageBuffer || options.imageBuffer.length === 0) {
      throw new Error(
        'Free AI Studio is a prompt-first manual workflow: copy the grounded prompt to generate in your preferred free tool (ChatGPT, Bing, Fooocus, etc.), then drop the resulting image here to import.'
      );
    }

    const validation = validateImageBinary(options.imageBuffer);
    if (!validation.isValid) {
      throw new Error(`Imported file failed binary image validation: ${validation.error}`);
    }

    const mimeType = validation.mimeType || options.imageMimeType || 'image/jpeg';
    const requestedAspectRatio = options.aspectRatio || '1:1';
    const meta = await sharp(options.imageBuffer).metadata();
    const width = meta.width || options.width || (requestedAspectRatio === '16:9' ? 1280 : 1024);
    const height = meta.height || options.height || (requestedAspectRatio === '16:9' ? 720 : 1024);
    const aspectRatio = `${width}:${height}`;
    const ext = validation.format === 'png' ? 'png' : validation.format === 'webp' ? 'webp' : 'jpg';
    const fileName = options.imageFileName || `free-studio-${Date.now()}.${ext}`;

    return {
      buffer: options.imageBuffer,
      mimeType,
      width,
      height,
      aspectRatio,
      fileName,
      promptUsed: prompt,
      modelName: 'External Free AI / Studio Import',
      provider: this.name,
      providerId: this.id,
      tier: this.tier,
    };
  }
}

/**
 * PROVIDER 2: Local / Self-Hosted AI (Tier: LOCAL, ₹0)
 * Connects to a local ComfyUI, Stable Diffusion WebUI, or Ollama instance via
 * LOCAL_AI_IMAGE_URL. Free operation on local/on-prem hardware.
 */
export class LocalSelfHostedProvider implements VisualProvider {
  public id = 'local-sd';
  public name = 'Local / Self-Hosted AI (ComfyUI / SD)';
  public tier: ProviderTier = 'LOCAL';
  public costPerImage = '₹0 (Self-Hosted Hardware)';
  public requiresApiKey = false;

  public getEndpoint(): string | undefined {
    return process.env.LOCAL_AI_IMAGE_URL?.trim();
  }

  public getCapability(): ProviderCapability {
    const endpoint = this.getEndpoint();
    return {
      id: this.id,
      name: this.name,
      tier: endpoint ? 'LOCAL' : 'UNAVAILABLE',
      isAvailable: Boolean(endpoint),
      costPerImage: this.costPerImage,
      requiresApiKey: this.requiresApiKey,
      endpointConfigured: endpoint || 'Not configured (set LOCAL_AI_IMAGE_URL)',
      description:
        'Local automated generation via self-hosted Stable Diffusion, ComfyUI, or Ollama without cloud API subscriptions.',
    };
  }

  public async isAvailable(): Promise<boolean> {
    const endpoint = this.getEndpoint();
    if (!endpoint) return false;
    try {
      // Fast ping with 1.5s timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return res.status < 500;
    } catch {
      return false;
    }
  }

  public async generateImage(
    prompt: string,
    options?: {
      aspectRatio?: string;
      width?: number;
      height?: number;
      imageBuffer?: Buffer;
      imageMimeType?: string;
      imageFileName?: string;
    }
  ): Promise<GeneratedVisualResult> {
    const aspectRatio = options?.aspectRatio || '1:1';
    const width = options?.width || (aspectRatio === '16:9' ? 1280 : 1024);
    const height = options?.height || (aspectRatio === '16:9' ? 720 : 1024);

    // 1. Direct browser-orchestrated upload path (bypasses Vercel-to-localhost boundary)
    if (options?.imageBuffer && options.imageBuffer.length > 0) {
      const validation = validateImageBinary(options.imageBuffer);
      if (!validation.isValid) {
        throw new Error(`Local AI image failed binary validation: ${validation.error}`);
      }

      const mimeType = validation.mimeType || options.imageMimeType || 'image/png';
      const ext = validation.format === 'jpeg' ? 'jpg' : validation.format === 'webp' ? 'webp' : 'png';
      const fileName = options.imageFileName || `local-comfyui-${Date.now()}.${ext}`;

      return {
        buffer: options.imageBuffer,
        mimeType,
        width,
        height,
        aspectRatio,
        fileName,
        promptUsed: prompt,
        modelName: 'Local ComfyUI / SD (Browser-Client Orchestrated)',
        provider: this.name,
        providerId: this.id,
        tier: this.tier,
      };
    }

    // 2. Server-side HTTP fetch path (when endpoint is accessible to server)
    const endpoint = this.getEndpoint();
    if (!endpoint) {
      throw new Error(
        'Local AI generation is unavailable: LOCAL_AI_IMAGE_URL environment variable is not configured, and no client-generated image was supplied.'
      );
    }

    if (endpoint.includes('127.0.0.1') || endpoint.includes('localhost')) {
      throw new Error(
        'The server environment cannot reach 127.0.0.1 (localhost). Please generate the image directly using the Local AI client connector in your browser on the Admin Media page.'
      );
    }

    try {
      // Standard SD txt2img or generic local image generation endpoint
      const genUrl = endpoint.endsWith('/') ? `${endpoint}sdapi/v1/txt2img` : `${endpoint}/sdapi/v1/txt2img`;
      const res = await fetch(genUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: 'ugly, blurry, lowres, distorted, artificial neon, text artifacts, watermark',
          width,
          height,
          steps: 25,
          cfg_scale: 7.5,
        }),
      });

      if (!res.ok) {
        throw new Error(`Local AI server responded with HTTP status ${res.status}`);
      }

      const json = await res.json();
      const base64Image = Array.isArray(json.images) && json.images[0] ? json.images[0] : null;

      if (!base64Image) {
        throw new Error('Local AI server returned an empty image payload.');
      }

      const buffer = Buffer.from(base64Image.replace(/^data:image\/\w+;base64,/, ''), 'base64');
      const validation = validateImageBinary(buffer);
      if (!validation.isValid) {
        throw new Error(`Local AI server returned invalid image data: ${validation.error}`);
      }

      return {
        buffer,
        mimeType: validation.mimeType || 'image/png',
        width,
        height,
        aspectRatio,
        fileName: `local-ai-${Date.now()}.png`,
        promptUsed: prompt,
        modelName: 'Local Stable Diffusion / ComfyUI',
        provider: this.name,
        providerId: this.id,
        tier: this.tier,
      };
    } catch (err: any) {
      throw new Error(`Local AI generation failed: ${err?.message || 'Connection error'}`);
    }
  }
}

/**
 * PROVIDER 3: Google Gemini Native Image (Tier: PAID / Optional Quota)
 * Uses native Gemini 3.1 Flash Image model via @google/genai interactions API.
 * STRICT RULE: OPTIONAL ONLY. Never mandatory. Never called without explicit
 * admin consent.
 */
export class GeminiNativeProvider implements VisualProvider {
  public id = 'gemini';
  public name = 'Google Gemini Flash Image';
  public tier: ProviderTier = 'PAID';
  public costPerImage = 'Standard Google Gemini GenAI API quota / pricing';
  public requiresApiKey = true;

  public getApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY?.trim();
  }

  public getCapability(): ProviderCapability {
    const apiKey = this.getApiKey();
    const isAvail = Boolean(apiKey && apiKey.length > 5);
    return {
      id: this.id,
      name: this.name,
      tier: isAvail ? 'PAID' : 'UNAVAILABLE',
      isAvailable: isAvail,
      costPerImage: this.costPerImage,
      requiresApiKey: this.requiresApiKey,
      description:
        'Native Google Gemini 3.1 Flash Image generation model. Optional provider requiring configured GEMINI_API_KEY.',
    };
  }

  public isAvailable(): boolean {
    const key = this.getApiKey();
    return Boolean(key && key.length > 5);
  }

  public async generateImage(
    prompt: string,
    options?: { aspectRatio?: string; width?: number; height?: number }
  ): Promise<GeneratedVisualResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error(
        'Gemini image generation is unavailable: GEMINI_API_KEY is not configured. Use the Free AI Studio provider for ₹0 generation.'
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const aspectRatio = options?.aspectRatio || '1:1';
    const width = options?.width || (aspectRatio === '16:9' ? 1280 : 1024);
    const height = options?.height || (aspectRatio === '16:9' ? 720 : 1024);

    // 1. Attempt native interactions.create() with 'gemini-3.1-flash-image'
    try {
      if (ai.interactions && typeof (ai.interactions as any).create === 'function') {
        const interaction = await (ai.interactions as any).create({
          model: 'gemini-3.1-flash-image',
          input: prompt,
          response_modalities: ['image'],
        });

        const outputs = interaction?.outputs || [];
        for (const output of outputs) {
          if (output.type === 'image' && output.data) {
            const buffer = Buffer.from(output.data, 'base64');
            return {
              buffer,
              mimeType: 'image/jpeg',
              width,
              height,
              aspectRatio,
              fileName: `gemini-flash-${Date.now()}.jpg`,
              promptUsed: prompt,
              modelName: 'gemini-3.1-flash-image',
              provider: this.name,
              providerId: this.id,
              tier: this.tier,
            };
          }
        }
      }
    } catch (interactionErr: any) {
      console.warn('Interactions API generation attempt note:', interactionErr?.message);
    }

    // 2. Fallback to models.generateImages via @google/genai
    try {
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
      if (generatedImages && generatedImages.length > 0 && generatedImages[0].image?.imageBytes) {
        const buffer = Buffer.from(generatedImages[0].image.imageBytes, 'base64');
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
          providerId: this.id,
          tier: this.tier,
        };
      }
    } catch (imagenErr: any) {
      throw new Error(`Google GenAI image generation failed: ${imagenErr?.message || 'Unknown provider error'}`);
    }

    throw new Error('Google GenAI returned no image output data.');
  }
}

export { GeminiNativeProvider as GeminiImagenProvider };

// ============================================================================
// 3. PROVIDER REGISTRY & CAPABILITY DISCOVERY
// ============================================================================

const registeredProviders: Record<string, VisualProvider> = {
  'manual-studio': new ManualAiStudioProvider(),
  'local-sd': new LocalSelfHostedProvider(),
  'gemini': new GeminiNativeProvider(),
};

let customActiveProvider: VisualProvider | null = null;

export function setVisualProvider(provider: VisualProvider): void {
  customActiveProvider = provider;
  if (provider.id) {
    registeredProviders[provider.id] = provider;
  }
}

export function getActiveVisualProvider(): VisualProvider {
  return customActiveProvider || getProviderById();
}

/**
 * Returns capabilities and live status for all providers.
 */
export async function getProviderCapabilities(): Promise<ProviderCapability[]> {
  const capabilities: ProviderCapability[] = [];
  for (const provider of Object.values(registeredProviders)) {
    if (typeof provider.getCapability === 'function') {
      const cap = await provider.getCapability();
      capabilities.push(cap);
    }
  }
  return capabilities;
}

/**
 * Returns a specific provider by ID with default failover to the Free Studio.
 */
export function getProviderById(providerId?: string): VisualProvider {
  if (customActiveProvider) {
    return customActiveProvider;
  }
  if (providerId && registeredProviders[providerId]) {
    return registeredProviders[providerId];
  }
  // Default is strictly the ₹0 Free AI Studio
  return registeredProviders['manual-studio'];
}

// ============================================================================
// 4. ENGINE EXECUTION — ASYNC & ADMIN TRIGGERED ONLY
// ============================================================================

export interface VisualGenerationRequest {
  entityType: MediaEntityType;
  entityId: string;
  role?: MediaAssetRole;
  variant?: VisualVariant;
  promptOverride?: string;
  providerId?: string;
  imageBuffer?: Buffer;
  imageMimeType?: string;
  imageFileName?: string;
}

export async function generateAndSaveVisualForEntity(
  request: VisualGenerationRequest
): Promise<{
  asset: MediaAsset;
  promptUsed: string;
  provider: string;
  tier: ProviderTier;
  cost: string;
}> {
  // 1. Resolve Provider
  const provider = customActiveProvider || getProviderById(request.providerId);

  // FAIL-CLOSED ZERO-COST GUARD:
  const isAvail = await provider.isAvailable();
  if (!isAvail) {
    throw new Error(
      `Visual Engine Provider "${provider.name}" is unconfigured or unavailable. The website operates free-first; please use the Free AI Studio (₹0) or configure the required credentials.`
    );
  }

  // 2. Compose strictly grounded canonical prompt (never hallucinated claims)
  const promptResult = await composeVisualPrompt({
    entityType: request.entityType,
    entityId: request.entityId,
    variant: request.variant,
    role: request.role,
    promptOverride: request.promptOverride,
    hasSuppliedReferenceImage: Boolean(request.imageBuffer),
  });

  const variant = promptResult.variant;
  const role = promptResult.role;
  const prompt = promptResult.finalPrompt;

  // 3. Generate or process image via selected provider
  const result = await provider.generateImage(prompt, {
    aspectRatio: promptResult.aspectRatio,
    imageBuffer: request.imageBuffer,
    imageMimeType: request.imageMimeType,
    imageFileName: request.imageFileName,
  });

  // 4. Strict Binary Integrity Check (>1KB, valid JPEG/PNG/WebP magic bytes)
  const validation = validateImageBinary(result.buffer);
  if (!validation.isValid) {
    throw new Error(`AI generated output failed binary image validation: ${validation.error}`);
  }

  // 5. Mandatory Storage Upload Verification (Zero DB records created if upload fails!)
  const fileExtension = validation.format === 'png' ? 'png' : validation.format === 'webp' ? 'webp' : 'jpg';
  const storagePath = `ai-generated/${request.entityType.toLowerCase()}/${request.entityId}/${Date.now()}-${variant}.${fileExtension}`;
  const bucketName = 'product-images';

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    throw new Error('Supabase storage client is unavailable. Cannot register AI media without storage persistence.');
  }

  const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
    .from(bucketName)
    .upload(storagePath, result.buffer, {
      contentType: validation.mimeType || result.mimeType,
      upsert: true,
    });

  if (uploadError || !uploadData) {
    throw new Error(`Supabase storage upload failed for generated visual: ${uploadError?.message || 'No upload response'}`);
  }

  const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath);
  const publicUrl = urlData?.publicUrl;

  if (!publicUrl) {
    throw new Error('Failed to resolve public URL for stored AI visual object.');
  }

  // 6. Save through canonical Media DAL
  // CRITICAL GOVERNANCE RULES:
  // - source = 'AI_GENERATED'
  // - status = 'suggested' (NEVER auto-approved, NEVER auto-published!)
  // - isLocked = false
  // - anti-hallucination locking guard in saveMediaAsset() prevents overwriting locked manual primary
  const { asset } = await saveMediaAsset({
    entityType: request.entityType,
    entityId: request.entityId,
    url: publicUrl,
    storageBucket: bucketName,
    storagePath,
    fileHash: validation.hash,
    fileName: `${request.entityType.toLowerCase()}-${request.entityId}-${variant}.${fileExtension}`,
    mimeType: validation.mimeType || result.mimeType,
    fileSizeBytes: validation.byteLength,
    width: result.width,
    height: result.height,
    aspectRatio: result.aspectRatio,
    role,
    source: 'AI_GENERATED',
    status: 'suggested', // STRICTLY SUGGESTED!
    isLocked: false,
    title: `AI Generated ${variant.toUpperCase()} — ${promptResult.facts.name}`,
    altText: `AI suggested ${variant} visual for ${promptResult.facts.name}`,
    caption: `Generated via ${result.modelName} (${result.tier})`,
    visualContext: {
      variant,
      facts: promptResult.facts,
      formFactor: promptResult.facts.formFactor,
      isOverride: promptResult.isOverride,
    },
    aiMetadata: {
      provider: result.provider,
      providerId: result.providerId || provider.id || 'custom',
      tier: result.tier || provider.tier || 'FREE',
      cost: provider.costPerImage || '₹0',
      model: result.modelName,
      promptUsed: result.promptUsed,
      canonicalPrompt: promptResult.canonicalPrompt,
      isOverride: promptResult.isOverride,
      promptOverride: promptResult.promptOverride,
      storagePath,
      fileHash: validation.hash,
      byteLength: validation.byteLength,
      generatedAt: new Date().toISOString(),
      variant,
    },
    sortOrder: 150,
  });

  return {
    asset,
    promptUsed: result.promptUsed,
    provider: result.provider,
    tier: result.tier || provider.tier || 'FREE',
    cost: provider.costPerImage || '₹0',
  };
}
