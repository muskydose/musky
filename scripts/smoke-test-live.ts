import https from 'https';

const BASE = 'https://muskydose.in';

async function check(url: string, options: https.RequestOptions = {}) {
  return new Promise<{
    url: string;
    status: number;
    headers: any;
    dataLength: number;
    preview: string;
  }>((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode || 0,
          headers: res.headers,
          dataLength: data.length,
          preview: data.slice(0, 100).replace(/\n/g, ' '),
        });
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== PROBING LIVE PRODUCTION ROUTES (https://muskydose.in) ===\n');

  const publicRoutes = [
    '/',
    '/products',
    '/categories',
    '/guides',
    '/wholesale',
    '/robots.txt',
    '/sitemap.xml',
  ];

  for (const r of publicRoutes) {
    const res = await check(BASE + r);
    console.log('[PUBLIC]', res.status, r, `(${res.dataLength} bytes)`);
  }

  console.log('\n=== PROBING UNAUTHENTICATED CRON ROUTES (EXPECT 401) ===\n');
  const cronRoutes = [
    '/api/cron/guardian',
    '/api/cron/growth-autopilot',
    '/api/cron/gsc-sync',
    '/api/cron/media-queue',
    '/api/cron/seo-report',
    '/api/cron/master-agent',
    '/api/cron/drain-queue',
  ];

  for (const r of cronRoutes) {
    const res = await check(BASE + r);
    console.log('[CRON AUTH]', res.status, r, res.preview);
  }

  console.log('\n=== PROBING UNAUTHENTICATED ADMIN (EXPECT REDIRECT / LOGIN) ===\n');
  const adminRes = await check(BASE + '/admin');
  console.log('[ADMIN]', adminRes.status, '/admin', 'Location:', adminRes.headers?.location || 'none');
}

run().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
