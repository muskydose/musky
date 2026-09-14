import assert from 'node:assert';
import fs from 'fs';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
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

import {
  mapRowToKnowledgeEntity,
  getKnowledgeBySlug,
  getKnowledgeByKey,
  getKnowledgeById,
  getPublishedKnowledgeEntities,
  getAllKnowledgeEntitiesAdmin,
  getAllKnowledgeEntitiesRaw,
  resetKnowledgeCache,
  KnowledgeEntity,
} from '../lib/db/knowledge';
import { CANONICAL_ENTITY_REGISTRY } from '../lib/growth/entity-registry';

async function runKnowledgeDalTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 2 STEP 2B: KNOWLEDGE DAL VERIFICATION TESTS');
  console.log('===============================================================');

  // --------------------------------------------------------------------------
  // SUITE 1: ROW NORMALIZATION & CanonicalEntityRecord MAPPING
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Row Normalization & Type Safety ---');

  const mockDbRow = {
    id: 'ent-henna-mehndi',
    entity_key: 'HENNA_MEHNDI',
    slug: 'henna-mehndi',
    canonical_name: 'Henna (Mehndi)',
    scientific_name: 'Lawsonia inermis',
    botanical_family: 'Lythraceae',
    product_family: 'BOTANICAL_SINGLE',
    entity_class: 'BOTANICAL_SINGLE',
    aliases: ['Henna', 'Mehndi', 'Heena', 'Lawsonia inermis'],
    normalized_aliases: ['henna', 'mehndi', 'heena', 'lawsonia inermis'],
    redirect_slugs: ['henna', 'mehndi', 'sojat-henna', 'rajasthani-henna'],
    supported_scopes: ['HAIR', 'BEARD'],
    safe_use_cases: ['hair_dyeing', 'conditioning', 'body_art'],
    compatible_attributes: ['organic', 'chemical_free'],
    related_entity_keys: ['INDIGO', 'AMLA', 'BHRINGRAJ'],
    guide_families: ['BEARD_GROWTH', 'HAIR_CARE'],
    description: 'Triple-sifted high-lawsone henna powder from Sojat, Rajasthan.',
    seo_title: 'Henna (Mehndi) | Botanical Care & Sourcing',
    seo_description: 'Authentic high-lawsone henna from Sojat, Rajasthan.',
    og_image_url: 'https://muskydose.com/og/henna.jpg',
    robots_index: true,
    robots_follow: true,
    status: 'published',
    published: true,
    sort_order: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };

  const mapped = mapRowToKnowledgeEntity(mockDbRow);
  assert.strictEqual(mapped.entityKey, 'HENNA_MEHNDI');
  assert.strictEqual(mapped.slug, 'henna-mehndi');
  assert.strictEqual(mapped.canonicalName, 'Henna (Mehndi)');
  assert.strictEqual(mapped.scientificName, 'Lawsonia inermis');
  assert.strictEqual(mapped.botanicalFamily, 'Lythraceae');
  assert.strictEqual(mapped.dbStatus, 'published');
  assert.strictEqual(mapped.published, true);
  assert.strictEqual(mapped.status, 'KNOWN');
  assert.strictEqual(mapped.confidence, 'HIGH');
  assert.deepStrictEqual(mapped.aliases, ['Henna', 'Mehndi', 'Heena', 'Lawsonia inermis']);
  assert.deepStrictEqual(mapped.redirectSlugs, ['henna', 'mehndi', 'sojat-henna', 'rajasthani-henna']);
  assert.deepStrictEqual(mapped.relatedEntities, ['INDIGO', 'AMLA', 'BHRINGRAJ']);
  assert.strictEqual(mapped.searchRepresentations.canonical, 'Henna (Mehndi)');
  assert.strictEqual(mapped.searchRepresentations.scientific, 'Lawsonia inermis');
  console.log('  ✓ Database row correctly maps to KnowledgeEntity and CanonicalEntityRecord (PASSED)');

  // Test UNKNOWN sentinel mapping
  const unknownRow = {
    id: 'ent-unknown',
    entity_key: 'UNKNOWN',
    slug: 'unknown',
    canonical_name: 'Unknown Botanical Entity',
    aliases: [],
    status: 'draft',
    published: false,
    sort_order: 999,
  };
  const mappedUnknown = mapRowToKnowledgeEntity(unknownRow);
  assert.strictEqual(mappedUnknown.entityKey, 'UNKNOWN');
  assert.strictEqual(mappedUnknown.status, 'UNKNOWN');
  assert.strictEqual(mappedUnknown.confidence, 'NEEDS_REVIEW');
  assert.strictEqual(mappedUnknown.published, false);
  console.log('  ✓ Sentinel UNKNOWN row mapped to status: UNKNOWN, confidence: NEEDS_REVIEW (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 2: SLUG LOOKUP & 308 REDIRECT INTENT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Slug Resolution & Redirect Discovery ---');
  resetKnowledgeCache();

  // Test exact slug resolution
  const hennaExact = await getKnowledgeBySlug('henna-mehndi');
  assert.ok(hennaExact.entity, 'Exact slug henna-mehndi must resolve');
  assert.strictEqual(hennaExact.entity.entityKey, 'HENNA_MEHNDI');
  assert.strictEqual(hennaExact.isRedirect, false, 'Exact canonical match must not be marked redirect');
  console.log('  ✓ Exact slug "henna-mehndi" resolves directly without redirect (PASSED)');

  const indigoExact = await getKnowledgeBySlug('indigo');
  assert.ok(indigoExact.entity, 'Exact slug indigo must resolve');
  assert.strictEqual(indigoExact.entity.entityKey, 'INDIGO');
  assert.strictEqual(indigoExact.isRedirect, false);
  console.log('  ✓ Exact slug "indigo" resolves directly without redirect (PASSED)');

  // Test redirect aliases
  const hennaAlias1 = await getKnowledgeBySlug('henna');
  assert.ok(hennaAlias1.entity, 'Alias slug "henna" must resolve');
  assert.strictEqual(hennaAlias1.entity.entityKey, 'HENNA_MEHNDI');
  assert.strictEqual(hennaAlias1.isRedirect, true, 'Alias match must signal 308 redirect intent');
  assert.strictEqual(hennaAlias1.redirectCanonicalSlug, 'henna-mehndi');
  console.log('  ✓ Alias slug "henna" resolves with 308 redirect intent to "henna-mehndi" (PASSED)');

  const hennaAlias2 = await getKnowledgeBySlug('mehndi');
  assert.ok(hennaAlias2.entity, 'Alias slug "mehndi" must resolve');
  assert.strictEqual(hennaAlias2.isRedirect, true);
  assert.strictEqual(hennaAlias2.redirectCanonicalSlug, 'henna-mehndi');
  console.log('  ✓ Alias slug "mehndi" resolves with 308 redirect intent to "henna-mehndi" (PASSED)');

  // Test unknown / invalid slug
  const notFound = await getKnowledgeBySlug('non-existent-botanical-slug');
  assert.strictEqual(notFound.entity, null);
  assert.strictEqual(notFound.isRedirect, false);
  console.log('  ✓ Non-existent slug cleanly returns null entity (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 3: KEY & ID RESOLUTION (RELATIONSHIP ENGINE INTERFACE)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Entity Key and ID Lookups ---');

  const hennaByKey = await getKnowledgeByKey('HENNA_MEHNDI');
  assert.ok(hennaByKey, 'HENNA_MEHNDI key must resolve');
  assert.strictEqual(hennaByKey.slug, 'henna-mehndi');
  console.log('  ✓ Key lookup "HENNA_MEHNDI" resolved accurately (PASSED)');

  // Case-insensitive key lookup check
  const indigoByKeyLower = await getKnowledgeByKey('indigo');
  assert.ok(indigoByKeyLower, 'Case-insensitive key lookup must resolve');
  assert.strictEqual(indigoByKeyLower.entityKey, 'INDIGO');
  console.log('  ✓ Case-insensitive key lookup "indigo" resolved to "INDIGO" (PASSED)');

  // Primary key ID lookup check
  const amlaById = await getKnowledgeById('ent-amla');
  assert.ok(amlaById, 'ID lookup "ent-amla" must resolve');
  assert.strictEqual(amlaById.entityKey, 'AMLA');
  console.log('  ✓ ID lookup "ent-amla" resolved accurately (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 4: PUBLIC FILTERING & UNKNOWN / DRAFT ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Public Visibility & Sentinel Isolation ---');

  const publishedEntities = await getPublishedKnowledgeEntities();
  assert.strictEqual(publishedEntities.length, 17, 'Must return exactly 17 published knowledge entities');

  // Verify none are UNKNOWN or draft
  for (const entity of publishedEntities) {
    assert.notStrictEqual(entity.entityKey, 'UNKNOWN', 'UNKNOWN sentinel must never be in published list');
    assert.strictEqual(entity.published, true, 'All returned entities must have published === true');
    assert.strictEqual(entity.dbStatus, 'published', 'All returned entities must have dbStatus === published');
  }
  console.log('  ✓ Exactly 17 published entities returned; zero UNKNOWN or drafts exposed (PASSED)');

  // Verify UNKNOWN sentinel cannot be queried publicly via standard slug/key without includeDrafts
  const unknownPublicSlug = await getKnowledgeBySlug('unknown');
  assert.strictEqual(unknownPublicSlug.entity, null, 'UNKNOWN slug must NOT be accessible publicly');

  const unknownPublicKey = await getKnowledgeByKey('UNKNOWN');
  assert.strictEqual(unknownPublicKey, null, 'UNKNOWN key must NOT be accessible publicly');

  const unknownDraftSlug = await getKnowledgeBySlug('unknown', { includeDrafts: true });
  assert.ok(unknownDraftSlug.entity, 'UNKNOWN slug accessible when includeDrafts is true');
  assert.strictEqual(unknownDraftSlug.entity.entityKey, 'UNKNOWN');
  console.log('  ✓ Sentinel UNKNOWN blocked from public access, visible only with includeDrafts (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 5: FALLBACK MECHANISM & PRECEDENCE (DB vs REGISTRY)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Safe Fallback & DB Precedence Integrity ---');
  resetKnowledgeCache();

  const rawResult = await getAllKnowledgeEntitiesRaw();
  assert.ok(Array.isArray(rawResult.entities), 'Entities must be an array');
  assert.ok(
    rawResult.source === 'registry' || rawResult.source === 'database',
    'Source must be either registry (if DB pending) or database'
  );
  console.log(`  ✓ DAL loaded successfully from source: "${rawResult.source}" (count: ${rawResult.entities.length}) (PASSED)`);

  // Verify Admin call returns all entities including UNKNOWN
  const adminEntities = await getAllKnowledgeEntitiesAdmin();
  assert.strictEqual(adminEntities.length, 18, 'Admin retrieval must return 18 entities (17 published + 1 UNKNOWN)');
  assert.ok(adminEntities.some((e) => e.entityKey === 'UNKNOWN'), 'Admin retrieval must include UNKNOWN sentinel');
  console.log('  ✓ Admin retrieval provides full 18 entities for CMS governance (PASSED)');

  // Verify caching operates as expected
  const secondRawResult = await getAllKnowledgeEntitiesRaw();
  assert.strictEqual(secondRawResult.source, rawResult.source, 'Cached read returns consistent source');
  assert.strictEqual(secondRawResult.entities.length, rawResult.entities.length, 'Cached read returns consistent count');
  console.log('  ✓ DAL memory caching behaves deterministically (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 6: DOWNSTREAM CONTRACT COMPATIBILITY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Downstream Compatibility & Contract Adherence ---');

  for (const [key, regRecord] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
    if (key === 'UNKNOWN') continue;
    const entity = publishedEntities.find((e) => e.entityKey === key);
    assert.ok(entity, `Canonical registry entity ${key} must exist in published KnowledgeEntities`);
    assert.strictEqual(entity.canonicalName, regRecord.canonicalName);
    assert.strictEqual(entity.scientificName, regRecord.scientificName);
    assert.strictEqual(entity.botanicalFamily, regRecord.botanicalFamily);
    assert.strictEqual(entity.productFamily, regRecord.productFamily);
    assert.strictEqual(entity.entityClass, regRecord.entityClass);
    assert.deepStrictEqual(entity.supportedScopes, regRecord.supportedScopes);
    assert.deepStrictEqual(entity.compatibleAttributes, regRecord.compatibleAttributes);
    assert.deepStrictEqual(entity.relatedEntities, regRecord.relatedEntities);
  }
  console.log('  ✓ All 17 canonical registry entities 100% congruent with KnowledgeEntity contract (PASSED)');

  console.log('\n===============================================================');
  console.log('ALL PHASE 2 STEP 2B KNOWLEDGE DAL TESTS PASSED SUCCESSFULLY! (6/6)');
  console.log('===============================================================');
}

runKnowledgeDalTests().catch((err) => {
  console.error('\n❌ KNOWLEDGE DAL TEST SUITE FAILED:', err);
  process.exit(1);
});

