import { GoogleGenAI } from '@google/genai';

export interface ProductAutoFillInput {
  productName: string;
  categoryId?: string;
  categoryName?: string;
  productType?: string;
  quantityOrWeight?: string;
  hints?: string;
  existingCategories?: { id: string; name: string }[];
}

export interface ProductAutoFillDraft {
  suggestedCategoryName: string;
  suggestedCategoryId?: string;
  productType: string;
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
 * Intelligent Grounded Fallback Generator (for offline, testing, or API key missing)
 */
export function generateGroundedFallbackDraft(input: ProductAutoFillInput): ProductAutoFillDraft {
  const name = input.productName.trim();
  const lowerName = name.toLowerCase();

  let categoryName = input.categoryName || 'Hair Care';
  let productType: string = input.productType || 'POWDER';
  let weight = input.quantityOrWeight || '250g Pack';
  let ingredients: string[] = [];
  let benefits: string[] = [];
  let usage = '';

  if (lowerName.includes('cone') || (lowerName.includes('bridal') && (lowerName.includes('mehendi') || lowerName.includes('mehndi') || lowerName.includes('henna')))) {
    categoryName = input.categoryName || 'Henna Care';
    productType = input.productType || 'FINISHED';
    weight = input.quantityOrWeight || 'Pack of 12 Cones';
    ingredients = [
      '100% Pure Sojat Henna Powder (Lawsonia Inermis)',
      'Eucalyptus Essential Oil',
      'Clove Bud Essential Oil',
      'Tea Tree Essential Oil',
      'Natural Cane Sugar',
      'Purified Water',
    ];
    benefits = [
      'Ready-to-use smooth flowing paste crafted for intricate bridal body art designs',
      'Infused with pure therapeutic essential oils for dark, rich, long-lasting stain development',
      'Clinically smooth pin-hole nozzle ensuring precise line work and zero clogging',
      '100% natural herbal paste free from toxic chemical dyes or synthetic stain accelerators',
    ];
    usage = 'Clean and dry skin thoroughly before application. Snip the cone tip to desired thickness. Apply intricate patterns on palms and feet. Allow paste to dry for 30-45 minutes. Keep paste on skin for 4 to 8 hours, then gently scrape off without water for 24 hours to maximize deep stain oxidation.';
  } else if (lowerName.includes('henna') || lowerName.includes('mehendi') || lowerName.includes('mehndi')) {
    categoryName = input.categoryName || 'Henna Care';
    productType = input.productType || (lowerName.includes('leaf') || lowerName.includes('leaves') ? 'RAW' : 'POWDER');
    ingredients = ['100% Pure Lawsonia Inermis (Natural Sojat Henna) Leaf Powder'];
    benefits = [
      'Authentic Sojat origin Lawsonia Inermis with rich natural Lawsone pigment',
      'Micro-fine triple cloth-sifted powder ensuring effortless mixing and smooth application',
      'Guaranteed 100% pure with zero added chemicals, metallic salts, or PPD',
      'Acts as a natural cooling conditioner, strengthening hair roots and imparting rich color',
    ];
    usage = 'In a non-metallic bowl, mix henna powder with warm water or black tea brew into a creamy consistency. Cover and allow dye release for 4-6 hours. Apply section by section on clean dry hair. Leave for 2 to 3 hours, then rinse gently with lukewarm water.';
  } else if (lowerName.includes('indigo')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Indigofera Tinctoria (Natural Indigo) Leaf Powder'];
    benefits = [
      'Pure organic Indigo leaves harvested and processed for rich blue-black natural coloration',
      'Perfect 2-step natural hair coloring partner with pure Sojat henna for rich brown to jet black shades',
      'Completely free from hydrogen peroxide, PPD, resorcinol, and synthetic dyes',
      'Conditions hair cuticles and provides lasting shine without damaging hair texture',
    ];
    usage = 'Mix fresh indigo powder with lukewarm water and a pinch of salt. Apply immediately onto freshly henna-treated hair. Keep on hair for 1.5 to 2 hours, then rinse with water only without shampoo for 48 hours to allow natural oxidation.';
  } else if (lowerName.includes('amla') || lowerName.includes('gooseberry') || lowerName.includes('emblica')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Phyllanthus Emblica (Organic Amla / Indian Gooseberry) Fruit Pulp Powder'];
    benefits = [
      'Naturally rich in Vitamin C, antioxidants, and essential botanical phytonutrients',
      'Helps strengthen hair roots, reduce premature graying, and curb excess hair fall',
      'Restores natural scalp pH balance and boosts hair volume with brilliant luster',
      '100% pure sun-dried amla fruit pulp powder free from artificial colors or fillers',
    ];
    usage = 'Mix 2 tablespoons of Amla powder with warm water, aloe vera gel, or coconut oil to create a nourishing scalp mask. Massage gently into scalp and hair strands. Leave for 30-45 minutes before rinsing with a mild herbal cleanser.';
  } else if (lowerName.includes('rose') || lowerName.includes('water') || lowerName.includes('gulab') || lowerName.includes('toner')) {
    categoryName = input.categoryName || 'Face Care';
    productType = input.productType || 'FINISHED';
    weight = input.quantityOrWeight || '200ml Bottle';
    ingredients = ['100% Pure Hydro-Distilled Rosa Damascena (Damask Rose) Floral Water'];
    benefits = [
      'Traditional steam-distilled pure Damask Rose water capturing natural essential oils',
      'Instant hydrating skin toner and natural pH balancer for all skin types',
      'Calms skin redness, refines facial pores, and provides an uplifting natural rose aroma',
      'No added synthetic fragrances, alcohol, or parabens',
    ];
    usage = 'Spritz directly onto clean face and neck as a refreshing daily toner or hydrating mist. Can also be used to mix herbal face packs and henna paste for an enhanced soothing experience.';
  } else if (lowerName.includes('shikakai')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Acacia Concinna (Organic Shikakai) Fruit & Bark Powder'];
    benefits = [
      'Natural plant saponin cleanser that washes hair gently without stripping essential scalp moisture',
      'Detangles hair strands, controls dandruff, and promotes silky bounce and texture',
      'Low pH natural herbal cleanser that preserves natural cuticle integrity',
      'Zero synthetic detergents, sulfates, silicones, or chemical preservatives',
    ];
    usage = 'Mix 2-3 tablespoons with warm water into a thin runny paste. Massage onto wet scalp for 3-5 minutes until mild natural lather develops, then rinse thoroughly with clean water.';
  } else if (lowerName.includes('reetha') || lowerName.includes('soapnut') || lowerName.includes('aritha')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Sapindus Mukorossi (Organic Reetha / Soapnut) Shell Powder'];
    benefits = [
      'Rich in natural botanical saponins for gentle, foam-rich herbal scalp and hair cleansing',
      'Eliminates scalp grease, dirt, and environmental pollutants naturally',
      'Adds lustrous body, softness, and volume to oily or limp hair',
      '100% biodegradable and hypoallergenic pure herbal cleansing remedy',
    ];
    usage = 'Combine with warm water (or mix with Shikakai and Amla) to create a gentle cleansing tea or paste. Apply to damp scalp, massage gently, and rinse thoroughly with water.';
  } else if (lowerName.includes('bhringraj')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Eclipta Alba (Organic Bhringraj / False Daisy) Leaf Powder'];
    benefits = [
      'Known in Ayurveda as the "King of Hair" for promoting follicle vitality and scalp health',
      'Helps nourish hair roots, manage premature graying, and soothe irritated scalp',
      'Deeply conditions hair shafts, making hair softer, thicker, and more resilient',
      '100% pure shade-dried Bhringraj leaves with zero additives or fillers',
    ];
    usage = 'Mix with coconut oil, sesame oil, or warm water into a smooth paste. Massage thoroughly into scalp roots. Leave on for 45-60 minutes before washing with a gentle herbal cleanser.';
  } else if (lowerName.includes('neem')) {
    categoryName = input.categoryName || 'Face Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Azadirachta Indica (Organic Neem) Leaf Powder'];
    benefits = [
      'Potent natural antibacterial and antifungal properties for clarifying troubled skin and scalp',
      'Helps purify pores, control excess sebum, and soothe active breakouts and blemishes',
      'Relieves scalp itchiness and helps maintain clean, dandruff-free roots',
      'Pure shade-dried mature neem leaves without fillers or synthetic additives',
    ];
    usage = 'Mix 1 tablespoon with rose water or plain water to form a smooth paste. Apply evenly to face (avoiding eyes) or scalp. Leave for 15-20 minutes, then rinse gently with lukewarm water.';
  } else if (lowerName.includes('hibiscus') || lowerName.includes('gudhal')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Hibiscus Rosa-Sinensis (Organic Hibiscus Flower & Leaf) Powder'];
    benefits = [
      'Rich in natural amino acids, mucilage, and alpha-hydroxy acids for intense hair hydration',
      'Improves hair elasticity, prevents split ends, and leaves hair silky smooth',
      'Enhances natural red highlights and adds deep lustrous shine to hair',
      '100% pure sun-dried hibiscus petals and leaves with zero artificial colorants',
    ];
    usage = 'Blend with coconut milk or warm water into a rich mask. Apply from roots to tips. Leave for 30-40 minutes and rinse thoroughly with water.';
  } else if (lowerName.includes('brahmi')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Bacopa Monnieri (Organic Brahmi) Whole Plant Powder'];
    benefits = [
      'Traditional Ayurvedic rejuvenator that calms the scalp and strengthens hair roots',
      'Forms a protective natural layer around hair fibers, reducing split ends and breakage',
      'Nourishes dry, stressed hair follicles and boosts overall hair density',
      '100% pure organic Brahmi with zero chemical processing',
    ];
    usage = 'Mix with warm water, amla, or yogurt into a conditioning mask. Apply to scalp and hair, leave for 30-45 minutes, then rinse with lukewarm water.';
  } else if (lowerName.includes('multani') || lowerName.includes('clay') || lowerName.includes('earth')) {
    categoryName = input.categoryName || 'Face Care';
    productType = input.productType || 'POWDER';
    ingredients = ['100% Pure Natural Calcium Bentonite (Fuller\'s Earth / Multani Mitti) Clay'];
    benefits = [
      'Deeply cleanses facial pores by drawing out excess sebum, dirt, and impurities',
      'Imparts a natural cooling sensation, refining skin texture and toning enlarged pores',
      'Soothes sun-exposed skin and helps reduce acne-causing blemishes',
      '100% natural sun-cured volcanic clay free from artificial bleaching agents',
    ];
    usage = 'Mix 1-2 tablespoons with pure Musky Dose Rose Water into a creamy paste. Apply evenly to face and neck. Allow to dry for 10-15 minutes, then wash gently with lukewarm water.';
  } else if (lowerName.includes('oil')) {
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'FINISHED';
    weight = input.quantityOrWeight || '100ml Bottle';
    ingredients = [`100% Pure Cold-Pressed ${name} Herbal Infusion`];
    benefits = [
      'Cold-pressed botanical infusion delivering intensive root and scalp nourishment',
      'Lightweight, non-sticky formula that penetrates deep into hair follicles',
      'Helps tame frizz, prevent moisture loss, and impart radiant healthy shine',
      'Free from mineral oils, silicones, synthetic fragrances, and artificial preservatives',
    ];
    usage = 'Dispense a few drops into palms, rub hands together, and massage gently into scalp and hair strands. Leave on overnight or for at least 1 hour before washing.';
  } else {
    // Neutral Generic Botanical Powder or Product
    categoryName = input.categoryName || 'Hair Care';
    productType = input.productType || 'POWDER';
    ingredients = [`100% Pure Natural ${name} (Botanical Formulation)`];
    benefits = [
      `Authentic pure botanical formulation crafted from premium natural herbs`,
      `Gently nourishes and revitalizes with traditional Ayurvedic herbal nutrients`,
      `Triple cloth-sifted for an ultra-fine, smooth, lump-free consistency`,
      `100% chemical-free with zero added artificial colors, fragrances, or preservatives`,
    ];
    usage = `Mix required quantity of ${name} with warm water or suitable natural liquid into a smooth paste. Apply evenly to desired area, allow to absorb for 20 to 30 minutes, then rinse thoroughly with plain water.`;
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

  const shortDesc = `${name} — 100% pure, authentic natural botanical formulation by Musky Dose. Completely chemical-free, preservative-free, and crafted with uncompromising purity.`;
  const fullDesc = `${name} by Musky Dose represents the highest standard of traditional Ayurvedic herbal care. Sourced with utmost integrity, our botanicals are harvested at peak maturity and gently processed to preserve their natural phytochemical potency.\n\nWhether used as a standalone revitalizing treatment or blended into customized beauty recipes, this authentic formulation delivers pure, wholesome nourishment with guaranteed purity and zero synthetic additives.`;

  const slug = createSlug(name);
  const seoTitle = `${name} | 100% Pure Natural — Musky Dose`;
  const seoDesc = `Buy authentic ${name} direct from Musky Dose. 100% pure, natural chemical-free botanical care. Order online or via WhatsApp.`;

  const keywords = [
    name.toLowerCase(),
    `pure ${name.toLowerCase()}`,
    `natural ${name.toLowerCase()}`,
    `organic ${name.toLowerCase()}`,
    'musky dose botanical care',
  ];

  const faqs = [
    {
      question: `Is Musky Dose ${name} 100% natural and free of chemicals?`,
      answer: `Yes, our ${name} is 100% pure and completely free from PPD, ammonia, metallic salts, artificial fragrances, and chemical preservatives.`,
    },
    {
      question: `How should I store ${name} for best shelf life?`,
      answer: 'Store in an airtight container in a cool, dry, and dark place away from direct sunlight and moisture.',
    },
    {
      question: 'Where is this product sourced and manufactured?',
      answer: 'This product is cultivated, processed, and packaged at our dedicated facility in Sojat City, Pali District, Rajasthan, India.',
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
