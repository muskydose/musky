const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const publicDir = path.join(__dirname, '..', 'public');
  const files = [
    { name: 'logo.png', width: 580, height: 150 },
    { name: 'favicon.png', width: 64, height: 64 },
    { name: 'icon-192.png', width: 192, height: 192 },
    { name: 'icon-512.png', width: 512, height: 512 },
    { name: 'apple-touch-icon.png', width: 180, height: 180 },
    { name: 'favicon.ico', isIco: true }
  ];

  console.log('============================================================');
  console.log('          MUSKY DOSE - BRAND ASSETS BINARY AUDIT           ');
  console.log('============================================================');

  for (const f of files) {
    const filePath = path.join(publicDir, f.name);
    if (!fs.existsSync(filePath)) {
      console.error(`FAIL: Asset ${f.name} does NOT exist!`);
      process.exit(1);
    }
    const buf = fs.readFileSync(filePath);
    if (f.isIco) {
      const header = buf.slice(0, 4).toString('hex');
      if (header !== '00000100') {
        console.error(`FAIL: ${f.name} does NOT have valid ICO header! Header: ${header}`);
        process.exit(1);
      }
      const embeddedPngMeta = await sharp(buf.slice(22)).metadata();
      console.log(`PASS [✓] ${f.name}: Valid ICO header (00000100), embedded PNG = ${embeddedPngMeta.width}x${embeddedPngMeta.height}`);
    } else {
      const header = buf.slice(0, 8).toString('hex');
      if (header !== '89504e470d0a1a0a') {
        console.error(`FAIL: ${f.name} does NOT have valid PNG header! Header: ${header}`);
        process.exit(1);
      }
      const metadata = await sharp(filePath).metadata();
      if (!metadata || !metadata.format) {
        console.error(`FAIL: Asset ${f.name} is corrupted or invalid!`);
        process.exit(1);
      }
      console.log(`PASS [✓] ${f.name}: Valid PNG Signature, Format = ${metadata.format}, Dimensions = ${metadata.width}x${metadata.height}`);
    }
  }

  console.log('============================================================');
  console.log('RESULT: ALL BRAND ASSETS VALIDATED SUCCESSFULLY [✓]');
  console.log('============================================================');
}

main().catch(err => {
  console.error('ASSET AUDIT ERROR:', err);
  process.exit(1);
});
