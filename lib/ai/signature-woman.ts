// ============================================================================
// MUSKY DOSE — SIGNATURE WOMAN MASTER REFERENCE IDENTITY
// Universal Visual Language v1 — Permanent Heritage Identity Specification
// ============================================================================

export interface SignatureWomanIdentity {
  id: string;
  name: string;
  heritage: string;
  ageBracket: string;
  facialFeatures: string;
  hair: string;
  attire: string;
  expression: string;
  lightingStandard: string;
  colorPalette: string[];
  invariants: string[];
  negativeConstraints: string[];
}

export const SIGNATURE_WOMAN_MASTER_IDENTITY: SignatureWomanIdentity = {
  id: 'musky-dose-signature-woman-v1',
  name: 'Musky Dose Heritage Botanical Steward',
  heritage: 'Authentic northwestern Rajasthan (Marwar/Sojat) generational botanical lineage',
  ageBracket: 'Early 30s, mature, poised, grounded dignity',
  facialFeatures:
    'Natural, authentic South Asian features with warm olive-sand undertone, honest skin texture with visible real pores, subtle natural beauty without artificial cosmetic enhancement',
  hair: 'Natural deep black/dark brown hair with authentic soft texture, worn loose or in a relaxed natural low gathering, real hair flyaways, zero synthetic lacquer',
  attire:
    'Minimalist unbleached handloom organic cotton or khadi linen in natural ecru, sandstone, raw beige, or soft herbal olive; authentic modest draping with clean, uncluttered silhouettes; subtle traditional brass or terracotta accent if any',
  expression:
    'Calm, observant, grounded, peaceful confidence. Eyes reflecting gentle wisdom and generational familiarity with botanicals. No exaggerated commercial smile, no staged drama',
  lightingStandard:
    '5200K–5600K neutral daylight-balanced morning light. Directional soft natural window or courtyard illumination. Gentle natural shadows, zero artificial orange/yellow cast',
  colorPalette: [
    '#EDE8D0', // Sandstone / ecru canvas
    '#0E2A1E', // Deep Forest / Heritage Green
    '#2C4A3E', // Soft botanical olive
    '#C49A45', // Warm muted brass / gold accent
    '#F7F4EB', // Natural parchment / cream
  ],
  invariants: [
    'Strictly grounded in physical realism and botanical truthfulness',
    'Must remain identical in facial bone structure, skin undertone, and posture across all assets',
    'Always presented alongside genuine botanical ingredients (henna leaves, amla fruit, reetha, shikakai)',
    'Zero artificial digital gradients or fantasy magical particles',
    'Maintains generational dignity of Sojat henna artisans and Rajasthani botanical wisdom',
  ],
  negativeConstraints: [
    'heavy synthetic makeup',
    'glossy lipstick',
    'fake eyelashes',
    'airbrushed skin texture',
    'plastic smoothness',
    'western fast fashion',
    'exaggerated commercial jewelry',
    'hyper-saturated orange lighting',
    'fantasy glow or magic sparkles',
    'deformed hands or fingers',
    'disfigured anatomy',
    'western corporate aesthetics',
  ],
};

/**
 * Returns a standardized prompt descriptor combining the Master Identity
 * with specific contextual requirements (e.g. harvesting, inspecting, blending).
 */
export function buildSignatureWomanPrompt(context: {
  scene: string;
  action: string;
  composition: 'PORTRAIT' | 'ENVIRONMENTAL' | 'CLOSEUP';
  aspectRatio: '1:1' | '4:5' | '16:9';
}): { prompt: string; negativePrompt: string; guidelines: string[] } {
  const master = SIGNATURE_WOMAN_MASTER_IDENTITY;

  const prompt = [
    `Authentic portrait of the Musky Dose Heritage Botanical Steward:`,
    `${master.ageBracket}, ${master.heritage}.`,
    `${master.facialFeatures}.`,
    `${master.hair}.`,
    `Attire: ${master.attire}.`,
    `Expression: ${master.expression}.`,
    `Setting & Action: ${context.scene}, ${context.action}.`,
    `Lighting & Environment: ${master.lightingStandard}. Soft directional morning sunlight, genuine limestone and terracotta courtyard textures.`,
    `Composition: ${context.composition} shot, balanced negative space, truthful organic textures, Hasselblad 80mm f/4 documentary photography aesthetic.`,
  ].join(' ');

  const negativePrompt = master.negativeConstraints.join(', ');

  return {
    prompt,
    negativePrompt,
    guidelines: master.invariants,
  };
}

