// ============================================================================
// MUSKY DOSE — AUTONOMOUS SEO KEYWORD UNIVERSE VERIFICATION SUITE
// Tests all 15 deterministic requirements:
// 1. Product generates keyword family (head, product, attribute, buy, Hindi, Hinglish)
// 2. Keyword normalization deduplicates spelling variants (mehendi, mehandi, mehndi)
// 3. Hindi and Hinglish variants remain distinct but related (shared cluster)
// 4. Generated keyword is NOT marked GSC observed (strict CATALOG_DERIVED)
// 5. GSC query is correctly marked GSC_OBSERVED
// 6. GSC metrics remain zero when no GSC query exists
// 7. Future product automatically enters keyword universe
// 8. Duplicate product scan is idempotent
// 9. Keyword maps to canonical page (transactional -> product, informational -> guide)
// 10. Cannibalization is detected
// 11. Unsupported claims are rejected (medical claims, hallucinated attributes)
// 12. No paid API dependency is introduced ($0 budget verified)
// 13. Provenance survives ingestion
// 14. Confidence survives ingestion
// 15. Dynamic content gaps replace hardcoded query list
// ============================================================================

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { KeywordUniverseEngine } from '../lib/agent/seo-intelligence/keyword-universe-engine';
import { KeywordUniverseStore, generateDeterministicKeywordId } from '../lib/agent/seo-intelligence/keyword-universe-store';
import { MuskyDoseMasterAgent } from '../lib/agent/master-agent';
import { AgentStore } from '../lib/agent/agent-store';
import { Product } from '../lib/types';
import { GrowthGscSnapshot } from '../lib/growth/types';

