import assert from 'node:assert';
import {
  tokenizeText,
  computeTokenOverlap,
  generateVisualContext,
  scoreProductGuideRelationship,
  scoreProductKnowledgeRelationship,
  scoreGuideKnowledgeRelationship,
  isRelationshipPubliclyVisible,
  saveRelationshipOverride,
  getRelatedGuidesForProduct,
  getRelatedProductsForGuide,
  getRelatedKnowledgeForProduct,
  getOmnichannelContextForEntity,
  EntityRelationshipRecord,
} from '../lib/growth/entity-relationships';
import { Product, ProductGuide, Category } from '../lib/types';
import { getEntity, CANONICAL_ENTITY_REGISTRY } from '../lib/growth/entity-registry';

async function runStep1Tests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 1 STEP 1: RELATIONSHIPS & VISUAL CONTEXT TESTS');
  console.log('===============================================================');

  // --------------------------------------------------------------------------
  // TEST SUITE 1: Tokenization & Similarity Utility
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Tokenization & Jaccard Overlap ---');
  const tokensA = tokenizeText('Pure Natural Sojat Henna Powder for Bridal Mehndi');
  const tokensB = tokenizeText('How to Mix BAQ Henna for Dark Bridal Mehndi Stain');
  assert.ok(tokensA.has('henna'), 'Must stem lowercase token "henna"');
  assert.ok(tokensA.has('sojat'), 'Must include "sojat"');
  assert.ok(!tokensA.has('for'), 'Must exclude stop word "for"');
  assert.ok(!tokensA.has('pure'), 'Must exclude stop word "pure"');

  const overlap = computeTokenOverlap(tokensA, tokensB);
  assert.ok(overlap > 0.15, `Overlap must be > 0.15, got ${overlap}`);
  console.log(`  ✓ Token overlap verified: ${(overlap * 100).toFixed(1)}% (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST SUITE 2: Visual Context Contract Verification
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Visual Context Contract ---');
  const sampleProduct: Product = {
    id: 'prod-henna-baq',
    name: 'BAQ Henna Powder 250g',
    slug: 'baq-henna-powder',
    price: 249,
    categoryName: 'Henna',
    categoryId: 'cat-henna',
    sellingUnit: 'kg',
    shortDescription: 'Pure Sojat BAQ henna powder for dark bridal stain.',
    fullDescription: 'Finely sifted body art quality henna powder harvested from Rajasthan.',
    quantityOrWeight: '250g',
    sku: 'MD-HEN-BAQ-250G',
    images: ['/images/fallback.svg'],
    ingredients: ['Lawsonia Inermis'],
    benefits: ['Deep stain', 'Cooling scalp'],
    usageInstructions: 'Mix with warm water and essential oils.',
    stockStatus: 'in_stock',
    isFeatured: true,
    sortOrder: 1,
    seoKeywords: ['henna', 'body art', 'sojat', 'bridal'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const prodVisual = generateVisualContext({
    entityType: 'PRODUCT',
    entity: sampleProduct,
  });

  assert.strictEqual(prodVisual.entityType, 'PRODUCT');
  assert.strictEqual(prodVisual.suggestedVisualType, '3D_PRODUCT_RENDER');
  assert.ok(prodVisual.entityKeywords.length > 0, 'Must have canonical keywords');
  assert.ok(prodVisual.visualSubjects.length >= 2, 'Must provide visual subjects');
  assert.ok(prodVisual.antiHallucinationConstraints.length >= 2, 'Must include anti-hallucination rules');
  console.log('  ✓ Product Visual Context contract validated: 3D_PRODUCT_RENDER (PASSED)');

  const sampleGuide: ProductGuide = {
    id: 'guide-1',
    title: 'How to Mix BAQ Henna for Dark Bridal Stain',
    slug: 'how-to-mix-baq-henna-bridal',
    shortIntro: 'Master the traditional Rajasthani technique for mixing BAQ henna.',
    ingredients: ['Lawsonia Inermis', 'Eucalyptus Oil', 'Lemon Juice'],
    keyBenefits: ['Deep mahogany color', 'Smooth cone paste flow'],
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const guideVisual = generateVisualContext({
    entityType: 'GUIDE',
    entity: sampleGuide,
  });

  assert.strictEqual(guideVisual.entityType, 'GUIDE');
  assert.strictEqual(guideVisual.suggestedVisualType, 'INSTRUCTIONAL_INFOGRAPHIC');
  console.log('  ✓ Guide Visual Context contract validated: INSTRUCTIONAL_INFOGRAPHIC (PASSED)');

  const hennaKnowledge = getEntity('HENNA_MEHNDI')!;
  const knowledgeVisual = generateVisualContext({
    entityType: 'KNOWLEDGE',
    entity: hennaKnowledge,
  });
  assert.strictEqual(knowledgeVisual.entityType, 'KNOWLEDGE');
  assert.strictEqual(knowledgeVisual.suggestedVisualType, 'EDUCATIONAL_ILLUSTRATION');
  console.log('  ✓ Knowledge Visual Context contract validated: EDUCATIONAL_ILLUSTRATION (PASSED)');

  // --------------------------------------------------------------------------
  // TEST SUITE 3: Deterministic Product -> Guide Scoring & Explainability
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Deterministic Relevance Scoring & Explainability ---');
  const scoring1 = scoreProductGuideRelationship(sampleProduct, sampleGuide);
  assert.ok(scoring1.score >= 0.65, `Expected score >= 0.65, got ${scoring1.score}`);
  assert.ok(scoring1.reasons.includes('BOTANICAL_MATCH'), 'Must identify botanical alignment');
  assert.ok(scoring1.reasons.length > 0, 'Reasons must be explainable');
  console.log(`  ✓ BAQ Henna -> Mix Guide: Score = ${scoring1.score}, Reasons = [${scoring1.reasons.join(', ')}] (PASSED)`);

  // Direct explicit link invariant (must score 1.0)
  const directlyLinkedGuide: ProductGuide = {
    ...sampleGuide,
    productId: sampleProduct.id,
  };
  const directScoring = scoreProductGuideRelationship(sampleProduct, directlyLinkedGuide);
  assert.strictEqual(directScoring.score, 1.0, 'Explicit link must score 1.0');
  assert.ok(directScoring.reasons.includes('EXPLICIT_LINK'));
  console.log('  ✓ Direct Foreign Key link scores 1.0 with EXPLICIT_LINK (PASSED)');

  // --------------------------------------------------------------------------
  // TEST SUITE 4: GSC Query Signals Boost
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: GSC-Ready Scoring Signals ---');
  const gscSignals = [
    { query: 'baq henna powder for bridal stain', impressions: 350, clicks: 25, ctr: 0.07, position: 3.2 },
  ];
  const gscScoring = scoreProductGuideRelationship(sampleProduct, sampleGuide, {
    growthKeywords: gscSignals,
  });
  assert.ok(gscScoring.score >= scoring1.score, 'GSC signal must boost score or maintain');
  assert.ok(gscScoring.reasons.includes('GSC_SIGNAL'), 'Must record GSC_SIGNAL in reasons');
  console.log(`  ✓ GSC query signal boosted score: ${scoring1.score} -> ${gscScoring.score} with GSC_SIGNAL (PASSED)`);

  // --------------------------------------------------------------------------
  // TEST SUITE 5: Governance & Rejection Suppression (Fail-Closed)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Governance & Rejection Suppression ---');
  const approvedRecord: EntityRelationshipRecord = {
    id: 'rel-1',
    sourceType: 'PRODUCT',
    sourceId: 'prod-1',
    targetType: 'GUIDE',
    targetId: 'guide-1',
    relationshipType: 'PRODUCT_GUIDE',
    relevanceScore: 0.85,
    confidence: 'HIGH',
    status: 'approved',
    reasons: ['BOTANICAL_MATCH'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const rejectedRecord: EntityRelationshipRecord = {
    ...approvedRecord,
    id: 'rel-2',
    status: 'rejected',
  };

  assert.strictEqual(isRelationshipPubliclyVisible(approvedRecord), true, 'Approved record must be visible');
  assert.strictEqual(isRelationshipPubliclyVisible(rejectedRecord), false, 'Rejected record must NEVER be visible');
  console.log('  ✓ Strict safety invariant: Rejected records are 100% suppressed from public visibility (PASSED)');

  // --------------------------------------------------------------------------
  // TEST SUITE 6: Future Universal Entity Verification (Zero Hardcoding)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Future Universal Entity Discovery (No Hardcoded Branches) ---');
  // Synthetic novel botanical product that does not exist in hardcoded lists
  const novelHibiscusProduct: Product = {
    id: 'prod-future-hibiscus-powder',
    name: 'Organic Sojat Hibiscus Scalp Petal Powder',
    slug: 'organic-sojat-hibiscus-scalp-powder',
    price: 199,
    categoryName: 'Hair Care',
    categoryId: 'cat-hair-care',
    sellingUnit: 'kg',
    shortDescription: 'Pure dried hibiscus petal powder.',
    fullDescription: 'Finely ground hibiscus petals for clarifying and conditioning hair.',
    quantityOrWeight: '100g',
    sku: 'MD-HIB-100G',
    images: ['/images/fallback.svg'],
    ingredients: ['Hibiscus Rosa-Sinensis'],
    benefits: ['Scalp conditioning', 'Hair softness'],
    usageInstructions: 'Mix with warm water into a smooth paste.',
    stockStatus: 'in_stock',
    isFeatured: false,
    sortOrder: 10,
    seoKeywords: ['hibiscus', 'scalp conditioning', 'hair pack', 'gudhal'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const hibiscusKnowledge = getEntity('HIBISCUS')!;
  const novelScore = scoreProductKnowledgeRelationship(novelHibiscusProduct, hibiscusKnowledge);
  assert.ok(novelScore.score >= 0.80, `Novel Hibiscus product must resolve to HIBISCUS knowledge entity, got ${novelScore.score}`);
  assert.ok(novelScore.reasons.includes('BOTANICAL_MATCH'));
  console.log(`  ✓ Future Novel Product (Hibiscus) matched HIBISCUS entity: Score = ${novelScore.score} (PASSED)`);

  // Assert Henna product does NOT match Indigo as a botanical match (No cross-botanical contamination)
  const crossMatch = scoreProductKnowledgeRelationship(sampleProduct, getEntity('INDIGO')!);
  assert.ok(!crossMatch.reasons.includes('BOTANICAL_MATCH'), 'Henna product must NOT botanically match Indigo');
  console.log('  ✓ No botanical contamination: Henna product does not claim Indigo botanical match (PASSED)');

  // --------------------------------------------------------------------------
  // TEST SUITE 7: Omnichannel Future Platform Hooks
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Omnichannel & Social / GBP Hooks ---');
  const omnichannel = await getOmnichannelContextForEntity('PRODUCT', sampleProduct);
  assert.ok(omnichannel.approvedKeywords.length > 0, 'Must provide approved keywords');
  assert.ok(omnichannel.socialCopyHooks.headline.length > 0, 'Must produce copy headline');
  assert.ok(omnichannel.socialCopyHooks.hashtags.includes('#MuskyDose'), 'Must include brand hashtag');
  assert.strictEqual(omnichannel.visualContext.suggestedVisualType, '3D_PRODUCT_RENDER');
  console.log('  ✓ Omnichannel adapter produces clean visual & social payload (PASSED)');

  console.log('\n===============================================================');
  console.log('ALL PHASE 1 STEP 1 TESTS PASSED SUCCESSFULLY!');
  console.log('===============================================================');
}

runStep1Tests().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
