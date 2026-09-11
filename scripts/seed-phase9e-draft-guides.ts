import { saveGuide, getGuides } from '../lib/db/guides';
import { ProductGuide } from '../lib/types';

const DRAFT_GUIDES: Partial<ProductGuide>[] = [
  {
    id: 'guide-mix-baq-henna-bridal',
    title: 'How to Mix BAQ Henna for Dark Bridal Stain',
    slug: 'how-to-mix-baq-henna-for-dark-bridal-stain',
    category: 'Henna & Mehndi',
    shortIntro:
      'Professional master guide on mixing 100% pure triple-sifted Sojat BAQ henna powder with high-terp essential oils for rich, deep mahogany bridal stains.',
    published: false,
    isPublished: false,
    status: 'NEEDS_REVIEW',
    readTime: '6 min read',
    overview:
      'Achieving an intensely dark, long-lasting mahogany bridal mehndi stain requires proper dye release kinetics, fine micro-sifting, and natural terpene synergy. This guide outlines the exact preparation method developed by Rajasthan mehndi artisans.',
    whatIsThis:
      'Body Art Quality (BAQ) henna is the highest purity grade of Lawsonia Inermis, harvested from top-crop leaves in Sojat, Rajasthan, and micro-sifted through fine mesh to ensure zero clogging in precision applicator cones.',
    keyBenefits: [
      'Clog-free smooth cone flow with micro-pulverized triple-sifted powder',
      'Maximum natural lawsone dye release without chemical accelerators',
      'Deep rich mahogany to burgundy stain progression over 48 hours',
      '100% natural botanical formula free from PPD, synthetic dyes, and artificial preservatives',
    ],
    ingredients: [
      '100g 100% Pure Sojat BAQ Henna Powder (Lawsonia Inermis)',
      '30ml Pure Essential Oil blend (Eucalyptus Globulus & Clove Bud)',
      '30g Granulated sugar (for paste flexibility and skin adhesion)',
      'Lukewarm distilled water or lemon juice (approx. 200-240ml)',
    ],
    whoShouldUse:
      'Professional bridal mehndi artists, cone makers, and traditional body art practitioners seeking maximum natural stain intensity and smooth clog-free cone application.',
    whoShouldAvoid:
      'Individuals with known sensitivities to specific essential oils (eucalyptus or clove). Always perform a 24-hour patch test before full bridal application.',
    howToUse:
      '1. In a glass or ceramic bowl, combine 100g of triple-sifted BAQ henna powder with 30g of sugar.\n2. Gradually add lukewarm distilled water or mild lemon juice while stirring until a thick mashed-potato consistency is reached.\n3. Blend in 30ml of terpene-rich botanical essential oil (Eucalyptus or Clove).\n4. Cover paste with airtight plastic wrap touching the paste surface directly. Allow 6 to 12 hours for dye release at room temperature (24°C-28°C).\n5. Adjust consistency to smooth ribbon flow, strain through a stocking into applicator cones, and seal.\n6. Apply onto clean, oil-free skin. Keep paste on skin for 6-8 hours. Gently scrape off paste; avoid water contact for the first 12-24 hours to allow natural oxidation.',
    quantityPreparation:
      '100g of pure BAQ henna powder yields approximately 5 to 6 standard 30g mehndi cones, sufficient for complete bridal hands and feet application.',
    storageInstructions:
      'Store dry powder in an airtight pouch away from sunlight. Freshly prepared henna cones can be frozen in an airtight container for up to 6 months without loss of staining power.',
    importantNotes:
      'Never use synthetic dyes, kerosene, or PPD accelerators. Natural lawsone requires oxygen exposure over 24-48 hours to transition from pumpkin orange to deep mahogany.',
    faqs: [
      {
        question: 'How many cones can I make from 100g of BAQ Henna Powder?',
        answer:
          '100g of finely sifted BAQ henna powder produces approximately 5 to 6 standard 30g mehndi cones.',
      },
      {
        question: 'Why does natural bridal henna take 48 hours to reach peak darkness?',
        answer:
          'Natural lawsone dye binds with skin keratin and darkens through exposure to ambient oxygen (oxidation). It initially appears bright pumpkin orange, maturing into rich reddish-mahogany over 24 to 48 hours.',
      },
      {
        question: 'Does Musky Dose BAQ Henna contain PPD or chemical colorants?',
        answer:
          'No. Musky Dose BAQ henna powder is 100% pure shade-dried Lawsonia Inermis leaves from Sojat, Rajasthan, with zero chemical dyes, zero PPD, and zero synthetic preservatives.',
      },
    ],
    seoTitle: 'How to Mix BAQ Henna for Dark Bridal Stain | Musky Dose',
    seoDescription:
      'Master the traditional Sojat technique for mixing Body Art Quality (BAQ) henna. Step-by-step dye release ratios, terp oils, and natural aftercare for deep bridal color.',
    seoKeywords:
      'how to mix baq henna for dark stain, bridal henna mixing recipe, sojat henna cone preparation, natural henna dye release, body art quality henna paste',
    content:
      '## Overview\n\nAchieving an intensely dark, long-lasting mahogany bridal mehndi stain requires proper dye release kinetics, fine micro-sifting, and natural terpene synergy.\n\n## What is This Product?\n\nBody Art Quality (BAQ) henna is the highest purity grade of Lawsonia Inermis, harvested from top-crop leaves in Sojat, Rajasthan.\n\n## Related Sourcing & Products\n\n- Sourcing for bridal orders? View [BAQ Henna Powder](/products/baq-henna-powder)\n- Intensify stain naturally with [Bridal Henna Oil](/products/bridal-henna-oil)\n- Salon & artist bulk orders available at [Wholesale Sourcing](/wholesale)',
    source: 'GSC',
  },
  {
    id: 'guide-what-is-baq-henna-vs-regular',
    title: 'What is BAQ (Body Art Quality) Henna vs Regular Mehendi Powder?',
    slug: 'what-is-baq-henna-vs-regular-mehendi-powder',
    category: 'Henna & Mehndi',
    shortIntro:
      'Learn the essential differences between Body Art Quality (BAQ) henna powder and regular commercial hair mehendi: sifting grade, lawsone concentration, purity, and application methods.',
    published: false,
    isPublished: false,
    status: 'NEEDS_REVIEW',
    readTime: '5 min read',
    overview:
      'Not all henna powders are created equal. Understanding the sifting grade, leaf selection, and processing method distinguishes genuine Body Art Quality (BAQ) henna from coarse commercial grades.',
    whatIsThis:
      'Body Art Quality (BAQ) henna is processed exclusively from prime Lawsonia Inermis foliage that is shade-dried and micro-cloth sifted up to three times to produce an ultra-fine, silky powder that will never clog precision applicator cones.',
    keyBenefits: [
      'Zero clogged cone tips due to ultra-fine triple cloth sifting (mesh count > 100)',
      'Higher concentration of pure leaf lawsone pigment for deep skin staining',
      'Free of stems, sand, grit, and harsh chemical adulterants',
      'Multi-purpose: safe for high-precision bridal body art and luxury hair conditioning',
    ],
    ingredients: ['100% Pure Lawsonia Inermis (Harvested in Sojat, Rajasthan)'],
    whoShouldUse:
      'Mehndi artists, salons, brides, and natural hair color enthusiasts looking for the highest purity grade of Rajasthan henna.',
    whoShouldAvoid:
      'Anyone seeking immediate jet-black stains from a single application (pure BAQ henna exclusively yields natural reddish-brown/mahogany tones; "black henna" usually contains toxic chemical PPD).',
    howToUse:
      'For Body Art:\n1. Mix with lukewarm water, sugar, and pure essential oils.\n2. Rest 6-12 hours for dye release, strain into cones, and apply.\n\nFor Hair Conditioning:\n1. Mix with lukewarm water into a smooth paste.\n2. Apply evenly to clean hair, leave on for 2-3 hours, and rinse with plain water.',
    quantityPreparation:
      'Body Art: 100g powder yields 5-6 precision cones. Hair Application: 100g for medium-length hair, 200g-250g for long hair.',
    storageInstructions:
      'Store sealed in a cool, dry, dark cupboard. Prevent moisture from entering the packaging.',
    importantNotes:
      'Genuine BAQ henna contains zero chemical additives, zero PPD, zero metallic salts, and zero synthetic fragrances.',
    faqs: [
      {
        question: 'What does "BAQ" stand for?',
        answer:
          'BAQ stands for "Body Art Quality". It designates the highest grade of henna powder, made from top-crop leaves that are shade-dried and micro-sifted multiple times to create a silky, fiber-free powder.',
      },
      {
        question: 'Can BAQ Henna also be used on hair?',
        answer:
          'Yes, absolutely. BAQ henna provides an exceptionally smooth, lump-free hair pack that rinses out much easier than coarse standard mehendi powders.',
      },
      {
        question: 'Why should I avoid commercially manufactured "chemical black cones"?',
        answer:
          'Many commercial black cones contain para-phenylenediamine (PPD), kerosene, or synthetic dyes that can cause severe skin blistering and chemical burns. Pure Sojat BAQ henna is 100% plant-based and safe for natural body art.',
      },
    ],
    seoTitle: 'What is BAQ Henna vs Regular Mehendi Powder? | Musky Dose',
    seoDescription:
      'Understand the difference between Body Art Quality (BAQ) henna and standard mehendi. Micro-sifting, lawsone percentage, cone consistency, and purity explained.',
    seoKeywords:
      'what is baq henna, baq henna vs regular henna, body art quality henna meaning, triple sifted henna powder, sojat baq henna powder',
    content:
      '## Overview\n\nUnderstanding the sifting grade, leaf selection, and processing method distinguishes genuine Body Art Quality (BAQ) henna from coarse commercial grades.\n\n## Sifting Grade & Purity\n\nBAQ henna undergoes triple cloth filtration removing all coarse leaf veins and fibers.\n\n## Related Sourcing\n\n- Sourcing verified [BAQ Henna Powder](/products/baq-henna-powder)\n- Salon wholesale supply available at [Wholesale Desk](/wholesale)',
    source: 'GSC',
  },
  {
    id: 'guide-henna-indigo-2-step-hair-dye',
    title: 'Henna + Indigo 2-Step Natural Hair Dye',
    slug: 'henna-and-indigo-2-step-natural-hair-dye',
    category: 'Hair Care',
    shortIntro:
      'Comprehensive guide to achieving permanent jet-black or rich brown hair naturally using a 2-step pure Sojat henna and indigo powder process with zero chemical dyes.',
    published: false,
    isPublished: false,
    status: 'NEEDS_REVIEW',
    readTime: '7 min read',
    overview:
      'The 2-step henna and indigo process is the gold standard for achieving 100% permanent grey coverage and natural jet black or dark brown hair without ammonia, peroxide, or PPD.',
    whatIsThis:
      'A synergistic two-step plant-based coloring method where Lawsonia Inermis (Henna) first deposits a reddish lawsone dye base on keratin, and Indigofera Tinctoria (Indigo) bonds directly to the henna base to create a rich, permanent natural black.',
    keyBenefits: [
      '100% permanent grey coverage without ammonia, peroxide, resorcinol, or PPD',
      'Step 1 deposits natural reddish base; Step 2 deposits deep indigo blue, creating rich jet black',
      'Strengthens hair cuticle and adds natural botanical shine and volume',
      'Zero synthetic allergens or artificial chemical developers',
    ],
    ingredients: [
      'Step 1: 100% Pure Sojat Henna Powder (Lawsonia Inermis)',
      'Step 2: 100% Pure Natural Indigo Leaf Powder (Indigofera Tinctoria)',
      'Lukewarm distilled water and 1/2 teaspoon salt (for indigo dye stabilization)',
    ],
    whoShouldUse:
      'Men and women looking for complete grey coverage and deep black or dark brown hair without chemical hair dyes or synthetic pigments.',
    whoShouldAvoid:
      'Those who have bleached their hair within 48 hours or individuals with known G6PD deficiency. Always perform a strand test before full head application.',
    howToUse:
      'STEP 1 (Henna Base):\n1. Mix pure henna powder with warm water into a smooth paste and let rest for 2-3 hours for dye release.\n2. Apply evenly to clean, dry, shampooed hair.\n3. Leave on for 2 hours under a shower cap, then rinse thoroughly with plain water (no shampoo).\n\nSTEP 2 (Indigo Application):\n1. Mix pure indigo powder with warm water (approx. 45°C-50°C) and a pinch of salt.\n2. Apply immediately within 15-20 minutes of mixing while the dye is freshly active.\n3. Leave on for 1.5 to 2 hours under a shower cap.\n4. Rinse thoroughly with plain water only. Do not shampoo for 48 hours while the color oxidizes into deep black.',
    quantityPreparation:
      'Short Hair: 50g Henna + 50g Indigo | Medium Hair: 100g Henna + 100g Indigo | Long Hair: 150g-200g Henna + 150g-200g Indigo.',
    storageInstructions:
      'Keep powders sealed in dark, airtight containers at room temperature. Never pre-mix indigo powder ahead of time.',
    importantNotes:
      'Indigo must be mixed and applied freshly. Do not let indigo paste sit for hours like henna, as its dye molecules oxidize rapidly upon hydration.',
    faqs: [
      {
        question: 'Why must henna and indigo be applied in two separate steps for black hair?',
        answer:
          'Indigo cannot bind directly to grey or white hair keratin on its own (it will produce an unwanted green or pale tint). Henna acts as the natural mordant and primer, depositing lawsone that indigo binds to, resulting in rich black.',
      },
      {
        question: 'Can I mix henna and indigo together in one step?',
        answer:
          'Mixing henna and indigo together in a 50/50 or 75/25 ratio creates warm chestnut or dark chocolate brown. For true jet black and complete grey coverage, the two-step method is strongly recommended.',
      },
      {
        question: 'How long does the 2-step henna and indigo color last?',
        answer:
          'Henna and indigo form a permanent botanical bond with hair keratin that does not wash out. Touch-ups are typically only needed on new root growth every 3 to 5 weeks.',
      },
    ],
    seoTitle: 'Henna + Indigo 2-Step Natural Hair Dye Guide | Musky Dose',
    seoDescription:
      'Step-by-step 2-step natural hair coloring process using pure Sojat henna and indigo powder for 100% grey coverage, rich black tones, and deep hair conditioning.',
    seoKeywords:
      'henna and indigo 2 step hair dye, natural black hair dye without chemical, henna indigo process for grey hair, pure indigo powder for hair, chemical free black hair color',
    content:
      '## Overview\n\nThe 2-step henna and indigo process is the gold standard for achieving 100% permanent grey coverage naturally.\n\n## Two-Step Process\n\n1. Step 1 (Henna Primer): Binds lawsone to hair keratin.\n2. Step 2 (Indigo Tint): Binds indigo pigment to the henna base, producing permanent natural black.\n\n## Related Products\n\n- Pure [BAQ Henna Powder](/products/baq-henna-powder)\n- Discover our [Hair Care Category](/categories/hair-care)\n- Bulk hair salon supplies at [Wholesale Sourcing](/wholesale)',
    source: 'GSC',
  },
];

async function main() {
  console.log('Seeding 3 educational guides as DRAFTS ONLY (needsReview=true, published=false)...');
  for (const draft of DRAFT_GUIDES) {
    try {
      const saved = await saveGuide(draft as any);
      console.log(`✓ Saved Draft Guide: "${saved.title}" (slug: ${saved.slug}, published: ${saved.published})`);
    } catch (err: any) {
      console.error(`✗ Failed saving draft guide "${draft.title}":`, err.message);
    }
  }

  const all = await getGuides();
  console.log(`\nTotal guides currently in database: ${all.length}`);
  console.log(
    JSON.stringify(
      all.map((g) => ({
        id: g.id,
        title: g.title,
        slug: g.slug,
        published: g.published,
      })),
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error('Seed execution error:', err);
  process.exit(1);
});
