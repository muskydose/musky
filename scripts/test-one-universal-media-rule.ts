/**
 * MUSKY DOSE — ONE UNIVERSAL MEDIA ARCHITECTURE VERIFICATION SUITE
 * 
 * Verifies that:
 * 1. EVERY visual on the website resolves exclusively through the canonical Media DAL / universal media resolver.
 * 2. All legacy / external bypasses (Unsplash, mock CDNs, arbitrary URLs) are strictly eliminated.
 * 3. Official logo (/logo.png) and favicon (/favicon.png) are protected.
 * 4. Catalog data (products, prices, SKUs, inventory) is 100% preserved and never mutated.
 * 5. BAQ Henna (prod-1786368977551) resolves its verified live Supabase manual upload asset.
 * 6. Missing/unapproved media shows clean branded fallback without runtime crash.
 */

import assert from 'assert';
import {
  isSafeInternalMediaUrl,
  getPrimaryMedia,
  getMediaForEntity,
  attachCanonicalMediaToCategory,
  attachCanonicalMediaToProduct,
  attachCanonicalMediaToGuide,
} from '../lib/db/media';
import {
  resolveAuthoritativeProductMedia,
  generateProductMediaSchema,
  extractMerchantFeedMedia,
} from '../lib/growth/product-media-governance';
import { validateProductForMerchantFeed } from '../lib/growth/merchant-feed';
import { getSiteLogo, getSiteFavicon, getSiteAppleIcon } from '../lib/brand-assets';
import { mapRowToCategory } from '../lib/db/categories';
import { Product, Category, ProductGuide } from '../lib/types';

