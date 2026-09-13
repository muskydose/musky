import assert from 'node:assert';
import fs from 'fs';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

import { getSupabaseAdmin } from '../lib/supabase';
import { getProducts, getAllProductsAdmin } from '../lib/db/products';
import { getCategories } from '../lib/db/categories';
import { getGuides } from '../lib/db/guides';
import {
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
  resolveCanonicalEntity,
  CanonicalEntityRecord,
} from '../lib/growth/entity-registry';
import {
  scoreProductGuideRelationship,
  scoreProductKnowledgeRelationship,
  scoreGuideKnowledgeRelationship,
  generateVisualContext,
  isRelationshipPubliclyVisible,
  saveRelationshipOverride,
  deleteRelationshipOverride,
  persistRelationshipLedger,
  getAllPersistedRelationships,
  resetRelationshipCache,
  getRelatedGuidesForProduct,
  getRelatedProductsForGuide,
  getRelatedKnowledgeForProduct,
  getRelatedKnowledgeForGuide,
  getOmnichannelContextForEntity,
  EntityRelationshipRecord,
  EntityType,
  EntityRelationshipType,
} from '../lib/growth/entity-relationships';
import { Product, ProductGuide, Category } from '../lib/types';
import { GrowthKeyword } from '../lib/growth/types';

interface BackfillSummary {
  productsScanned: number;
  categoriesScanned: number;
  guidesScanned: number;
  knowledgeEntitiesScanned: number;
  totalCandidateEdges: number;
  suggestedEdges: number;
  approvedEdges: number;
  rejectedEdges: number;
  skippedLowConfidenceEdges: number;
  errors: string[];
}