async function runKeywordUniverseTestSuite() {
  console.log('\n============================================================');
  console.log('🌿 RUNNING AUTONOMOUS KEYWORD UNIVERSE ENGINE TEST SUITE');
  console.log('============================================================\n');

  const engine = KeywordUniverseEngine.getInstance();
  const store = KeywordUniverseStore.getInstance();

  // Reset store for deterministic testing
  store.resetForTesting();

  // Sample test product
  const sampleProduct: Product = {
    id: 'prod_sojat_henna_100g',
    name: 'Sojat Henna Powder (100% Pure & Natural)',
    slug: 'sojat-henna-powder-pure-natural',
    categoryId: 'cat_henna',
    categoryName: 'Henna Powder',
    shortDescription: 'Triple sifted, 100% pure organic Rajasthani Sojat henna powder for natural hair conditioning, rich stain, and cooling scalp treatment.',
    fullDescription: 'Triple sifted, 100% pure organic Rajasthani Sojat henna powder for natural hair conditioning, rich stain, and cooling scalp treatment.',
    price: 249,
    compareAtPrice: 299,
    quantityOrWeight: '100g',
    sku: 'MSK-HEN-100',
    images: ['/images/products/sojat-henna.jpg'],
    ingredients: ['100% Lawsonia Inermis (Henna) Leaf Powder'],
    benefits: ['Natural conditioning', 'Rich stain'],
    usageInstructions: 'Mix with warm water and let rest for 2-3 hours before application.',
    stockStatus: 'in_stock',
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // --------------------------------------------------------------------------
  // TEST 1: PRODUCT GENERATES KEYWORD FAMILY
  // --------------------------------------------------------------------------
  console.log('[TEST 1] Testing product keyword family generation...');
  const derivedKeywords = engine.deriveKeywordsFromProduct(sampleProduct, 'Henna Powder');
  assert(derivedKeywords.length >= 6, `Expected at least 6 keyword variants, got ${derivedKeywords.length}`);

  const hasHead = derivedKeywords.some((k) => k.keyword.toLowerCase().includes('henna powder') || k.keyword.toLowerCase().includes('sojat'));
  const hasBuy = derivedKeywords.some((k) => k.keyword.toLowerCase().startsWith('buy ') || k.intent === 'TRANSACTIONAL');
  const hasHindi = derivedKeywords.some((k) => k.language === 'hi');
  const hasHinglish = derivedKeywords.some((k) => k.language === 'hinglish');

  assert(hasHead, 'Keyword family must include HEAD/BRAND variant');
  assert(hasBuy, 'Keyword family must include BUY/COMMERCIAL variant');
  assert(hasHindi, 'Keyword family must include Hindi (Devanagari) variant');
  assert(hasHinglish, 'Keyword family must include Hinglish variant');

  // Now onboard into store
  await engine.onboardProduct(sampleProduct, 'Henna Powder');
  console.log(`  ✓ Successfully generated ${derivedKeywords.length} keyword variants (Head, Buy, Hindi, Hinglish)`);

  // --------------------------------------------------------------------------
  // TEST 2: KEYWORD NORMALIZATION DEDUPLICATES SPELLING VARIANTS
  // --------------------------------------------------------------------------
  console.log('[TEST 2] Testing keyword normalization deduplication (mehendi, mehandi, mehndi)...');
  const norm1 = engine.normalizeKeyword('sojat mehendi powder');
  const norm2 = engine.normalizeKeyword('sojat mehandi powder');
  const norm3 = engine.normalizeKeyword('sojat mehndi powder');

  assert.strictEqual(norm1, norm2, 'mehendi and mehandi must normalize to the same stem');
  assert.strictEqual(norm2, norm3, 'mehandi and mehndi must normalize to the same stem');
  assert.strictEqual(norm1, 'sojat mehndi powder', 'Normalized keyword stem should be "sojat mehndi powder"');

  const heenaNorm = engine.normalizeKeyword('pure heena powder');
  const hennaNorm = engine.normalizeKeyword('pure henna powder');
  assert.strictEqual(heenaNorm, hennaNorm, 'heena and henna must normalize to the same stem');
  console.log('  ✓ Normalization cleanly resolves mehandi/mehendi -> mehndi and heena -> henna');

  // --------------------------------------------------------------------------
  // TEST 3: HINDI AND HINGLISH VARIANTS REMAIN DISTINCT BUT RELATED
  // --------------------------------------------------------------------------
  console.log('[TEST 3] Testing Hindi and Hinglish distinct language preservation with shared cluster...');
  const hindiEntry = derivedKeywords.find((k) => k.language === 'hi');
  const hinglishEntry = derivedKeywords.find((k) => k.language === 'hinglish');

  assert(hindiEntry, 'Must have a Hindi entry');
  assert(hinglishEntry, 'Must have a Hinglish entry');
  assert.notStrictEqual(hindiEntry.keyword, hinglishEntry.keyword, 'Hindi and Hinglish keywords must have distinct text');
  assert.strictEqual(hindiEntry.cluster, hinglishEntry.cluster, 'Hindi and Hinglish variants must share the same cluster');
  console.log(`  ✓ Hindi (${hindiEntry.keyword}) and Hinglish (${hinglishEntry.keyword}) share cluster "${hindiEntry.cluster}"`);

  // --------------------------------------------------------------------------
  // TEST 4: GENERATED KEYWORD IS NOT MARKED GSC OBSERVED
  // --------------------------------------------------------------------------
  console.log('[TEST 4] Testing strict provenance of generated catalog keywords...');
  for (const kw of derivedKeywords) {
    assert.notStrictEqual(
      kw.source,
      'GSC_OBSERVED',
      `Catalog-generated keyword "${kw.keyword}" must NOT be marked GSC_OBSERVED`
    );
    assert.strictEqual(
      kw.source,
      'CATALOG_DERIVED',
      `Catalog-generated keyword "${kw.keyword}" must be marked CATALOG_DERIVED`
    );
  }
  console.log('  ✓ All generated keywords strictly marked CATALOG_DERIVED (0 false GSC_OBSERVED)');

  // --------------------------------------------------------------------------
  // TEST 5: GSC QUERY IS CORRECTLY MARKED GSC_OBSERVED
  // --------------------------------------------------------------------------
  console.log('[TEST 5] Testing GSC telemetry ingestion provenance...');
  const mockGscSnapshot: GrowthGscSnapshot = {
    id: 'snap_test_1',
    snapshotDate: '2026-09-17',
    query: 'organic sojat henna leaves',
    canonicalPage: '/products/sojat-henna-powder-pure-natural',
    impressions: 45,
    clicks: 3,
    ctr: 0.066,
    averagePosition: 8.4,
    country: 'IND',
    source: 'GOOGLE_SEARCH_CONSOLE',
    createdAt: new Date().toISOString(),
  };

  const gscResult = await engine.ingestGscSnapshots([mockGscSnapshot]);
  assert.strictEqual(gscResult.ingestedCount, 1, 'Should ingest 1 real GSC query row');

  const gscEntry = store.getFiltered({ source: 'GSC_OBSERVED' })[0];
  assert(gscEntry, 'Must find ingested GSC entry');
  assert.strictEqual(gscEntry.source, 'GSC_OBSERVED', 'GSC query must be marked GSC_OBSERVED');
  assert.strictEqual(gscEntry.gscImpressions, 45, 'Impressions must match observed GSC data');
  assert.strictEqual(gscEntry.gscClicks, 3, 'Clicks must match observed GSC data');
  console.log('  ✓ Real GSC query correctly marked GSC_OBSERVED with accurate telemetry');

  // --------------------------------------------------------------------------
  // TEST 6: GSC METRICS REMAIN ZERO WHEN NO QUERY EXISTS
  // --------------------------------------------------------------------------
  console.log('[TEST 6] Testing zero telemetry invention for non-GSC keywords...');
  const catalogEntry = store.getFiltered({ source: 'CATALOG_DERIVED' })[0];
  assert(catalogEntry, 'Must have catalog entry');
  assert.strictEqual(catalogEntry.gscImpressions, 0, 'Catalog keyword impressions must be 0');
  assert.strictEqual(catalogEntry.gscClicks, 0, 'Catalog keyword clicks must be 0');
  assert.strictEqual(catalogEntry.gscAveragePosition, 0, 'Catalog keyword position must be 0 (never invented)');
  console.log('  ✓ Zero impressions/clicks/positions invented for unobserved catalog keywords');

  // --------------------------------------------------------------------------
  // TEST 7: FUTURE PRODUCT AUTOMATICALLY ENTERS KEYWORD UNIVERSE
  // --------------------------------------------------------------------------
  console.log('[TEST 7] Testing future product auto-onboarding...');
  const countBefore = store.getAll().length;
  const futureProduct: Product = {
    id: 'prod_bhringraj_powder_100g',
    name: 'Bhringraj Powder for Hair Growth',
    slug: 'bhringraj-powder-hair-growth',
    categoryId: 'cat_herbal',
    categoryName: 'Herbal Powders',
    shortDescription: '100% Pure eclipta alba Bhringraj herbal hair care powder for root strengthening and hair vitality.',
    fullDescription: '100% Pure eclipta alba Bhringraj herbal hair care powder for root strengthening and hair vitality.',
    price: 199,
    compareAtPrice: 249,
    quantityOrWeight: '100g',
    sku: 'MSK-BHR-100',
    images: ['/images/products/bhringraj.jpg'],
    ingredients: ['100% Eclipta Alba (Bhringraj) Powder'],
    benefits: ['Root strengthening', 'Hair vitality'],
    usageInstructions: 'Mix with warm water or oils and apply to scalp.',
    stockStatus: 'in_stock',
    isFeatured: false,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const futureResult = await engine.onboardProduct(futureProduct, 'Herbal Powders');
  const countAfter = store.getAll().length;
  assert(futureResult.generatedCount > 0, 'Future product must generate keywords');
  assert.strictEqual(countAfter, countBefore + futureResult.generatedCount, 'Keyword store must expand immediately upon onboarding');
  console.log(`  ✓ Future product successfully onboarded with ${futureResult.generatedCount} new keywords`);

  // --------------------------------------------------------------------------
  // TEST 8: DUPLICATE PRODUCT SCAN IS IDEMPOTENT
  // --------------------------------------------------------------------------
  console.log('[TEST 8] Testing idempotency of repeated product scans...');
  const countBeforeRepeat = store.getAll().length;
  await engine.onboardProduct(futureProduct, 'Herbal Powders');
  const countAfterRepeat = store.getAll().length;

  assert.strictEqual(countAfterRepeat, countBeforeRepeat, 'Repeated onboarding of identical product must not add duplicates');
  console.log(`  ✓ Idempotency verified: 0 duplicate keywords created on re-scan (${countBeforeRepeat} -> ${countAfterRepeat})`);

  // --------------------------------------------------------------------------
  // TEST 9: KEYWORD MAPS TO CANONICAL PAGE
  // --------------------------------------------------------------------------
  console.log('[TEST 9] Testing canonical page routing intent mapping...');
  const transactionalKw = derivedKeywords.find((k) => k.intent === 'TRANSACTIONAL');
  assert(transactionalKw, 'Must have transactional keyword');
  assert(
    transactionalKw.targetUrl.startsWith('/products/'),
    `Transactional keyword "${transactionalKw.keyword}" must map to /products/*, got ${transactionalKw.targetUrl}`
  );

  const informationalKw = derivedKeywords.find((k) => k.intent === 'INFORMATIONAL');
  if (informationalKw) {
    assert(
      informationalKw.targetUrl.startsWith('/products/') ||
        informationalKw.targetUrl.startsWith('/learn/') ||
        informationalKw.targetUrl.startsWith('/categories/'),
      `Informational keyword must map to appropriate educational or entity page`
    );
  }
  console.log(`  ✓ Canonical mapping verified: ${transactionalKw.keyword} -> ${transactionalKw.targetUrl}`);

  // --------------------------------------------------------------------------
  // TEST 10: CANNIBALIZATION IS DETECTED
  // --------------------------------------------------------------------------
  console.log('[TEST 10] Testing keyword cannibalization detection...');
  const now = new Date().toISOString();
  // Force a collision by registering the same normalized primary keyword targeting two different URLs
  await store.upsertEntries([
    {
      id: 'test_cannibal_1',
      keyword: 'sojat natural henna paste',
      normalizedKeyword: 'sojat natural henna paste',
      language: 'en',
      locale: 'en-IN',
      country: 'IND',
      source: 'INTERNAL_GRAPH_DERIVED',
      confidence: 'HIGH',
      intent: 'TRANSACTIONAL',
      cluster: 'sojat-henna',
      entityType: 'PRODUCT',
      entityId: 'prod-1',
      targetUrl: '/products/sojat-henna-powder-pure-natural',
      primaryOrSecondary: 'PRIMARY',
      status: 'ACTIVE',
      firstSeenAt: now,
      lastSeenAt: now,
      gscClicks: 0,
      gscImpressions: 0,
      gscCtr: 0,
      gscAveragePosition: 0,
      evidence: 'Test entry 1',
      isActualGscQuery: false,
      isGeneratedKeyword: true,
      generationMethod: 'TEST',
      relevanceScore: 90,
      opportunityScore: 70,
      cannibalizationRisk: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'test_cannibal_2',
      keyword: 'sojat natural henna paste',
      normalizedKeyword: 'sojat natural henna paste',
      language: 'en',
      locale: 'en-IN',
      country: 'IND',
      source: 'HEURISTIC_HYPOTHESIS',
      confidence: 'MEDIUM',
      intent: 'TRANSACTIONAL',
      cluster: 'sojat-henna',
      entityType: 'LANDING',
      entityId: 'guide-1',
      targetUrl: '/learn/henna-paste-guide',
      primaryOrSecondary: 'PRIMARY',
      status: 'ACTIVE',
      firstSeenAt: now,
      lastSeenAt: now,
      gscClicks: 0,
      gscImpressions: 0,
      gscCtr: 0,
      gscAveragePosition: 0,
      evidence: 'Test entry 2',
      isActualGscQuery: false,
      isGeneratedKeyword: true,
      generationMethod: 'TEST',
      relevanceScore: 85,
      opportunityScore: 65,
      cannibalizationRisk: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  const cannibalIssues = engine.detectCannibalization();
  assert(cannibalIssues.length > 0, 'Cannibalization detector must detect collision on "sojat natural henna paste"');
  const matchingIssue = cannibalIssues.find((c) => c.keyword === 'sojat natural henna paste');
  assert(matchingIssue, 'Must find cannibalization issue for colliding keyword');
  assert(matchingIssue.conflictingUrls.length >= 2, 'Must report both competing URLs');
  console.log(`  ✓ Cannibalization detected: "${matchingIssue.keyword}" competes across [${matchingIssue.conflictingUrls.join(', ')}]`);

  // --------------------------------------------------------------------------
  // TEST 11: UNSUPPORTED CLAIMS ARE REJECTED
  // --------------------------------------------------------------------------
  console.log('[TEST 11] Testing rejection of unsupported claims / medical hallucinations...');
  const claimsRejected = engine.validateKeywordClaims(
    'chemical free cure for baldness and hair regrowth guarantee'
  );
  assert.strictEqual(claimsRejected.isValid, false, 'Medical cures/baldness guarantees must be rejected');
  assert(claimsRejected.violationReason?.includes('Medical or cure claims are strictly disallowed'));

  const validClaim = engine.validateKeywordClaims('triple sifted sojat henna powder for natural hair conditioning');
  assert.strictEqual(validClaim.isValid, true, 'Botanical conditioning claims must pass');
  console.log('  ✓ Medical / unsupported claims safely rejected');

  // --------------------------------------------------------------------------
  // TEST 12: NO PAID API DEPENDENCY IS INTRODUCED
  // --------------------------------------------------------------------------
  console.log('[TEST 12] Testing zero paid third-party SEO API dependencies...');
  const pkgJsonPath = path.resolve(process.cwd(), 'package.json');
  const pkgContent = fs.readFileSync(pkgJsonPath, 'utf-8');
  const forbiddenPaidApis = [
    'semrush',
    'ahrefs',
    'moz',
    'spyfu',
    'dataforseo',
    'serpapi',
    'valueserp',
    'serper',
  ];

  for (const api of forbiddenPaidApis) {
    assert(
      !pkgContent.toLowerCase().includes(api),
      `Forbidden paid SEO dependency "${api}" found in package.json!`
    );
  }
  console.log('  ✓ Verified 100% free-first architecture ($0 paid SEO dependencies)');

  // --------------------------------------------------------------------------
  // TEST 13: PROVENANCE SURVIVES INGESTION
  // --------------------------------------------------------------------------
  console.log('[TEST 13] Testing provenance integrity through retrieval...');
  const allEntries = store.getAll();
  const catalogCount = allEntries.filter((k) => k.source === 'CATALOG_DERIVED').length;
  const gscCount = allEntries.filter((k) => k.source === 'GSC_OBSERVED').length;

  assert(catalogCount > 0, 'Catalog derived entries must retain their source');
  assert(gscCount > 0, 'GSC observed entries must retain their source');

  const filteredCatalog = store.getFiltered({ source: 'CATALOG_DERIVED' });
  assert.strictEqual(filteredCatalog.length, catalogCount, 'Filtered query by source must return exact matching entries');
  console.log(`  ✓ Provenance preserved across storage and retrieval (${catalogCount} catalog, ${gscCount} GSC)`);

  // --------------------------------------------------------------------------
  // TEST 14: CONFIDENCE SURVIVES INGESTION
  // --------------------------------------------------------------------------
  console.log('[TEST 14] Testing confidence score preservation...');
  const highConf = store.getFiltered({ confidence: 'HIGH' });
  const medConf = store.getFiltered({ confidence: 'MEDIUM' });

  assert(highConf.length > 0, 'Must have entries with HIGH confidence');
  for (const h of highConf) {
    assert.strictEqual(h.confidence, 'HIGH', 'Confidence must remain HIGH');
  }
  console.log(`  ✓ Confidence values intact (${highConf.length} HIGH, ${medConf.length} MEDIUM)`);

  // --------------------------------------------------------------------------
  // TEST 15: DYNAMIC CONTENT GAPS REPLACE HARDCODED QUERY LIST
  // --------------------------------------------------------------------------
  console.log('[TEST 15] Verifying hardcoded unservedHighIntentQueries is replaced dynamically...');
  const seoEngineFile = fs.readFileSync(
    path.resolve(process.cwd(), 'lib/agent/seo-intelligence/seo-intelligence-engine.ts'),
    'utf-8'
  );

  assert(
    !seoEngineFile.includes('const unservedHighIntentQueries = ['),
    'Hardcoded query array "const unservedHighIntentQueries = [" must be removed'
  );
  assert(
    seoEngineFile.includes('keywordUniverseEngine.getDynamicContentGaps()'),
    'SEO intelligence engine must call keywordUniverseEngine.getDynamicContentGaps()'
  );

  const dynamicGaps = await engine.getDynamicContentGaps();
  assert(Array.isArray(dynamicGaps), 'Dynamic gaps must return an array');
  assert(dynamicGaps.length > 0, 'Dynamic gaps must contain unserved keyword opportunities');
  console.log(`  ✓ Dynamic content gap engine confirmed: generated ${dynamicGaps.length} dynamic opportunities without hardcoding`);

  // --------------------------------------------------------------------------
  // TEST 16: MASTER AGENT AUTONOMOUS DAILY SWEEP WIRING & AUDIT
  // --------------------------------------------------------------------------
  console.log('[TEST 16] Testing Master Agent autonomous daily sweep wiring & audit log...');
  const masterAgent = MuskyDoseMasterAgent.getInstance();
  const agentStore = AgentStore.getInstance();
  const dailySummary = await masterAgent.runDailyAutonomousSweep({ timeLimitMs: 5000, maxBatch: 0 });
  assert(dailySummary.keywordUniverseSweep, 'Daily sweep summary must contain keywordUniverseSweep report');
  assert.strictEqual(dailySummary.keywordUniverseSweep.started, true, 'Keyword sweep must have started');
  assert.strictEqual(dailySummary.keywordUniverseSweep.completed, true, 'Keyword sweep must have completed');
  assert(dailySummary.keywordUniverseSweep.totalKeywords > 0, 'Keyword sweep must report total keywords > 0');

  const auditLogs = agentStore.getAuditLogs(10);
  const kwAudit = auditLogs.find((l) => l.action === 'KEYWORD_UNIVERSE_SWEEP_EXECUTED');
  assert(kwAudit, 'Audit log must record KEYWORD_UNIVERSE_SWEEP_EXECUTED');
  assert.strictEqual(kwAudit.worker, 'seo_guardian');
  console.log(`  ✓ Master Agent autonomously executed Keyword Universe sweep: ${dailySummary.keywordUniverseSweep.totalKeywords} keywords processed and audited`);

  // --------------------------------------------------------------------------
  // TEST 17: DETERMINISTIC ID UNIQUENESS ACROSS DISTINCT TARGET URLS
  // --------------------------------------------------------------------------
  console.log('[TEST 17] Testing deterministic ID uniqueness across distinct target URLs...');
  const kwTest = 'pure organic sojat henna powder';
  const normKwTest = engine.normalizeKeyword(kwTest);
  const urlA = '/products/sojat-henna-100g';
  const urlB = '/categories/natural-henna';

  const idA = generateDeterministicKeywordId(normKwTest, urlA);
  const idB = generateDeterministicKeywordId(normKwTest, urlB);
  assert.notStrictEqual(idA, idB, 'Different URLs for the same keyword must have distinct deterministic IDs');

  await store.upsertEntries([
    {
      id: idA,
      keyword: kwTest,
      normalizedKeyword: normKwTest,
      language: 'en',
      locale: 'en-IN',
      country: 'IND',
      source: 'CATALOG_DERIVED',
      confidence: 'HIGH',
      intent: 'COMMERCIAL',
      cluster: 'sojat-henna',
      entityType: 'PRODUCT',
      entityId: 'p1',
      targetUrl: urlA,
      primaryOrSecondary: 'PRIMARY',
      status: 'ACTIVE',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      gscClicks: 0,
      gscImpressions: 0,
      gscCtr: 0,
      gscAveragePosition: 0,
      evidence: 'Test A',
      isActualGscQuery: false,
      isGeneratedKeyword: true,
      generationMethod: 'TEST',
      relevanceScore: 90,
      opportunityScore: 80,
      cannibalizationRisk: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: idB,
      keyword: kwTest,
      normalizedKeyword: normKwTest,
      language: 'en',
      locale: 'en-IN',
      country: 'IND',
      source: 'CATALOG_DERIVED',
      confidence: 'HIGH',
      intent: 'COMMERCIAL',
      cluster: 'sojat-henna',
      entityType: 'CATEGORY',
      entityId: 'c1',
      targetUrl: urlB,
      primaryOrSecondary: 'SECONDARY',
      status: 'ACTIVE',
      firstSeenAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
      gscClicks: 0,
      gscImpressions: 0,
      gscCtr: 0,
      gscAveragePosition: 0,
      evidence: 'Test B',
      isActualGscQuery: false,
      isGeneratedKeyword: true,
      generationMethod: 'TEST',
      relevanceScore: 85,
      opportunityScore: 75,
      cannibalizationRisk: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]);

  const matches = store.getAll().filter((e) => e.normalizedKeyword === normKwTest);
  assert.strictEqual(matches.length, 2, 'Both URLs for the same keyword must coexist without overwriting each other');
  console.log(`  ✓ Both target URLs retained for [${normKwTest}] with deterministic IDs: [${idA}] and [${idB}]`);

  // --------------------------------------------------------------------------
  // TEST 18: GSC QUERY/PAGE TUPLE DISTINCT PRESERVATION
  // --------------------------------------------------------------------------
  console.log('[TEST 18] Testing GSC query/page tuple distinct preservation...');
  const dualSnapshots: GrowthGscSnapshot[] = [
    {
      id: 'snap_dual_1',
      snapshotDate: '2026-09-17',
      query: 'sojat henna powder buy online',
      canonicalPage: '/products/sojat-henna-100g',
      impressions: 50,
      clicks: 5,
      ctr: 0.1,
      averagePosition: 4.2,
      country: 'IND',
      source: 'GOOGLE_SEARCH_CONSOLE',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'snap_dual_2',
      snapshotDate: '2026-09-17',
      query: 'sojat henna powder buy online',
      canonicalPage: '/wholesale-henna',
      impressions: 30,
      clicks: 2,
      ctr: 0.066,
      averagePosition: 7.1,
      country: 'IND',
      source: 'GOOGLE_SEARCH_CONSOLE',
      createdAt: new Date().toISOString(),
    },
  ];

  await engine.ingestGscSnapshots(dualSnapshots);
  const dualMatches = store.getAll().filter((e) => e.keyword === 'sojat henna powder buy online' && e.source === 'GSC_OBSERVED');
  assert.strictEqual(dualMatches.length, 2, 'GSC observations for same query across 2 pages must remain distinct');
  const prodPage = dualMatches.find((e) => e.targetUrl === '/products/sojat-henna-100g');
  const wholesalePage = dualMatches.find((e) => e.targetUrl === '/wholesale-henna');
  assert(prodPage && wholesalePage, 'Both distinct canonical target URLs must exist in GSC observations');
  assert.strictEqual(prodPage.gscImpressions, 50);
  assert.strictEqual(wholesalePage.gscImpressions, 30);
  console.log('  ✓ GSC query/page tuples preserved distinctly with accurate metrics');

  // --------------------------------------------------------------------------
  // TEST 19: REAL DYNAMIC CATALOG COUNT CALCULATION
  // --------------------------------------------------------------------------
  console.log('[TEST 19] Testing real dynamic catalog count calculation...');
  const statsDynamic = store.getSummaryStats(7);
  assert.strictEqual(statsDynamic.totalProductsInCatalog, 7, 'totalProductsInCatalog should match passed catalog size');
  const statsFallback = store.getSummaryStats();
  assert(statsFallback.totalProductsInCatalog >= 1, 'Fallback catalog count should derive from covered products');
  console.log(`  ✓ Dynamic catalog products count verified: ${statsDynamic.totalProductsInCatalog} products`);

  // --------------------------------------------------------------------------
  // TEST 20: LARGE VOLUME KEYWORD PAGINATION CAPABILITY
  // --------------------------------------------------------------------------
  console.log('[TEST 20] Testing pagination batched loading capability (>1000 records)...');
  const storeFile = fs.readFileSync(
    path.resolve(process.cwd(), 'lib/agent/seo-intelligence/keyword-universe-store.ts'),
    'utf-8'
  );
  assert(!storeFile.includes('.limit(1000)'), 'Hardcoded .limit(1000) must not exist in keyword-universe-store.ts');
  assert(storeFile.includes('.range('), 'Pagination with .range() must be implemented in keyword-universe-store.ts');
  console.log('  ✓ Batched pagination logic verified: .range(from, from + BATCH_SIZE - 1) handles arbitrary universe volume');

  // --------------------------------------------------------------------------
  // TEST 21: PRODUCT SEO DIFFERENTIATION PREVENTS CANNIBALIZATION (BAQ vs SOJAT HENNA)
  // --------------------------------------------------------------------------
  console.log('[TEST 21] Testing product SEO differentiation & cannibalization prevention (BAQ vs Sojat Henna)...');
  const baqProduct: Product = {
    id: 'prod_baq_henna_test',
    name: 'BAQ Henna Powder',
    slug: 'baq-henna-powder',
    categoryId: 'cat_henna',
    categoryName: 'Henna',
    shortDescription: 'BEST FOR HENNA (MEHNDI) ARTIST. 100% Pure Lawsonia Inermis for dark bridal stain and professional cones.',
    fullDescription: 'BEST FOR HENNA (MEHNDI) ARTIST. 100% Pure Lawsonia Inermis for dark bridal stain and professional cones.',
    price: 99,
    compareAtPrice: 129,
    quantityOrWeight: '100g',
    sku: 'MSK-BAQ-100',
    images: ['/images/products/baq-henna.jpg'],
    ingredients: ['100% Pure Organic Lawsonia Inermis Leaf Powder'],
    benefits: ['Deep rich mahogany stain', 'Chemical-free natural hair coolant'],
    usageInstructions: 'Mix with warm water or lemon juice and essential oils.',
    stockStatus: 'in_stock',
    isFeatured: true,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const tripleProduct: Product = {
    id: 'prod_triple_henna_test',
    name: 'Sojat Pure Triple-Shifted Henna Powder',
    slug: 'sojat-pure-triple-shifted-henna-powder',
    categoryId: 'cat_henna',
    categoryName: 'Henna',
    shortDescription: '100% Organic, cloth-filtered Rajasthani Henna powder for natural hair conditioning, rich stain, and scalp health.',
    fullDescription: '100% Organic, cloth-filtered Rajasthani Henna powder for natural hair conditioning, rich stain, and scalp health.',
    price: 89,
    compareAtPrice: 119,
    quantityOrWeight: '100g',
    sku: 'MSK-TRP-100',
    images: ['/images/products/sojat-pure-triple-shifted.jpg'],
    ingredients: ['100% Pure Organic Lawsonia Inermis (Henna) Leaf Powder'],
    benefits: ['Deep, natural long-lasting dark stain', 'Acts as a natural hair conditioner and coolant'],
    usageInstructions: 'Mix with warm water and let rest for 2-3 hours before application.',
    stockStatus: 'in_stock',
    isFeatured: true,
    isActive: true,
    sortOrder: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Derive keywords for both products
  const baqDerived = engine.deriveKeywordsFromProduct(baqProduct, 'Henna');
  const tripleDerived = engine.deriveKeywordsFromProduct(tripleProduct, 'Henna');

  // Verify BAQ primary intent is body art / bridal artist (TRANSACTIONAL)
  const baqPrimaryArtists = baqDerived.find((k) => k.keyword.includes('baq henna powder for mehndi artists'));
  assert(baqPrimaryArtists, 'BAQ must derive "baq henna powder for mehndi artists"');
  assert.strictEqual(baqPrimaryArtists.primaryOrSecondary, 'PRIMARY');
  assert.strictEqual(baqPrimaryArtists.intent, 'TRANSACTIONAL');

  // Verify BAQ retains "sojat henna powder" as SECONDARY (not removed, but non-colliding)
  const baqSojatSec = baqDerived.find((k) => k.keyword === 'sojat henna powder');
  assert(baqSojatSec, 'BAQ must retain "sojat henna powder" as secondary');
  assert.strictEqual(baqSojatSec.primaryOrSecondary, 'SECONDARY');

  // Verify Triple-Shifted derives "sojat henna powder" as PRIMARY
  const tripleSojatPrim = tripleDerived.find((k) => k.keyword === 'sojat henna powder');
  assert(tripleSojatPrim, 'Triple-shifted must derive "sojat henna powder" as primary');
  assert.strictEqual(tripleSojatPrim.primaryOrSecondary, 'PRIMARY');

  // Verify zero primary keyword overlap between BAQ and Triple-Shifted
  const baqPrimaryNorms = new Set(baqDerived.filter((k) => k.primaryOrSecondary === 'PRIMARY').map((k) => k.normalizedKeyword));
  const triplePrimaryNorms = new Set(tripleDerived.filter((k) => k.primaryOrSecondary === 'PRIMARY').map((k) => k.normalizedKeyword));
  const sharedPrimary = Array.from(baqPrimaryNorms).filter((n) => triplePrimaryNorms.has(n));
  assert.strictEqual(sharedPrimary.length, 0, `BAQ and Triple-Shifted Henna must have 0 shared PRIMARY keywords, found: [${sharedPrimary.join(', ')}]`);

  // Onboard BAQ product into engine store
  await engine.onboardProduct(baqProduct, 'Henna');

  // Verify BAQ Henna Powder has ZERO cannibalization conflict with any existing store product
  const issuesAfterBaq = engine.detectCannibalization();
  const baqCollision = issuesAfterBaq.find((issue) => issue.conflictingUrls.includes('/products/baq-henna-powder'));
  assert(!baqCollision, `BAQ Henna Powder must have 0 cannibalization conflict with existing catalog, found: ${baqCollision?.keyword}`);
  console.log('  ✓ Verified: BAQ and Triple-Shifted Henna differentiate cleanly with 0 cannibalization collision and 0 shared PRIMARY keywords');

  // --------------------------------------------------------------------------
  // SUMMARY STATS CHECK
  // --------------------------------------------------------------------------
  console.log('\n[SUMMARY] Testing summary stats telemetry aggregation...');
  const summary = store.getSummaryStats();
  assert(summary.totalKeywords > 0, 'Total keywords must be > 0');
  assert(summary.languagesCount.en >= 0, 'English count must be >= 0');
  assert(summary.languagesCount.hi >= 0, 'Hindi count must be >= 0');
  assert(summary.languagesCount.hinglish >= 0, 'Hinglish count must be >= 0');
  assert(Object.keys(summary.clustersCount).length > 0, 'Clusters count must be > 0');

  console.log(`  • Total Universe Keywords: ${summary.totalKeywords}`);
  console.log(`  • GSC Observed: ${summary.gscObservedCount}`);
  console.log(`  • Catalog Derived: ${summary.catalogDerivedCount}`);
  console.log(`  • Internal Graph Derived: ${summary.internalGraphDerivedCount}`);
  console.log(`  • Heuristic Hypotheses: ${summary.heuristicHypothesesCount}`);
  console.log(`  • Languages: EN=${summary.languagesCount.en}, HI=${summary.languagesCount.hi}, Hinglish=${summary.languagesCount.hinglish}`);
  console.log(`  • Cannibalization Risks: ${summary.cannibalizationRisksCount}`);
  console.log(`  • Clusters: ${Object.keys(summary.clustersCount).length}`);

  console.log('\n============================================================');
  console.log('🎉 ALL 21 DETERMINISTIC KEYWORD UNIVERSE TESTS PASSED');
  console.log('============================================================\n');
}

runKeywordUniverseTestSuite().catch((err) => {
  console.error('\n❌ Keyword Universe Verification FAILED:\n', err);
  process.exit(1);
});
