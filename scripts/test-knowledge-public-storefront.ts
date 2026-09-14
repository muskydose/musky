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

import {
  getPublishedKnowledgeEntities,
  getKnowledgeBySlug,
  getKnowledgeByKey,
  saveKnowledgeEntity,
  archiveKnowledgeEntity,
  resetKnowledgeCache,
  KnowledgeEntity,
} from '../lib/db/knowledge';
import {
  generateStaticParams,
  generateMetadata,
} from '../app/knowledge/[entity]/page';
import sitemap from '../app/sitemap';
import { CANONICAL_ENTITY_REGISTRY } from '../lib/growth/entity-registry';

const EXPECTED_17_CANONICAL_SLUGS = [
  'henna-mehndi',
  'indigo',
  'amla',
  'shikakai',
  'reetha',
  'hibiscus',
  'bhringraj',
  'brahmi',
  'neem',
  'moringa',
  'rose',
  'beetroot',
  'fenugreek',
  'multani-mitti',
  'herbal-blend',
  'essential-oil',
  'carrier-oil',
];

async function runStorefrontTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 2 STEP 2E: PUBLIC KNOWLEDGE STOREFRONT & SITEMAP TESTS');
  console.log('===============================================================');

  resetKnowledgeCache({ resetFallbackStore: true });

  // --------------------------------------------------------------------------
  // SUITE 1: ALL 17 CANONICAL KNOWLEDGE SLUGS RESOLUTION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: 17 Canonical Public Knowledge URLs Resolution ---');
  for (const slug of EXPECTED_17_CANONICAL_SLUGS) {
    const lookup = await getKnowledgeBySlug(slug);
    assert.ok(lookup.entity, `Canonical slug "${slug}" must resolve an entity`);
    assert.strictEqual(lookup.isRedirect, false, `Canonical slug "${slug}" must NOT be a redirect`);
    assert.strictEqual(lookup.entity.slug, slug, `Resolved slug must match "${slug}"`);
    assert.strictEqual(lookup.entity.published, true, `"${slug}" must be published`);
    assert.strictEqual(lookup.entity.dbStatus, 'published', `"${slug}" dbStatus must be published`);
    assert.notStrictEqual(lookup.entity.entityKey, 'UNKNOWN', `"${slug}" must not be UNKNOWN`);
  }
  console.log(`  ✓ All ${EXPECTED_17_CANONICAL_SLUGS.length} canonical knowledge URLs resolve cleanly with 100% fidelity (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 2: DYNAMIC ALIAS & REDIRECT DISCOVERY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Dynamic Alias & 308 Redirect Handling ---');
  const aliasTests = [
    { alias: 'henna', expectedTarget: 'henna-mehndi' },
    { alias: 'mehndi', expectedTarget: 'henna-mehndi' },
    { alias: 'mehendi', expectedTarget: 'henna-mehndi' },
    { alias: 'lawsonia-inermis', expectedTarget: 'henna-mehndi' },
  ];

  for (const { alias, expectedTarget } of aliasTests) {
    const lookup = await getKnowledgeBySlug(alias);
    assert.ok(lookup.entity, `Alias "${alias}" must resolve target entity`);
    assert.strictEqual(lookup.isRedirect, true, `Alias "${alias}" must be marked as redirect`);
    assert.strictEqual(
      lookup.redirectCanonicalSlug,
      expectedTarget,
      `Alias "${alias}" must redirect to "${expectedTarget}"`
    );
  }
  console.log('  ✓ Regional & botanical alias slugs correctly trigger canonical redirect intent (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 3: DRAFT, ARCHIVED & UNKNOWN SENTINEL ISOLATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Draft, Archived & UNKNOWN Sentinel Isolation ---');
  // 1. UNKNOWN sentinel
  const unknownDirect = await getKnowledgeBySlug('unknown');
  assert.strictEqual(unknownDirect.entity, null, 'Public getKnowledgeBySlug("unknown") must return null');
  assert.strictEqual(unknownDirect.isRedirect, false);

  const unknownByKey = await getKnowledgeByKey('UNKNOWN');
  assert.strictEqual(unknownByKey, null, 'Public getKnowledgeByKey("UNKNOWN") must return null');

  // UNKNOWN accessible only with explicit includeDrafts
  const unknownAdmin = await getKnowledgeByKey('UNKNOWN', { includeDrafts: true });
  assert.ok(unknownAdmin, 'UNKNOWN sentinel must be accessible when includeDrafts is true');
  assert.strictEqual(unknownAdmin.entityKey, 'UNKNOWN');
  assert.strictEqual(unknownAdmin.published, false);
  console.log('  ✓ UNKNOWN sentinel strictly isolated from public queries (PASSED)');

  // 2. Non-existent slug
  const nonExistent = await getKnowledgeBySlug('non-existent-herbal-slug-404');
  assert.strictEqual(nonExistent.entity, null, 'Non-existent slug must return null');
  assert.strictEqual(nonExistent.isRedirect, false);
  console.log('  ✓ Non-existent slug returns null safely (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 4: STATIC PARAMS GENERATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: Next.js Static Params Generation ---');
  const staticParams = await generateStaticParams();
  assert.strictEqual(
    staticParams.length,
    17,
    `generateStaticParams must return exactly 17 entries, got ${staticParams.length}`
  );
  const paramSlugs = staticParams.map((p) => p.entity).sort();
  const sortedExpected = [...EXPECTED_17_CANONICAL_SLUGS].sort();
  assert.deepStrictEqual(paramSlugs, sortedExpected, 'Static params must match expected 17 canonical slugs');
  assert.ok(!paramSlugs.includes('unknown'), 'generateStaticParams must NEVER contain unknown');
  console.log('  ✓ generateStaticParams yields exactly 17 published routes (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 5: SEO METADATA & SCHEMA GENERATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: SEO Metadata & Canonical Tag Assertions ---');
  // 1. Valid canonical entity metadata
  const hennaMeta = await generateMetadata({
    params: Promise.resolve({ entity: 'henna-mehndi' }),
  });
  assert.ok(hennaMeta.title?.toString().includes('Henna / Mehndi'), 'Henna title must contain canonical name');
  assert.strictEqual(
    hennaMeta.alternates?.canonical,
    'https://muskydose.in/knowledge/henna-mehndi',
    'Canonical URL must be exact'
  );
  assert.strictEqual((hennaMeta.robots as any)?.index, true, 'Published entity must be indexable');
  assert.strictEqual((hennaMeta.robots as any)?.follow, true, 'Published entity must allow follow');
  console.log('  ✓ Canonical page metadata generated with indexable robots and canonical URL (PASSED)');

  // 2. Alias redirect metadata
  const aliasMeta = await generateMetadata({
    params: Promise.resolve({ entity: 'henna' }),
  });
  assert.strictEqual(
    aliasMeta.alternates?.canonical,
    'https://muskydose.in/knowledge/henna-mehndi',
    'Alias metadata canonical must point to canonical page'
  );
  assert.strictEqual((aliasMeta.robots as any)?.index, false, 'Alias page must have robots.index = false');
  assert.strictEqual((aliasMeta.robots as any)?.follow, true, 'Alias page must have robots.follow = true');
  console.log('  ✓ Alias metadata generated with index: false and canonical target (PASSED)');

  // 3. 404 entity metadata
  const missingMeta = await generateMetadata({
    params: Promise.resolve({ entity: 'phantom-botanical' }),
  });
  assert.strictEqual((missingMeta.robots as any)?.index, false, 'Missing entity must have robots.index = false');
  assert.strictEqual((missingMeta.robots as any)?.follow, false, 'Missing entity must have robots.follow = false');
  console.log('  ✓ Missing entity metadata returns noindex, nofollow (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 6: SITEMAP DB-FIRST INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Sitemap Integration Audit ---');
  const sitemapEntries = await sitemap();
  const sitemapKnowledgeUrls = sitemapEntries
    .filter((e) => e.url.includes('/knowledge/'))
    .map((e) => e.url);

  console.log(`  Discovered ${sitemapKnowledgeUrls.length} Knowledge URLs in sitemap:`);
  assert.strictEqual(
    sitemapKnowledgeUrls.length,
    17,
    `Sitemap must contain exactly 17 knowledge URLs, got ${sitemapKnowledgeUrls.length}`
  );

  for (const slug of EXPECTED_17_CANONICAL_SLUGS) {
    const expectedUrl = `https://muskydose.in/knowledge/${slug}`;
    assert.ok(
      sitemapKnowledgeUrls.includes(expectedUrl),
      `Sitemap must contain canonical URL: ${expectedUrl}`
    );
  }

  assert.ok(
    !sitemapKnowledgeUrls.some((u) => u.includes('unknown')),
    'Sitemap must NEVER contain UNKNOWN entity'
  );
  console.log('  ✓ Sitemap contains 100% of published canonical entities and 0 sentinels/drafts (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 7: FUTURE PUBLISHED ENTITY DYNAMIC DISCOVERY WITHOUT REDEPLOYMENT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 7: Future Admin-Created Entity Simulation ---');
  const futureEntityKey = 'TEST_TULSI';
  const futureSlug = 'test-organic-tulsi-holy-basil';

  // 1. Create a draft entity
  const draftCreated = await saveKnowledgeEntity({
    entityKey: futureEntityKey,
    slug: futureSlug,
    canonicalName: 'Organic Tulsi (Holy Basil)',
    scientificName: 'Ocimum sanctum',
    botanicalFamily: 'Lamiaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['Tulsi', 'Holy Basil'],
    redirectSlugs: ['tulsi-basil'],
    supportedScopes: ['HAIR', 'SKIN'],
    safeUseCases: ['Scalp purifying rinse', 'Ayurvedic skin toner'],
    compatibleAttributes: ['pure'],
    relatedEntities: ['NEEM', 'AMLA'],
    guideFamilies: ['PRODUCT_OVERVIEW'],
    description: 'Freshly milled holy basil leaves for clarifying hair and scalp infusions.',
    status: 'draft',
    published: false,
    sortOrder: 50,
  });

  // Verify draft is NOT visible publicly
  const draftLookup = await getKnowledgeBySlug(futureSlug);
  assert.strictEqual(draftLookup.entity, null, 'Newly created draft entity must NOT be accessible publicly');

  // Verify sitemap does NOT include draft
  const sitemapWithDraft = await sitemap();
  const draftInSitemap = sitemapWithDraft.some((e) => e.url.includes(futureSlug));
  assert.strictEqual(draftInSitemap, false, 'Draft entity must NOT appear in sitemap');
  console.log('  ✓ Future draft entity safely hidden from public pages and sitemap (PASSED)');

  // 2. Publish the entity
  await saveKnowledgeEntity({
    id: draftCreated.id,
    entityKey: futureEntityKey,
    slug: futureSlug,
    canonicalName: 'Organic Tulsi (Holy Basil)',
    scientificName: 'Ocimum sanctum',
    botanicalFamily: 'Lamiaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['Tulsi', 'Holy Basil'],
    redirectSlugs: ['tulsi-basil'],
    supportedScopes: ['HAIR', 'SKIN'],
    safeUseCases: ['Scalp purifying rinse'],
    compatibleAttributes: ['pure'],
    relatedEntities: ['NEEM'],
    guideFamilies: ['PRODUCT_OVERVIEW'],
    description: 'Freshly milled holy basil leaves for clarifying hair and scalp infusions.',
    status: 'published',
    published: true,
    sortOrder: 50,
  });

  // Verify published entity is now immediately discoverable
  const publishedLookup = await getKnowledgeBySlug(futureSlug);
  assert.ok(publishedLookup.entity, 'Published future entity must be discoverable immediately');
  assert.strictEqual(publishedLookup.entity?.canonicalName, 'Organic Tulsi (Holy Basil)');
  assert.strictEqual(publishedLookup.isRedirect, false);

  // Verify alias redirect works for future entity
  const futureAliasLookup = await getKnowledgeBySlug('tulsi-basil');
  assert.ok(futureAliasLookup.entity, 'Future alias redirect must resolve');
  assert.strictEqual(futureAliasLookup.isRedirect, true);
  assert.strictEqual(futureAliasLookup.redirectCanonicalSlug, futureSlug);

  // Verify sitemap includes newly published entity
  const sitemapWithPublished = await sitemap();
  const publishedInSitemap = sitemapWithPublished.some((e) => e.url.includes(futureSlug));
  assert.strictEqual(publishedInSitemap, true, 'Newly published entity must appear in sitemap automatically');
  console.log('  ✓ Newly published entity immediately accessible publicly & in sitemap with zero code change (PASSED)');

  // 3. Soft-delete / archive entity and verify it disappears from public view
  await archiveKnowledgeEntity(draftCreated.id);
  const archivedLookup = await getKnowledgeBySlug(futureSlug);
  assert.strictEqual(archivedLookup.entity, null, 'Archived entity must NOT be accessible publicly');

  const sitemapAfterArchive = await sitemap();
  const archivedInSitemap = sitemapAfterArchive.some((e) => e.url.includes(futureSlug));
  assert.strictEqual(archivedInSitemap, false, 'Archived entity must disappear from sitemap');
  console.log('  ✓ Archived entity immediately removed from public access and sitemap (PASSED)');

  // Clean up cache after test
  resetKnowledgeCache({ resetFallbackStore: true });

  console.log('\n===============================================================');
  console.log('ALL PHASE 2 STEP 2E PUBLIC STOREFRONT TESTS PASSED! (7/7)');
  console.log('===============================================================');
}

runStorefrontTests().catch((err) => {
  console.error('Storefront test failure:', err);
  process.exit(1);
});
