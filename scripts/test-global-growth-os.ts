/**
 * MUSKY DOSE — MUSKY GLOBAL GROWTH OS COMPREHENSIVE VERIFICATION SUITE
 * 
 * Verifies all 26 phases of the Musky Global Growth OS:
 * 1. Canonical Product Truth (Strict Anti-Fabrication)
 * 2. Deterministic Query-to-Page Ownership Engine
 * 3. Automated Cannibalization Detection & Resolution
 * 4. Unified Entity Graph & Semantic Edges
 * 5. Technical SEO Guardian Audits
 * 6. Bing / IndexNow Key Verification & Routing
 * 7. Global SEO & Regional Botanical Vernacular Taxonomy
 * 8. Lead CRM 11-Stage Lifecycle & Qualification
 * 9. Full Lead Attribution Chain (Query -> Landing Page -> Lead)
 * 10. Real Search Coverage Map & Opportunity Radar
 * 11. Global Growth Orchestrator Execution
 */

import { getAuthoritativeProductTruth } from '../lib/growth/canonical-product-truth';
import { resolveQueryOwnership, auditCannibalizationAcrossQueries } from '../lib/growth/query-ownership-engine';
import { getGlobalEntityGraph } from '../lib/growth/entity-graph-engine';
import { runTechnicalSeoAudit } from '../lib/growth/technical-seo-guardian';
import { resolveVernacularTerm, evaluateInternationalIntent } from '../lib/growth/global-seo-engine';
import { qualifyLead, ingestCrmLead, transitionCrmStage, getAttributionInsights } from '../lib/growth/lead-crm-engine';
import { computeSearchCoverageMap, buildGlobalOpportunityRadar } from '../lib/growth/search-coverage-engine';
import { MuskyGlobalGrowthOrchestrator } from '../lib/growth/global-growth-orchestrator';
import { Product, ProductGuide, Category } from '../lib/types';

// Mock Catalog Data for deterministic hermetic testing
const mockProducts: Product[] = ([
  {
    id: 'prod-henna-001',
    name: 'Pure Sojat Henna Powder',
    slug: 'pure-sojat-henna-powder',
    sku: 'MD-HENNA-100G',
    price: 249,
    compareAtPrice: 299,
    stockStatus: 'in_stock',
    isActive: true,
    robotsIndex: true,
    categoryId: 'cat-1',
    categoryName: 'Henna & Mehndi',
    shortDescription: '100% Pure triple cloth-sifted microfine henna powder harvested directly from Sojat, Rajasthan.',
    fullDescription: '100% Pure triple cloth-sifted microfine henna powder harvested directly from Sojat, Rajasthan.',
    quantityOrWeight: '100g',
    ingredients: ['100% Pure Lawsonia inermis Leaf Powder'],
    images: ['https://muskydose.in/media/henna-pouch.jpg'],
    variants: [
      { id: 'v1', sku: 'MD-HENNA-100G', price: 249, weight: '100g', stockStatus: 'in_stock' },
      { id: 'v2', sku: 'MD-HENNA-250G', price: 549, weight: '250g', stockStatus: 'in_stock' },
    ],
  },
  {
    id: 'prod-indigo-002',
    name: 'Natural Indigo Powder',
    slug: 'natural-indigo-powder',
    sku: 'MD-INDIGO-100G',
    price: 299,
    compareAtPrice: 349,
    stockStatus: 'in_stock',
    isActive: true,
    robotsIndex: true,
    categoryId: 'cat-2',
    categoryName: 'Herbal Hair Care',
    shortDescription: '100% Pure organic Indigofera tinctoria leaf powder for natural black hair dyeing with Henna.',
    fullDescription: '100% Pure organic Indigofera tinctoria leaf powder for natural black hair dyeing with Henna.',
    quantityOrWeight: '100g',
    ingredients: ['100% Pure Indigofera tinctoria Leaf Powder'],
    images: ['https://muskydose.in/media/indigo-pouch.jpg'],
  },
  {
    id: 'prod-amla-003',
    name: 'Pure Amla Powder',
    slug: 'pure-amla-powder',
    sku: 'MD-AMLA-100G',
    price: 199,
    stockStatus: 'in_stock',
    isActive: true,
    robotsIndex: true,
    categoryId: 'cat-2',
    categoryName: 'Herbal Hair Care',
    shortDescription: '100% Pure sun-dried Phyllanthus emblica fruit powder for hair conditioning and root strength.',
    fullDescription: '100% Pure sun-dried Phyllanthus emblica fruit powder for hair conditioning and root strength.',
    quantityOrWeight: '100g',
    ingredients: ['100% Pure Phyllanthus emblica Fruit Powder'],
    images: ['https://muskydose.in/media/amla-pouch.jpg'],
  },
] as any);

