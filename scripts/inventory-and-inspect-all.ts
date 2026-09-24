import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

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

import { getSearchConsoleConfig } from '../lib/growth/sources/search-console-adapter';

function createJwt(clientEmail: string, privateKey: string, scope: string): string {
  const formattedKey = privateKey.replace(/\\n/g, '\n').trim();
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  const b64 = (obj: any) => Buffer.from(JSON.stringify(obj)).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsigned = b64(header) + '.' + b64(payload);
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const sig = signer.sign(formattedKey).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return unsigned + '.' + sig;
}

async function getToken(clientEmail: string, privateKey: string, scope: string): Promise<string> {
  const jwt = createJwt(clientEmail, privateKey, scope);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }).toString(),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  return data.access_token;
}

export interface UrlAuditResult {
  url: string;
  category: string;
  httpStatus: number;
  robotsMeta: string;
  canonicalHref: string;
  inSitemap: boolean;
  gscCoverageState?: string;
  gscIndexingState?: string;
  gscVerdict?: string;
  gscLastCrawl?: string;
  gscUserCanonical?: string;
  gscGoogleCanonical?: string;
  gscPageFetch?: string;
}

const auditFilePath = path.resolve(process.cwd(), 'scripts/url-inventory-gsc-audit.json');

async function main() {
  console.log('============================================================');
  console.log('  PHASE 2 & 4: COMPREHENSIVE URL INVENTORY & GSC INSPECTION');
  console.log('============================================================\n');

  const cfg = getSearchConsoleConfig();
  const token = await getToken(cfg.clientEmail!, cfg.privateKey!, 'https://www.googleapis.com/auth/webmasters.readonly');

  // 1. Fetch live sitemap URLs
  const sitemapRes = await fetch('https://muskydose.in/sitemap.xml', { signal: AbortSignal.timeout(10000) });
  const sitemapXml = await sitemapRes.text();
  const sitemapUrls = new Set([...sitemapXml.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]));
  console.log(`Found ${sitemapUrls.size} URLs in live sitemap.xml.\n`);

  const extraUrls = [
    'https://muskydose.in/products/musky-dose-special-bridal-mehendi-cones',
    'https://muskydose.in/about',
    'https://muskydose.in/categories',
    'https://muskydose.in/wholesale',
    'https://muskydose.in/sojat-henna',
  ];

  const allUrls = Array.from(new Set([...Array.from(sitemapUrls), ...extraUrls]));
  console.log(`Total URLs to audit & inspect: ${allUrls.length}`);

  let existingResults: Record<string, UrlAuditResult> = {};
  if (fs.existsSync(auditFilePath)) {
    try {
      const parsed: UrlAuditResult[] = JSON.parse(fs.readFileSync(auditFilePath, 'utf8'));
      parsed.forEach(p => existingResults[p.url] = p);
    } catch {}
  }

  const results: UrlAuditResult[] = [];

  for (let i = 0; i < allUrls.length; i++) {
    const u = allUrls[i];

    // If already inspected recently, reuse
    if (existingResults[u] && existingResults[u].gscCoverageState && existingResults[u].gscCoverageState !== 'API_ERROR') {
      results.push(existingResults[u]);
      console.log(`[${i + 1}/${allUrls.length}] (cached) ${u.replace('https://muskydose.in', '') || '/'} -> ${existingResults[u].gscCoverageState}`);
      continue;
    }

    let cat = 'STATIC';
    if (u.includes('/products/')) cat = 'PRODUCT';
    else if (u.includes('/guides/')) cat = 'GUIDE';
    else if (u.includes('/knowledge/')) cat = 'KNOWLEDGE';
    else if (u.includes('/categories/')) cat = 'CATEGORY';
    else if (u.includes('/policy') || u.includes('/terms')) cat = 'POLICY';

    // Live HTTP probe
    let httpStatus = 0;
    let robotsMeta = 'NONE';
    let canonicalHref = 'NONE';

    try {
      const res = await fetch(u, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(8000),
      });
      httpStatus = res.status;
      const html = await res.text();

      const rMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["'][^>]*>/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']robots["'][^>]*>/i);
      if (rMatch) robotsMeta = rMatch[1];

      const cMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["'][^>]*>/i)
        || html.match(/<link[^>]*href=["']([^"']*)["'][^>]*rel=["']canonical["'][^>]*>/i);
      if (cMatch) canonicalHref = cMatch[1];
    } catch {
      httpStatus = 599;
    }

    // GSC Inspection probe
    let gscData: any = {};
    try {
      const inspectRes = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inspectionUrl: u,
          siteUrl: cfg.siteUrl,
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (inspectRes.ok) {
        const json = await inspectRes.json();
        const r = json.inspectionResult?.indexStatusResult;
        gscData = {
          coverage: r?.coverageState || 'UNKNOWN',
          verdict: r?.verdict || 'NEUTRAL',
          lastCrawl: r?.lastCrawlTime || 'NEVER',
          userCanonical: r?.userCanonical,
          googleCanonical: r?.googleCanonical,
          pageFetch: r?.pageFetchState || 'UNKNOWN',
        };
      } else {
        const errText = await inspectRes.text();
        gscData = { coverage: `API_ERROR_${inspectRes.status}` };
      }
    } catch {
      gscData = { coverage: 'TIMEOUT_OR_NET_ERROR' };
    }

    const item: UrlAuditResult = {
      url: u,
      category: cat,
      httpStatus,
      robotsMeta,
      canonicalHref,
      inSitemap: sitemapUrls.has(u),
      gscCoverageState: gscData.coverage,
      gscVerdict: gscData.verdict,
      gscLastCrawl: gscData.lastCrawl,
      gscUserCanonical: gscData.userCanonical,
      gscGoogleCanonical: gscData.googleCanonical,
      gscPageFetch: gscData.pageFetch,
    };

    results.push(item);
    existingResults[u] = item;

    // Save incrementally
    fs.writeFileSync(auditFilePath, JSON.stringify(Object.values(existingResults), null, 2), 'utf8');

    const icon = item.gscCoverageState?.includes('indexed') ? '🟢' : item.gscCoverageState === 'Crawled - currently not indexed' ? '🟡' : item.gscCoverageState?.includes('unknown') ? '⚪' : '🔵';
    console.log(`[${i + 1}/${allUrls.length}] ${icon} ${u.replace('https://muskydose.in', '') || '/'}`);
    console.log(`     HTTP: ${httpStatus} | Canonical: ${canonicalHref === u ? 'SELF' : canonicalHref} | Robots: ${robotsMeta}`);
    console.log(`     GSC: ${item.gscCoverageState} | Verdict: ${item.gscVerdict} | LastCrawl: ${item.gscLastCrawl?.slice(0, 10)}`);

    await new Promise(r => setTimeout(r, 150));
  }

  // Summarize findings
  const indexed = results.filter(r => r.gscCoverageState?.toLowerCase().includes('indexed'));
  const crawledNotIndexed = results.filter(r => r.gscCoverageState === 'Crawled - currently not indexed');
  const discoveredNotIndexed = results.filter(r => r.gscCoverageState === 'Discovered - currently not indexed');
  const unknown = results.filter(r => r.gscCoverageState === 'URL is unknown to Google');

  console.log('\n============================================================');
  console.log('  AUDIT SUMMARY BY GOOGLE SEARCH CONSOLE COVERAGE');
  console.log('============================================================');
  console.log(`Total URLs Audited: ${results.length}`);
  console.log(`🟢 Indexed in Google: ${indexed.length}`);
  console.log(`🟡 Crawled, Not Indexed: ${crawledNotIndexed.length}`);
  console.log(`🔵 Discovered, Not Indexed: ${discoveredNotIndexed.length}`);
  console.log(`⚪ Unknown to Google (Awaiting Crawl): ${unknown.length}`);
}

main().catch(console.error);
