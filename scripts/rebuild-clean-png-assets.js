const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// 1. Precise vector rendering for Main Brand Logo (2048x675 PNG)
// Matches 'musky logo butterfly(2).png'
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 150" width="2048" height="675">
  <!-- CRESCENT ARC -->
  <path d="M 128, 22 A 62,62 0 1 0 118, 128" fill="none" stroke="#111111" stroke-width="4.2" stroke-linecap="round" />

  <!-- PINK BUTTERFLY WING & ANTENNAE -->
  <g>
    <!-- Antennae -->
    <path d="M 48, 62 Q 41, 44 35, 32" fill="none" stroke="#ff1493" stroke-width="3" stroke-linecap="round" />
    <circle cx="35" cy="32" r="4" fill="#ff1493" />
    <path d="M 52, 62 Q 55, 46 55, 36" fill="none" stroke="#ff1493" stroke-width="3" stroke-linecap="round" />
    <circle cx="55" cy="36" r="4" fill="#ff1493" />

    <!-- Main Butterfly Wing Silhouette -->
    <path d="M 50,68 C 52,50 68,32 94,32 C 106,32 112,44 108,58 C 103,72 88,82 72,88 C 88,96 98,112 86,122 C 76,128 60,122 54,108 C 50,98 50,82 50,68 Z" fill="#ff1493" />
  </g>

  <!-- 'musky' WORDMARK PATH OUTLINES -->
  <g fill="#111111">
    <!-- 'm' -->
    <path d="M 136 42 h 12 v 6 c 3 -5 8 -8 15 -8 c 6 0 11 3 13 8 c 4 -5 9 -8 16 -8 c 11 0 16 7 16 19 v 31 h -12 v -27 c 0 -7 -3 -11 -9 -11 c -5 0 -9 4 -9 11 v 27 h -12 v -27 c 0 -7 -3 -11 -9 -11 c -5 0 -9 4 -9 11 v 27 h -12 Z" />
    <!-- 'u' -->
    <path d="M 212 40 h 12 v 27 c 0 6 3 9 8 9 c 5 0 8 -3 8 -9 v -27 h 12 v 49 h -12 v -6 c -3 5 -8 8 -15 8 c -10 0 -15 -7 -15 -19 Z" />
    <!-- 's' -->
    <path d="M 278 40 c 10 0 16 5 16 13 c 0 7 -5 10 -12 12 l -6 2 c -5 1 -7 3 -7 5 c 0 3 3 5 8 5 c 5 0 10 -2 14 -5 v 10 c -4 3 -10 5 -16 5 c -11 0 -17 -6 -17 -14 c 0 -8 6 -11 13 -13 l 5 -1 c 5 -1 6 -2 6 -4 c 0 -2 -2 -4 -6 -4 c -4 0 -9 2 -13 4 v -10 c 4 -3 9 -5 15 -5 Z" />
    <!-- 'k' -->
    <path d="M 302 24 h 12 v 28 l 14 -12 h 15 l -18 15 l 19 24 h -15 l -13 -17 l -4 4 v 13 h -12 Z" />
    <!-- 'y' -->
    <path d="M 346 40 h 13 l 9 24 l 9 -24 h 13 l -17 41 c -4 10 -10 15 -20 15 h -6 v -10 h 4 c 5 0 8 -2 10 -7 l 1 -3 Z" />

    <!-- Drips under 'm' -->
    <line x1="148" y1="92" x2="148" y2="108" stroke="#111111" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="148" cy="109" r="3.2" fill="#111111" />
    <line x1="164" y1="92" x2="164" y2="118" stroke="#111111" stroke-width="4" stroke-linecap="round" />
    <circle cx="164" cy="119" r="3.8" fill="#111111" />
    <line x1="180" y1="92" x2="180" y2="105" stroke="#111111" stroke-width="3" stroke-linecap="round" />
    <circle cx="180" cy="106" r="2.8" fill="#111111" />

    <!-- Drips under 'u' -->
    <line x1="214" y1="92" x2="214" y2="112" stroke="#111111" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="214" cy="113" r="3.2" fill="#111111" />
    <line x1="234" y1="92" x2="234" y2="122" stroke="#111111" stroke-width="4.2" stroke-linecap="round" />
    <circle cx="234" cy="123" r="4" fill="#111111" />

    <!-- Drip under 's' -->
    <line x1="268" y1="92" x2="268" y2="107" stroke="#111111" stroke-width="3.2" stroke-linecap="round" />
    <circle cx="268" cy="108" r="3" fill="#111111" />

    <!-- Drip under 'k' -->
    <line x1="300" y1="92" x2="300" y2="116" stroke="#111111" stroke-width="3.8" stroke-linecap="round" />
    <circle cx="300" cy="117" r="3.5" fill="#111111" />

    <!-- Drip under 'y' -->
    <line x1="338" y1="96" x2="338" y2="120" stroke="#111111" stroke-width="4" stroke-linecap="round" />
    <circle cx="338" cy="121" r="3.8" fill="#111111" />
  </g>

  <!-- 'Dose' WORDMARK PATH OUTLINES -->
  <g fill="#111111">
    <!-- 'D' -->
    <path d="M 404 28 h 18 c 14 0 24 9 24 24 c 0 16 -10 25 -24 25 h -18 Z M 417 38 v 29 h 5 c 8 0 13 -5 13 -14 c 0 -10 -5 -15 -13 -15 Z" />
    <!-- 'o' -->
    <path d="M 462 40 c 10 0 17 8 17 19 c 0 11 -7 19 -17 19 c -11 0 -18 -8 -18 -19 c 0 -11 7 -19 18 -19 Z M 462 49 c -5 0 -8 4 -8 10 c 0 6 3 10 8 10 c 5 0 8 -4 8 -10 c 0 -6 -3 -10 -8 -10 Z" />
    <!-- 's' -->
    <path d="M 495 40 c 8 0 13 4 13 10 c 0 5 -4 8 -9 9 l -4 2 c -4 1 -5 2 -5 4 c 0 2 2 4 6 4 c 4 0 8 -2 11 -4 v 8 c -3 2 -8 4 -13 4 c -9 0 -14 -5 -14 -11 c 0 -6 5 -9 11 -10 l 4 -1 c 3 -1 5 -2 5 -4 c 0 -2 -2 -3 -5 -3 c -3 0 -7 2 -10 3 v -8 c 3 -2 7 -3 12 -3 Z" />
    <!-- 'e' -->
    <path d="M 522 40 c 10 0 16 7 16 17 v 3 h -22 c 1 4 4 6 8 6 c 3 0 7 -1 10 -3 v 7 c -3 2 -7 3 -11 3 c -10 0 -16 -7 -16 -17 c 0 -10 6 -16 15 -16 Z M 522 47 c -4 0 -7 3 -8 6 h 14 c 0 -4 -2 -6 -6 -6 Z" />

    <!-- Trailing dots/motion lines on 'e' -->
    <line x1="542" y1="52" x2="558" y2="52" stroke="#111111" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="562" cy="52" r="3.5" fill="#111111" />
    <line x1="542" y1="64" x2="566" y2="64" stroke="#111111" stroke-width="4" stroke-linecap="round" />
    <circle cx="570" cy="64" r="4" fill="#111111" />
    <line x1="542" y1="76" x2="560" y2="76" stroke="#111111" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="564" cy="76" r="3.5" fill="#111111" />
  </g>
