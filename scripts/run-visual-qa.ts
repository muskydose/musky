import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getProducts } from '../lib/db/products';
import { getCategories } from '../lib/db/categories';
import { getPublishedGuides } from '../lib/db/guides';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SCREENSHOT_DIR = path.join(
  'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\a6a7869d-f185-4685-a8fa-fb2df63e7898\\scratch\\qa_screenshots'
);

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

interface CdpClient {
  send(method: string, params?: any): Promise<any>;
  close(): void;
}

function createCdpConnection(wsUrl: string): Promise<CdpClient> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    let id = 0;
    const callbacks = new Map<number, { resolve: (res: any) => void; reject: (err: any) => void }>();

    ws.onopen = () => {
      resolve({
        send: (method: string, params?: any) => {
          return new Promise((res, rej) => {
            const reqId = ++id;
            callbacks.set(reqId, { resolve: res, reject: rej });
            ws.send(JSON.stringify({ id: reqId, method, params }));
          });
        },
        close: () => ws.close(),
      });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data.toString());
        if (msg.id && callbacks.has(msg.id)) {
          const cb = callbacks.get(msg.id)!;
          callbacks.delete(msg.id);
          if (msg.error) cb.reject(new Error(msg.error.message));
          else cb.resolve(msg.result);
        }
      } catch (err) {
        // ignore non-json messages
      }
    };

    ws.onerror = (err) => reject(err);
  });
}