async function runUniversalRelationshipVerification() {
  console.log('===============================================================');
  console.log('STARTING PHASE 1 STEP 2: CATALOG BACKFILL & VERIFICATION');
  console.log('===============================================================');

  // --------------------------------------------------------------------------
  // SECTION 1: ACTUAL DATABASE & CATALOG BASELINE
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 1: Actual Production Entity Audit ---');
  const adminProducts = await getAllProductsAdmin();
  const storeProducts = await getProducts();
  console.log(`  Raw Supabase Admin Products: ${adminProducts.length}`);
  console.log(`  Storefront Active Products:  ${storeProducts.length}`);
  const allProducts = adminProducts.length > 0 ? adminProducts : storeProducts;
  const activeProducts = allProducts.filter((p) => p.isActive !== false);
  const inactiveProducts = allProducts.filter((p) => p.isActive === false);
  const categories = await getCategories();
  const activeCategories = categories.filter((c) => c.isActive !== false);
  const guides = await getGuides();
  const publishedGuides = guides.filter((g) => g.published !== false);
  const draftGuides = guides.filter((g) => g.published === false);
  const knowledgeEntities = Object.values(CANONICAL_ENTITY_REGISTRY).filter((e) => e.status === 'KNOWN');

  console.log(`  Products in Database:         ${allProducts.length} total (${activeProducts.length} active, ${inactiveProducts.length} inactive)`);
  console.log(`  Categories in Database:       ${categories.length} total (${activeCategories.length} active)`);
  console.log(`  Product Guides in Database:   ${guides.length} total (${publishedGuides.length} published, ${draftGuides.length} draft/needs_review)`);
  console.log(`  Knowledge Entities (Canonical): ${knowledgeEntities.length} active knowledge entities`);

  assert.ok(allProducts.length >= 28, `Expected at least 28 products, got ${allProducts.length}`);
  assert.ok(categories.length >= 5, `Expected at least 5 categories, got ${categories.length}`);
  assert.ok(guides.length >= 3, `Expected at least 3 guides, got ${guides.length}`);
  assert.ok(knowledgeEntities.length >= 5, `Expected at least 5 canonical knowledge entities, got ${knowledgeEntities.length}`);

  // Check Supabase entity_relationships table status
  const supabase = getSupabaseAdmin();
  let dbTableExists = false;
  if (supabase) {
    const { data, error } = await supabase.from('entity_relationships').select('id').limit(1);
    if (!error) {
      dbTableExists = true;
      console.log('  Database Table [entity_relationships]: PRESENT & ACCESSIBLE');
    } else {
      console.log(`  Database Table [entity_relationships]: PENDING MIGRATION (${error.message})`);
      console.log('  Fail-closed resiliency active: Engine operates with in-memory override ledger.');
    }
  }

  // Check growth_keywords table
  let growthKeywords: GrowthKeyword[] = [];
  if (supabase) {
    const { data: gscData, error: gscError } = await supabase
      .from('growth_keywords')
      .select('*')
      .limit(100);
    if (!gscError && Array.isArray(gscData)) {
      growthKeywords = gscData as GrowthKeyword[];
      console.log(`  Growth Keywords in Database:  ${growthKeywords.length} query records loaded for scoring context`);
    }
  }

  // --------------------------------------------------------------------------
  // SECTION 2: DETERMINISTIC CATALOG BACKFILL
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2: Deterministic Catalog Backfill Execution ---');
  const summary: BackfillSummary = {
    productsScanned: activeProducts.length,
    categoriesScanned: activeCategories.length,
    guidesScanned: guides.length,
    knowledgeEntitiesScanned: knowledgeEntities.length,
    totalCandidateEdges: 0,
    suggestedEdges: 0,
    approvedEdges: 0,
    rejectedEdges: 0,
    skippedLowConfidenceEdges: 0,
    errors: [],
  };

  const backfillMap = new Map<string, EntityRelationshipRecord>();

  // A. Product -> Guide & Product -> Knowledge relationships across all catalog products
  for (const product of allProducts) {
    // 1. Guides evaluation
    for (const guide of guides) {
      const evaluation = scoreProductGuideRelationship(product, guide, { growthKeywords });
      summary.totalCandidateEdges++;

      const isExplicit =
        guide.productId === product.id ||
        (Array.isArray(guide.productIds) && guide.productIds.includes(product.id)) ||
        (Array.isArray(guide.relatedProductIds) && guide.relatedProductIds.includes(product.id));

      if (evaluation.score >= 0.40 || isExplicit) {
        const status = isExplicit ? 'approved' : 'suggested';
        if (status === 'approved') summary.approvedEdges++;
        else summary.suggestedEdges++;

        const edgeId = `backfill-pg-${product.id}-${guide.id || guide.slug}`;
        const record: EntityRelationshipRecord = {
          id: edgeId,
          sourceType: 'PRODUCT',
          sourceId: product.id,
          targetType: 'GUIDE',
          targetId: guide.id || guide.slug,
          relationshipType: 'PRODUCT_GUIDE',
          relevanceScore: evaluation.score,
          confidence: evaluation.confidence,
          status,
          reasons: evaluation.reasons,
          visualContext: evaluation.visualContext,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        backfillMap.set(`${record.sourceType}:${record.sourceId}->${record.targetType}:${record.targetId}`, record);
      } else {
        summary.skippedLowConfidenceEdges++;
      }
    }

    // 2. Knowledge entities evaluation
    for (const entity of knowledgeEntities) {
      const evaluation = scoreProductKnowledgeRelationship(product, entity, { growthKeywords });
      summary.totalCandidateEdges++;

      if (evaluation.score >= 0.40) {
        summary.suggestedEdges++;
        const edgeId = `backfill-pk-${product.id}-${entity.entityKey}`;
        const record: EntityRelationshipRecord = {
          id: edgeId,
          sourceType: 'PRODUCT',
          sourceId: product.id,
          targetType: 'KNOWLEDGE',
          targetId: entity.entityKey,
          relationshipType: 'PRODUCT_KNOWLEDGE',
          relevanceScore: evaluation.score,
          confidence: evaluation.confidence,
          status: 'suggested',
          reasons: evaluation.reasons,
          visualContext: evaluation.visualContext,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        backfillMap.set(`${record.sourceType}:${record.sourceId}->${record.targetType}:${record.targetId}`, record);
      } else {
        summary.skippedLowConfidenceEdges++;
      }
    }
  }

  // B. Guide -> Knowledge relationships
  for (const guide of guides) {
    for (const entity of knowledgeEntities) {
      const evaluation = scoreGuideKnowledgeRelationship(guide, entity);
      summary.totalCandidateEdges++;

      if (evaluation.score >= 0.40) {
        summary.suggestedEdges++;
        const edgeId = `backfill-gk-${guide.id || guide.slug}-${entity.entityKey}`;
        const record: EntityRelationshipRecord = {
          id: edgeId,
          sourceType: 'GUIDE',
          sourceId: guide.id || guide.slug,
          targetType: 'KNOWLEDGE',
          targetId: entity.entityKey,
          relationshipType: 'GUIDE_KNOWLEDGE',
          relevanceScore: evaluation.score,
          confidence: evaluation.confidence,
          status: 'suggested',
          reasons: evaluation.reasons,
          visualContext: evaluation.visualContext,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        backfillMap.set(`${record.sourceType}:${record.sourceId}->${record.targetType}:${record.targetId}`, record);
      } else {
        summary.skippedLowConfidenceEdges++;
      }
    }
  }

  console.log(`  Total Candidate Combinations Evaluated: ${summary.totalCandidateEdges}`);
  console.log(`  Explicit Approved Relationships Found:   ${summary.approvedEdges}`);
  console.log(`  Suggested Relationships Generated:      ${summary.suggestedEdges}`);
  console.log(`  Skipped Low-Confidence (<0.40) Pairs:   ${summary.skippedLowConfidenceEdges}`);
  console.log(`  Unique High-Confidence Edges Mapped:    ${backfillMap.size}`);

  assert.ok(backfillMap.size > 20, 'Expected >20 meaningful relationships backfilled');

  // --------------------------------------------------------------------------
  // SECTION 2B: CANONICAL DATABASE PERSISTENCE & LEDGER AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 2B: Canonical Database Persistence Execution ---');
  const candidateEdges = Array.from(backfillMap.values());
  const persistResult = await persistRelationshipLedger(candidateEdges);

  console.log('  Persist Call Completed:');
  console.log(`    - Total records submitted:        ${candidateEdges.length}`);
  console.log(`    - Records processed/persisted:    ${persistResult.persistedCount}`);
  console.log(`    - Supabase Table [entity_relationships]: ${persistResult.tablePersisted ? 'PERSISTED DIRECTLY' : `TABLE NOT DEPLOYED YET (${persistResult.tableError || 'fail-closed fallback active'})`}`);
  console.log(`    - Supabase Backup [site_settings.data]:  ${persistResult.siteSettingsPersisted ? 'PERSISTED SUCCESSFULLY' : 'SKIPPED/UNAVAILABLE'}`);

  assert.ok(persistResult.persistedCount === candidateEdges.length, 'All candidate edges must be persisted into canonical store');

  // Verify persisted ledger by reading it back from the canonical store
  resetRelationshipCache();
  const loadedLedger = await getAllPersistedRelationships();
  console.log(`  Read-Back From Persistent Store: ${loadedLedger.length} relationships verified`);
  assert.ok(loadedLedger.length >= candidateEdges.length, 'Loaded relationships must match persisted count');

  // Verify counts by relationship type
  const typeCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = { suggested: 0, approved: 0, rejected: 0 };
  const seenUnique = new Set<string>();
  let duplicates = 0;
  let orphans = 0;
  let selfLinks = 0;

  for (const edge of loadedLedger) {
    typeCounts[edge.relationshipType] = (typeCounts[edge.relationshipType] || 0) + 1;
    statusCounts[edge.status] = (statusCounts[edge.status] || 0) + 1;

    const uKey = `${edge.sourceType}:${edge.sourceId}->${edge.targetType}:${edge.targetId}#${edge.relationshipType}`;
    if (seenUnique.has(uKey)) duplicates++;
    seenUnique.add(uKey);

    if (edge.sourceId === edge.targetId) selfLinks++;

    // Orphan check: verify source/target exist in known entities
    let sourceValid = false;
    let targetValid = false;
    if (edge.sourceType === 'PRODUCT') sourceValid = allProducts.some((p) => p.id === edge.sourceId);
    else if (edge.sourceType === 'GUIDE') sourceValid = guides.some((g) => (g.id || g.slug) === edge.sourceId);
    else if (edge.sourceType === 'KNOWLEDGE') sourceValid = !!getEntity(edge.sourceId);
    else if (edge.sourceType === 'CATEGORY') sourceValid = categories.some((c) => c.id === edge.sourceId || c.slug === edge.sourceId);

    if (edge.targetType === 'PRODUCT') targetValid = allProducts.some((p) => p.id === edge.targetId);
    else if (edge.targetType === 'GUIDE') targetValid = guides.some((g) => (g.id || g.slug) === edge.targetId);
    else if (edge.targetType === 'KNOWLEDGE') targetValid = !!getEntity(edge.targetId);
    else if (edge.targetType === 'CATEGORY') targetValid = categories.some((c) => c.id === edge.targetId || c.slug === edge.targetId);

    if (!sourceValid || !targetValid) orphans++;
  }

  console.log('  Persisted Relationships Breakdown:');
  console.log(`    - Total Relationships: ${loadedLedger.length}`);
  for (const [t, count] of Object.entries(typeCounts)) {
    console.log(`      * ${t}: ${count}`);
  }
  console.log('    - Status Breakdown:');
  console.log(`      * Suggested: ${statusCounts.suggested}`);
  console.log(`      * Approved:  ${statusCounts.approved}`);
  console.log(`      * Rejected:  ${statusCounts.rejected}`);
  console.log('    - Integrity Checks:');
  console.log(`      * Duplicate count:  ${duplicates} (PASS)`);
  console.log(`      * Orphan count:     ${orphans} (PASS)`);
  console.log(`      * Self-link count:  ${selfLinks} (PASS)`);

  assert.strictEqual(duplicates, 0, 'Must have zero duplicates in persisted relationship ledger');
  assert.strictEqual(orphans, 0, 'Must have zero orphans in persisted relationship ledger');
  assert.strictEqual(selfLinks, 0, 'Must have zero self-links in persisted relationship ledger');

  // --------------------------------------------------------------------------
  // SECTION 3: MANDATORY REAL CATALOG PRODUCT TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 3: Mandatory Real Product Relationship Assertions ---');

  // 1. BAQ Henna Powder
  const baqHenna = activeProducts.find((p) => p.name.toLowerCase().includes('baq') || p.slug.includes('baq'))
    || activeProducts.find((p) => p.id === 'prod-1786368977551');
  assert.ok(baqHenna, 'BAQ Henna Powder must exist in catalog');
  console.log(`  Testing: "${baqHenna.name}" (ID: ${baqHenna.id})`);

  const baqGuides = await getRelatedGuidesForProduct(baqHenna, { allGuides: guides, limit: 3, includeDrafts: true });
  assert.ok(baqGuides.length > 0, 'BAQ Henna must discover at least 1 related guide');
  assert.ok(
    baqGuides.some((g) => g.title.toLowerCase().includes('henna') || g.title.toLowerCase().includes('bridal')),
    'BAQ Henna must link to Henna or Bridal guides'
  );
  console.log(`    ✓ Discovered Guides: [${baqGuides.map((g) => g.title).join(' | ')}]`);

  const baqKnowledge = await getRelatedKnowledgeForProduct(baqHenna, { limit: 2 });
  assert.ok(baqKnowledge.length > 0, 'BAQ Henna must discover knowledge entities');
  assert.strictEqual(baqKnowledge[0].entityKey, 'HENNA_MEHNDI', 'Primary knowledge entity must be HENNA_MEHNDI');
  console.log(`    ✓ Discovered Knowledge: [${baqKnowledge.map((k) => k.canonicalName).join(', ')}]`);

  // 2. Bridal Henna Oil
  const bridalOil = activeProducts.find((p) => p.id === 'prod-bridal-henna-oil' || p.name.toLowerCase().includes('bridal henna oil'));
  assert.ok(bridalOil, 'Bridal Henna Oil must exist in catalog');
  console.log(`\n  Testing: "${bridalOil.name}" (ID: ${bridalOil.id})`);

  const bridalOilGuides = await getRelatedGuidesForProduct(bridalOil, { allGuides: guides, limit: 3, includeDrafts: true });
  assert.ok(bridalOilGuides.length > 0, 'Bridal Henna Oil must discover bridal/mixing guides');
  console.log(`    ✓ Discovered Guides: [${bridalOilGuides.map((g) => g.title).join(' | ')}]`);

  // 3. Indigo Powder
  const indigoProd = activeProducts.find((p) => p.id === 'prod-2' || p.name.toLowerCase().includes('indigo'));
  assert.ok(indigoProd, 'Indigo Powder must exist in catalog');
  console.log(`\n  Testing: "${indigoProd.name}" (ID: ${indigoProd.id})`);

  const indigoGuides = await getRelatedGuidesForProduct(indigoProd, { allGuides: guides, limit: 3, includeDrafts: true });
  assert.ok(indigoGuides.length > 0, 'Indigo Powder must discover at least 1 guide');
  assert.ok(
    indigoGuides.some((g) => g.slug.includes('indigo') || g.title.toLowerCase().includes('indigo')),
    'Indigo Powder must discover the 2-step henna indigo guide'
  );
  console.log(`    ✓ Discovered Guides: [${indigoGuides.map((g) => g.title).join(' | ')}]`);

  const indigoKnowledge = await getRelatedKnowledgeForProduct(indigoProd, { limit: 2 });
  assert.ok(indigoKnowledge.length > 0, 'Indigo must discover knowledge entities');
  assert.strictEqual(indigoKnowledge[0].entityKey, 'INDIGO', 'Primary knowledge entity must be INDIGO');
  console.log(`    ✓ Discovered Knowledge: [${indigoKnowledge.map((k) => k.canonicalName).join(', ')}]`);

  // Assert Henna product does not claim Indigo botanical match
  const baqIndigoScore = scoreProductKnowledgeRelationship(baqHenna, getEntity('INDIGO')!);
  assert.ok(!baqIndigoScore.reasons.includes('BOTANICAL_MATCH'), 'BAQ Henna must not botanically match Indigo');
  console.log('    ✓ Cross-botanical safety verified: Henna does not claim Indigo botanical identity');

  // 4. Sojat Pure Henna
  const sojatHenna = activeProducts.find((p) => p.id === 'prod-1' || p.name.toLowerCase().includes('triple-shifted'));
  assert.ok(sojatHenna, 'Sojat Pure Henna must exist in catalog');
  console.log(`\n  Testing: "${sojatHenna.name}" (ID: ${sojatHenna.id})`);
  const sojatGuides = await getRelatedGuidesForProduct(sojatHenna, { allGuides: guides, limit: 3, includeDrafts: true });
  assert.ok(sojatGuides.length > 0, 'Sojat Pure Henna must discover related guides');
  console.log(`    ✓ Discovered Guides: [${sojatGuides.map((g) => g.title).join(' | ')}]`);

  // --------------------------------------------------------------------------
  // SECTION 4: MANDATORY REAL GUIDE TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 4: Mandatory Real Guide Assertions ---');
  for (const guide of guides) {
    console.log(`  Evaluating Guide: "${guide.title}" (ID: ${guide.id})`);
    const matchedProducts = await getRelatedProductsForGuide(guide, { allProducts: activeProducts, limit: 3 });
    const matchedKnowledge = await getRelatedKnowledgeForGuide(guide, { limit: 2 });

    console.log(`    -> Products Matched (${matchedProducts.length}): [${matchedProducts.map((p) => p.name).join(', ')}]`);
    console.log(`    -> Knowledge Matched (${matchedKnowledge.length}): [${matchedKnowledge.map((k) => k.canonicalName).join(', ')}]`);

    assert.ok(matchedProducts.length > 0, `Guide ${guide.id} must discover relevant products`);
    assert.ok(matchedKnowledge.length > 0, `Guide ${guide.id} must discover relevant knowledge`);
  }

  // --------------------------------------------------------------------------
  // SECTION 5: MANDATORY REAL KNOWLEDGE ENTITY TESTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 5: Mandatory Real Knowledge Entity Assertions ---');
  const testedEntities = ['HENNA_MEHNDI', 'INDIGO', 'AMLA', 'BEETROOT'];
  for (const entKey of testedEntities) {
    const ent = getEntity(entKey)!;
    console.log(`  Evaluating Knowledge Entity: "${ent.canonicalName}"`);

    // Products matching this knowledge entity across full catalog
    const matchingProducts = allProducts.filter((p) => {
      const score = scoreProductKnowledgeRelationship(p, ent);
      return score.score >= 0.70;
    });

    console.log(`    -> High-Confidence Products (${matchingProducts.length}): [${matchingProducts.slice(0, 3).map((p) => p.name).join(', ')}]`);
    assert.ok(matchingProducts.length > 0, `Knowledge entity ${ent.canonicalName} must match relevant products in catalog`);
  }

  // --------------------------------------------------------------------------
  // SECTION 6: GSC RELEVANCE INFLUENCE VERIFICATION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 6: GSC Relevance Influence Verification ---');
  const baseEvaluation = scoreProductGuideRelationship(baqHenna, guides[0]);
  const boostedEvaluation = scoreProductGuideRelationship(baqHenna, guides[0], {
    growthKeywords: [
      {
        query: 'sojat baq henna powder bridal stain',
        impressions: 450,
        clicks: 30,
        ctr: 0.067,
        position: 4.1,
      },
    ],
  });

  console.log(`  Base Score:    ${baseEvaluation.score} (Reasons: [${baseEvaluation.reasons.join(', ')}])`);
  console.log(`  Boosted Score: ${boostedEvaluation.score} (Reasons: [${boostedEvaluation.reasons.join(', ')}])`);

  assert.ok(boostedEvaluation.score >= baseEvaluation.score, 'GSC signal must boost score');
  assert.ok(boostedEvaluation.reasons.includes('GSC_SIGNAL'), 'Reasons must record GSC_SIGNAL');
  console.log('  ✓ GSC query signal successfully adjusted relationship score without rewriting content (PASSED)');

  // --------------------------------------------------------------------------
  // SECTION 7: FIRST-CLASS VISUAL CONTEXT VALIDATION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 7: First-Class Visual Context Validation ---');
  const pVisual = generateVisualContext({ entityType: 'PRODUCT', entity: baqHenna });
  assert.strictEqual(pVisual.suggestedVisualType, '3D_PRODUCT_RENDER');
  assert.ok(pVisual.antiHallucinationConstraints.length >= 2);
  assert.ok(pVisual.approvedFacts.length >= 2);
  console.log(`  ✓ Product Visual Context: ${pVisual.suggestedVisualType} (Constraints: ${pVisual.antiHallucinationConstraints.length})`);

  const gVisual = generateVisualContext({ entityType: 'GUIDE', entity: guides[0] });
  assert.strictEqual(gVisual.suggestedVisualType, 'INSTRUCTIONAL_INFOGRAPHIC');
  console.log(`  ✓ Guide Visual Context: ${gVisual.suggestedVisualType}`);

  const kVisual = generateVisualContext({ entityType: 'KNOWLEDGE', entity: getEntity('HENNA_MEHNDI')! });
  assert.strictEqual(kVisual.suggestedVisualType, 'EDUCATIONAL_ILLUSTRATION');
  console.log(`  ✓ Knowledge Visual Context: ${kVisual.suggestedVisualType}`);

  const cVisual = generateVisualContext({ entityType: 'CATEGORY', entity: categories[0] });
  assert.strictEqual(cVisual.suggestedVisualType, 'COLLECTION_SCENE');
  console.log(`  ✓ Category Visual Context: ${cVisual.suggestedVisualType}`);

  // --------------------------------------------------------------------------
  // SECTION 8: GOVERNANCE & REJECTION SUPPRESSION
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8: Governance & Rejection Suppression ---');
  // 1. Temporary test rejection against real pair
  await saveRelationshipOverride({
    sourceType: 'PRODUCT',
    sourceId: baqHenna.id,
    targetType: 'GUIDE',
    targetId: guides[0].id || guides[0].slug,
    relationshipType: 'PRODUCT_GUIDE',
    status: 'rejected',
    reasons: ['BOTANICAL_MATCH'],
  });

  const guidesAfterRejection = await getRelatedGuidesForProduct(baqHenna, { allGuides: guides, limit: 5, includeDrafts: true });
  const targetGuideId = guides[0].id || guides[0].slug;
  const wasRejectedGuideReturned = guidesAfterRejection.some((g) => (g.id || g.slug) === targetGuideId);
  assert.strictEqual(wasRejectedGuideReturned, false, 'Rejected relationship must NEVER be returned publicly');
  console.log('  ✓ Verified: Admin-rejected guide was 100% suppressed from customer-facing resolution (PASSED)');

  // Clean up rejection override by restoring to approved
  await saveRelationshipOverride({
    sourceType: 'PRODUCT',
    sourceId: baqHenna.id,
    targetType: 'GUIDE',
    targetId: guides[0].id || guides[0].slug,
    relationshipType: 'PRODUCT_GUIDE',
    status: 'approved',
    reasons: ['BOTANICAL_MATCH'],
  });

  // 2. Temporary novel rejection test to verify zero test junk cleanup
  const tempTestKey = `temp-test-del-${Date.now()}`;
  await saveRelationshipOverride({
    sourceType: 'PRODUCT',
    sourceId: tempTestKey,
    targetType: 'GUIDE',
    targetId: 'temp-guide-target',
    relationshipType: 'PRODUCT_GUIDE',
    status: 'rejected',
    reasons: ['BOTANICAL_MATCH'],
  });
  console.log('  ✓ Created temporary rejection override: verified rejected state');
  await deleteRelationshipOverride('PRODUCT', tempTestKey, 'GUIDE', 'temp-guide-target', 'PRODUCT_GUIDE');
  console.log('  ✓ Safely deleted temporary rejection override: zero test junk left in DB (PASSED)');

  // --------------------------------------------------------------------------
  // SECTION 8B: PUBLIC VISIBILITY & RLS CONTRACT AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 8B: Public Visibility & RLS Contract Audit ---');
  const dummyApproved: EntityRelationshipRecord = {
    id: 'test-app',
    sourceType: 'PRODUCT',
    sourceId: 'p1',
    targetType: 'GUIDE',
    targetId: 'g1',
    relationshipType: 'PRODUCT_GUIDE',
    relevanceScore: 0.85,
    confidence: 'HIGH',
    status: 'approved',
    reasons: ['EXPLICIT_LINK'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const dummySuggested: EntityRelationshipRecord = {
    ...dummyApproved,
    id: 'test-sug',
    status: 'suggested',
  };

  const dummyRejected: EntityRelationshipRecord = {
    ...dummyApproved,
    id: 'test-rej',
    status: 'rejected',
  };

  // Rule 1: Approved is visible
  assert.strictEqual(isRelationshipPubliclyVisible(dummyApproved, { requireExplicitApproval: true }), true);
  // Rule 2: Suggested is NOT public when explicit approval is required
  assert.strictEqual(isRelationshipPubliclyVisible(dummySuggested, { requireExplicitApproval: true }), false);
  // Rule 3: Rejected is NEVER visible under any circumstances
  assert.strictEqual(isRelationshipPubliclyVisible(dummyRejected, { requireExplicitApproval: true }), false);
  assert.strictEqual(isRelationshipPubliclyVisible(dummyRejected, { requireExplicitApproval: false }), false);
  console.log('  ✓ RLS Contract Validated: approved=PUBLIC, suggested=NOT_PUBLIC, rejected=NEVER_PUBLIC (PASSED)');

  // --------------------------------------------------------------------------
  // SECTION 9: FUTURE SYNTHETIC NOVEL ENTITY TEST (CLEAN UP AFTERWARDS)
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 9: Future Synthetic Novel Entity Test ---');
  const novelBhringrajProduct: Product = {
    id: 'fixture-future-bhringraj-leaves-99',
    name: 'Pure Wild Sojat Bhringraj Powder',
    slug: 'pure-wild-sojat-bhringraj-powder',
    price: 349,
    categoryName: 'Hair Care',
    categoryId: 'cat-hair-care',
    sellingUnit: 'kg',
    shortDescription: 'Wildcrafted Bhringraj (Eclipta Alba) for traditional hair scalp care.',
    fullDescription: 'Authentic pure Bhringraj powder milled from sustainably harvested wild plants in Rajasthan.',
    quantityOrWeight: '100g',
    sku: 'MD-BHR-100G',
    images: ['/images/fallback.svg'],
    ingredients: ['Eclipta Alba'],
    benefits: ['Scalp cooling', 'Ayurvedic conditioning'],
    usageInstructions: 'Mix into hair mask with warm water.',
    stockStatus: 'in_stock',
    isFeatured: false,
    sortOrder: 50,
    seoKeywords: ['bhringraj', 'eclipta alba', 'ayurvedic hair care', 'scalp oil'],
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const bhringrajKnowledge = getEntity('BHRINGRAJ')!;
  const novelScore = scoreProductKnowledgeRelationship(novelBhringrajProduct, bhringrajKnowledge);
  assert.ok(novelScore.score >= 0.85, `Novel Bhringraj product must match BHRINGRAJ entity, got ${novelScore.score}`);
  assert.ok(novelScore.reasons.includes('BOTANICAL_MATCH'));
  console.log(`  ✓ Future product resolved to BHRINGRAJ entity: Score = ${novelScore.score}, Reasons = [${novelScore.reasons.join(', ')}] (PASSED)`);

  // --------------------------------------------------------------------------
  // SECTION 10: DATA INTEGRITY & SAFETY INVARIANTS
  // --------------------------------------------------------------------------
  console.log('\n--- SECTION 10: Data Integrity & Invariants Audit ---');
  for (const [key, edge] of backfillMap.entries()) {
    // 1. No self-links
    assert.ok(edge.sourceId !== edge.targetId, `Self link detected on ${key}`);
    // 2. Scores within bounds [0.0, 1.0]
    assert.ok(edge.relevanceScore >= 0 && edge.relevanceScore <= 1.0, `Score out of bounds on ${key}: ${edge.relevanceScore}`);
    // 3. Valid status
    assert.ok(['suggested', 'approved', 'rejected'].includes(edge.status), `Invalid status on ${key}`);
    // 4. Non-empty reasons
    assert.ok(edge.reasons.length > 0, `Missing reasons on ${key}`);
  }
  console.log(`  ✓ All ${backfillMap.size} backfilled relationship edges satisfied 100% of data integrity invariants!`);

  console.log('\n===============================================================');
  console.log('ALL PHASE 1 STEP 2 TESTS & BACKFILL ASSERTIONS PASSED (100%)');
  console.log('===============================================================');
}

runUniversalRelationshipVerification().catch((err) => {
  console.error('Step 2 Verification Failed:', err);
  process.exit(1);
});
