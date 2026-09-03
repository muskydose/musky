// ============================================================
// MUSKY DOSE — WEBSITE GUARDIAN: API HEALTH PROBES
// Internal Endpoint Response Structure & Latency Monitoring
// ============================================================

import { GuardianCheckResult } from '../types';

const INTERNAL_API_PROBES = [
  { path: '/api/products', name: 'API: Products Catalog', expectedField: 'products' },
  { path: '/api/categories', name: 'API: Categories Taxonomy', expectedField: 'categories' },
  { path: '/api/settings', name: 'API: Public Settings', expectedField: 'settings' },
  { path: '/api/search/smart-route?q=sojat+henna', name: 'API: Smart Search Router', expectedField: 'routeType' },
];

export async function runApiHealthChecks(baseUrl?: string): Promise<GuardianCheckResult[]> {
  const results: GuardianCheckResult[] = [];
  const origin = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  for (const probe of INTERNAL_API_PROBES) {
    const start = Date.now();
    const url = `${origin}${probe.path}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'x-guardian-probe': '1',
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);
      const duration = Date.now() - start;

      if (!res) {
        results.push({
          checkId: `chk_api_${probe.path.replace(/\W/g, '_')}`,
          name: probe.name,
          target: probe.path,
          type: 'API',
          status: 'FAIL',
          durationMs: duration,
          error: 'Connection timeout or network failure',
          observedAt: new Date().toISOString(),
        });
        continue;
      }

      let json: any = null;
      try {
        json = await res.json();
      } catch {
        json = null;
      }

      const isStatusOk = res.status === 200;
      const isSuccess = json && json.success === true;
      const hasExpectedData = json && (json[probe.expectedField] !== undefined || json.data !== undefined);
      const isPass = isStatusOk && (isSuccess || hasExpectedData);
      const isWarn = isPass && duration > 2000;

      results.push({
        checkId: `chk_api_${probe.path.replace(/\W/g, '_')}`,
        name: probe.name,
        target: probe.path,
        type: 'API',
        status: isPass ? (isWarn ? 'WARN' : 'PASS') : 'FAIL',
        statusCode: res.status,
        durationMs: duration,
        error: isPass ? undefined : `API returned HTTP ${res.status} or missing ${probe.expectedField}`,
        details: { hasPayload: Boolean(json) },
        observedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      results.push({
        checkId: `chk_api_${probe.path.replace(/\W/g, '_')}`,
        name: probe.name,
        target: probe.path,
        type: 'API',
        status: 'FAIL',
        durationMs: Date.now() - start,
        error: e.message || 'API probe execution error',
        observedAt: new Date().toISOString(),
      });
    }
  }

  return results;
}

