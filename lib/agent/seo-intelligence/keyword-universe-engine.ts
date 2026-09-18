// ============================================================================
// MUSKY DOSE — AUTONOMOUS SEO KEYWORD UNIVERSE ENGINE
// Continuous, free-first, evidence-first keyword discovery, clustering,
// normalization, page mapping, and cannibalization prevention.
// ============================================================================

import { Product, Category, ProductGuide } from '@/lib/types';
import { SeoIntelligenceEngine } from './seo-intelligence-engine';
import { KeywordUniverseStore, generateDeterministicKeywordId } from './keyword-universe-store';
import {
  KeywordUniverseEntry,
  KeywordClusterId,
  KeywordLanguage,
  CannibalizationIssue,
} from './keyword-universe-types';
import { SeoSearchIntent } from './types';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getPublishedGuides } from '@/lib/db/guides';
import { getGscSnapshots } from '@/lib/growth/growth-db';
import { GrowthGscSnapshot } from '@/lib/growth/types';
import { logger } from '@/lib/logger';

// ----------------------------------------------------------------------------
// 1. DOMAIN TAXONOMY & NORMALIZATION DICTIONARY
// ----------------------------------------------------------------------------

export const BOTANICAL_DOMAIN_TAXONOMY = [
  'Henna',
  'Mehndi',
  'Sojat Henna',
  'Natural Henna',
  'Henna Powder',
  'Mehndi Powder',
  'Bridal Henna',
  'Body Art Henna',
  'Hair Henna',
  'Natural Hair Color',
  'Indigo',
  'Amla',
  'Shikakai',
  'Herbal Hair Care',
  'Henna Oil',
  'Mehndi Oil',
  'Hair Mask',
  'Face Pack',
  'Herbal Shampoo',
  'Wholesale Henna',
  'Henna Supplier',
  'Henna Manufacturer',
  'Sojat Manufacturer',
  'Rajasthan Herbal Products',
  'Natural Botanical Care',
] as const;

export const HINDI_HINGLISH_DICTIONARY: Record<
  string,
  { hindi: string[]; hinglish: string[]; cluster: KeywordClusterId }
> = {
  henna: {
    hindi: ['मेहंदी', 'मेंहदी', 'हिना', 'सोजत मेहंदी'],
    hinglish: [
      'asli sojat ki mehndi',
      'baalon ke liye natural mehndi',
      'shuddh mehndi powder rate',
      'bina chemical wali mehndi',
      'mehendi powder sojat',
      'natural mehandi powder',
    ],
    cluster: 'sojat-henna',
  },
  indigo: {
    hindi: ['इंडिगो पाउडर', 'नील पाउडर'],
    hinglish: [
      'indigo powder baalon ke liye',
      'natural black hair ke liye indigo',
      'mehndi ke baad indigo lagane ka tarika',
    ],
    cluster: 'indigo',
  },
  amla: {
    hindi: ['आंवला पाउडर'],
    hinglish: ['amla powder baalon ke liye', 'shuddh amla churna'],
    cluster: 'amla',
  },
  wholesale: {
    hindi: ['होलसेल मेहंदी', 'सोजत मेहंदी निर्माता'],
    hinglish: [
      'sojat mehndi wholesale rate',
      'bulk mehndi powder supplier rajasthan',
      'direct karkhane se mehndi',
    ],
    cluster: 'wholesale-b2b',
  },
};

export class KeywordUniverseEngine {
  private static instance: KeywordUniverseEngine | null = null;
  private store: KeywordUniverseStore;
  private seoEngine: SeoIntelligenceEngine;

  public static getInstance(): KeywordUniverseEngine {
    if (!KeywordUniverseEngine.instance) {
      KeywordUniverseEngine.instance = new KeywordUniverseEngine();
    }
    return KeywordUniverseEngine.instance;
  }

  private constructor() {
    this.store = KeywordUniverseStore.getInstance();
    this.seoEngine = SeoIntelligenceEngine.getInstance();
  }

