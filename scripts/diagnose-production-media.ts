import fs from 'fs';

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

async function diagnose() {
  console.log('=== PRODUCTION SUPABASE DIAGNOSTIC ===');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing');

  const supabase = getSupabaseAdmin() || getSupabase();
  if (!supabase) {
    console.error('FAILED to initialize Supabase client!');
    return;
  }

  // 1. Check media_assets table
  console.log('\n--- Checking public.media_assets ---');
  const { data: mediaData, error: mediaError, count: mediaCount } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact' });

  if (mediaError) {
    console.log('media_assets query ERROR:', {
      code: mediaError.code,
      message: mediaError.message,
      details: mediaError.details,
      hint: mediaError.hint,
    });
  } else {
    console.log(`media_assets table EXISTS! Row count: ${mediaData?.length ?? 0}, Total count: ${mediaCount}`);
    if (mediaData && mediaData.length > 0) {
      console.log('First 3 media rows:');
      mediaData.slice(0, 3).forEach((r) => {
        console.log(`  - [${r.id}] ${r.entity_type}/${r.entity_id}: ${r.role} (${r.source}, ${r.status}) -> ${r.url}`);
      });
    }
  }

  // 2. Check site_settings table
  console.log('\n--- Checking public.site_settings ---');
  const { data: settingsData, error: settingsError } = await supabase
    .from('site_settings')
    .select('*');

  if (settingsError) {
    console.log('site_settings query ERROR:', settingsError);
  } else {
    console.log(`site_settings rows: ${settingsData?.length}`);
    if (settingsData && settingsData.length > 0) {
      const row = settingsData[0];
      const dataCol = row.data || {};
      console.log('site_settings keys in row:', Object.keys(row));
      console.log('site_settings.data keys:', Object.keys(dataCol));
      console.log('row.media_library length:', Array.isArray(row.media_library) ? row.media_library.length : 'not array/col');
      console.log('row.data.mediaLibrary length:', Array.isArray(dataCol.mediaLibrary) ? dataCol.mediaLibrary.length : 'not array');
      if (Array.isArray(dataCol.mediaLibrary)) {
        console.log('Sample data.mediaLibrary items:', dataCol.mediaLibrary.slice(0, 3));
      }
    }
  }

  // 3. Check products table
  console.log('\n--- Checking public.products ---');
  const { data: prodData, error: prodError } = await supabase
    .from('products')
    .select('id, name, images, is_active');
  if (prodError) {
    console.log('products query ERROR:', prodError);
  } else {
    console.log(`products count: ${prodData?.length}`);
    const withImages = (prodData || []).filter((p) => Array.isArray(p.images) && p.images.length > 0);
    console.log(`products with images[]: ${withImages.length}`);
    withImages.slice(0, 4).forEach((p) => {
      console.log(`  - ${p.id} (${p.name}): ${JSON.stringify(p.images)}`);
    });
  }

  // 4. Check categories table
  console.log('\n--- Checking public.categories ---');
  const { data: catData, error: catError } = await supabase
    .from('categories')
    .select('id, name, image');
  if (catError) {
    console.log('categories query ERROR:', catError);
  } else {
    console.log(`categories count: ${catData?.length}`);
    catData?.forEach((c) => console.log(`  - ${c.id} (${c.name}): ${c.image}`));
  }

  // 5. Check DAL output: getAllMediaAssetsRaw() and getSiteSettings()
  console.log('\n--- Checking DAL Outputs ---');
  const { getAllMediaAssetsRaw } = await import('../lib/db/media');
  const { getSiteSettings } = await import('../lib/db/settings');

  const rawMedia = await getAllMediaAssetsRaw();
  console.log(`getAllMediaAssetsRaw count: ${rawMedia.assets.length}, source: ${rawMedia.source}`);

  const settings = await getSiteSettings();
  console.log(`getSiteSettings().mediaLibrary count: ${settings.mediaLibrary?.length || 0}`);
}

diagnose().catch(console.error);
