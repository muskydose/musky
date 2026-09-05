import { GoogleGenAI } from '@google/genai';
import { ProductAutoFillDraft as EngineDraft, deriveProductAutoFill } from '@/lib/growth/product-autofill-engine';

export type ProductAutoFillDraft = EngineDraft;

export interface ProductAutoFillInput {
  productName: string;
  categoryId?: string;
  categoryName?: string;
  productType?: string;
  quantityOrWeight?: string;
  hints?: string;
  existingCategories?: { id: string; name: string }[];
}

/**
 * Brand Guardrails & System Prompt for Musky Dose
 */
const SYSTEM_PROMPT = `
You are the expert Ayurvedic botanical copywriter and product specialist for "Musky Dose" (muskydose.in), a premium brand based in Sojat, Rajasthan, India.

Brand Portfolio & Botanical Diversity:
- Musky Dose specializes in authentic Rajasthani botanical powders (Henna, Indigo, Amla, Shikakai, Reetha, Bhringraj, Neem, Brahmi, Hibiscus, Multani Mitti), finished body art goods (Bridal Mehendi Cones, Natural Cones), floral hydrosols (Steam-Distilled Rose Water), and natural herbal hair oils.
- Tone: Premium, trustworthy, clear, grounded, elegant, customer-first.

CRITICAL CONTENT & PRODUCT IDENTITY GUARDRAILS:
1. STRICT PRODUCT IDENTITY:
   - The product name is 100% AUTHORITATIVE.
   - DO NOT assume a product is Henna (Lawsonia Inermis) or hair dye simply because it is a powder, herbal, or from Musky Dose.
   - ONLY mention Lawsone pigment, mahogany/red-orange staining, hair dyeing, or 4-6 hour dye-release if the product name specifically contains "Henna" or "Mehendi" or "Mehndi".
   - If the product is "Amla", the ingredient MUST be Phyllanthus Emblica (Amla / Indian Gooseberry) and benefits MUST focus on Vitamin C, root nourishment, and scalp health — NEVER hair dyeing, dye release, or mahogany stain.
   - If the product is "Indigo", the ingredient MUST be Indigofera Tinctoria (Natural Indigo) — NEVER Lawsonia Inermis.
   - If the product is "Rose Water", the ingredient MUST be Rosa Damascena floral water and usage MUST be misting/toning — NEVER a powder or mixing paste.
   - If the product is "Bridal Mehendi Cones", it is a ready-to-use paste in cones for skin body art / hand designs — NOT a dry hair wash powder.
   - If the product is "Shikakai", "Reetha", "Neem", "Bhringraj", "Brahmi", or "Hibiscus", provide accurate, herb-specific botanical profiles.

2. ZERO HALLUCINATED CLAIMS:
   - NEVER invent specific laboratory test percentages (e.g. do not invent "contains exactly 3.4% lawsone" or "98.7% purity").
   - NEVER invent fake government awards, ISO numbers, patent numbers, or clinical lab certificates.
   - NEVER make cure-all medical claims. Keep benefits grounded in traditional Ayurvedic beauty, hair care, and cosmetic wellness.
   - NEVER generate selling prices, compare-at prices, stock numbers, or SKU codes.

3. PURE JSON OUTPUT:
   - Output valid JSON ONLY matching the requested schema. No markdown backticks, no text outside the JSON object.
`;

/**
 * Slugify helper
 */
function createSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Intelligent Grounded Fallback Generator (delegated to canonical product-autofill-engine)
 */
export function generateGroundedFallbackDraft(input: ProductAutoFillInput): ProductAutoFillDraft {
  return deriveProductAutoFill({
    productName: input.productName,
    categoryId: input.categoryId,
    categoryName: input.categoryName,
    productType: input.productType,
    quantityOrWeight: input.quantityOrWeight,
  });
}

/**
 * Semantic Consistency and Anti-Contamination Validator
 */