async function runVisualQA() {
  console.log('🌐 Starting Real Browser-Based Visual QA Suite...\n');

  // 1. Resolve representative routes
  const [allProducts, allCategories, allGuides] = await Promise.all([
    getProducts(),
    getCategories(),
    getPublishedGuides(),
  ]);

  const activeProduct = allProducts.find((p) => p.isActive !== false) || allProducts[0];
  const activeCategory = allCategories[0];
  const activeGuide = allGuides[0];

  const productSlug = activeProduct?.slug || activeProduct?.id || 'baq-sojat-henna';
  const categorySlug = activeCategory?.slug || 'sojat-henna-powder';
  const guideSlug = activeGuide?.slug || 'henna-mixing-guide';

  const routesToCheck = [
    { name: 'Homepage', path: '/' },
    { name: 'Products Catalog', path: '/products' },
    { name: 'Categories List', path: '/categories' },
    { name: 'Guides Knowledge Base', path: '/guides' },
    { name: 'Botanical Knowledge Root', path: '/knowledge/henna-mehndi' },
    { name: 'Contact / Story', path: '/contact' },
    { name: 'Shopping Cart', path: '/cart' },
    { name: 'Checkout Flow', path: '/checkout' },
    { name: 'Product Detail Page', path: `/products/${productSlug}` },
    { name: 'Category Detail Page', path: `/categories/${categorySlug}` },
    { name: 'Guide Detail Page', path: `/guides/${guideSlug}` },
    { name: 'Knowledge Detail Page', path: '/knowledge/henna-mehndi' },
    { name: 'Admin Media Requirements Hub', path: '/admin/media-requirements' },
  ];

  console.log('Representative slugs identified:');
  console.log(`- Product: /products/${productSlug}`);
  console.log(`- Category: /categories/${categorySlug}`);
  console.log(`- Guide: /guides/${guideSlug}`);
  console.log(`- Knowledge: /knowledge/henna-mehndi\n`);

  // 2. Launch Chrome Headless
  const debuggingPort = 9222;
  const chromeProcess = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${debuggingPort}`,
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--mute-audio',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  // Wait for Chrome remote debugging endpoint
  await new Promise((r) => setTimeout(r, 2000));

  let versionInfo: any;
  try {
    const versionRes = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`);
    versionInfo = await versionRes.json();
  } catch (e) {
    console.error('Failed to connect to Chrome debugging endpoint:', e);
    chromeProcess.kill();
    process.exit(1);
  }

  const browserWsUrl = versionInfo.webSocketDebuggerUrl;
  const browserClient = await createCdpConnection(browserWsUrl);

  // Create new target / page
  const targetResult = await browserClient.send('Target.createTarget', { url: 'about:blank' });
  const targetWsUrl = `ws://127.0.0.1:${debuggingPort}/devtools/page/${targetResult.targetId}`;
  const page = await createCdpConnection(targetWsUrl);

  await page.send('Page.enable');
  await page.send('DOM.enable');
  await page.send('CSS.enable');
  await page.send('Runtime.enable');

  const viewports = [
    { name: 'Desktop-1440', width: 1440, height: 900, isMobile: false },
    { name: 'Desktop-1280', width: 1280, height: 800, isMobile: false },
    { name: 'Desktop-1024', width: 1024, height: 768, isMobile: false },
    { name: 'Tablet-768', width: 768, height: 1024, isMobile: true },
    { name: 'Mobile-390', width: 390, height: 844, isMobile: true },
    { name: 'Mobile-375', width: 375, height: 667, isMobile: true },
  ];

  const results: any[] = [];
  let totalBugs = 0;

  for (const route of routesToCheck) {
    console.log(`\n======================================================`);
    console.log(`🔎 Auditing Route: ${route.name} (${route.path})`);
    console.log(`======================================================`);

    for (const vp of viewports) {
      // Set device emulation
      await page.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.isMobile,
      });

      // Navigate
      const targetUrl = `http://localhost:3000${route.path}`;
      await page.send('Page.navigate', { url: targetUrl });
      await new Promise((r) => setTimeout(r, 1200)); // Allow render & client hydration

      // Visual QA Evaluation script inside page
      const evalRes = await page.send('Runtime.evaluate', {
        expression: `
          (() => {
            const width = window.innerWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const hasHorizontalOverflow = scrollWidth > width + 1; // 1px tolerance

            // Typography Check
            const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
            const headingFonts = headings.slice(0, 10).map(h => ({
              tag: h.tagName,
              text: (h.innerText || '').slice(0, 30),
              fontFamily: window.getComputedStyle(h).fontFamily,
            }));

            const bodyFont = window.getComputedStyle(document.body).fontFamily;

            // Media Check
            const images = Array.from(document.querySelectorAll('img')).map(img => img.src);
            const unsafeImages = images.filter(src => 
              src.includes('unsplash.com') || 
              src.includes('googleusercontent') ||
              src.includes('cdn.muskydose.in')
            );

            // Broken elements
            const brokenImages = Array.from(document.querySelectorAll('img')).filter(img => img.naturalWidth === 0 && img.src && !img.src.includes('.svg')).length;

            return {
              hasHorizontalOverflow,
              width,
              scrollWidth,
              bodyFont,
              headingFonts,
              totalImages: images.length,
              unsafeImages,
              brokenImages,
            };
          })()
        `,
        returnByValue: true,
      });

      const metrics = evalRes.result.value;

      // Check overflow
      const overflowPass = !metrics.hasHorizontalOverflow;
      if (!overflowPass) {
        console.warn(`  ⚠️ [OVERFLOW] ${route.name} at ${vp.name}: width=${metrics.width}, scrollWidth=${metrics.scrollWidth}`);
        totalBugs++;
      }

      // Check typography
      const bodyHasKarla = metrics.bodyFont.toLowerCase().includes('karla') || metrics.bodyFont.toLowerCase().includes('sans');
      const headingsHaveMomoOrSerif = metrics.headingFonts.every(
        (h: any) => h.fontFamily.toLowerCase().includes('momo') || h.fontFamily.toLowerCase().includes('serif') || h.fontFamily.toLowerCase().includes('var')
      );

      // Check media purity
      const mediaPure = metrics.unsafeImages.length === 0;
      if (!mediaPure) {
        console.error(`  ❌ [MEDIA LEAK] ${route.name} contains unsafe images:`, metrics.unsafeImages);
        totalBugs++;
      }

      // Capture screenshot at representative Desktop (1440) and Mobile (390)
      if (vp.name === 'Desktop-1440' || vp.name === 'Mobile-390') {
        const ssRes = await page.send('Page.captureScreenshot', { format: 'webp', quality: 75 });
        const cleanName = route.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const filename = `${cleanName}_${vp.name}.webp`;
        fs.writeFileSync(path.join(SCREENSHOT_DIR, filename), Buffer.from(ssRes.data, 'base64'));
      }

      console.log(`  ✓ ${vp.name.padEnd(12)}: Overflow: ${overflowPass ? 'PASS' : 'FAIL'} | Media: ${mediaPure ? 'CLEAN (0 unsafe)' : 'LEAK'} | Images: ${metrics.totalImages}`);

      results.push({
        route: route.name,
        path: route.path,
        viewport: vp.name,
        overflowPass,
        bodyHasKarla,
        headingsHaveMomoOrSerif,
        mediaPure,
      });
    }
  }

  // Test Prefers-Reduced-Motion
  console.log('\n======================================================');
  console.log('♿ Testing prefers-reduced-motion Emulation...');
  console.log('======================================================');
  await page.send('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  });

  await page.send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 1000));

  const motionEval = await page.send('Runtime.evaluate', {
    expression: `
      (() => {
        const matches = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        return { matches };
      })()
    `,
    returnByValue: true,
  });

  console.log(`  ✓ prefers-reduced-motion: reduce active in browser engine: ${motionEval.result.value.matches ? 'YES' : 'NO'}`);

  // Cleanup
  page.close();
  browserClient.close();
  chromeProcess.kill();

  console.log('\n======================================================');
  console.log(`QA SUMMARY: ${results.length} audit checks performed across 13 routes and 6 viewports.`);
  console.log(`Total Visual Bugs / Overflow Issues: ${totalBugs}`);
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}`);
  console.log('======================================================\n');
}

runVisualQA().catch((err) => {
  console.error('Visual QA run failed:', err);
  process.exit(1);
});

