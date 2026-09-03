// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN: SYNTHETIC URL PROBES
// Non-Destructive HTTP Checks on Critical Customer Routes
// ============================================================

import { GuardianCheckResult } from '../types';
import { INITIAL_PRODUCTS, INITIAL_PRODUCT_GUIDES } from '@/lib/data-store';

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

  // 1. Static Core Routes
  for (const route of CORE_STATIC_ROUTES) {
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
      }).catch((err) => {
        return null;
      });

      clearTimeout(timeoutId);
      const duration = Date.now() - start;

      if (!res) {
        // Network or timeout failure
        results.push({
          checkId: `chk_url_${route.path.replace(/\W/g, '_')}`,
          name: route.name,
          target: route.path,
          type: 'STOREFRONT_URL',
          status: 'FAIL',
          durationMs: duration,
          error: 'Connection timeout or network unavailable',
          observedAt: new Date().toISOString(),
        });
        continue;
      }

      const isPass = res.status === route.expectedCode;
      const isWarn = res.status === 200 && duration > 2500;

      results.push({
        checkId: `chk_url_${route.path.replace(/\W/g, '_')}`,
        name: route.name,
        target: route.path,
        type: 'STOREFRONT_URL',
        status: isPass ? (isWarn ? 'WARN' : 'PASS') : 'FAIL',
        statusCode: res.status,
        durationMs: duration,
        error: isPass ? undefined : `Expected HTTP ${route.expectedCode}, received ${res.status}`,
        observedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      const duration = Date.now() - start;
      results.push({
        checkId: `chk_url_${route.path.replace(/\W/g, '_')}`,
        name: route.name,
        target: route.path,
        type: 'STOREFRONT_URL',
        status: 'FAIL',
        durationMs: duration,
        error: e.message || 'Probe execution error',
        observedAt: new Date().toISOString(),
      });
    }
  }

  // 2. Dynamic Route Sampling (1 active product, 1 published guide)
  const sampleProduct = INITIAL_PRODUCTS[0];
  if (sampleProduct) {
    const start = Date.now();
    const path = `/products/${sampleProduct.slug}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${origin}${path}`, {
        headers: { 'x-guardian-probe': '1' },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      const duration = Date.now() - start;
      results.push({
        checkId: 'chk_sampled_product',
        name: `Sample Product: ${sampleProduct.name}`,
        target: path,
        type: 'STOREFRONT_URL',
        status: res?.status === 200 ? 'PASS' : 'FAIL',
        statusCode: res?.status,
        durationMs: duration,
        error: res?.status === 200 ? undefined : `Sample product page returned HTTP ${res?.status ?? 0}`,
        observedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      results.push({
        checkId: 'chk_sampled_product',
        name: `Sample Product: ${sampleProduct.name}`,
        target: path,
        type: 'STOREFRONT_URL',
        status: 'FAIL',
        durationMs: Date.now() - start,
        error: e.message,
        observedAt: new Date().toISOString(),
      });
    }
  }

  const sampleGuide = INITIAL_PRODUCT_GUIDES[0];
  if (sampleGuide) {
    const start = Date.now();
    const path = `/guides/${sampleGuide.slug}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(`${origin}${path}`, {
        headers: { 'x-guardian-probe': '1' },
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(timeoutId);

      const duration = Date.now() - start;
      results.push({
        checkId: 'chk_sampled_guide',
        name: `Sample Guide: ${sampleGuide.title}`,
        target: path,
        type: 'STOREFRONT_URL',
        status: res?.status === 200 ? 'PASS' : 'FAIL',
        statusCode: res?.status,
        durationMs: duration,
        error: res?.status === 200 ? undefined : `Sample guide page returned HTTP ${res?.status ?? 0}`,
        observedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      results.push({
        checkId: 'chk_sampled_guide',
        name: `Sample Guide: ${sampleGuide.title}`,
        target: path,
        type: 'STOREFRONT_URL',
        status: 'FAIL',
        durationMs: Date.now() - start,
        error: e.message,
        observedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