  // --------------------------------------------------------------------------
  // 2. NORMALIZATION & CLUSTERING LOGIC
  // --------------------------------------------------------------------------

  /**
   * Normalizes keyword string: lowercased, punctuation stripped,
   * extra whitespace collapsed, and common transliterations unified.
   */
  public normalizeKeyword(term: string): string {
    if (!term) return '';
    let normalized = term
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Standardize transliterations into canonical representation
    normalized = normalized
      .replace(/\bmehandi\b/g, 'mehndi')
      .replace(/\bmehendi\b/g, 'mehndi')
      .replace(/\bheena\b/g, 'henna')
      .replace(/\bhina\b/g, 'henna')
      .replace(/\bneel\b/g, 'indigo');

    return normalized;
  }

  /**
   * Identifies the primary topical cluster for a keyword.
   */
  public resolveCluster(term: string, categorySlug?: string): KeywordClusterId {
    const t = term.toLowerCase();

    if (t.includes('wholesale') || t.includes('होलसेल') || t.includes('bulk') || t.includes('manufacturer') || t.includes('supplier') || t.includes('factory')) {
      return 'wholesale-b2b';
    }
    if (t.includes('oil') || t.includes('तेल') || t.includes('mehndi oil') || t.includes('essential')) {
      return 'henna-oil';
    }
    if (t.includes('indigo') || t.includes('neel') || t.includes('इंडिगो') || t.includes('नील')) {
      return 'indigo';
    }
    if (t.includes('amla') || t.includes('आंवला')) {
      return 'amla';
    }
    if (t.includes('shikakai') || t.includes('reetha') || t.includes('शिककाई') || t.includes('रीठा')) {
      return 'shikakai';
    }
    if (t.includes('bridal') || t.includes('dulhan') || t.includes('दुल्हन') || t.includes('cone')) {
      return 'bridal-henna';
    }
    if (t.includes('body art') || t.includes('baq') || t.includes('tattoo')) {
      return 'body-art-henna';
    }
    if (t.includes('sojat') || t.includes('सोजत')) {
      return 'sojat-henna';
    }
    if (t.includes('hair') || t.includes('dye') || t.includes('color') || t.includes('baal') || t.includes('बाल')) {
      return 'hair-henna';
    }
    if (t.includes('face') || t.includes('rose') || t.includes('clay') || t.includes('चेहरा')) {
      return 'face-care';
    }
    if (t.includes('henna') || t.includes('mehndi') || t.includes('मेहंदी') || t.includes('मेंहदी') || t.includes('हिना')) {
      return 'natural-henna';
    }
    if (categorySlug === 'hair-care' || categorySlug === 'henna-powder') {
      return 'natural-henna';
    }
    if (t.includes('rajasthan') || t.includes('राजस्थान')) {
      return 'rajasthan-botanicals';
    }

    return 'general-botanical';
  }

  /**
   * Detects the language of a keyword.
   */
  public detectLanguage(term: string): KeywordLanguage {
    // Check for Devanagari Unicode block (U+0900 to U+097F)
    if (/[\u0900-\u097F]/.test(term)) {
      return 'hi';
    }
    // Check for common Hinglish markers
    const hinglishMarkers = ['ke liye', 'wali', 'ka tarika', 'baalon', 'asli', 'shuddh', 'karkhane', 'se'];
    const t = term.toLowerCase();
    if (hinglishMarkers.some((m) => t.includes(m))) {
      return 'hinglish';
    }
    return 'en';
  }

  // --------------------------------------------------------------------------
  // 3. CATALOG KEYWORD DERIVATION (FACTUAL ONLY)
  // --------------------------------------------------------------------------

