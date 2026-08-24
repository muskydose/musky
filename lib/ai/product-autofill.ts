import { GoogleGenAI } from '@google/genai';

export interface ProductAutoFillInput {
  productName: string;
  categoryId?: string;
  categoryName?: string;
  productType?: 'POWDER' | 'RAW' | 'FINISHED';
  quantityOrWeight?: string;
  hints?: string;
  existingCategories?: { id: string; name: string }[];
}

export interface ProductAutoFillDraft {
  suggestedCategoryName: string;
  suggestedCategoryId?: string;
  productType: 'POWDER' | 'RAW' | 'FINISHED';
  shortDescription: string;
  fullDescription: string;
  benefits: string[];
  ingredients: string[];
  usageInstructions: string;
  faqs: { question: string; answer: string }[];
  seoTitle: string;
  seoDescription: string;
  keywords: string[];
  tags: string[];
  slug: string;
  quantityOrWeight: string;
}

/**
 * Brand Guardrails & System Prompt for Musky Dose
 */
const SYSTEM_PROMPT = `
You are the expert Ayurvedic botanical copywriter and product specialist for "Musky Dose" (muskydose.in), a premium brand based in Sojat, Rajasthan, India — the henna capital of the world.

Brand Identity:
- Natural, 100% herbal, authentic Sojat heritage, pure botanical care, chemical-free.
- Tone: Premium, trustworthy, clear, grounded, elegant, customer-first.

CRITICAL CONTENT GUARDRAILS:
1. NEVER invent specific laboratory test percentages (e.g. do not invent "contains exactly 3.4% lawsone").
2. NEVER invent fake government awards, ISO numbers, patent numbers, or lab certificates.
3. NEVER make cure-all medical claims. Keep benefits grounded in traditional Ayurvedic and cosmetic use (e.g., cooling scalp, rich natural color, conditioning, strengthening hair follicles).
4. NEVER generate selling prices, compare-at prices, stock numbers, or SKU codes.
5. If the product is Henna or Indigo, emphasize authentic Rajasthani / Sojat cultivation and micro-cloth sifting.
6. Provide output in pure, valid JSON format ONLY. Do NOT wrap in markdown backticks or include any text outside the JSON object.
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
 * Intelligent Grounded Fallback Generator (for offline, testing, or API key missing)
 */
function generateGroundedFallbackDraft(input: ProductAutoFillInput): ProductAutoFillDraft {
  const name = input.productName.trim();
  const lowerName = name.toLowerCase();

  let categoryName = input.categoryName || 'Henna Care';
  let productType: 'POWDER' | 'RAW' | 'FINISHED' = input.productType || 'POWDER';
  let weight = input.quantityOrWeight || '250g Pack';
  let ingredients = ['100% Pure Natural Botanical Leaf Powder'];
  let benefits = [
    'Pure natural formulation direct from Sojat, Rajasthan farms',
    'Triple cloth-sifted for ultra-fine, smooth, lump-free consistency',
    'Free from synthetic dyes, PPD, ammonia, and chemical additives',
    'Nourishes and conditions hair while promoting natural shine',
  ];
  let usage = 'Mix with lukewarm water into a smooth paste. Allow paste to rest for 4 to 6 hours before application. Apply evenly on clean hair or skin, leave for 2-3 hours, then rinse thoroughly with plain water.';

  if (lowerName.includes('henna') || lowerName.includes('mehendi')) {
    categoryName = 'Henna Care';
    productType = 'POWDER';
    ingredients = ['100% Pure Lawsonia Inermis (Natural Sojat Henna) Leaf Powder'];
    benefits = [
      'Authentic Sojat origin Lawsonia Inermis with rich natural Lawsone pigment',
      'Micro-fine triple cloth-sifted powder ensuring effortless mixing and smooth application',
      'Guaranteed 100% pure with zero added chemicals, metallic salts, or PPD',
      'Acts as a natural cooling conditioner, strengthening hair roots and imparting rich color',
    ];
    usage = 'In a non-metallic bowl, mix henna powder with warm water or black tea brew into a creamy yoghurt-like consistency. Cover and allow dye release for 4-6 hours. Apply section by section on clean dry hair. Leave for 2 to 3 hours, then rinse gently with lukewarm water.';
  } else if (lowerName.includes('indigo')) {
    categoryName = 'Hair Care';
    productType = 'POWDER';
    ingredients = ['100% Pure Indigofera Tinctoria (Natural Indigo) Leaf Powder'];
    benefits = [
      'Pure organic Indigo leaves harvested and processed for rich blue-black natural coloration',
      'Perfect 2-step natural hair coloring partner with pure Sojat henna for rich brown to jet black shades',
      'Completely free from hydrogen peroxide, PPD, resorcinol, and synthetic dyes',
      'Conditions hair cuticles and provides lasting shine without damaging hair texture',
    ];
    usage = 'Mix fresh indigo powder with lukewarm water and a pinch of salt. Apply immediately onto freshly henna-treated hair. Keep on hair for 1.5 to 2 hours, then rinse with water only without shampoo for 48 hours to allow natural oxidation.';
  } else if (lowerName.includes('amla') || lowerName.includes('gooseberry')) {
    categoryName = 'Hair Care';
    productType = 'POWDER';
    ingredients = ['100% Pure Phyllanthus Emblica (Organic Amla / Indian Gooseberry) Fruit Powder'];
    benefits = [
      'Naturally rich in Vitamin C, antioxidants, and essential botanical phytonutrients',
      'Helps strengthen hair roots, reduce premature graying, and curb excess hair fall',
      'Restores natural scalp pH balance and boosts hair volume with brilliant luster',
      '100% edible and cosmetic grade pure sun-dried amla fruit pulp powder',
    ];
    usage = 'Mix 2 tablespoons of Amla powder with water, aloe vera gel, or coconut oil to create a nourishing scalp mask. Massage gently into scalp and hair strands. Leave for 30-45 minutes before rinsing with a mild herbal cleanser.';
  } else if (lowerName.includes('rose') || lowerName.includes('water') || lowerName.includes('gulab')) {
    categoryName = 'Face Care';
    productType = 'FINISHED';
    weight = input.quantityOrWeight || '200ml Bottle';
    ingredients = ['100% Pure Hydro-Distilled Rosa Damascena (Damask Rose) Floral Water'];
    benefits = [
      'Traditional steam-distilled pure Damask Rose water capturing natural essential oils',
      'Instant hydrating skin toner and natural pH balancer for all skin types',
      'Calms skin redness, refines facial pores, and provides an uplifting natural rose aroma',
      'No added synthetic fragrances, alcohol, or parabens',
    ];
    usage = 'Spritz directly onto clean face and neck as a refreshing daily toner or hydrating mist. Can also be used to mix herbal face packs and henna paste for an enhanced soothing experience.';
  } else if (lowerName.includes('shikakai') || lowerName.includes('reetha') || lowerName.includes('bhringraj')) {
    categoryName = 'Hair Care';
    productType = 'POWDER';
    ingredients = [`100% Pure Natural ${name} Powder`];
    benefits = [
      'Traditional Ayurvedic botanical cleansing and hair revitalization remedy',
      'Gently cleanses scalp oil without stripping essential natural moisture',
      'Promotes follicle stimulation and adds silky volume and bounce to hair',
      'Zero synthetic detergents, sulfates, or chemical preservatives',
    ];
    usage = 'Mix required quantity with warm water to make a thin paste. Apply onto wet scalp, massage gently for 3-5 minutes, and rinse thoroughly with clean water.';
  }

  // Match categoryId from existing categories
  let categoryId = input.categoryId;
  if (!categoryId && input.existingCategories && input.existingCategories.length > 0) {
    const matched = input.existingCategories.find(
      (c) => c.name.toLowerCase().includes(categoryName.toLowerCase()) || categoryName.toLowerCase().includes(c.name.toLowerCase())
    );
    categoryId = matched?.id || input.existingCategories[0]?.id;
    if (matched) categoryName = matched.name;
  }

  const shortDesc = `${name} — 100% pure, natural botanical herbal formulation directly sourced and processed in Sojat, Rajasthan. Completely chemical-free and preservative-free.`;
  const fullDesc = `${name} by Musky Dose represents the highest standard of traditional Rajasthani herbal cultivation. Grown in the mineral-rich soils of Sojat, our botanicals are harvested at peak maturity, shade-dried to protect active phytochemicals, and cloth-sifted for an exceptionally smooth, uniform consistency.\n\nWhether used for traditional styling or natural wellness care, this authentic formulation delivers wholesome, revitalizing nourishment with guaranteed purity and zero synthetic adulterants.`;

  const slug = createSlug(name);
  const seoTitle = `${name} | 100% Pure Natural — Musky Dose Sojat`;
  const seoDesc = `Buy authentic ${name} direct from Sojat, Rajasthan. 100% chemical-free, natural botanical care by Musky Dose. Order online or via WhatsApp.`;

  const keywords = [
    name.toLowerCase(),
    `pure ${name.toLowerCase()}`,
    `sojat ${name.toLowerCase()}`,
    `natural ${name.toLowerCase()}`,
    'herbal powder sojat',
    'musky dose natural products',
  ];

  const faqs = [
    {
      question: `Is Musky Dose ${name} 100% natural and free of chemicals?`,
      answer: `Yes, our ${name} is 100% pure and completely free from PPD, ammonia, metallic salts, artificial colors, and preservatives.`,
    },
    {
      question: `How should I store ${name} for best shelf life?`,
      answer: 'Store in an airtight container in a cool, dry, and dark place away from direct sunlight and moisture.',
    },
    {
      question: 'Where is this product sourced and manufactured?',
      answer: 'This product is cultivated, harvested, and packaged directly at our facility in Sojat City, Pali District, Rajasthan, India.',
    },
  ];

  return {
    suggestedCategoryName: categoryName,
    suggestedCategoryId: categoryId,
    productType,
    shortDescription: shortDesc,
    fullDescription: fullDesc,
    benefits,
    ingredients,
    usageInstructions: usage,
    faqs,
    seoTitle,
    seoDescription: seoDesc,
    keywords,
    tags: keywords.slice(0, 5),
    slug,
    quantityOrWeight: weight,
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
Generate a complete, authentic product catalog draft for the following item:
- Product Name: "${input.productName}"
- Category Hint: "${input.categoryName || 'Auto-detect'}"
- Product Type Hint: "${input.productType || 'Auto-detect'}"
- Quantity / Pack Size Hint: "${input.quantityOrWeight || 'Standard Pack'}"
- Additional Admin Notes / Hints: "${input.hints || 'None'}"
- Existing Store Categories: ${JSON.stringify(input.existingCategories || [])}

Required JSON format:
{
  "suggestedCategoryName": "string",
  "suggestedCategoryId": "string or null",
  "productType": "POWDER" | "RAW" | "FINISHED",
  "shortDescription": "string (1-2 sentences, max 160 characters)",
  "fullDescription": "string (2-3 detailed paragraphs with brand story & botanical properties)",
  "benefits": ["string", "string", "string", "string"],
  "ingredients": ["string"],
  "usageInstructions": "string (clear step-by-step application instructions)",
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
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    });

    const responseText = response.text || '';
    const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    // Validate and sanitize parsed output
    const fallback = generateGroundedFallbackDraft(input);

    return {
      suggestedCategoryName: parsed.suggestedCategoryName || fallback.suggestedCategoryName,
      suggestedCategoryId: parsed.suggestedCategoryId || fallback.suggestedCategoryId,
      productType: (['POWDER', 'RAW', 'FINISHED'].includes(parsed.productType) ? parsed.productType : fallback.productType) as any,
      shortDescription: parsed.shortDescription || fallback.shortDescription,
      fullDescription: parsed.fullDescription || fallback.fullDescription,
      benefits: Array.isArray(parsed.benefits) && parsed.benefits.length > 0 ? parsed.benefits.map((b: any) => String(b).trim()) : fallback.benefits,
      ingredients: Array.isArray(parsed.ingredients) && parsed.ingredients.length > 0 ? parsed.ingredients.map((i: any) => String(i).trim()) : fallback.ingredients,
      usageInstructions: parsed.usageInstructions || fallback.usageInstructions,
      faqs: Array.isArray(parsed.faqs) && parsed.faqs.length > 0 ? parsed.faqs : fallback.faqs,
      seoTitle: parsed.seoTitle || fallback.seoTitle,
      seoDescription: parsed.seoDescription || fallback.seoDescription,
      keywords: Array.isArray(parsed.keywords) && parsed.keywords.length > 0 ? parsed.keywords : fallback.keywords,
      tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : fallback.tags,
      slug: parsed.slug ? createSlug(parsed.slug) : fallback.slug,
      quantityOrWeight: parsed.quantityOrWeight || fallback.quantityOrWeight,
    };
  } catch (err: any) {
    console.warn('Gemini Auto-Fill warning (falling back to grounded draft):', err.message || err);
    return generateGroundedFallbackDraft(input);
  }
}
