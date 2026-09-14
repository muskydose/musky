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

import { getSupabaseAdmin } from '../lib/supabase';
import { INITIAL_MEDIA_LIBRARY } from '../lib/data-store';

async function checkAndSeedSiteSettings() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error('No Supabase Admin client');
    return;
  }

  const { data: rows, error } = await admin.from('site_settings').select('*');
  if (error || !rows || rows.length === 0) {
    console.error('Failed to load site_settings:', error);
    return;
  }

  const row = rows[0];
  const data = row.data || {};
  console.log('Current site_settings.id:', row.id);
  console.log('Current data.mediaLibrary length:', Array.isArray(data.mediaLibrary) ? data.mediaLibrary.length : 'not array');

  // Inspect products
  const { data: products } = await admin.from('products').select('id, name, images');
  const { data: categories } = await admin.from('categories').select('id, name, image');

  console.log(`Loaded ${products?.length} products, ${categories?.length} categories.`);
  const productMediaItems: any[] = [];
  if (Array.isArray(products)) {
    for (const p of products) {
      if (Array.isArray(p.images) && p.images.length > 0) {
        p.images.forEach((img: any, idx: number) => {
          const url = typeof img === 'string' ? img : img?.url;
          if (url && typeof url === 'string' && url.trim()) {
            productMediaItems.push({
              id: `leg-prod-${p.id}-${idx}`,
              name: `${p.name} - Image ${idx + 1}`,
              url: url.trim(),
              type: 'image/webp',
              size: 150000,
              category: 'products',
              altText: `${p.name} product photo`,
              uploadedAt: new Date().toISOString(),
              usedIn: [`Product: ${p.name}`],
            });
          }
        });
      }
    }
  }
  console.log(`Extracted ${productMediaItems.length} product media items.`);

  if (Array.isArray(categories)) {
    for (const c of categories) {
      if (c.image && typeof c.image === 'string') {
        productMediaItems.push({
          id: `leg-cat-${c.id}`,
          name: `${c.name} Category Banner`,
          url: c.image,
          type: 'image/webp',
          size: 200000,
          category: 'categories',
          altText: `${c.name} banner`,
          uploadedAt: new Date().toISOString(),
          usedIn: [`Category: ${c.name}`],
        });
      }
    }
  }

  // Combine INITIAL_MEDIA_LIBRARY and active product/category items
  // Keep all 6 named INITIAL_MEDIA_LIBRARY items plus distinct real product/category URLs
  const finalMediaLibrary: any[] = [...INITIAL_MEDIA_LIBRARY];
  const knownUrls = new Set(INITIAL_MEDIA_LIBRARY.map((m) => m.url));

  productMediaItems.forEach((item) => {
    if (!knownUrls.has(item.url)) {
      knownUrls.add(item.url);
      finalMediaLibrary.push(item);
    }
  });

  console.log(`Generated ${finalMediaLibrary.length} legacy media items.`);
  finalMediaLibrary.forEach(item => console.log(`  - [${item.id}] (${item.name}): ${item.url}`));

  const updatedData = {
    ...data,
    mediaLibrary: finalMediaLibrary,
  };

  const { error: updateError } = await admin
    .from('site_settings')
    .update({ data: updatedData, updated_at: new Date().toISOString() })
    .eq('id', row.id);

  if (updateError) {
    console.error('Failed to update site_settings:', updateError);
  } else {
    console.log('SUCCESS! Updated site_settings.data.mediaLibrary in Supabase.');
  }

  // Verify
  const { data: verifyRows } = await admin.from('site_settings').select('*');
  const verifyData = verifyRows?.[0]?.data || {};
  console.log('Verified data.mediaLibrary length in Supabase:', Array.isArray(verifyData.mediaLibrary) ? verifyData.mediaLibrary.length : 'not array');
}

checkAndSeedSiteSettings().catch(console.error);
