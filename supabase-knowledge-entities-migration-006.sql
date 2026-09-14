-- ============================================================================
-- MUSKY DOSE — KNOWLEDGE ENTITIES SCHEMA & CANONICAL SEED MIGRATION (PHASE 2 - STEP 2A)
--
-- STATUS: FOR ADMINISTRATIVE REVIEW ONLY — DO NOT EXECUTE DESTRUCTIVELY
-- NATURE: Strictly Additive & Idempotent (No DROP, No TRUNCATE)
--
-- PURPOSE:
-- Establishes the canonical relational foundation for botanical and controlled
-- Knowledge entities (public.knowledge_entities).
-- Fully compatible with:
-- 1. Universal relationship engine (public.entity_relationships) via entity_key.
-- 2. Storefront Knowledge routes (/knowledge/[entity]) via slug.
-- 3. VisualContext and SEO meta contracts.
-- ============================================================================

-- 1. CREATE TABLE: public.knowledge_entities
CREATE TABLE IF NOT EXISTS public.knowledge_entities (
  id TEXT PRIMARY KEY,
  entity_key TEXT NOT NULL,
  slug TEXT NOT NULL,
  canonical_name TEXT NOT NULL,
  scientific_name TEXT,
  botanical_family TEXT,
  product_family TEXT NOT NULL DEFAULT 'BOTANICAL_SINGLE',
  entity_class TEXT NOT NULL DEFAULT 'BOTANICAL_SINGLE',
  aliases TEXT[] NOT NULL DEFAULT '{}',
  normalized_aliases TEXT[] NOT NULL DEFAULT '{}',
  redirect_slugs TEXT[] NOT NULL DEFAULT '{}',
  supported_scopes TEXT[] NOT NULL DEFAULT '{"HAIR"}',
  safe_use_cases TEXT[] NOT NULL DEFAULT '{}',
  compatible_attributes TEXT[] NOT NULL DEFAULT '{}',
  related_entity_keys TEXT[] NOT NULL DEFAULT '{}',
  guide_families TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  seo_title TEXT,
  seo_description TEXT,
  og_image_url TEXT,
  robots_index BOOLEAN NOT NULL DEFAULT TRUE,
  robots_follow BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'needs_review', 'archived')),
  published BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_knowledge_entities_entity_key UNIQUE (entity_key),
  CONSTRAINT uq_knowledge_entities_slug UNIQUE (slug)
);

-- 2. INDEXES FOR PERFORMANCE & SEARCH
CREATE INDEX IF NOT EXISTS idx_knowledge_entities_slug 
  ON public.knowledge_entities (slug);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_entity_key 
  ON public.knowledge_entities (entity_key);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_status_pub 
  ON public.knowledge_entities (status, published);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_sort_order 
  ON public.knowledge_entities (sort_order ASC);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_aliases 
  ON public.knowledge_entities USING GIN (aliases);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_normalized_aliases 
  ON public.knowledge_entities USING GIN (normalized_aliases);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_redirect_slugs 
  ON public.knowledge_entities USING GIN (redirect_slugs);

CREATE INDEX IF NOT EXISTS idx_knowledge_entities_related_entity_keys 
  ON public.knowledge_entities USING GIN (related_entity_keys);

-- 3. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.knowledge_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read published knowledge_entities" ON public.knowledge_entities;

-- Public read access strictly for PUBLISHED entities
CREATE POLICY "Allow public read published knowledge_entities"
ON public.knowledge_entities FOR SELECT
USING (status = 'published' AND published = TRUE);

