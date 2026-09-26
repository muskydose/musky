import http from 'http';

const routesToTest = [
  '/',
  '/products',
  '/categories',
  '/guides',
  '/wholesale',
  '/admin',
  '/admin/agent',
  '/admin/media',
];

async function fetchRoute(port: number, route: string): Promise<{ status: number; bodyLength: number }> {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}${route}`, {
      headers: {
        'Accept': 'text/html',
        'User-Agent': 'MuskyDoseSmokeTest/1.0',
      },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode || 500, bodyLength: data.length });
      });
    });
    req.on('error', (err) => reject(err));
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error(`Timeout fetching ${route}`));
    });
  });
}

async function runSmokeTests() {
  console.log('\n============================================================');
  console.log('🌐 BROWSER / UI SMOKE TEST (PHASE 28)');
  console.log('============================================================\n');

  const port = 3005;
  for (const route of routesToTest) {
    try {
      const res = await fetchRoute(port, route);
      const isOk = res.status === 200 || res.status === 307 || res.status === 308;
      console.log(`  ${isOk ? '✅' : '❌'} [${route}] HTTP Status: ${res.status} (${res.bodyLength} bytes)`);
      if (!isOk) {
        console.error(`Smoke test failed for route: ${route}`);
        process.exit(1);
      }
    } catch (err: any) {
      console.error(`  ❌ Failed to reach route ${route}:`, err.message);
      process.exit(1);
    }
  }

  console.log('\n============================================================');
  console.log('🎉 ALL ROUTES SMOKE TESTED SUCCESSFULLY!');
  console.log('============================================================\n');
}

runSmokeTests();
