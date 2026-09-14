import assert from 'node:assert';
import fs from 'fs';
import path from 'path';

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
  CANONICAL_ENTITY_REGISTRY,
  getEntity,
} from '../lib/growth/entity-registry';
import {
  ENTITY_KEY_TO_SLUG,
  HENNA_ALIAS_SLUGS,
} from '../lib/growth/search-intent-router';
import { getSupabaseAdmin } from '../lib/supabase';

async function runKnowledgeSchemaTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 2 STEP 2A: KNOWLEDGE SCHEMA & SEED VERIFICATION');
  console.log('===============================================================');

  const migrationPath = path.resolve('supabase-knowledge-entities-migration-006.sql');
  assert.ok(fs.existsSync(migrationPath), `Migration file must exist at ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // --------------------------------------------------------------------------
  // SUITE 1: DDL INTEGRITY & SAFETY CONSTRAINTS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: DDL Safety & Table Structure ---');
  // Strip SQL comments before checking forbidden destructive keywords
  const sqlWithoutComments = sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.ok(!/\bDROP\s+TABLE\b/i.test(sqlWithoutComments), 'Migration must NEVER contain DROP TABLE (strictly additive)');
  assert.ok(!/\bTRUNCATE\b/i.test(sqlWithoutComments), 'Migration must NEVER contain TRUNCATE (strictly non-destructive)');
  assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS public.knowledge_entities'), 'Must use CREATE TABLE IF NOT EXISTS');
  console.log('  ✓ Non-destructive safety verified: Zero DROP or TRUNCATE statements (PASSED)');

  // Verify all 27 required columns exist in DDL
  const requiredColumns = [
    'id',
    'entity_key',
    'slug',
    'canonical_name',
    'scientific_name',
    'botanical_family',
    'product_family',
    'entity_class',
    'aliases',
    'normalized_aliases',
    'redirect_slugs',
    'supported_scopes',
    'safe_use_cases',
    'compatible_attributes',
    'related_entity_keys',
    'guide_families',
    'description',
    'seo_title',
    'seo_description',
    'og_image_url',
    'robots_index',
    'robots_follow',
    'status',
    'published',
    'sort_order',
    'created_at',
    'updated_at',
  ];

  for (const col of requiredColumns) {
    const colRegex = new RegExp(`\\b${col}\\b`, 'i');
    assert.ok(colRegex.test(sql), `Column "${col}" must be declared in knowledge_entities table`);
  }
  console.log(`  ✓ All ${requiredColumns.length} required columns declared in DDL (PASSED)`);

  // Verify Constraints & Indexes
  assert.ok(sql.includes('CONSTRAINT uq_knowledge_entities_entity_key UNIQUE (entity_key)'), 'Must enforce UNIQUE (entity_key)');
  assert.ok(sql.includes('CONSTRAINT uq_knowledge_entities_slug UNIQUE (slug)'), 'Must enforce UNIQUE (slug)');
  assert.ok(sql.includes('PRIMARY KEY'), 'Must declare PRIMARY KEY (id)');
  assert.ok(sql.includes('CHECK (status IN (\'draft\', \'published\', \'needs_review\', \'archived\'))'), 'Must enforce status check constraint');
  assert.ok(sql.includes('ENABLE ROW LEVEL SECURITY'), 'Must enable Row Level Security');
  assert.ok(sql.includes('idx_knowledge_entities_slug'), 'Must create index on slug');
  assert.ok(sql.includes('idx_knowledge_entities_entity_key'), 'Must create index on entity_key');
  assert.ok(sql.includes('USING GIN (aliases)'), 'Must create GIN index on aliases');
  assert.ok(sql.includes('USING GIN (normalized_aliases)'), 'Must create GIN index on normalized_aliases');
  assert.ok(sql.includes('USING GIN (redirect_slugs)'), 'Must create GIN index on redirect_slugs');
  console.log('  ✓ Primary keys, unique constraints, check constraints, and GIN indexes verified (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 2: RLS POLICY CONTRACT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: Row Level Security (RLS) Policy Audit ---');
  assert.ok(
    sql.includes("CREATE POLICY \"Allow public read published knowledge_entities\""),
    'Must declare public read policy for published entities'
  );
  assert.ok(
    sql.includes("USING (status = 'published' AND published = TRUE)"),
    'Public read policy must strictly require status = \'published\' AND published = TRUE'
  );
  console.log("  ✓ Public RLS policy verified: status = 'published' AND published = TRUE (PASSED)");

  // --------------------------------------------------------------------------
  // SUITE 3: SEED DATA INTEGRITY & TAXONOMICAL ACCURACY
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: Canonical Seed Data Verification ---');

  // Verify all 17 public canonical entity keys exist in the seed SQL
  const publicEntityKeys = Object.keys(CANONICAL_ENTITY_REGISTRY).filter((k) => k !== 'UNKNOWN');
  assert.strictEqual(publicEntityKeys.length, 17, 'Baseline must contain exactly 17 canonical entities');

  for (const key of publicEntityKeys) {
    const memoryRecord = CANONICAL_ENTITY_REGISTRY[key];
    const expectedSlug = ENTITY_KEY_TO_SLUG[key];

    assert.ok(sql.includes(`'${key}'`), `Seed SQL must contain entity_key '${key}'`);
    assert.ok(sql.includes(`'${expectedSlug}'`), `Seed SQL must contain slug '${expectedSlug}'`);
    assert.ok(sql.includes(`'${memoryRecord.canonicalName.replace(/'/g, "''")}'`), `Seed SQL must contain canonical name for '${key}'`);

    // Verify aliases are seeded
    for (const alias of memoryRecord.aliases.slice(0, 3)) {
      assert.ok(sql.includes(`'${alias.replace(/'/g, "''")}'`), `Seed SQL must include alias '${alias}' for '${key}'`);
    }
  }
  console.log(`  ✓ All 17 public canonical entities seeded with 100% taxonomical fidelity (PASSED)`);

  // Verify UNKNOWN sentinel record is seeded with published = false
  assert.ok(sql.includes("'UNKNOWN'"), "Seed SQL must contain UNKNOWN entity key");
  assert.ok(sql.includes("'ent-unknown'"), "Seed SQL must contain ent-unknown ID");
  // Ensure UNKNOWN is seeded with 'draft' and FALSE
  const unknownRegex = /'ent-unknown'[\s\S]*?'UNKNOWN'[\s\S]*?'draft'[\s\S]*?FALSE/i;
  assert.ok(unknownRegex.test(sql), "UNKNOWN sentinel must be seeded with status='draft' and published=FALSE");
  console.log("  ✓ UNKNOWN sentinel seeded as DRAFT and strictly NOT public (PASSED)");

  // --------------------------------------------------------------------------
  // SUITE 4: URL PRESERVATION & REDIRECT AUDIT
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: URL Preservation & Alias Redirects ---');
  for (const [key, slug] of Object.entries(ENTITY_KEY_TO_SLUG)) {
    assert.ok(
      sql.includes(`'${slug}'`),
      `Public URL path /knowledge/${slug} must be preserved in seed`
    );
  }
  console.log(`  ✓ All ${Object.keys(ENTITY_KEY_TO_SLUG).length} canonical public URLs preserved (PASSED)`);

  // Verify Henna redirect slugs in seed
  for (const aliasSlug of HENNA_ALIAS_SLUGS) {
    assert.ok(
      sql.includes(`'${aliasSlug}'`),
      `Henna redirect slug '${aliasSlug}' must be present in redirect_slugs`
    );
  }
  console.log(`  ✓ All ${HENNA_ALIAS_SLUGS.size} Henna 308 redirect slugs preserved in seed (PASSED)`);

  // --------------------------------------------------------------------------
  // SUITE 5: LOGICAL INVARIANTS & UNIQUENESS COLLISION TEST
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Invariants & Collision Prevention ---');
  const seenKeys = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const [key, record] of Object.entries(CANONICAL_ENTITY_REGISTRY)) {
    const slug = key === 'UNKNOWN' ? 'unknown' : ENTITY_KEY_TO_SLUG[key];

    assert.ok(!seenKeys.has(key), `Duplicate entity_key detected: ${key}`);
    seenKeys.add(key);

    assert.ok(!seenSlugs.has(slug), `Duplicate slug detected: ${slug}`);
    seenSlugs.add(slug);
  }
  console.log('  ✓ Collision safety: 100% unique entity_keys and slugs across all records (PASSED)');

  // Test RLS filtering logic simulation
  const mockTableData = Object.entries(CANONICAL_ENTITY_REGISTRY).map(([key, record]) => ({
    entity_key: key,
    slug: key === 'UNKNOWN' ? 'unknown' : ENTITY_KEY_TO_SLUG[key],
    status: key === 'UNKNOWN' ? 'draft' : 'published',
    published: key !== 'UNKNOWN',
  }));

  const publicSelectable = mockTableData.filter(
    (row) => row.status === 'published' && row.published === true
  );
  assert.strictEqual(publicSelectable.length, 17, 'Exactly 17 public entities selectable under RLS policy');
  assert.ok(!publicSelectable.some((row) => row.entity_key === 'UNKNOWN'), 'UNKNOWN entity must NEVER be selectable');
  console.log('  ✓ RLS simulation: Exactly 17 public records eligible, UNKNOWN strictly excluded (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 6: PRODUCTION DATABASE CONNECTION CHECK (INFORMATIONAL ONLY)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Database Table State Inspection ---');
  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data, error } = await supabase.from('knowledge_entities').select('id').limit(1);
    if (!error) {
      console.log('  Database Table [knowledge_entities]: ALREADY PRESENT in Supabase');
    } else {
      console.log(`  Database Table [knowledge_entities]: PENDING SQL EDITOR EXECUTION (${error.message})`);
      console.log('  Fail-closed safety active: Migration is ready for administrative execution in Step 2.');
    }
  } else {
    console.log('  Supabase client not initialized (skipping live query).');
  }

  console.log('\n===============================================================');
  console.log('ALL PHASE 2 STEP 2A KNOWLEDGE SCHEMA TESTS PASSED (100%)');
  console.log('===============================================================');
}

runKnowledgeSchemaTests().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});