-- 4. CANONICAL SEED DATA: 17 Canonical Entities + 1 UNKNOWN Sentinel
INSERT INTO public.knowledge_entities (
  id,
  entity_key,
  slug,
  canonical_name,
  scientific_name,
  botanical_family,
  product_family,
  entity_class,
  aliases,
  normalized_aliases,
  redirect_slugs,
  supported_scopes,
  safe_use_cases,
  compatible_attributes,
  related_entity_keys,
  guide_families,
  description,
  seo_title,
  seo_description,
  og_image_url,
  robots_index,
  robots_follow,
  status,
  published,
  sort_order
) VALUES
-- 1. HENNA_MEHNDI
(
  'ent-henna-mehndi',
  'HENNA_MEHNDI',
  'henna-mehndi',
  'Henna / Mehndi',
  'Lawsonia inermis',
  'Lythraceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['henna', 'mehndi', 'mehendi', 'mehandi', 'heena', 'hina', 'lawsonia inermis', 'madayantika'],
  ARRAY['henna', 'mehndi', 'mehendi', 'mehandi', 'heena', 'hina', 'lawsonia inermis', 'madayantika'],
  ARRAY['henna', 'mehndi', 'mehendi', 'mehandi', 'heena', 'hina', 'lawsonia-inermis', 'madayantika'],
  ARRAY['HAIR', 'BODY_ART'],
  ARRAY[
    'Natural reddish-brown hair conditioning and plant tint',
    'Traditional cooling scalp pack',
    'Bridal and festive body art paste application'
  ],
  ARRAY['pure', 'baq', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
  ARRAY['INDIGO', 'AMLA', 'HIBISCUS', 'BEETROOT', 'ROSE'],
  ARRAY[
    'PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE',
    'BUYING_GUIDE', 'ORIGIN_GUIDE', 'COMPARISON_GUIDE', 'INGREDIENT_GUIDE', 'FAQ_GUIDE'
  ],
  'Natural Rajasthani Henna leaf powder for traditional hair conditioning, coloring, and intricate bridal mehndi body art.',
  'Henna / Mehndi (Lawsonia inermis) | Botanical Care & Sourcing — Musky Dose',
  'Natural Rajasthani Henna leaf powder for traditional hair conditioning, coloring, and intricate bridal mehndi body art. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  1
),

-- 2. INDIGO
(
  'ent-indigo',
  'INDIGO',
  'indigo',
  'Natural Indigo',
  'Indigofera tinctoria',
  'Fabaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['indigo', 'neel', 'nili', 'avuri', 'neelam', 'indigofera tinctoria'],
  ARRAY['indigo', 'neel', 'nili', 'avuri', 'neelam', 'indigofera tinctoria'],
  ARRAY['neel', 'avuri'],
  ARRAY['HAIR'],
  ARRAY[
    'Chemical-free brown to black hair coloring used sequentially with Henna',
    'Natural herbal hair conditioning'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
  ARRAY['HENNA_MEHNDI', 'AMLA'],
  ARRAY[
    'PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE',
    'BUYING_GUIDE', 'COMPARISON_GUIDE', 'INGREDIENT_GUIDE', 'FAQ_GUIDE'
  ],
  'Pure Indigo leaf powder used traditionally with Henna for chemical-free brown-to-black hair coloring.',
  'Natural Indigo (Indigofera tinctoria) | Botanical Care & Sourcing — Musky Dose',
  'Pure Indigo leaf powder used traditionally with Henna for chemical-free brown-to-black hair coloring. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  2
),

-- 3. AMLA
(
  'ent-amla',
  'AMLA',
  'amla',
  'Amla (Indian Gooseberry)',
  'Phyllanthus emblica',
  'Phyllanthaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'nellikai', 'phyllanthus emblica'],
  ARRAY['amla', 'amalaki', 'indian gooseberry', 'usirikaya', 'nellikai', 'phyllanthus emblica'],
  ARRAY['amalaki', 'indian-gooseberry'],
  ARRAY['HAIR'],
  ARRAY[
    'Scalp nourishment and hair root strength',
    'Herbal conditioning and shine enhancement',
    'Natural clarifying hair pack component'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
  ARRAY['SHIKAKAI', 'REETHA', 'BHRINGRAJ', 'BRAHMI', 'HENNA_MEHNDI'],
  ARRAY[
    'PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE',
    'BUYING_GUIDE', 'INGREDIENT_GUIDE', 'FAQ_GUIDE'
  ],
  'Vitamin C rich Indian gooseberry fruit powder for scalp nourishment, hair root strength, and conditioning.',
  'Amla (Indian Gooseberry) (Phyllanthus emblica) | Botanical Care & Sourcing — Musky Dose',
  'Vitamin C rich Indian gooseberry fruit powder for scalp nourishment, hair root strength, and conditioning. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  3
),

-- 4. SHIKAKAI
(
  'ent-shikakai',
  'SHIKAKAI',
  'shikakai',
  'Shikakai',
  'Senegalia rugata',
  'Fabaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['shikakai', 'seekaya', 'senegalia rugata', 'acacia concinna'],
  ARRAY['shikakai', 'seekaya', 'senegalia rugata', 'acacia concinna'],
  ARRAY['seekaya'],
  ARRAY['HAIR'],
  ARRAY[
    'Gentle herbal hair wash and natural saponin cleansing',
    'Low-pH conditioning without stripping scalp moisture'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
  ARRAY['AMLA', 'REETHA', 'BHRINGRAJ'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Traditional Ayurvedic pod powder with gentle natural saponins for cleansing without stripping scalp oils.',
  'Shikakai (Senegalia rugata) | Botanical Care & Sourcing — Musky Dose',
  'Traditional Ayurvedic pod powder with gentle natural saponins for cleansing without stripping scalp oils. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  4
),

-- 5. REETHA
(
  'ent-reetha',
  'REETHA',
  'reetha',
  'Reetha (Soapnut)',
  'Sapindus mukorossi',
  'Sapindaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['reetha', 'aritha', 'soapnut', 'sapindus mukorossi', 'soap nut'],
  ARRAY['reetha', 'aritha', 'soapnut', 'sapindus mukorossi', 'soap nut'],
  ARRAY['aritha', 'soapnut'],
  ARRAY['HAIR'],
  ARRAY[
    'Foaming herbal cleansing for scalp and hair',
    'Residue removal in chemical-free hair care regimens'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['AMLA', 'SHIKAKAI'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Natural foaming botanical soapnut powder for traditional herbal hair wash formulations.',
  'Reetha (Soapnut) (Sapindus mukorossi) | Botanical Care & Sourcing — Musky Dose',
  'Natural foaming botanical soapnut powder for traditional herbal hair wash formulations. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  5
),

-- 6. HIBISCUS
(
  'ent-hibiscus',
  'HIBISCUS',
  'hibiscus',
  'Hibiscus Petal',
  'Hibiscus rosa-sinensis',
  'Malvaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['hibiscus', 'gudhal', 'jaswand', 'chembarathi', 'javakusuma'],
  ARRAY['hibiscus', 'gudhal', 'jaswand', 'chembarathi', 'javakusuma'],
  ARRAY['gudhal', 'jaswand'],
  ARRAY['HAIR', 'SKIN'],
  ARRAY[
    'Deep moisture conditioning and hair follicle smoothing',
    'Botanical hydration packs for skin and hair'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
  ARRAY['AMLA', 'HENNA_MEHNDI', 'ROSE'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Shade-dried red hibiscus petal powder for deep moisture conditioning and hair follicle soothing.',
  'Hibiscus Petal (Hibiscus rosa-sinensis) | Botanical Care & Sourcing — Musky Dose',
  'Shade-dried red hibiscus petal powder for deep moisture conditioning and hair follicle soothing. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  6
),

-- 7. BHRINGRAJ
(
  'ent-bhringraj',
  'BHRINGRAJ',
  'bhringraj',
  'Bhringraj',
  'Eclipta alba',
  'Asteraceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['bhringraj', 'bringaraj', 'kesharaj', 'false daisy', 'eclipta alba'],
  ARRAY['bhringraj', 'bringaraj', 'kesharaj', 'false daisy', 'eclipta alba'],
  ARRAY['bringaraj', 'false-daisy'],
  ARRAY['HAIR'],
  ARRAY[
    'Traditional Ayurvedic scalp revitalization and root care',
    'Hair oil infusion base and hair pack component'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['BRAHMI', 'AMLA', 'SHIKAKAI'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Traditional Ayurvedic herbal leaf powder revered for hair vitality and scalp revitalization.',
  'Bhringraj (Eclipta alba) | Botanical Care & Sourcing — Musky Dose',
  'Traditional Ayurvedic herbal leaf powder revered for hair vitality and scalp revitalization. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  7
),

-- 8. BRAHMI
(
  'ent-brahmi',
  'BRAHMI',
  'brahmi',
  'Brahmi',
  'Bacopa monnieri',
  'Plantaginaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['brahmi', 'bacopa monnieri', 'water hyssop', 'jalbrahmi'],
  ARRAY['brahmi', 'bacopa monnieri', 'water hyssop', 'jalbrahmi'],
  ARRAY['bacopa'],
  ARRAY['HAIR'],
  ARRAY[
    'Cooling scalp pack application',
    'Nutrient-rich hair root conditioning and herbal hair mask'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['BHRINGRAJ', 'AMLA'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Classical Ayurvedic calming herb powder for hair follicle care and scalp temperature cooling.',
  'Brahmi (Bacopa monnieri) | Botanical Care & Sourcing — Musky Dose',
  'Classical Ayurvedic calming herb powder for hair follicle care and scalp temperature cooling. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  8
),

-- 9. NEEM
(
  'ent-neem',
  'NEEM',
  'neem',
  'Neem Leaf',
  'Azadirachta indica',
  'Meliaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['neem', 'nimba', 'azadirachta indica', 'indian lilac'],
  ARRAY['neem', 'nimba', 'azadirachta indica', 'indian lilac'],
  ARRAY['nimba'],
  ARRAY['HAIR', 'SKIN'],
  ARRAY[
    'Scalp hygiene and cooling herbal care',
    'Clarifying face packs for oily or congested skin'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['MULTANI_MITTI', 'AMLA'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Bitter botanical leaf powder traditionally valued for scalp hygiene and skin clarifying packs.',
  'Neem Leaf (Azadirachta indica) | Botanical Care & Sourcing — Musky Dose',
  'Bitter botanical leaf powder traditionally valued for scalp hygiene and skin clarifying packs. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  9
),

-- 10. MORINGA
(
  'ent-moringa',
  'MORINGA',
  'moringa',
  'Moringa Leaf',
  'Moringa oleifera',
  'Moringaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['moringa', 'sahjan', 'drumstick leaf', 'moringa oleifera'],
  ARRAY['moringa', 'sahjan', 'drumstick leaf', 'moringa oleifera'],
  ARRAY['sahjan'],
  ARRAY['HAIR', 'SKIN'],
  ARRAY[
    'Nutrient-dense green botanical hair masks',
    'DIY botanical face pack mixing'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['AMLA', 'NEEM'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Nutrient-dense green leaf powder for DIY botanical masks and enriching hair infusions.',
  'Moringa Leaf (Moringa oleifera) | Botanical Care & Sourcing — Musky Dose',
  'Nutrient-dense green leaf powder for DIY botanical masks and enriching hair infusions. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  10
),

-- 11. ROSE
(
  'ent-rose',
  'ROSE',
  'rose',
  'Damask Rose',
  'Rosa damascena',
  'Rosaceae',
  'DISTILLATE_HYDROSOL',
  'BOTANICAL_SINGLE',
  ARRAY['rose', 'gulab', 'damask rose', 'rose water', 'rose petal', 'rosa damascena'],
  ARRAY['rose', 'gulab', 'damask rose', 'rose water', 'rose petal', 'rosa damascena'],
  ARRAY['gulab', 'rose-water'],
  ARRAY['SKIN', 'COSMETIC_FORMULATION'],
  ARRAY[
    'Gentle facial toning and post-cleansing misting',
    'Liquid mixer for herbal face packs and henna paste preparation'
  ],
  ARRAY['pure', 'organic', 'lab-tested'],
  ARRAY['MULTANI_MITTI', 'BEETROOT', 'HIBISCUS'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Pure aromatic steam-distilled hydrosol and shade-dried petal powder for facial toning and skincare.',
  'Damask Rose (Rosa damascena) | Botanical Care & Sourcing — Musky Dose',
  'Pure aromatic steam-distilled hydrosol and shade-dried petal powder for facial toning and skincare. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  11
),

-- 12. BEETROOT
(
  'ent-beetroot',
  'BEETROOT',
  'beetroot',
  'Beetroot',
  'Beta vulgaris',
  'Amaranthaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['beetroot', 'chukandar', 'beta vulgaris', 'beet powder'],
  ARRAY['beetroot', 'chukandar', 'beta vulgaris', 'beet powder'],
  ARRAY['chukandar'],
  ARRAY['SKIN', 'COSMETIC_FORMULATION'],
  ARRAY[
    'Naturally pigmented botanical face masks',
    'DIY cosmetic tinting and gentle skincare formulations'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['ROSE', 'MULTANI_MITTI', 'HENNA_MEHNDI'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Naturally pigmented root powder for botanical face glow masks and cosmetic tinting.',
  'Beetroot (Beta vulgaris) | Botanical Care & Sourcing — Musky Dose',
  'Naturally pigmented root powder for botanical face glow masks and cosmetic tinting. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  12
),

-- 13. FENUGREEK
(
  'ent-fenugreek',
  'FENUGREEK',
  'fenugreek',
  'Fenugreek (Methi)',
  'Trigonella foenum-graecum',
  'Fabaceae',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['methi', 'fenugreek', 'trigonella foenum-graecum'],
  ARRAY['methi', 'fenugreek', 'trigonella foenum-graecum'],
  ARRAY['methi'],
  ARRAY['HAIR'],
  ARRAY[
    'Mucilage slip and deep hydration in herbal hair packs',
    'Scalp moisturization and hair softness enhancement'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'organic', 'lab-tested'],
  ARRAY['AMLA', 'SHIKAKAI', 'BHRINGRAJ'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Mucilage-rich seed powder for slip, conditioning, and intense hydration in hair packs.',
  'Fenugreek (Methi) (Trigonella foenum-graecum) | Botanical Care & Sourcing — Musky Dose',
  'Mucilage-rich seed powder for slip, conditioning, and intense hydration in hair packs. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  13
),

-- 14. MULTANI_MITTI
(
  'ent-multani-mitti',
  'MULTANI_MITTI',
  'multani-mitti',
  'Multani Mitti (Fuller''s Earth)',
  'Solum fullonum',
  'Clay Mineral',
  'BOTANICAL_SINGLE',
  'BOTANICAL_SINGLE',
  ARRAY['multani mitti', 'fullers earth', 'bentonite', 'clay'],
  ARRAY['multani mitti', 'fullers earth', 'bentonite', 'clay'],
  ARRAY['fullers-earth'],
  ARRAY['SKIN', 'HAIR'],
  ARRAY[
    'Absorption of excess skin sebum and clarifying facial masks',
    'Traditional clarifying scalp wash paste'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'triple-sifted', 'lab-tested'],
  ARRAY['ROSE', 'NEEM', 'BEETROOT'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Natural mineral-rich clay for absorbing surface oils, clarifying pores, and scalp cleansing.',
  'Multani Mitti (Fuller''s Earth) (Solum fullonum) | Botanical Care & Sourcing — Musky Dose',
  'Natural mineral-rich clay for absorbing surface oils, clarifying pores, and scalp cleansing. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  14
),

-- 15. HERBAL_BLEND
(
  'ent-herbal-blend',
  'HERBAL_BLEND',
  'herbal-blend',
  'Herbal Blend / Multi-Botanical Pack',
  NULL,
  NULL,
  'HERBAL_BLEND',
  'CONTROLLED_PRODUCT_CLASS',
  ARRAY['hair pack', 'herbal pack', 'blend', 'trio', 'mix', 'face pack'],
  ARRAY['hair pack', 'herbal pack', 'blend', 'trio', 'mix', 'face pack'],
  ARRAY['hair-pack', 'botanical-blend'],
  ARRAY['HAIR', 'HERBAL'],
  ARRAY[
    'Synergistic multi-herb cleansing and conditioning',
    'Customized traditional Ayurvedic hair packs'
  ],
  ARRAY['pure', 'fine', 'micro-fine', 'triple-sifted', 'organic', 'lab-tested'],
  ARRAY['AMLA', 'REETHA', 'SHIKAKAI', 'BHRINGRAJ', 'HIBISCUS'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Formulated combination of two or more complementary botanical powders without synthetic detergents.',
  'Herbal Blend / Multi-Botanical Pack | Botanical Care & Sourcing — Musky Dose',
  'Formulated combination of two or more complementary botanical powders without synthetic detergents. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  15
),

-- 16. ESSENTIAL_OIL_SINGLE
(
  'ent-essential-oil',
  'ESSENTIAL_OIL_SINGLE',
  'essential-oil',
  'Pure Essential Oil',
  NULL,
  NULL,
  'ESSENTIAL_OIL',
  'CONTROLLED_PRODUCT_CLASS',
  ARRAY['essential oil', 'aroma oil', 'pure oil', 'distillate oil'],
  ARRAY['essential oil', 'aroma oil', 'pure oil', 'distillate oil'],
  ARRAY['aroma-oil'],
  ARRAY['HAIR', 'AROMATHERAPY', 'COSMETIC_FORMULATION'],
  ARRAY[
    'Aromatherapy diffusion',
    'Terpene enrichment for henna body art paste',
    'Carrier-diluted topical massage and wellness'
  ],
  ARRAY['pure', 'organic', 'lab-tested'],
  ARRAY['CARRIER_OIL', 'HENNA_MEHNDI'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Concentrated volatile botanical distillate requiring carrier oil dilution before topical application.',
  'Pure Essential Oil | Botanical Care & Sourcing — Musky Dose',
  'Concentrated volatile botanical distillate requiring carrier oil dilution before topical application. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  16
),

-- 17. CARRIER_OIL
(
  'ent-carrier-oil',
  'CARRIER_OIL',
  'carrier-oil',
  'Cold-Pressed Carrier Oil',
  NULL,
  NULL,
  'CARRIER_OIL',
  'CONTROLLED_PRODUCT_CLASS',
  ARRAY['carrier oil', 'cold pressed oil', 'massage oil', 'base oil'],
  ARRAY['carrier oil', 'cold pressed oil', 'massage oil', 'base oil'],
  ARRAY['cold-pressed-oil', 'base-oil'],
  ARRAY['HAIR', 'SKIN', 'COSMETIC_FORMULATION'],
  ARRAY[
    'Nourishing base for essential oil dilution',
    'Traditional hair and scalp massage',
    'Skin conditioning and moisture barrier care'
  ],
  ARRAY['pure', 'organic', 'lab-tested'],
  ARRAY['ESSENTIAL_OIL_SINGLE'],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_USE', 'WHAT_IS_IT', 'HOW_TO_STORE', 'FAQ_GUIDE'],
  'Mechanically extracted vegetable oil serving as a nourishing base for essential oil dilution.',
  'Cold-Pressed Carrier Oil | Botanical Care & Sourcing — Musky Dose',
  'Mechanically extracted vegetable oil serving as a nourishing base for essential oil dilution. Explore authentic Rajasthani botanical characteristics, safe usage, related products, and verified origin sourcing.',
  NULL,
  TRUE,
  TRUE,
  'published',
  TRUE,
  17
),

-- 18. UNKNOWN (Sentinel Record - Strictly DRAFT & NEVER Publicly Visible)
(
  'ent-unknown',
  'UNKNOWN',
  'unknown',
  'Unclassified / Novel Botanical Entity',
  NULL,
  NULL,
  'UNKNOWN',
  'CONTROLLED_PRODUCT_CLASS',
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY[]::TEXT[],
  ARRAY['HERBAL'],
  ARRAY['Traditional botanical personal care'],
  ARRAY['pure', 'lab-tested'],
  ARRAY[]::TEXT[],
  ARRAY['PRODUCT_OVERVIEW', 'HOW_TO_STORE'],
  'New or unmapped product entity. Commercial name is strictly preserved and public claims are restricted until reviewed.',
  'Unclassified Botanical Entity | Musky Dose',
  'Unclassified botanical entity record for audit and governance.',
  NULL,
  FALSE,
  FALSE,
  'draft',
  FALSE,
  999
)
ON CONFLICT (entity_key) DO UPDATE SET
  slug = EXCLUDED.slug,
  canonical_name = EXCLUDED.canonical_name,
  scientific_name = EXCLUDED.scientific_name,
  botanical_family = EXCLUDED.botanical_family,
  product_family = EXCLUDED.product_family,
  entity_class = EXCLUDED.entity_class,
  aliases = EXCLUDED.aliases,
  normalized_aliases = EXCLUDED.normalized_aliases,
  redirect_slugs = EXCLUDED.redirect_slugs,
  supported_scopes = EXCLUDED.supported_scopes,
  safe_use_cases = EXCLUDED.safe_use_cases,
  compatible_attributes = EXCLUDED.compatible_attributes,
  related_entity_keys = EXCLUDED.related_entity_keys,
  guide_families = EXCLUDED.guide_families,
  description = EXCLUDED.description,
  seo_title = EXCLUDED.seo_title,
  seo_description = EXCLUDED.seo_description,
  robots_index = EXCLUDED.robots_index,
  robots_follow = EXCLUDED.robots_follow,
  status = EXCLUDED.status,
  published = EXCLUDED.published,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