  /**
   * Generates a rich, structured keyword family for a product based solely on
   * factual catalog attributes without hallucinating lab claims or certifications.
   */
  public deriveKeywordsFromProduct(product: Product, categoryName?: string): KeywordUniverseEntry[] {
    const entries: KeywordUniverseEntry[] = [];
    const now = new Date().toISOString();
    const name = product.name.trim();
    const slug = product.slug;
    const catName = categoryName || product.categoryName || 'Henna';
    const targetUrl = `/products/${slug}`;
    const desc = (((product as any).description || product.shortDescription || product.fullDescription || '') as string).toLowerCase();

    // Determine core botanical entity
    let baseEntity = 'henna';
    if (name.toLowerCase().includes('indigo')) baseEntity = 'indigo';
    else if (name.toLowerCase().includes('amla')) baseEntity = 'amla';
    else if (name.toLowerCase().includes('oil')) baseEntity = 'henna oil';

    const isHenna = baseEntity === 'henna';
    const isOil = baseEntity === 'henna oil';

    const add = (
      rawTerm: string,
      generationMethod: string,
      primaryOrSecondary: 'PRIMARY' | 'SECONDARY' | 'LONG_TAIL' = 'SECONDARY',
      overrideIntent?: SeoSearchIntent
    ) => {
      const clean = rawTerm.replace(/\s+/g, ' ').trim();
      if (!clean) return;
      const normalized = this.normalizeKeyword(clean);
      const intent = overrideIntent || this.seoEngine.classifySearchIntent(clean);
      const cluster = this.resolveCluster(clean, product.categoryId);
      const language = this.detectLanguage(clean);
      const id = generateDeterministicKeywordId(normalized, targetUrl);

      entries.push({
        id,
        keyword: clean,
        normalizedKeyword: normalized,
        language,
        locale: 'en-IN',
        country: 'IND',
        source: 'CATALOG_DERIVED',
        confidence: 'HIGH', // Catalog is first-party fact
        intent,
        cluster,
        entityType: 'PRODUCT',
        entityId: product.id,
        productSlug: slug,
        categorySlug: product.categoryId,
        targetUrl,
        primaryOrSecondary,
        status: 'ACTIVE',
        firstSeenAt: now,
        lastSeenAt: now,
        gscClicks: 0,
        gscImpressions: 0,
        gscCtr: 0,
        gscAveragePosition: 0,
        evidence: `Catalog audit: Derived directly from factual product name [${name}] and category [${catName}].`,
        isActualGscQuery: false,
        isGeneratedKeyword: true,
        generationMethod,
        relevanceScore: primaryOrSecondary === 'PRIMARY' ? 95 : primaryOrSecondary === 'SECONDARY' ? 80 : 65,
        opportunityScore: primaryOrSecondary === 'PRIMARY' ? 85 : 70,
        cannibalizationRisk: false,
        createdAt: now,
        updatedAt: now,
      });
    };

    // 1. HEAD TERMS
    add(name, 'CATALOG_HEAD_TERM', 'PRIMARY');
    if (isHenna) {
      add('sojat henna powder', 'CATALOG_HEAD_TERM', 'PRIMARY');
      add('natural henna powder', 'CATALOG_HEAD_TERM', 'SECONDARY');
    } else {
      add(`pure ${baseEntity} powder`, 'CATALOG_HEAD_TERM', 'PRIMARY');
    }

    // 2. PRODUCT TERMS
    add(`${name} online`, 'CATALOG_PRODUCT_TERM', 'SECONDARY');
    add(`pure ${name}`, 'CATALOG_PRODUCT_TERM', 'SECONDARY');

    // 3. ATTRIBUTE TERMS (only if product attributes support them)
    if (desc.includes('triple') || desc.includes('sifted') || name.toLowerCase().includes('triple')) {
      add(`triple sifted ${baseEntity} powder`, 'CATALOG_ATTRIBUTE_TERM', 'SECONDARY');
      add(`microfine cloth filtered ${baseEntity}`, 'CATALOG_ATTRIBUTE_TERM', 'LONG_TAIL');
    }
    if (desc.includes('baq') || name.toLowerCase().includes('baq') || desc.includes('body art')) {
      add(`body art quality ${baseEntity} powder`, 'CATALOG_ATTRIBUTE_TERM', 'SECONDARY');
      add(`baq ${baseEntity} powder for mehndi artists`, 'CATALOG_ATTRIBUTE_TERM', 'LONG_TAIL');
    }
    const weight = product.quantityOrWeight || (product as any).weight;
    if (weight) {
      add(`${name} ${weight}`, 'CATALOG_ATTRIBUTE_TERM', 'LONG_TAIL');
    }

    // 4. USE-CASE TERMS (hair, body art, skin)
    if (isHenna) {
      add('henna powder for hair natural color', 'CATALOG_USE_CASE_TERM', 'SECONDARY');
      add('natural mehndi powder for bridal cones', 'CATALOG_USE_CASE_TERM', 'SECONDARY');
    } else if (baseEntity === 'indigo') {
      add('natural indigo powder for black hair', 'CATALOG_USE_CASE_TERM', 'SECONDARY');
      add('henna and indigo 2-step coloring', 'CATALOG_USE_CASE_TERM', 'LONG_TAIL');
    } else if (isOil) {
      add('henna oil for dark stain oxidation', 'CATALOG_USE_CASE_TERM', 'SECONDARY');
    }

    // 5. BUY / ORDER TERMS
    add(`buy ${name} online`, 'CATALOG_BUY_TERM', 'SECONDARY', 'TRANSACTIONAL');
    add(`order fresh ${baseEntity} from sojat`, 'CATALOG_BUY_TERM', 'LONG_TAIL', 'TRANSACTIONAL');

    // 6. PRICE TERMS
    add(`${name} price`, 'CATALOG_PRICE_TERM', 'SECONDARY', 'TRANSACTIONAL');
    add(`natural ${baseEntity} price in india`, 'CATALOG_PRICE_TERM', 'SECONDARY', 'TRANSACTIONAL');

    // 7. WHOLESALE / SUPPLIER / MANUFACTURER TERMS
    add(`${baseEntity} wholesale supplier rajasthan`, 'CATALOG_WHOLESALE_TERM', 'SECONDARY', 'WHOLESALE');
    add(`${baseEntity} manufacturer sojat`, 'CATALOG_MANUFACTURER_TERM', 'SECONDARY', 'WHOLESALE');
    add(`bulk ${baseEntity} powder direct factory`, 'CATALOG_SUPPLIER_TERM', 'LONG_TAIL', 'WHOLESALE');

    // 8. LOCAL / REGIONAL TERMS
    add(`sojat ${baseEntity}`, 'CATALOG_LOCAL_TERM', 'SECONDARY', 'LOCAL');
    add(`pure ${baseEntity} rajasthan`, 'CATALOG_LOCAL_TERM', 'SECONDARY', 'LOCAL');

    // 9. QUESTION & HOW-TO TERMS
    add(`how to mix ${name}`, 'CATALOG_HOW_TO_TERM', 'LONG_TAIL', 'INFORMATIONAL');
    add(`is ${name} chemical free`, 'CATALOG_QUESTION_TERM', 'LONG_TAIL', 'INFORMATIONAL');

    // 10. COMPARISON & APPLICATION TERMS
    if (isHenna) {
      add('pure sojat henna vs ordinary henna', 'CATALOG_COMPARISON_TERM', 'LONG_TAIL', 'COMMERCIAL');
      add('henna paste preparation ritual', 'CATALOG_APPLICATION_TERM', 'LONG_TAIL', 'INFORMATIONAL');
    }

    // 11. HINDI & HINGLISH VARIANTS
    if (isHenna) {
      add('सोजत मेहंदी पाउडर', 'CATALOG_HINDI_VARIANT', 'SECONDARY');
      add('asli sojat ki mehndi', 'CATALOG_HINGLISH_VARIANT', 'LONG_TAIL');
      add('baalon ke liye natural mehndi powder', 'CATALOG_HINGLISH_VARIANT', 'LONG_TAIL');
    } else if (baseEntity === 'indigo') {
      add('इंडिगो पाउडर', 'CATALOG_HINDI_VARIANT', 'SECONDARY');
      add('indigo powder baalon ke liye', 'CATALOG_HINGLISH_VARIANT', 'LONG_TAIL');
    }

    // Deduplicate by normalized keyword before returning
    const seen = new Set<string>();
    const uniqueEntries: KeywordUniverseEntry[] = [];
    for (const e of entries) {
      if (!seen.has(e.normalizedKeyword)) {
        seen.add(e.normalizedKeyword);
        uniqueEntries.push(e);
      }
    }

    return uniqueEntries;
  }