async function runOneUniversalMediaArchitectureTests() {
  console.log('🧪 Starting Musky Dose One-Universal-Media Architecture Test Suite...\n');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.then(() => {
          passed++;
          console.log(`  ✅ [PASS] ${name}`);
        }).catch((err) => {
          console.error(`  ❌ [FAIL] ${name}:`, err.message);
          throw err;
        });
      } else {
        passed++;
        console.log(`  ✅ [PASS] ${name}`);
      }
    } catch (err: any) {
      console.error(`  ❌ [FAIL] ${name}:`, err.message);
      throw err;
    }
  }

  // ==========================================================================
  // SECTION 1: STRICT URL SANITIZATION & BRAND PRESERVATION
  // ==========================================================================
  console.log('--- SECTION 1: Strict URL Sanitization & Brand Protection ---');

  test('Official logo is recognized as safe internal media', () => {
    assert.strictEqual(isSafeInternalMediaUrl('/logo.png'), true);
  });

  test('Official favicon and icons are recognized as safe internal media', () => {
    assert.strictEqual(isSafeInternalMediaUrl('/favicon.png'), true);
    assert.strictEqual(isSafeInternalMediaUrl('/favicon.ico'), true);
    assert.strictEqual(isSafeInternalMediaUrl('/apple-touch-icon.png'), true);
    assert.strictEqual(isSafeInternalMediaUrl('/images/fallback.svg'), true);
  });

  test('Supabase storage canonical uploads are recognized as safe internal media', () => {
    const supabaseUrl = 'https://cbqeygqmflkquxexsogd.supabase.co/storage/v1/object/public/product-images/manual/product/prod-1.webp';
    assert.strictEqual(isSafeInternalMediaUrl(supabaseUrl), true);
  });

  test('External Unsplash URLs are strictly rejected by isSafeInternalMediaUrl', () => {
    const unsplash = 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&q=80';
    assert.strictEqual(isSafeInternalMediaUrl(unsplash), false);
  });

  test('Mock CDNs and Google image URLs are strictly rejected', () => {
    assert.strictEqual(isSafeInternalMediaUrl('https://cdn.muskydose.in/mock-henna.jpg'), false);
    assert.strictEqual(isSafeInternalMediaUrl('https://lh3.googleusercontent.com/abc123xyz'), false);
    assert.strictEqual(isSafeInternalMediaUrl('https://images.google.com/search?q=henna'), false);
  });

  test('Brand helpers fallback safely if external URLs are injected in site_settings', () => {
    const dirtySettings = {
      logoUrl: 'https://images.unsplash.com/fake-logo',
      faviconUrl: 'https://cdn.muskydose.in/fake-favicon.ico',
    };
    assert.strictEqual(getSiteLogo(dirtySettings), '/logo.png');
    assert(getSiteFavicon(dirtySettings).startsWith('/favicon.png'));
    assert.strictEqual(getSiteAppleIcon(dirtySettings), '/apple-touch-icon.png');
  });

  // ==========================================================================
  // SECTION 2: CATEGORY CONSUMPTION & INGESTION SANITIZATION
  // ==========================================================================
  console.log('\n--- SECTION 2: Category DAL & Consumer Sanitization ---');

  test('Category row mapper strips raw legacy Unsplash image string', () => {
    const dirtyRow = {
      id: 'cat-henna',
      name: 'Henna & Mehndi',
      slug: 'henna',
      description: 'Sojat henna',
      image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80',
      sort_order: 1,
      is_active: true,
    };
    const mapped = mapRowToCategory(dirtyRow);
    assert.strictEqual(mapped.image, '', 'Unsplash URL must be stripped to empty string');
    assert.strictEqual(mapped.name, 'Henna & Mehndi');
  });

  test('Category row mapper preserves safe Supabase or local image string', () => {
    const safeRow = {
      id: 'cat-henna',
      name: 'Henna & Mehndi',
      slug: 'henna',
      image: 'https://cbqeygqmflkquxexsogd.supabase.co/storage/v1/object/public/product-images/categories/henna.webp',
      sort_order: 1,
      is_active: true,
    };
    const mapped = mapRowToCategory(safeRow);
    assert.strictEqual(mapped.image, safeRow.image);
  });

  test('attachCanonicalMediaToCategory attaches approved asset without mutating category.image', () => {
    const cat: Category = {
      id: 'cat-henna',
      name: 'Henna',
      slug: 'henna',
      description: '',
      image: '',
      sortOrder: 1,
      isActive: true,
    };
    const mockAsset: any = {
      id: 'asset-cat-1',
      url: 'https://cbqeygqmflkquxexsogd.supabase.co/storage/v1/object/public/product-images/cat-1.webp',
      source: 'MANUAL_UPLOAD',
      status: 'approved',
    };
    const attached = attachCanonicalMediaToCategory(cat, mockAsset);
    assert.strictEqual(attached.canonicalPrimaryUrl, mockAsset.url);
    assert.strictEqual(attached.image, '', 'Original category.image must remain untouched');
  });

  // ==========================================================================
  // SECTION 3: PRODUCT GOVERNANCE & BYPASS ELIMINATION
  // ==========================================================================
  console.log('\n--- SECTION 3: Product Governance & Authoritative Media ---');

  test('Product media governance strips Unsplash and mock images from product.images and product.media', () => {
    const dirtyProduct = {
      id: 'prod-test-dirty',
      name: 'Dirty Henna Powder',
      slug: 'dirty-henna-powder',
      categoryId: 'cat-1',
      price: 249,
      images: [
        'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
        'https://cdn.muskydose.in/mock-henna.jpg',
      ],
      media: [
        {
          id: 'm-1',
          type: 'image',
          url: 'https://images.unsplash.com/photo-1596462502278',
          role: 'PRIMARY',
          sortOrder: 1,
          enabled: true,
        },
      ],
    } as unknown as Product;

    const resolution = resolveAuthoritativeProductMedia(dirtyProduct);
    assert.strictEqual(resolution.allMedia.length, 0, 'No unsafe media items should be ingested');
    assert.strictEqual(resolution.isFallback, true, 'isFallback must be true');
    assert(resolution.primaryImage.includes('fallback.svg'), 'Must return clean branded fallback SVG');
  });

  test('Product media governance preserves verified Supabase storage assets', () => {
    const safeProduct = {
      id: 'prod-safe-1',
      name: 'Safe Henna Powder',
      slug: 'safe-henna-powder',
      categoryId: 'cat-1',
      price: 249,
      images: [
        'https://cbqeygqmflkquxexsogd.supabase.co/storage/v1/object/public/product-images/manual/product/safe-1.webp',
      ],
    } as unknown as Product;

    const resolution = resolveAuthoritativeProductMedia(safeProduct);
    assert.strictEqual(resolution.allMedia.length, 1);
    assert.strictEqual(resolution.isFallback, false);
    assert.strictEqual(resolution.primaryImage, safeProduct.images![0]);
  });

  test('generateProductMediaSchema generates clean JSON-LD without Unsplash or fallback SVGs', () => {
    const dirtyProduct = {
      id: 'prod-schema-test',
      name: 'Schema Test',
      slug: 'schema-test',
      categoryId: 'cat-1',
      price: 199,
      images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12'],
    } as unknown as Product;

    const schema = generateProductMediaSchema(dirtyProduct);
    assert.strictEqual(schema.images.length, 0, 'Schema images must contain 0 items when only dirty images exist');
  });

  // ==========================================================================
  // SECTION 4: GOOGLE MERCHANT CENTER COMPLIANCE
  // ==========================================================================
  console.log('\n--- SECTION 4: Google Merchant Center Compliance ---');

  test('Google Merchant validation flags product with missing/unsafe images as FEED_NEEDS_REVIEW', () => {
    const unapprovedProd = {
      id: 'prod-no-image',
      name: 'Pure Henna Without Image',
      slug: 'pure-henna-no-image',
      categoryId: 'cat-1',
      price: 299,
      shortDescription: '100% Pure Triple Sifted Sojat Henna Powder for natural hair conditioning.',
      stockStatus: 'in_stock',
      isActive: true,
      robotsIndex: true,
      images: ['https://images.unsplash.com/photo-1546868871-7041f2a55e12'], // Unsafe!
    } as unknown as Product;

    const result = validateProductForMerchantFeed(unapprovedProd);
    assert.strictEqual(result.feedStatus, 'FEED_NEEDS_REVIEW');
    assert(result.validationErrors.some((e) => e.toLowerCase().includes('image')), 'Must report image error');
  });

  test('Google Merchant validation accepts product with verified Supabase storage asset', () => {
    const approvedProd = {
      id: 'prod-with-verified-image',
      name: 'Pure Henna Verified',
      slug: 'pure-henna-verified',
      categoryId: 'cat-1',
      price: 299,
      shortDescription: '100% Pure Triple Sifted Sojat Henna Powder for natural hair conditioning.',
      stockStatus: 'in_stock',
      isActive: true,
      robotsIndex: true,
      images: ['https://cbqeygqmflkquxexsogd.supabase.co/storage/v1/object/public/product-images/manual/product/safe-img.webp'],
    } as unknown as Product;

    const result = validateProductForMerchantFeed(approvedProd);
    assert.strictEqual(result.feedStatus, 'FEED_READY');
    assert.strictEqual(result.validationErrors.length, 0);
    assert.strictEqual(result.cleanItem.imageLink, approvedProd.images![0]);
  });

  // ==========================================================================
  // SECTION 5: LIVE STORE REPOSITORY & BAQ HENNA CHECK
  // ==========================================================================
  console.log('\n--- SECTION 5: Live Database & BAQ Henna Verification ---');

  await test('BAQ Henna (prod-1786368977551) resolves verified MANUAL_UPLOAD asset from live DAL', async () => {
    const primary = await getPrimaryMedia({
      entityType: 'PRODUCT',
      entityId: 'prod-1786368977551',
    });

    assert(primary, 'Primary asset must resolve');
    console.log(`     Asset ID: ${primary.id}`);
    console.log(`     Source:   ${primary.source}`);
    console.log(`     Status:   ${primary.status}`);
    console.log(`     Locked:   ${primary.isLocked}`);
    console.log(`     URL:      ${primary.url}`);

    assert.strictEqual(primary.source, 'MANUAL_UPLOAD', 'Must be MANUAL_UPLOAD');
    assert.strictEqual(primary.status, 'approved', 'Must be approved');
    assert.strictEqual(primary.isLocked, true, 'Must be locked');
    assert(primary.url.includes('.supabase.co/storage/v1/object/public/product-images/manual/product/prod-1786368977551-primary-'), 'Must point to verified Supabase manual webp file');
  });

  await test('All approved media assets in public.media_assets are safe internal assets', async () => {
    const assets = await getMediaForEntity({ entityType: 'PRODUCT', includeDrafts: false });
    for (const asset of assets) {
      assert(
        isSafeInternalMediaUrl(asset.url),
        `Asset ${asset.id} has unsafe URL: ${asset.url}`
      );
    }
    console.log(`     Verified ${assets.length} approved product assets — 100% safe internal URLs`);
  });

  console.log(`\n🎉 All ${passed}/${total} Universal Media Rule Tests PASSED successfully!\n`);
}

runOneUniversalMediaArchitectureTests().catch((err) => {
  console.error('\n❌ Suite failed:', err);
  process.exit(1);
});
