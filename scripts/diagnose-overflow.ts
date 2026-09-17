import { spawn } from 'node:child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function createCdpConnection(wsUrl: string): Promise<any> {
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
      } catch (err) {}
    };

    ws.onerror = (err) => reject(err);
  });
}

async function main() {
  const debuggingPort = 9223;
  const chrome = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      `--remote-debugging-port=${debuggingPort}`,
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await new Promise((r) => setTimeout(r, 2000));
  const versionRes = await fetch(`http://127.0.0.1:${debuggingPort}/json/version`);
  const versionInfo = await versionRes.json();
  const browser = await createCdpConnection(versionInfo.webSocketDebuggerUrl);

  const target = await browser.send('Target.createTarget', { url: 'about:blank' });
  const page = await createCdpConnection(`ws://127.0.0.1:${debuggingPort}/devtools/page/${target.targetId}`);

  await page.send('Page.enable');
  await page.send('DOM.enable');
  await page.send('Emulation.setDeviceMetricsOverride', {
    width: 1280,
    height: 800,
    deviceScaleFactor: 1,
    mobile: false,
  });

  await page.send('Page.navigate', { url: 'http://localhost:3000/' });
  await new Promise((r) => setTimeout(r, 1500));

  const diag = await page.send('Runtime.evaluate', {
    expression: `
      (() => {
        const docWidth = window.innerWidth;
        const all = Array.from(document.querySelectorAll('*'));
        const overflowing = [];
        for (const el of all) {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 2) {
            overflowing.push({
              tag: el.tagName,
              className: el.className ? (typeof el.className === 'string' ? el.className.slice(0, 100) : '') : '',
              right: Math.round(rect.right),
              width: Math.round(rect.width),
              overflowPx: Math.round(rect.right - docWidth),
              text: (el.innerText || '').slice(0, 40).replace(/\\n/g, ' ')
            });
          }
        }
        return {
          windowWidth: docWidth,
          scrollWidth: document.documentElement.scrollWidth,
          overflowing: overflowing.slice(0, 10)
        };
      })()
    `,
    returnByValue: true,
  });

  console.log('DIAGNOSTIC RESULT:', JSON.stringify(diag.result.value, null, 2));

  page.close();
  browser.close();
  chrome.kill();
}

main().catch(console.error);