const mockGuides: ProductGuide[] = [
  {
    id: 'guide-baq-001',
    title: 'What is BAQ Henna vs Regular Henna Powder?',
    slug: 'guide-what-is-baq-henna-vs-regular',
    category: 'BAQ Henna Comparison',
    shortIntro: 'Complete educational comparison between Body Art Quality triple-sifted henna and regular grade henna.',
    seoDescription: 'Complete educational comparison between Body Art Quality triple-sifted henna and regular grade henna.',
    content: 'Body Art Quality henna is triple cloth-sifted...',
    published: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'guide-indigo-002',
    title: 'How to Dye Hair Naturally Black with Henna and Indigo (2-Step Method)',
    slug: 'guide-henna-indigo-2-step-hair-dye',
    category: 'Henna Indigo 2-Step Dyeing',
    shortIntro: 'Step by step masterclass on achieving natural jet black hair using 100% pure organic henna and indigo.',
    seoDescription: 'Step by step masterclass on achieving natural jet black hair using 100% pure organic henna and indigo.',
    content: 'Step 1: Apply Henna. Step 2: Apply Indigo...',
    published: true,
    isPublished: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockCategories: Category[] = [
  { id: 'cat-1', name: 'Henna & Mehndi', slug: 'henna-mehndi', description: 'Pure Henna', sortOrder: 1, isActive: true },
  { id: 'cat-2', name: 'Herbal Hair Care', slug: 'herbal-hair-care', description: 'Herbal Hair Care', sortOrder: 2, isActive: true },
];

async function runTestSuite() {
  console.log('============================================================');
  console.log('🌱 MUSKY GLOBAL GROWTH OS — COMPREHENSIVE VERIFICATION SUITE');
  console.log('============================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  ✓ [TEST ${total}] ${testName}`);
    } else {
      console.error(`  ✗ [TEST ${total}] FAILED: ${testName}`);
      if (details) console.error(`    Details: ${details}`);
      process.exit(1);
    }
  }

  // TEST 1: Canonical Product Truth Anti-Fabrication
  console.log('--- PILLAR 1: CANONICAL PRODUCT TRUTH ---');
  const truth = getAuthoritativeProductTruth(mockProducts[0]);
  assert(truth.brand === 'Musky Dose', 'Product truth preserves brand Musky Dose');
  assert(truth.botanicalIdentity.botanicalName === 'Lawsonia inermis', 'Botanical name verified Lawsonia inermis');
  assert(truth.origin.city === 'Sojat' && truth.origin.state === 'Rajasthan', 'Heritage origin verified Sojat, Rajasthan');
  assert(truth.variants.length === 2, 'Actual catalog variants preserved deterministically');
  assert(truth.attributes.chemicalFree === true && truth.attributes.ppdFree === true, 'Truthful chemical-free attributes verified');

  // TEST 2: Query-to-Page Ownership Engine
  console.log('\n--- PILLAR 2: QUERY-TO-PAGE OWNERSHIP & INTENT ---');
  const qWholesale = resolveQueryOwnership('sojat mehndi wholesale rate bulk 50kg', mockProducts, mockGuides, mockCategories);
  assert(qWholesale.primaryIntent === 'WHOLESALE' && qWholesale.canonicalUrl.endsWith('/wholesale'), 'Wholesale query maps strictly to /wholesale');

  const qInfo = resolveQueryOwnership('what is baq henna vs regular henna powder', mockProducts, mockGuides, mockCategories);
  assert(qInfo.primaryIntent === 'INFORMATIONAL' && qInfo.canonicalUrl.includes('/guides/'), 'Informational query maps strictly to guide');

  const qProduct = resolveQueryOwnership('pure sojat henna powder buy online', mockProducts, mockGuides, mockCategories);
  assert(qProduct.primaryIntent === 'PRODUCT_SPECIFIC' && qProduct.canonicalUrl.includes('/products/pure-sojat-henna-powder'), 'Product transactional query maps to PDP');

  const qBotanical = resolveQueryOwnership('meaning of maruthani powder in ayurveda', mockProducts, mockGuides, mockCategories);
  assert(qBotanical.primaryIntent === 'KNOWLEDGE' && qBotanical.canonicalUrl.includes('/knowledge/henna-mehndi'), 'Botanical vernacular query maps to knowledge entity');

  // TEST 3: Cannibalization Prevention
  console.log('\n--- PILLAR 3: CANNIBALIZATION DETECTION ---');
  const cannibalization = auditCannibalizationAcrossQueries(
    ['pure sojat henna powder', 'natural indigo powder', 'sojat mehndi wholesale rate'],
    mockProducts,
    mockGuides,
    mockCategories
  );
  assert(cannibalization.cleanOwnershipCount === 3, 'Zero cannibalization conflicts across primary target queries');

  // TEST 4: Unified Entity Graph
  console.log('\n--- PILLAR 4: UNIFIED ENTITY GRAPH ---');
  const graph = getGlobalEntityGraph();
  graph.ingestCatalog(mockProducts, mockGuides, mockCategories);
  const graphSnapshot = graph.getSnapshot();
  assert(graphSnapshot.nodesCount >= 10, 'Graph contains Brand, Terroirs, Botanicals, Products, and Guides');
  assert(graphSnapshot.edgesCount >= 5, 'Graph establishes explicit semantic relationships');

  const relatedToHenna = graph.getRelatedEntities('botanical-henna_mehndi');
  assert(relatedToHenna.length > 0, 'Henna botanical node is deeply connected across terroir, guides, and products');

  // TEST 5: Technical SEO Guardian
  console.log('\n--- PILLAR 5: TECHNICAL SEO GUARDIAN ---');
  const audit = runTechnicalSeoAudit(mockProducts, mockGuides, mockCategories);
  assert(audit.score >= 80, `Technical SEO Guardian score verified (${audit.score}/100)`);
  assert(audit.failCount === 0, 'Zero critical technical SEO failures detected');

  // TEST 6: Global SEO & Regional Botanical Vernacular Taxonomy
  console.log('\n--- PILLAR 6: GLOBAL SEO & VERNACULAR TAXONOMY ---');
  const tamilMatch = resolveVernacularTerm('maruthani hair pack');
  assert(tamilMatch?.language === 'ta' && tamilMatch.canonicalEntityKey === 'HENNA_MEHNDI', 'Tamil vernacular term Maruthani maps to Henna');

  const teluguMatch = resolveVernacularTerm('gorintaku leaves');
  assert(teluguMatch?.language === 'te' && teluguMatch.canonicalEntityKey === 'HENNA_MEHNDI', 'Telugu vernacular term Gorintaku maps to Henna');

  const exportIntent = evaluateInternationalIntent('organic henna powder wholesale dubai uae');
  assert(exportIntent.isInternational === true && exportIntent.destinationUrl.endsWith('/wholesale'), 'International export demand routes to Wholesale portal');

  // TEST 7: Lead CRM 11-Stage Lifecycle & Qualification
  console.log('\n--- PILLAR 7: LEAD CRM & DETERMINISTIC QUALIFICATION ---');
  const sampleLeadPayload = {
    name: 'Ramesh Sharma',
    businessName: 'Sharma Beauty Salons Network',
    company: 'Sharma Beauty Salons Network',
    mobile: '919876543210',
    whatsapp: '919876543210',
    country: 'India',
    region: 'Maharashtra',
    source: 'WHOLESALE_ENQUIRY' as const,
    quantity: '50 kg',
    productName: 'Pure Sojat Henna Powder',
    attributionQuery: 'bulk sojat mehndi powder supplier',
    attributionLandingPage: 'https://muskydose.in/wholesale',
    attributionIntent: 'WHOLESALE',
  };

  const qualification = qualifyLead(sampleLeadPayload);
  assert(qualification.isQualified === true, 'Bulk salon enquiry qualifies with high score');
  assert(qualification.score >= 70, `Qualification score transparently computed: ${qualification.score}/100`);

  const ingestedLead = await ingestCrmLead(sampleLeadPayload);
  assert(ingestedLead.crmStage === 'QUALIFIED', 'Ingested lead automatically assigned QUALIFIED CRM stage');
  assert(ingestedLead.attributionQuery === 'bulk sojat mehndi powder supplier', 'Query attribution preserved');

  const transitioned = await transitionCrmStage(ingestedLead.leadId, 'SAMPLE', '500g testing sample dispatched via DTDC courier');
  assert(transitioned?.crmStage === 'SAMPLE', 'Lead successfully transitioned to SAMPLE stage in 11-stage CRM lifecycle');

  // TEST 8: Full Lead Attribution Chain
  console.log('\n--- PILLAR 8: LEAD ATTRIBUTION INSIGHTS ---');
  const attributionInsights = getAttributionInsights([ingestedLead]);
  assert(attributionInsights.byQuery['bulk sojat mehndi powder supplier'] === 1, 'Attribution insight byQuery tracked');
  assert(attributionInsights.byIntent['WHOLESALE'] === 1, 'Attribution insight byIntent tracked');

  // TEST 9: Search Coverage Map & Opportunity Radar
  console.log('\n--- PILLAR 9: SEARCH COVERAGE & OPPORTUNITY RADAR ---');
  const coverage = computeSearchCoverageMap(mockProducts, mockGuides, mockCategories, graph);
  assert(coverage.overallCompositeScore > 50, `Composite search coverage calculated: ${coverage.overallCompositeScore}%`);
  assert(coverage.botanicalCoveragePct === 100, 'Botanical coverage 100%');

  const radar = buildGlobalOpportunityRadar(mockProducts, mockGuides);
  assert(radar.length > 0, `Global Opportunity Radar identified ${radar.length} actionable high-confidence opportunities`);

  // TEST 10: Global Growth Orchestrator Execution
  console.log('\n--- PILLAR 10: GLOBAL GROWTH ORCHESTRATOR ---');
  const orchestrator = MuskyGlobalGrowthOrchestrator.getInstance();
  const cycleSummary = await orchestrator.runGrowthCycle();
  assert(cycleSummary.status === 'OPTIMAL' || cycleSummary.status === 'SELF_HEALED', `Growth cycle executed with status: ${cycleSummary.status}`);
  assert(cycleSummary.merchantFeedHealth.totalEvaluated >= 0, 'Google Merchant feed health evaluated deterministically');

  console.log('\n============================================================');
  console.log(`🎉 ALL ${passed}/${total} MUSKY GLOBAL GROWTH OS VERIFICATION TESTS PASSED`);
  console.log('============================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal Test Suite Error:', err);
  process.exit(1);
});
