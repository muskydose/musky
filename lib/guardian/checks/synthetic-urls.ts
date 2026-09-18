// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN: SYNTHETIC URL PROBES
// Non-Destructive HTTP Checks on Critical Customer Routes
// ============================================================

import { GuardianCheckResult } from '../types';
import { getProducts } from '@/lib/db/products';
import { getGuides } from '@/lib/db/guides';

const CORE_STATIC_ROUTES = [
  { path: '/', name: 'Storefront Homepage', expectedCode: 200 },
  { path: '/products', name: 'Product Catalog Listing', expectedCode: 200 },
  { path: '/categories', name: 'Categories Hub', expectedCode: 200 },
  { path: '/guides', name: 'Guides Ecosystem', expectedCode: 200 },
  { path: '/wholesale', name: 'B2B Wholesale Portal', expectedCode: 200 },
  { path: '/sojat-henna', name: 'Sojat Henna Origin Hub', expectedCode: 200 },
  { path: '/factory', name: 'Processing & Factory Story', expectedCode: 200 },
  { path: '/faq', name: 'Frequently Asked Questions', expectedCode: 200 },
  { path: '/contact', name: 'Contact & Mandi Location', expectedCode: 200 },
  { path: '/cart', name: 'Shopping Cart', expectedCode: 200 },
  { path: '/checkout', name: 'Secure Checkout', expectedCode: 200 },
  { path: '/robots.txt', name: 'Search Engine Robots.txt', expectedCode: 200 },
  { path: '/sitemap.xml', name: 'XML Sitemap', expectedCode: 200 },
];

export async function runSyntheticUrlChecks(baseUrl?: string): Promise<GuardianCheckResult[]> {
  const results: GuardianCheckResult[] = [];
  const origin = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  // 1. Static Core Routes in Parallel
  const staticResults = await Promise.all(
    CORE_STATIC_ROUTES.map(async (route) => {
      const start = Date.now();
      const url = `${origin}${route.path}`;

      try {
        // In serverless/test environment, fetch with a short 3.5s timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'x-guardian-probe': '1',
            'User-Agent': 'MuskyDose-Guardian/1.0',
          },
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);
        const duration = Date.now() - start;

        if (!res) {
          // Network or timeout failure
          return {
            checkId: `chk_url_${route.path.replace(/\W/g, '_')}`,
            name: route.name,
            target: route.path,
            type: 'STOREFRONT_URL' as const,
            status: 'FAIL' as const,
            durationMs: duration,
            error: 'Connection timeout or network unavailable',
            observedAt: new Date().toISOString(),
          };
        }

        const isPass = res.status === route.expectedCode;
        const isWarn = res.status === 200 && duration > 2500;
        const status: 'PASS' | 'WARN' | 'FAIL' = isPass ? (isWarn ? 'WARN' : 'PASS') : 'FAIL';

        return {
          checkId: `chk_url_${route.path.replace(/\W/g, '_')}`,
          name: route.name,
          target: route.path,
          type: 'STOREFRONT_URL' as const,
          status,
          statusCode: res.status,
          durationMs: duration,
          error: isPass ? undefined : `Expected HTTP ${route.expectedCode}, received ${res.status}`,
          observedAt: new Date().toISOString(),
        };
      } catch (e: any) {
        const duration = Date.now() - start;
        return {
          checkId: `chk_url_${route.path.replace(/\W/g, '_')}`,
          name: route.name,
          target: route.path,
          type: 'STOREFRONT_URL' as const,
          status: 'FAIL' as const,
          durationMs: duration,
          error: e.message || 'Probe execution error',
          observedAt: new Date().toISOString(),
        };
      }
    })
  );
  results.push(...staticResults);

  // 2. Dynamic Route Sampling in Parallel (1 active product, 1 published guide from DB)
  let sampleProductSlug = 'sojat-pure-triple-shifted-henna-powder';
  let sampleProductName = 'Sample Product';
  try {
    const products = await getProducts();
    if (products && products.length > 0) {
      sampleProductSlug = products[0].slug;
      sampleProductName = products[0].name;
    }
  } catch {}

  let sampleGuideSlug = 'henna-paste-preparation-guide';
  let sampleGuideTitle = 'Sample Guide';
  try {
    const guides = await getGuides();
    if (guides && guides.length > 0) {
      sampleGuideSlug = guides[0].slug;
      sampleGuideTitle = guides[0].title;
    }
  } catch {}

  const dynamicResults = await Promise.all([
    // Product probe
    (async (): Promise<GuardianCheckResult> => {
      const prodStart = Date.now();
      const prodPath = `/products/${sampleProductSlug}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${origin}${prodPath}`, {
          headers: { 'x-guardian-probe': '1' },
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeoutId);

        const duration = Date.now() - prodStart;
        return {
          checkId: 'chk_sampled_product',
          name: `Sample Product: ${sampleProductName}`,
          target: prodPath,
          type: 'STOREFRONT_URL' as const,
          status: res?.status === 200 ? 'PASS' : 'FAIL',
          statusCode: res?.status,
          durationMs: duration,
          error: res?.status === 200 ? undefined : `Sample product page returned HTTP ${res?.status ?? 0}`,
          observedAt: new Date().toISOString(),
        };
      } catch (e: any) {
        return {
          checkId: 'chk_sampled_product',
          name: `Sample Product: ${sampleProductName}`,
          target: prodPath,
          type: 'STOREFRONT_URL' as const,
          status: 'FAIL' as const,
          durationMs: Date.now() - prodStart,
          error: e.message,
          observedAt: new Date().toISOString(),
        };
      }
    })(),
    // Guide probe
    (async (): Promise<GuardianCheckResult> => {
      const guideStart = Date.now();
      const path = `/guides/${sampleGuideSlug}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${origin}${path}`, {
          headers: { 'x-guardian-probe': '1' },
          signal: controller.signal,
        }).catch(() => null);
        clearTimeout(timeoutId);

        const duration = Date.now() - guideStart;
        return {
          checkId: 'chk_sampled_guide',
          name: `Sample Guide: ${sampleGuideTitle}`,
          target: path,
          type: 'STOREFRONT_URL' as const,
          status: res?.status === 200 ? 'PASS' : 'FAIL',
          statusCode: res?.status,
          durationMs: duration,
          error: res?.status === 200 ? undefined : `Sample guide page returned HTTP ${res?.status ?? 0}`,
          observedAt: new Date().toISOString(),
        };
      } catch (e: any) {
        return {
          checkId: 'chk_sampled_guide',
          name: `Sample Guide: ${sampleGuideTitle}`,
          target: path,
          type: 'STOREFRONT_URL' as const,
          status: 'FAIL' as const,
          durationMs: Date.now() - guideStart,
          error: e.message,
          observedAt: new Date().toISOString(),
        };
      }
    })(),
  ]);
  results.push(...dynamicResults);

  return results;
}

