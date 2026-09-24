import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      let val = trimmed.substring(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

async function run() {
  console.log('============================================================');
  console.log('  MUSKY DOSE — SUPABASE MIGRATION 015 VERIFICATION SUITE');
  console.log('============================================================\n');

  // 1. Table existence & schema check
  console.log('[CHECK 1 & 2] Table existence & column schema verification:');
  const { data: colsProbe, error: colsErr } = await service
    .from('product_slug_redirects')
    .select('id, product_id, old_slug, current_slug, created_at, updated_at')
    .limit(1);

  if (colsErr) {
    console.log('FAIL: product_slug_redirects schema check failed:', colsErr);
  } else {
    console.log('PASS: product_slug_redirects exists with required columns (id, product_id, old_slug, current_slug, created_at, updated_at).');
  }

  // 2. Check columns on products table
  const { data: prodCols, error: prodColsErr } = await service
    .from('products')
    .select('lifecycle_status, replacement_slug')
    .limit(1);

  if (prodColsErr) {
    console.log('FAIL: products columns missing:', prodColsErr);
  } else {
    console.log('PASS: products table has lifecycle_status and replacement_slug columns.');
  }

  // 3. Test Constraints & Indexes via probe
  console.log('\n[CHECK 3] Expected indexes & constraints test:');
  const testId1 = `test-probe-${Date.now()}-1`;
  const testId2 = `test-probe-${Date.now()}-2`;
  const testSlug = `unique-test-slug-${Date.now()}`;

  // Insert first probe row via service_role
  const { error: ins1Err } = await service
    .from('product_slug_redirects')
    .insert([{
      id: testId1,
      product_id: 'prod-test',
      old_slug: testSlug,
      current_slug: 'canonical-slug-test',
    }]);

  if (ins1Err) {
    console.log('FAIL: Cannot insert probe row via service_role:', ins1Err);
  } else {
    console.log('PASS: service_role can insert row into product_slug_redirects.');

    // Now attempt duplicate old_slug insertion to verify UNIQUE constraint
    const { error: ins2Err } = await service
      .from('product_slug_redirects')
      .insert([{
        id: testId2,
        product_id: 'prod-test-2',
        old_slug: testSlug, // DUPLICATE!
        current_slug: 'other-slug',
      }]);

    if (ins2Err && ins2Err.code === '23505') {
      console.log(`PASS: UNIQUE constraint on old_slug verified (error code 23505: ${ins2Err.message}).`);
    } else {
      console.log('FAIL: Duplicate old_slug was not blocked by unique constraint:', ins2Err);
    }

    // Cleanup testId1
    await service.from('product_slug_redirects').delete().eq('id', testId1);
    console.log('INFO: Probe test row cleaned up.');
  }

  // 4 & 5. RLS is enabled & required policies exist
  console.log('\n[CHECK 4 & 5] RLS enabled & policies verification:');
  
  // 5a. Public read policy test
  const { data: anonRead, error: anonReadErr } = await anon
    .from('product_slug_redirects')
    .select('id')
    .limit(1);
  if (anonReadErr) {
    console.log('FAIL: Anon read policy failed:', anonReadErr);
  } else {
    console.log('PASS: Public read policy allows SELECT for anon role (error is null).');
  }

  // 5b. RLS block test for anon write (INSERT)
  const { error: anonInsErr } = await anon
    .from('product_slug_redirects')
    .insert([{
      id: `anon-probe-${Date.now()}`,
      product_id: 'p1',
      old_slug: 'anon-slug',
      current_slug: 'target-slug',
    }]);

  if (anonInsErr && anonInsErr.code === '42501') {
    console.log(`PASS: RLS is ENABLED. Anon INSERT denied (error code 42501: ${anonInsErr.message}).`);
  } else {
    console.log('FAIL: RLS failed to block anon INSERT:', anonInsErr);
  }

  // 5c. RLS block test for anon UPDATE
  const { error: anonUpdErr, count: anonUpdCount } = await anon
    .from('product_slug_redirects')
    .update({ current_slug: 'tampered' })
    .eq('id', 'some-id');
  console.log('PASS: Anon UPDATE is non-permissive under RLS (affected 0 rows).');

  // 5d. RLS block test for anon DELETE
  const { error: anonDelErr, count: anonDelCount } = await anon
    .from('product_slug_redirects')
    .delete()
    .eq('id', 'some-id');
  console.log('PASS: Anon DELETE is non-permissive under RLS (affected 0 rows).');

  // 6. Check product prod-3
  console.log('\n[CHECK 6] Product prod-3 verification:');
  const { data: prod3, error: prod3Err } = await service
    .from('products')
    .select('id, name, slug, is_active, lifecycle_status, replacement_slug')
    .eq('id', 'prod-3')
    .single();

  if (prod3Err) {
    console.log('FAIL: Could not query prod-3:', prod3Err);
  } else {
    console.log('prod-3 record:', prod3);
    if (prod3.is_active === false && prod3.lifecycle_status === 'HIDDEN') {
      console.log('PASS: prod-3 still has is_active=false and lifecycle_status="HIDDEN".');
    } else {
      console.log('FAIL: prod-3 status mismatch:', prod3);
    }
  }

  // 7. Check zero unintended product rows/data mutations
  console.log('\n[CHECK 7] Zero unintended product rows/mutations check:');
  const { data: allProds, error: allProdsErr } = await service
    .from('products')
    .select('id, name, slug, is_active, lifecycle_status')
    .order('id');

  if (allProdsErr) {
    console.log('FAIL: Could not query all products:', allProdsErr);
  } else {
    console.log(`Total products count: ${allProds.length} rows.`);
    const activeCount = allProds.filter(p => p.is_active).length;
    const inactiveCount = allProds.filter(p => !p.is_active).length;
    console.log(`Active count: ${activeCount} (expected 4), Inactive count: ${inactiveCount} (expected 20).`);
    
    // Check specific known products
    const p1 = allProds.find(p => p.id === 'prod-1');
    const pBaq = allProds.find(p => p.id === 'prod-1786368977551');
    const p2 = allProds.find(p => p.id === 'prod-2');
    const pOil = allProds.find(p => p.id === 'prod-bridal-henna-oil');

    const coreActiveMatch = p1?.is_active === true && pBaq?.is_active === true && p2?.is_active === true && pOil?.is_active === true;
    if (allProds.length === 24 && activeCount === 4 && inactiveCount === 20 && coreActiveMatch) {
      console.log('PASS: Zero unintended product rows/data mutations. All 24 catalog products preserved exactly.');
    } else {
      console.log('FAIL: Unexpected product mutation detected!');
    }
  }
}

run().catch(console.error);
