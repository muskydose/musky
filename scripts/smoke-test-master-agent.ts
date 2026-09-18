// ============================================================================
// MUSKY DOSE — PRODUCTION SMOKE TEST
// Validates Standalone Server HTTP Responses Across Storefront & Admin
// ============================================================================

import http from 'http';
import { spawn, ChildProcess } from 'child_process';
import assert from 'assert';

const PORT = 3005;
const BASE_URL = `http://localhost:${PORT}`;

async function fetchRoute(
  path: string,
  headers: Record<string, string> = {}
): Promise<{ status: number; contentType: string | null; body: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${path}`);
    const req = http.request(
      url,
      {
        method: 'GET',
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            contentType: res.headers['content-type'] || null,
            body: data,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  });
}

async function waitForServer(retries = 30, delayMs = 1000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetchRoute('/api/health');
      if (res.status === 200 || res.status === 503) {
        return;
      }
    } catch {
      // waiting
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Server failed to start on ${BASE_URL} within ${retries * delayMs}ms`);
}

async function runSmokeTests() {
  console.log('\n============================================================');
  console.log('🌐 STARTING STANDALONE SERVER PRODUCTION SMOKE TESTS');
  console.log(`Target: ${BASE_URL}`);
  console.log('============================================================\n');

  let serverProcess: ChildProcess | null = null;

  try {
    console.log(`Starting standalone server on PORT ${PORT}...`);
    serverProcess = spawn(
      process.execPath,
      ['--env-file=.env.local', '.next/standalone/server.js'],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PORT: String(PORT),
          NODE_ENV: 'production',
        },
        stdio: 'inherit',
      }
    );

    console.log('Waiting for server readiness...');
    await waitForServer();
    console.log('Server is online!\n');

    const testRoutes = [
      { path: '/', expectedStatus: [200] },
      { path: '/products', expectedStatus: [200] },
      { path: '/products/baq-henna-powder', expectedStatus: [200] }, // representative product
      { path: '/categories', expectedStatus: [200] },
      { path: '/categories/henna', expectedStatus: [200] }, // representative category
      { path: '/guides', expectedStatus: [200] },
      { path: '/guides/how-to-mix-baq-henna-for-dark-bridal-stain', expectedStatus: [200] }, // representative guide
      { path: '/knowledge/henna-mehndi', expectedStatus: [200] },
      { path: '/cart', expectedStatus: [200] },
      { path: '/checkout', expectedStatus: [200] },
      { path: '/admin/media-requirements', expectedStatus: [200, 307, 302] },
      { path: '/admin/agent', expectedStatus: [200, 307, 302] },
      { path: '/api/admin/agent/state', expectedStatus: [401] }, // Unauthenticated: must be protected by middleware!
      { path: '/api/health', expectedStatus: [200, 503] },
    ];

    for (const route of testRoutes) {
      process.stdout.write(`Testing [${route.path}]... `);
      const res = await fetchRoute(route.path);
      assert(
        route.expectedStatus.includes(res.status),
        `Route ${route.path} returned unexpected status ${res.status}. Expected one of: ${route.expectedStatus.join(', ')}`
      );
      console.log(`✅ ${res.status} OK`);
    }

    // Now test authenticated administrative access using createAdminSessionToken
    console.log('\nTesting Authenticated Admin Access to /api/admin/agent/state:');
    const { createAdminSessionToken } = await import('../lib/auth');
    const token = createAdminSessionToken('admin@muskydose.in');
    const authHeaders = {
      Cookie: `md_admin_auth=${token}`,
      Authorization: `Bearer ${token}`,
    };

    const agentStateRes = await fetchRoute('/api/admin/agent/state', authHeaders);
    assert.strictEqual(agentStateRes.status, 200, `Expected 200 for authenticated admin, got ${agentStateRes.status}`);
    const stateData = JSON.parse(agentStateRes.body);
    assert.strictEqual(stateData.success, true);
    assert(stateData.state, 'Response must contain state');
    assert.strictEqual(stateData.state.isAutonomous, true);
    assert(Array.isArray(stateData.tasks), 'Response must contain tasks array');
    console.log(`  ✅ Authenticated State OK | Autonomous: ${stateData.state.isAutonomous} | Total tasks: ${stateData.tasks.length}`);

    // Verify /admin/agent UI with authentication
    console.log('Testing Authenticated Admin Page [/admin/agent]...');
    const adminPageRes = await fetchRoute('/admin/agent', authHeaders);
    assert.strictEqual(adminPageRes.status, 200, `Expected 200 for authenticated /admin/agent, got ${adminPageRes.status}`);
    assert(adminPageRes.body.includes('Master Agent'), 'Page HTML must include Master Agent');
    console.log('  ✅ /admin/agent rendered successfully with 200 OK');

    console.log('\n============================================================');
    console.log('🎉 ALL PRODUCTION SMOKE TESTS PASSED CLEANLY!');
    console.log('============================================================\n');
  } finally {
    if (serverProcess) {
      console.log('Shutting down test server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runSmokeTests().catch((err) => {
  console.error('\n❌ PRODUCTION SMOKE TEST FAILED:', err);
  process.exit(1);
});
