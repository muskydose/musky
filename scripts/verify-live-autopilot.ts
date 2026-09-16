import { createAdminSessionToken } from '../lib/auth';

async function verifyLiveProduction() {
  console.log('========================================================================');
  console.log('🌐 LIVE PRODUCTION VERIFICATION FOR /admin/autopilot & CRON');
  console.log('========================================================================\n');

  const BASE_URL = 'https://muskydose.in';
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Unauthenticated request to /admin/autopilot (Must redirect to /admin/login)
  // --------------------------------------------------------------------------
  console.log('--- TEST 1: Unauthenticated Access to /admin/autopilot ---');
  const unauthRes = await fetch(`${BASE_URL}/admin/autopilot`, {
    redirect: 'manual',
  });
  console.log(`  HTTP Status: ${unauthRes.status}`);
  console.log(`  Location Header: ${unauthRes.headers.get('location')}`);
  assert(unauthRes.status === 307, 'Returns HTTP 307 Temporary Redirect for unauthenticated access');
  assert(
    unauthRes.headers.get('location')?.includes('/admin/login') === true,
    'Redirect location is /admin/login'
  );

  // --------------------------------------------------------------------------
  // TEST 2: Unauthenticated Cron Endpoint (Must return 401 Unauthorized)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 2: Unauthenticated Access to /api/cron/growth-autopilot ---');
  const unauthCronRes = await fetch(`${BASE_URL}/api/cron/growth-autopilot`, {
    redirect: 'manual',
  });
  console.log(`  HTTP Status: ${unauthCronRes.status}`);
  assert(unauthCronRes.status === 401, 'Cron returns HTTP 401 Unauthorized without bearer token');

  // --------------------------------------------------------------------------
  // TEST 3: Authenticated Request to /admin/autopilot (Must return 200 OK)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 3: Authenticated Access to /admin/autopilot ---');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@muskydose.in';
  const sessionToken = createAdminSessionToken(adminEmail);

  const authRes = await fetch(`${BASE_URL}/admin/autopilot`, {
    headers: {
      Cookie: `md_admin_auth=${sessionToken}`,
    },
    redirect: 'manual',
  });
  console.log(`  HTTP Status: ${authRes.status}`);
  const html = await authRes.text();
  assert(authRes.status === 200, `Authenticated request returned HTTP 200 OK (got: ${authRes.status})`);
  assert(
    html.includes('Autopilot') || html.includes('Musky Dose Admin') || html.includes('autopilot'),
    'HTML body contains Autopilot Admin interface content'
  );

  // --------------------------------------------------------------------------
  // TEST 4: Authenticated Autopilot API Endpoint (Must return 200 with state)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 4: Authenticated Admin Autopilot API GET ---');
  const apiRes = await fetch(`${BASE_URL}/api/admin/growth/autopilot`, {
    headers: {
      Cookie: `md_admin_auth=${sessionToken}`,
    },
  });
  console.log(`  API HTTP Status: ${apiRes.status}`);
  if (apiRes.status === 200) {
    const apiData = await apiRes.json();
    assert(apiData.success === true, 'API returned success: true');
    assert(typeof apiData.state === 'object', 'API returned state object');
    assert(Array.isArray(apiData.actions), 'API returned actions array');
  } else {
    assert(false, `API returned unexpected status: ${apiRes.status}`);
  }

  // --------------------------------------------------------------------------
  // TEST 5: Cron Endpoint with CRON_SECRET (Must execute or authorize cleanly)
  // --------------------------------------------------------------------------
  console.log('\n--- TEST 5: Authorized Cron Execution with CRON_SECRET ---');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const cronRes = await fetch(`${BASE_URL}/api/cron/growth-autopilot`, {
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });
    console.log(`  Cron HTTP Status: ${cronRes.status}`);
    const cronData = await cronRes.json();
    assert(cronRes.status === 200, `Cron executed with HTTP 200 (got: ${cronRes.status})`);
    assert(cronData.success === true, 'Cron execution returned success: true');
    console.log(`  Cron message: ${cronData.message}`);
  } else {
    console.log('  (Skipping authorized cron test: CRON_SECRET not in local env)');
  }

  console.log('\n========================================================================');
  console.log(`📊 LIVE PRODUCTION RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

verifyLiveProduction().catch((err) => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
