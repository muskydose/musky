/**
 * Musky Dose — Technical SEO & Indexing Verification Test Suite
 *
 * Verifies:
 * 1. Sitemap generation (active products, non-empty categories, guides, knowledge entities, static routes)
 * 2. prod-3 exclusion from sitemap and retention of hidden status
 * 3. Empty categories exclusion from sitemap & noindex,follow metadata
 * 4. Knowledge Hub generation & 17 published botanical entities
 * 5. Offers page metadata & canonical tag
 * 6. Wholesale page metadata alignment
 */

import fs from 'fs';
import path from 'path';

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

import sitemap from '../app/sitemap';
import { generateMetadata as generateCategoryMetadata } from '../app/categories/[slug]/page';
import { generateMetadata as generateOffersMetadata } from '../app/offers/page';
import { generateMetadata as generateKnowledgeHubMetadata } from '../app/knowledge/page';
import { generateMetadata as generateWholesaleMetadata } from '../app/wholesale/page';
import { getPublishedKnowledgeEntities } from '../lib/db/knowledge';
import { getProducts } from '../lib/db/products';
import { getCategories } from '../lib/db/categories';

async function runTests() {
  console.log('=== MUSKY DOSE TECHNICAL SEO & COVERAGE VERIFICATION ===\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  try {
    // 1. Sitemap Tests
    console.log('--- 1. XML Sitemap Audit ---');
    const sitemapEntries = await sitemap();
    const urls = sitemapEntries.map((e) => e.url);

    assert(urls.includes('https://muskydose.in'), 'Sitemap contains home page');
    assert(urls.includes('https://muskydose.in/products'), 'Sitemap contains /products');
    assert(urls.includes('https://muskydose.in/categories'), 'Sitemap contains /categories');
    assert(urls.includes('https://muskydose.in/knowledge'), 'Sitemap contains Botanical Knowledge Hub (/knowledge)');
    assert(urls.includes('https://muskydose.in/offers'), 'Sitemap contains /offers');
    assert(urls.includes('https://muskydose.in/guides'), 'Sitemap contains /guides');

    // Verify prod-3 is excluded
    const prod3InSitemap = urls.some((u) => u.includes('musky-dose-special-bridal-mehendi-cones'));
    assert(!prod3InSitemap, 'prod-3 (Hidden Bridal Cones) is EXCLUDED from sitemap');

    // Verify active products are included
    assert(urls.includes('https://muskydose.in/products/baq-henna-powder'), 'BAQ Henna Powder is in sitemap');
    assert(urls.includes('https://muskydose.in/products/natural-organic-indigo-powder'), 'Indigo Powder is in sitemap');
    assert(urls.includes('https://muskydose.in/products/sojat-pure-triple-shifted-henna-powder'), 'Triple Shifted Henna is in sitemap');
    assert(urls.includes('https://muskydose.in/products/bridal-henna-oil'), 'Bridal Henna Oil is in sitemap');

    // Verify category inclusion/exclusion
    assert(urls.includes('https://muskydose.in/categories/henna'), 'Category /categories/henna (has products) is IN sitemap');
    assert(urls.includes('https://muskydose.in/categories/hair-care'), 'Category /categories/hair-care (has products) is IN sitemap');
    assert(!urls.includes('https://muskydose.in/categories/face-care'), 'Category /categories/face-care (0 products) is EXCLUDED from sitemap');
    assert(!urls.includes('https://muskydose.in/categories/herbal-products'), 'Category /categories/herbal-products (0 products) is EXCLUDED from sitemap');
    assert(!urls.includes('https://muskydose.in/categories/beauty-category'), 'Category /categories/beauty-category (0 products) is EXCLUDED from sitemap');

    // Verify published guides
    assert(urls.includes('https://muskydose.in/guides/what-is-baq-henna-vs-regular-mehendi-powder'), 'Guide 1 in sitemap');
    assert(urls.includes('https://muskydose.in/guides/how-to-mix-baq-henna-for-dark-bridal-stain'), 'Guide 2 in sitemap');
    assert(urls.includes('https://muskydose.in/guides/henna-and-indigo-2-step-natural-hair-dye'), 'Guide 3 in sitemap');

    // Verify knowledge entities
    const knowledgeUrls = urls.filter((u) => u.includes('/knowledge/'));
    assert(knowledgeUrls.length >= 17, `All published botanical entities in sitemap (found: ${knowledgeUrls.length})`);
    assert(urls.includes('https://muskydose.in/knowledge/henna-mehndi'), 'Henna botanical profile in sitemap');
    assert(urls.includes('https://muskydose.in/knowledge/indigo'), 'Indigo botanical profile in sitemap');
    assert(urls.includes('https://muskydose.in/knowledge/brahmi'), 'Brahmi botanical profile in sitemap');
    assert(urls.includes('https://muskydose.in/knowledge/moringa'), 'Moringa botanical profile in sitemap');

    // 2. Category Metadata Robots Directives
    console.log('\n--- 2. Category Robots Directives Audit ---');
    const faceCareMeta: any = await generateCategoryMetadata({ params: Promise.resolve({ slug: 'face-care' }) });
    assert(
      faceCareMeta?.robots?.index === false && faceCareMeta?.robots?.follow === true,
      'Empty category /categories/face-care returns robots: { index: false, follow: true }',
      JSON.stringify(faceCareMeta?.robots)
    );

    const hennaMeta: any = await generateCategoryMetadata({ params: Promise.resolve({ slug: 'henna' }) });
    const hennaIndexable = hennaMeta?.robots ? hennaMeta.robots.index !== false : true;
    assert(hennaIndexable, 'Populated category /categories/henna is indexable');

    // 3. Knowledge Hub Metadata
    console.log('\n--- 3. Knowledge Hub Audit ---');
    const hubMeta: any = await generateKnowledgeHubMetadata();
    assert(hubMeta?.title?.includes('Botanical Knowledge Hub'), 'Knowledge Hub has valid title');
    assert(hubMeta?.alternates?.canonical === 'https://muskydose.in/knowledge', 'Knowledge Hub has canonical URL');

    const publishedEntities = await getPublishedKnowledgeEntities();
    assert(publishedEntities.length >= 17, `Database has ${publishedEntities.length} published botanical entities`);

    // 4. Offers Page Metadata
    console.log('\n--- 4. Offers Page Audit ---');
    const offersMeta: any = await generateOffersMetadata();
    assert(offersMeta?.title?.includes('Special Offers'), 'Offers page has SSR title');
    assert(offersMeta?.alternates?.canonical === 'https://muskydose.in/offers', 'Offers page has canonical URL');

    // 5. Wholesale Page Metadata
    console.log('\n--- 5. Wholesale Page Audit ---');
    const wholesaleMeta: any = await generateWholesaleMetadata();
    assert(!wholesaleMeta?.description?.toLowerCase().includes('bridal mehndi cones'), 'Wholesale meta description does not claim bridal cones');
  } catch (err: any) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
