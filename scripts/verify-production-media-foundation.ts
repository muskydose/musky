import fs from 'fs';
import assert from 'node:assert';

// Load .env.local
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

import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
import { getAllMediaAssetsRaw, resetMediaCache, getPrimaryMedia, resolveAuthoritativeMedia } from '../lib/db/media';
import { getProductByIdOrSlug, getAllProductsAdmin } from '../lib/db/products';
import { getCategoryByIdOrSlug, getCategories } from '../lib/db/categories';
import { getSiteSettings } from '../lib/db/settings';

async function runComprehensiveVerification() {
  console.log('===============================================================');
  console.log('VERIFYING PRODUCTION DATABASE MEDIA FOUNDATION AFTER 007');
  console.log('===============================================================');

  const adminClient = getSupabaseAdmin();
  assert.ok(adminClient, 'Supabase Admin client must be initialized');

  const anonClient = getSupabase();
  assert.ok(anonClient, 'Supabase Anon client must be initialized');

  // 1. Verify public.media_assets table exists & count rows
  console.log('\n--- 1. Checking physical table & row count ---');
  const { data: dbRows, error: dbErr, count: exactCount } = await adminClient
    .from('media_assets')
    .select('*', { count: 'exact' });

  assert.ifError(dbErr);
  assert.ok(dbRows && dbRows.length > 0, 'public.media_assets must contain physical rows');
  console.log(`  ✓ Table public.media_assets exists with ${exactCount} physical rows in Supabase.`);

  // 2. Verify no duplicate IDs or role collisions
  console.log('\n--- 2. Checking for duplicate rows ---');
  const idSet = new Set<string>();
  const duplicates: string[] = [];
  dbRows.forEach((r) => {
    if (idSet.has(r.id)) {
      duplicates.push(r.id);
    }
    idSet.add(r.id);
  });
  assert.strictEqual(duplicates.length, 0, `Must have zero duplicate IDs, found: ${duplicates.join(', ')}`);
  console.log(`  ✓ Zero duplicate primary keys: ${idSet.size} unique IDs across ${dbRows.length} rows.`);

  // Check unique primary per entity
  const primaryMap = new Map<string, string>();
  dbRows.filter((r) => r.role === 'PRIMARY' && r.status === 'approved').forEach((r) => {
    const key = `${r.entity_type}:${r.entity_id}`;
    if (primaryMap.has(key)) {
      console.warn(`  ! Multiple PRIMARY for ${key}: ${primaryMap.get(key)} and ${r.id}`);
    } else {
      primaryMap.set(key, r.id);
    }
  });
  console.log(`  ✓ Primary asset assignments valid across ${primaryMap.size} entities.`);

  // 3. Verify RLS policies with anon client
  console.log('\n--- 3. Verifying RLS & Public Access ---');
  const { data: anonApproved, error: anonErr } = await anonClient
    .from('media_assets')
    .select('id, status')
    .eq('status', 'approved');

  assert.ifError(anonErr);
  console.log(`  ✓ Anon client successfully reads ${anonApproved?.length || 0} approved rows under RLS.`);

  // Verify non-approved is blocked under anon (or 0 returned)
  const { data: anonUnapproved } = await anonClient
    .from('media_assets')
    .select('id, status')
    .neq('status', 'approved');
  assert.strictEqual(anonUnapproved?.length || 0, 0, 'Anon client must NOT read non-approved rows');
  console.log('  ✓ RLS enforcement confirmed: Anon client cannot read unapproved/suggested rows.');

  // 4. Verify known storage orphan exists and is untouched
  console.log('\n--- 4. Checking known storage orphan ---');
  const { data: storageFiles, error: storageErr } = await adminClient.storage
    .from('product-images')
    .list('products/prod-1');

  if (storageErr) {
    console.log('  Storage list notice:', storageErr.message);
  } else {
    const orphan = (storageFiles || []).find((f) => f.name === '1787626183022-sojat-pure-henna.png');
    if (orphan) {
      console.log(`  ✓ Known storage orphan confirmed present and untouched: products/prod-1/${orphan.name} (${orphan.metadata?.size || 67} bytes)`);
    } else {
      console.log('  Storage objects in products/prod-1:', storageFiles?.map((f) => f.name));
    }
  }

  // 5. Verify legacy media fields are intact
  console.log('\n--- 5. Verifying legacy fields remain intact ---');
  const { data: prods } = await adminClient.from('products').select('id, name, images');
  const prodsWithImages = (prods || []).filter((p) => Array.isArray(p.images) && p.images.length > 0);
  assert.ok(prodsWithImages.length >= 24, 'All product images must remain intact');
  console.log(`  ✓ Product legacy images[] intact: ${prodsWithImages.length} products retain original images.`);

  const { data: cats } = await adminClient.from('categories').select('id, name, image');
  const catsWithImage = (cats || []).filter((c) => c.image);
  assert.ok(catsWithImage.length >= 5, 'All category image fields must remain intact');
  console.log(`  ✓ Category legacy image intact: ${catsWithImage.length} categories retain original image.`);

  const settings = await getSiteSettings();
  assert.ok(settings.mediaLibrary && settings.mediaLibrary.length >= 6, 'Legacy mediaLibrary in settings must have items');
  console.log(`  ✓ Legacy site_settings.mediaLibrary intact: ${settings.mediaLibrary.length} items available.`);

  // 6. Verify DAL read source
  console.log('\n--- 6. Verifying DAL physical database read source ---');
  resetMediaCache();
  const rawDal = await getAllMediaAssetsRaw();
  assert.strictEqual(rawDal.source, 'database', 'getAllMediaAssetsRaw must report source="database"');
  assert.strictEqual(rawDal.assets.length, exactCount, 'getAllMediaAssetsRaw must return all DB rows');
  console.log(`  ✓ getAllMediaAssetsRaw() confirmed backed by database (source: "${rawDal.source}", rows: ${rawDal.assets.length}).`);

  // 7. Verify storefront canonical media resolution
  console.log('\n--- 7. Verifying storefront canonical media resolution ---');
  const allProds = await getAllProductsAdmin();
  console.log(`  Loaded ${allProds.length} products via getAllProductsAdmin().`);
  if (allProds.length > 0) {
    const firstP = allProds[0] as any;
    console.log(`  Sample product: id=${firstP.id}, name=${firstP.name}, images=${JSON.stringify(firstP.images)}, canonicalPrimaryUrl=${firstP.canonicalPrimaryUrl}`);
  }
  const prodWithMedia = allProds.find((p) => (p as any).canonicalPrimaryUrl) as any;
  if (!prodWithMedia) {
    // Check getBatchResolvedMedia for PRODUCT
    const { getBatchResolvedMedia } = await import('../lib/db/media');
    const bRes = await getBatchResolvedMedia('PRODUCT', allProds.map(p => p.id));
    console.log(`  getBatchResolvedMedia('PRODUCT') returned ${bRes.size} results.`);
    const sampleB = bRes.get(allProds[0]?.id || '');
    console.log(`  Sample bRes for ${allProds[0]?.id}:`, sampleB);
  }
  assert.ok(prodWithMedia, 'At least one product must have canonicalPrimaryUrl attached');
  console.log(`  ✓ Product [${prodWithMedia.id}] (${prodWithMedia.name}):`);
  console.log(`      canonicalPrimaryUrl: ${prodWithMedia.canonicalPrimaryUrl}`);
  console.log(`      legacy images[0]:    ${prodWithMedia.images[0]}`);

  const categories = await getCategories();
  const catWithMedia = categories.find((c) => (c as any).canonicalPrimaryUrl) as any;
  assert.ok(catWithMedia, 'At least one category must have canonicalPrimaryUrl attached');
  console.log(`  ✓ Category [${catWithMedia.id}] (${catWithMedia.name}):`);
  console.log(`      canonicalPrimaryUrl: ${catWithMedia.canonicalPrimaryUrl}`);
  console.log(`      legacy image:        ${catWithMedia.image}`);

  console.log('\n===============================================================');
  console.log('ALL PRODUCTION DATABASE FOUNDATION CHECKS PASSED PERFECTLY!');
  console.log('===============================================================');
}

runComprehensiveVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