function sanitizeAndValidateDraft(
  parsed: any,
  input: ProductAutoFillInput,
  fallback: ProductAutoFillDraft
): ProductAutoFillDraft {
  const name = input.productName.trim();
  const lowerName = name.toLowerCase();

  const isHenna = lowerName.includes('henna') || lowerName.includes('mehendi') || lowerName.includes('mehndi') || lowerName.includes('lawsonia');
  const isAmla = lowerName.includes('amla') || lowerName.includes('gooseberry') || lowerName.includes('emblica');
  const isIndigo = lowerName.includes('indigo') || lowerName.includes('tinctoria');
  const isRoseWater = lowerName.includes('rose') || lowerName.includes('water') || lowerName.includes('gulab') || lowerName.includes('toner');

  let ingredients: string[] = Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0
    ? parsed.ingredients.map((i: any) => String(i).trim())
    : fallback.ingredients;

  let benefits: string[] = Array.isArray(parsed.benefits) && parsed.benefits.length > 0
    ? parsed.benefits.map((b: any) => String(b).trim())
    : fallback.benefits;

  let usageInstructions: string = parsed.usageInstructions ? String(parsed.usageInstructions).trim() : fallback.usageInstructions;
  let shortDescription: string = parsed.shortDescription ? String(parsed.shortDescription).trim() : fallback.shortDescription;
  let fullDescription: string = parsed.fullDescription ? String(parsed.fullDescription).trim() : fallback.fullDescription;

  // RULE 1: If NOT Henna/Mehendi, eliminate any leaked Lawsonia / Henna / Stain references
  if (!isHenna) {
    ingredients = ingredients.filter(i => !/lawsonia|lawsone/i.test(i));
    if (ingredients.length === 0) ingredients = fallback.ingredients;

    benefits = benefits.filter(b => !/mahogany stain|dye release|lawsone|orange-red stain|mehendi stain|skin stain/i.test(b));
    if (benefits.length === 0) benefits = fallback.benefits;

    if (/allow (paste to rest for )?4 to 6 hours for dye release|dye release/i.test(usageInstructions)) {
      usageInstructions = fallback.usageInstructions;
    }
    if (/lawsonia inermis|lawsone/i.test(shortDescription)) {
      shortDescription = fallback.shortDescription;
    }
    if (/lawsonia inermis|lawsone/i.test(fullDescription)) {
      fullDescription = fallback.fullDescription;
    }
  }

  // RULE 2: If Amla, ensure ingredients and benefits are strictly Amla
  if (isAmla) {
    if (!ingredients.some(i => /amla|emblica|phyllanthus/i.test(i))) {
      ingredients = fallback.ingredients;
    }
    if (!benefits.some(b => /vitamin c|scalp|follicle|root|hair fall|shine/i.test(b))) {
      benefits = fallback.benefits;
    }
  }

  // RULE 3: If Rose Water / Liquid, ensure no powder/cloth-sifted leakage in ingredients/usage
  if (isRoseWater) {
    ingredients = ingredients.filter(i => !/powder|cloth-sifted|leaf powder/i.test(i));
    if (ingredients.length === 0) ingredients = fallback.ingredients;

    if (/mix with (warm|lukewarm) water into a paste|sifted/i.test(usageInstructions)) {
      usageInstructions = fallback.usageInstructions;
    }
  }

  // RULE 4: If Indigo, ensure Indigofera Tinctoria and no Lawsonia
  if (isIndigo) {
    ingredients = ingredients.filter(i => !/lawsonia/i.test(i));
    if (!ingredients.some(i => /indigo/i.test(i))) {
      ingredients = fallback.ingredients;
    }
  }

  // Ensure category and type alignment
  let categoryName = parsed.suggestedCategoryName || fallback.suggestedCategoryName;
  let categoryId = parsed.suggestedCategoryId || fallback.suggestedCategoryId;
  if (!categoryId && input.existingCategories && input.existingCategories.length > 0) {
    const matched = input.existingCategories.find(
      (c) => c.name.toLowerCase().includes(categoryName.toLowerCase()) || categoryName.toLowerCase().includes(c.name.toLowerCase())
    );
    categoryId = matched?.id || input.existingCategories[0]?.id;
    if (matched) categoryName = matched.name;
  }

  const productType = parsed.productType || input.productType || fallback.productType;

  return {
    ...fallback,
    suggestedCategoryName: categoryName,
    suggestedCategoryId: categoryId,
    productType,
    shortDescription,
    fullDescription,
    benefits,
    ingredients,
    usageInstructions,
    faqs: Array.isArray(parsed.faqs) && parsed.faqs.length > 0 ? parsed.faqs : fallback.faqs,
    seoTitle: parsed.seoTitle ? String(parsed.seoTitle).trim() : fallback.seoTitle,
    seoDescription: parsed.seoDescription ? String(parsed.seoDescription).trim() : fallback.seoDescription,
    keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords.map((k: any) => String(k).trim()) : fallback.keywords,
    tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags.map((t: any) => String(t).trim()) : fallback.tags,
    slug: parsed.slug ? createSlug(parsed.slug) : fallback.slug,
    quantityOrWeight: parsed.quantityOrWeight ? String(parsed.quantityOrWeight).trim() : fallback.quantityOrWeight,
  };
}