</svg>`;

// 2. Favicon SVG (512x512)
// Matches 'musky-favicon(2).png'
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(16, 16) scale(0.9375)">
    <!-- CRESCENT ARC -->
    <path d="M 430, 70 A 210,210 0 1 0 396, 434" fill="none" stroke="#111111" stroke-width="14" stroke-linecap="round" />

    <!-- PINK BUTTERFLY WING & ANTENNAE -->
    <g transform="translate(10, 0)">
      <!-- Antenna 1 -->
      <path d="M 160, 210 Q 135, 150 115, 110" fill="none" stroke="#ff1493" stroke-width="9.5" stroke-linecap="round" />
      <circle cx="115" cy="110" r="13" fill="#ff1493" />
      
      <!-- Antenna 2 -->
      <path d="M 175, 210 Q 185, 155 185, 120" fill="none" stroke="#ff1493" stroke-width="9.5" stroke-linecap="round" />
      <circle cx="185" cy="120" r="13" fill="#ff1493" />

      <!-- Butterfly Wing Silhouette -->
      <path d="M 168,230 C 175,168 230,105 318,105 C 358,105 380,146 366,192 C 350,240 300,274 246,294 C 300,320 334,374 294,408 C 260,428 206,408 185,362 C 172,328 168,276 168,230 Z" fill="#ff1493" />
    </g>
  </g>
</svg>`;

async function rebuild() {
  const publicDir = path.join(__dirname, '..', 'public');

  // Generate binary PNG files directly with sharp
  const pngLogo = await sharp(Buffer.from(logoSvg)).resize(2048, 675, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const png512 = await sharp(Buffer.from(faviconSvg)).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const png192 = await sharp(Buffer.from(faviconSvg)).resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const pngApple = await sharp(Buffer.from(faviconSvg)).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const png32 = await sharp(Buffer.from(faviconSvg)).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();

  // Write RAW BINARY BUFFERS directly to files
  fs.writeFileSync(path.join(publicDir, 'logo.png'), pngLogo);
  fs.writeFileSync(path.join(publicDir, 'favicon.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);
  fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), pngApple);

  // Generate binary valid favicon.ico
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(0, 0);
  icoHeader.writeUInt16LE(1, 2);
  icoHeader.writeUInt16LE(1, 4);
  icoHeader.writeUInt8(32, 6);
  icoHeader.writeUInt8(32, 7);
  icoHeader.writeUInt8(0, 8);
  icoHeader.writeUInt8(0, 9);
  icoHeader.writeUInt16LE(1, 10);
  icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(png32.length, 14);
  icoHeader.writeUInt32LE(22, 18);

  const icoBuf = Buffer.concat([icoHeader, png32]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuf);

  console.log('Clean PNG assets successfully created in /public!');
}

rebuild().catch(err => {
  console.error('Error rebuilding assets:', err);
  process.exit(1);
});