  // --------------------------------------------------------------------------
  // 4. GSC OBSERVED QUERY INGESTION (EVIDENCE-FIRST)
  // --------------------------------------------------------------------------

  /**
   * Ingests real GSC queries from snapshots into the keyword universe.
   * If GSC returns 0 queries, zero fake queries are generated.
   */
  public async ingestGscSnapshots(snapshots: GrowthGscSnapshot[]): Promise<{ ingestedCount: number }> {
    if (!snapshots || snapshots.length === 0) {
      return { ingestedCount: 0 };
    }

    const now = new Date().toISOString();
    const gscEntries: KeywordUniverseEntry[] = [];

    // Group snapshots by normalized query and canonical page to preserve distinct (query, page) tuples
    const snapshotMap = new Map<string, GrowthGscSnapshot[]>();
    for (const s of snapshots) {
      if (!s.query || !s.query.trim()) continue;
      const normalized = this.normalizeKeyword(s.query);
      const canonicalPage = s.canonicalPage || '/';
      const groupKey = `${normalized}::${canonicalPage.toLowerCase().trim()}`;
      const existing = snapshotMap.get(groupKey) || [];
      existing.push(s);
      snapshotMap.set(groupKey, existing);
    }

    for (const snaps of snapshotMap.values()) {
      const query = snaps[0].query;
      const canonicalPage = snaps[0]?.canonicalPage || '/';
      const totalImp = snaps.reduce((acc, x) => acc + x.impressions, 0);
      const totalClicks = snaps.reduce((acc, x) => acc + x.clicks, 0);
      const avgPos = snaps.reduce((acc, x) => acc + x.averagePosition, 0) / snaps.length;
      const ctr = totalImp > 0 ? totalClicks / totalImp : 0;

      const normalized = this.normalizeKeyword(query);
      const intent = this.seoEngine.classifySearchIntent(query);
      const cluster = this.resolveCluster(query);
      const language = this.detectLanguage(query);
      const id = generateDeterministicKeywordId(normalized, canonicalPage);

      const confidence = totalImp >= 100 ? 'HIGH' : totalImp >= 40 ? 'MEDIUM' : 'LOW';

      gscEntries.push({
        id,
        keyword: query,
        normalizedKeyword: normalized,
        language,
        locale: 'en-IN',
        country: 'IND',
        source: 'GSC_OBSERVED',
        confidence,
        intent,
        cluster,
        entityType: canonicalPage.startsWith('/products/') ? 'PRODUCT' : canonicalPage.startsWith('/categories/') ? 'CATEGORY' : 'LANDING',
        entityId: canonicalPage,
        targetUrl: canonicalPage,
        primaryOrSecondary: totalImp > 50 ? 'PRIMARY' : 'SECONDARY',
        status: totalClicks > 0 ? 'RANKING' : 'OPPORTUNITY',
        firstSeenAt: snaps[0]?.snapshotDate || now,
        lastSeenAt: now,
        gscClicks: totalClicks,
        gscImpressions: totalImp,
        gscCtr: Number(ctr.toFixed(4)),
        gscAveragePosition: Number(avgPos.toFixed(1)),
        evidence: `Google Search Console official API: Observed ${totalImp} impressions, ${totalClicks} clicks at position ${avgPos.toFixed(1)}.`,
        isActualGscQuery: true,
        isGeneratedKeyword: false,
        generationMethod: 'GSC_API_OBSERVED',
        relevanceScore: Math.min(100, Math.round(50 + totalImp / 5)),
        opportunityScore: Math.min(95, Math.round(40 + totalImp / 10 + (20 - Math.min(20, avgPos)))),
        cannibalizationRisk: false,
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.store.upsertEntries(gscEntries);
    return { ingestedCount: gscEntries.length };
  }

  // --------------------------------------------------------------------------
  // 5. CANNIBALIZATION DETECTION & PREVENTION
  // --------------------------------------------------------------------------

  /**
   * Scans the keyword universe for URL cannibalization where multiple pages
   * compete for the same primary keyword cluster.
   */
  public detectCannibalization(): CannibalizationIssue[] {
    const all = this.store.getAll();
    const primaryKeywords = all.filter((e) => e.primaryOrSecondary === 'PRIMARY');
    const clusterUrlMap = new Map<string, Set<string>>();

    for (const e of primaryKeywords) {
      if (!e.targetUrl || e.targetUrl === '/') continue;
      const urls = clusterUrlMap.get(e.normalizedKeyword) || new Set<string>();
      urls.add(e.targetUrl);
      clusterUrlMap.set(e.normalizedKeyword, urls);
    }

    const issues: CannibalizationIssue[] = [];
    for (const [kw, urls] of clusterUrlMap.entries()) {
      if (urls.size > 1) {
        const matchingEntry = primaryKeywords.find((e) => e.normalizedKeyword === kw);
        const cluster = matchingEntry?.cluster || 'general-botanical';
        issues.push({
          keyword: kw,
          cluster,
          conflictingUrls: Array.from(urls),
          recommendedAction: `Consolidate primary keyword target [${kw}] between ${Array.from(urls).join(' and ')} via canonical tag or targeted internal linking.`,
        });

        // Mark entries with cannibalization risk
        for (const e of all) {
          if (e.normalizedKeyword === kw) {
            e.cannibalizationRisk = true;
          }
        }
      }
    }

    return issues;
  }

  // --------------------------------------------------------------------------
  // 6. FUTURE PRODUCT AUTO-ONBOARDING (IDEMPOTENT)
  // --------------------------------------------------------------------------

  /**
   * Automatically and idempotently onboards a new or updated product to the
   * Keyword Universe without requiring manual keyword entry.
   */
  public async onboardProduct(product: Product, categoryName?: string): Promise<{
    productSlug: string;
    generatedCount: number;
    primaryKeyword: string;
    targetUrl: string;
  }> {
    await this.store.ensureLoaded();
    const generated = this.deriveKeywordsFromProduct(product, categoryName);
    await this.store.upsertEntries(generated);

    const primary = generated.find((e) => e.primaryOrSecondary === 'PRIMARY');
    return {
      productSlug: product.slug,
      generatedCount: generated.length,
      primaryKeyword: primary?.keyword || product.name,
      targetUrl: `/products/${product.slug}`,
    };
  }

  // --------------------------------------------------------------------------
  // 7. DYNAMIC CONTENT GAP DISCOVERY (REPLACES HARDCODED LIST)
  // --------------------------------------------------------------------------

  /**
   * Retrieves high-value content gaps dynamically from the Keyword Universe.
   * Replaces legacy hardcoded query arrays with dynamic taxonomy & universe analysis.
   */
  public async getDynamicContentGaps(): Promise<{ query: string; intent: SeoSearchIntent; cluster: KeywordClusterId }[]> {
    await this.store.ensureLoaded();
    const existing = this.store.getAll();
    const publishedGuides = await getPublishedGuides().catch(() => [] as ProductGuide[]);
    const publishedSlugs = new Set(publishedGuides.map((g) => g.slug.toLowerCase().trim()));
    const publishedTitles = new Set(publishedGuides.map((g) => this.normalizeKeyword(g.title)));

    const candidateMap = new Map<string, { query: string; intent: SeoSearchIntent; cluster: KeywordClusterId; priority: number }>();

    const isCoveredByGuide = (term: string): boolean => {
      const norm = this.normalizeKeyword(term);
      if (publishedTitles.has(norm)) return true;
      const slug = norm.replace(/[^a-z0-9]+/g, '-');
      if (publishedSlugs.has(slug)) return true;
      for (const title of publishedTitles) {
        if (title && (title.includes(norm) || norm.includes(title))) return true;
      }
      return false;
    };

    // 1. GSC observed opportunity queries without guides (highest priority real demand)
    for (const e of existing) {
      if (e.source === 'GSC_OBSERVED' && (e.intent === 'INFORMATIONAL' || e.intent === 'COMMERCIAL' || e.intent === 'WHOLESALE')) {
        if (!isCoveredByGuide(e.keyword)) {
          candidateMap.set(e.normalizedKeyword, {
            query: e.keyword,
            intent: e.intent,
            cluster: e.cluster,
            priority: 100 + (e.gscImpressions || 0),
          });
        }
      }
    }

    // 2. High-intent informational/commercial/wholesale catalog terms without guides
    for (const e of existing) {
      if (e.intent === 'INFORMATIONAL' || e.intent === 'COMMERCIAL' || e.intent === 'WHOLESALE') {
        if (!candidateMap.has(e.normalizedKeyword) && !isCoveredByGuide(e.keyword)) {
          const priority = e.primaryOrSecondary === 'PRIMARY' ? 80 : e.primaryOrSecondary === 'SECONDARY' ? 60 : 40;
          candidateMap.set(e.normalizedKeyword, {
            query: e.keyword,
            intent: e.intent,
            cluster: e.cluster,
            priority,
          });
        }
      }
    }

    // 3. Taxonomy relationships and unserved clusters from BOTANICAL_DOMAIN_TAXONOMY
    for (const tax of BOTANICAL_DOMAIN_TAXONOMY) {
      const norm = this.normalizeKeyword(tax);
      if (!candidateMap.has(norm) && !isCoveredByGuide(tax)) {
        const intent = this.seoEngine.classifySearchIntent(tax);
        const cluster = this.resolveCluster(tax);
        candidateMap.set(norm, {
          query: tax,
          intent: intent === 'NAVIGATIONAL' ? 'INFORMATIONAL' : intent,
          cluster,
          priority: 50,
        });
      }
    }

    // Hindi & Hinglish unserved clusters from HINDI_HINGLISH_DICTIONARY
    for (const [, dict] of Object.entries(HINDI_HINGLISH_DICTIONARY)) {
      for (const hinglishTerm of dict.hinglish) {
        const norm = this.normalizeKeyword(hinglishTerm);
        if (!candidateMap.has(norm) && !isCoveredByGuide(hinglishTerm)) {
          const intent = this.seoEngine.classifySearchIntent(hinglishTerm);
          candidateMap.set(norm, {
            query: hinglishTerm,
            intent,
            cluster: dict.cluster,
            priority: 45,
          });
        }
      }
    }

    // Fallback only if candidateMap is completely empty (e.g. empty universe and empty taxonomy)
    if (candidateMap.size === 0) {
      const fallbackTopics: { query: string; intent: SeoSearchIntent; cluster: KeywordClusterId }[] = [
        { query: 'sojat henna wholesale supplier rajasthan', intent: 'WHOLESALE', cluster: 'wholesale-b2b' },
        { query: 'how to store natural mehndi powder for freshness', intent: 'INFORMATIONAL', cluster: 'sojat-henna' },
        { query: 'triple sifted microfine henna vs ordinary henna', intent: 'COMMERCIAL', cluster: 'natural-henna' },
        { query: 'natural indigo powder for permanent black hair', intent: 'COMMERCIAL', cluster: 'indigo' },
        { query: 'how to test pure henna for chemical ppd additives', intent: 'INFORMATIONAL', cluster: 'natural-henna' },
      ];
      return fallbackTopics.filter((topic) => !isCoveredByGuide(topic.query));
    }

    // Return top candidates sorted by priority descending
    return Array.from(candidateMap.values())
      .sort((a, b) => b.priority - a.priority)
      .map(({ query, intent, cluster }) => ({ query, intent, cluster }));
  }

  // --------------------------------------------------------------------------
  // 8. AUTONOMOUS KEYWORD SWEEP (DAILY MASTER AGENT CYCLE)
  // --------------------------------------------------------------------------

  /**
   * Executes the full autonomous sweep across catalog, GSC snapshots, and internal graph.
   */
  public async runAutonomousKeywordSweep(): Promise<{
    totalKeywords: number;
    newlyAddedCount: number;
    gscObservedCount: number;
    catalogDerivedCount: number;
    cannibalizationIssues: CannibalizationIssue[];
    onboardedProducts: string[];
  }> {
    await this.store.ensureLoaded();
    const [products, categories, snapshots] = await Promise.all([
      getProducts().catch(() => [] as Product[]),
      getCategories().catch(() => [] as Category[]),
      getGscSnapshots(undefined, 500).catch(() => [] as GrowthGscSnapshot[]),
    ]);

    const initialCount = this.store.getAll().length;
    const existingEntries = this.store.getAll();
    const coveredProductSlugs = new Set(
      existingEntries.filter((e) => e.productSlug).map((e) => e.productSlug!)
    );

    const onboardedProducts: string[] = [];

    // 1. Onboard / Refresh all catalog products, detecting new additions
    for (const prod of products) {
      const isNew = !coveredProductSlugs.has(prod.slug);
      const cat = categories.find((c) => c.id === prod.categoryId);
      await this.onboardProduct(prod, cat?.name);
      if (isNew) {
        onboardedProducts.push(prod.slug);
      }
    }

    // 2. Ingest GSC queries
    await this.ingestGscSnapshots(snapshots);

    // 3. Detect Cannibalization
    const cannibalizationIssues = this.detectCannibalization();

    const finalEntries = this.store.getAll();
    const finalCount = finalEntries.length;
    const newlyAddedCount = Math.max(0, finalCount - initialCount);
    const summaryStats = this.store.getSummaryStats(products.length);

    logger.info('[KeywordUniverseEngine] Autonomous keyword sweep complete:', {
      totalKeywords: finalCount,
      newlyAddedCount,
      gscObservedCount: summaryStats.gscObservedCount,
      catalogDerivedCount: summaryStats.catalogDerivedCount,
      cannibalizationIssues: cannibalizationIssues.length,
      onboardedProductsCount: onboardedProducts.length,
    });

    return {
      totalKeywords: finalCount,
      newlyAddedCount,
      gscObservedCount: summaryStats.gscObservedCount,
      catalogDerivedCount: summaryStats.catalogDerivedCount,
      cannibalizationIssues,
      onboardedProducts,
    };
  }

  /**
   * Validates keywords against unsupported claims, medical exaggerations,
   * and non-factual botanical hallucinations.
   */
  public validateKeywordClaims(term: string): { isValid: boolean; violationReason?: string } {
    const t = term.toLowerCase();
    const forbiddenMedicalClaims = [
      'cure for baldness',
      'regrowth guarantee',
      'hair regrowth guarantee',
      'cancer',
      'ayurvedic cure',
      'instant hair grow',
      'permanent hair cure',
    ];
    for (const claim of forbiddenMedicalClaims) {
      if (t.includes(claim)) {
        return {
          isValid: false,
          violationReason: `Medical or cure claims are strictly disallowed: [${claim}]`,
        };
      }
    }
    return { isValid: true };
  }
}