/**
 * Main Product Auto-Fill Generator
 */
export async function generateProductAutoFillDraft(input: ProductAutoFillInput): Promise<ProductAutoFillDraft> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // If no Gemini API key configured, use grounded intelligent fallback
  if (!apiKey) {
    return generateGroundedFallbackDraft(input);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    const userPrompt = `
Generate an authentic, product-specific catalog draft for the following item:
- Product Name: "${input.productName}" (CRITICAL: Product Name is strictly authoritative for identity, species, and benefits)
- Category Context: "${input.categoryName || 'Auto-detect'}"
- Product Type / Classification: "${input.productType || 'Auto-detect'}"
- Quantity / Pack Size Hint: "${input.quantityOrWeight || 'Standard Pack'}"
- Additional Admin Notes / Hints: "${input.hints || 'None'}"
- Existing Store Categories: ${JSON.stringify(input.existingCategories || [])}

SPECIFIC ACCURACY DIRECTIVES:
- If Product is "Amla" / "Indian Gooseberry", ingredients MUST be Phyllanthus Emblica (Amla). Benefits MUST focus on Vitamin C, root nourishment, and scalp health. DO NOT mention Lawsonia Inermis, dye release, or hair coloring.
- If Product is "Indigo", ingredients MUST be Indigofera Tinctoria for 2-step natural hair coloring. DO NOT mention Henna as the sole ingredient.
- If Product is "Rose Water", ingredients MUST be Rosa Damascena floral water. Usage MUST be misting/toning.
- If Product is "Bridal Mehendi Cones", it is a ready-to-use skin paste cone for body art.
- If Product is "Henna Powder", ingredients MUST be Lawsonia Inermis.

Required JSON format:
{
  "suggestedCategoryName": "string",
  "suggestedCategoryId": "string or null",
  "productType": "string",
  "shortDescription": "string (1-2 sentences, max 160 characters)",
  "fullDescription": "string (2-3 detailed paragraphs with brand story & botanical properties)",
  "benefits": ["string", "string", "string", "string"],
  "ingredients": ["string"],
  "usageInstructions": "string (clear step-by-step application instructions for THIS specific product)",
  "faqs": [
    { "question": "string", "answer": "string" },
    { "question": "string", "answer": "string" }
  ],
  "seoTitle": "string (50-60 characters, brand-aligned)",
  "seoDescription": "string (140-160 characters, click-worthy for search engines)",
  "keywords": ["string", "string", "string", "string"],
  "tags": ["string", "string", "string"],
  "slug": "string (clean-url-slug)",
  "quantityOrWeight": "string (e.g. 100g, 250g Pack, 200ml Bottle)"
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT + '\n\n' + userPrompt }] },
      ],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const fallback = generateGroundedFallbackDraft(input);
    return sanitizeAndValidateDraft(parsed, input, fallback);
  } catch (err: any) {
    console.warn('Gemini Auto-Fill warning (falling back to grounded draft):', err.message || err);
    return generateGroundedFallbackDraft(input);
  }
}
