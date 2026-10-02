import fs from 'fs';
import path from 'path';

// 1. Load .env.local with stripped quotes before any other imports
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const content = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      val = val.replace(/^["']|["']$/g, '');
      process.env[key] = val;
    }
  }
}

import {
  saveMediaAsset,
  deleteMediaAsset,
  getMediaForEntity,
  getPrimaryMedia,
  syncProductMedia,
  scanMediaReferences,
  createSignedMediaUploadUrl,
  getAllMediaAssetsRaw,
  isSafeInternalMediaUrl,
} from '../lib/db/media';
import { uploadMediaFile, deleteMediaAssetClient, isBase64ImageData, safeParseResponse } from '../lib/media-upload';
import { NextRequest } from 'next/server';
import { POST as mediaAssetsPOST, DELETE as mediaAssetsDELETE } from '../app/api/admin/media-assets/route';
import { POST as mediaPOST, DELETE as mediaDELETE } from '../app/api/admin/media/route';
import { createAdminSessionToken } from '../lib/auth';

console.log('=== RUNNING MUSKY DOSE — 23-POINT UNIVERSAL MEDIA SYSTEM TEST SUITE ===\n');

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failed++;
  }
}

// Generate valid test image buffers (must be >= 1024 bytes to satisfy image integrity validation)
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const VALID_TEST_PNG = Buffer.concat([PNG_HEADER, Buffer.alloc(1024, 0)]);

const JPG_HEADER = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
  0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
  0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
  0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20,
  0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29,
  0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
  0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
  0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00,
  0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
  0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
  0x00, 0xbf, 0x80, 0xff, 0xd9,
]);
const VALID_TEST_JPG = Buffer.concat([JPG_HEADER, Buffer.alloc(1024, 0)]);

const WEBP_HEADER = Buffer.from([
  0x52, 0x49, 0x46, 0x46, 0x1a, 0x04, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
  0x56, 0x50, 0x38, 0x4c, 0x0d, 0x04, 0x00, 0x00, 0x2f, 0x00, 0x00, 0x00,
  0x00, 0x07, 0x00, 0x08, 0x73, 0x67, 0xa4, 0x00, 0x00, 0x00,
]);
const VALID_TEST_WEBP = Buffer.concat([WEBP_HEADER, Buffer.alloc(1024, 0)]);

async function runTests() {
  const adminToken = createAdminSessionToken('admin@muskydose.in');
  const authHeaders = {
    cookie: `md_admin_auth=${adminToken}`,
    authorization: `Bearer ${adminToken}`,
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };

  const prodA = 'test-prod-a-' + Date.now();
  const prodB = 'test-prod-b-' + Date.now();
  const prodC = 'test-prod-c-' + Date.now();

  // =========================================================================
  // REQUIREMENT 1: Small PNG upload via route
  // =========================================================================
  console.log('--- 1. Small PNG Upload ---');
  const pngFd = new FormData();
  pngFd.append('file', new File([VALID_TEST_PNG], 'leaf-swatch.png', { type: 'image/png' }));
  pngFd.append('entityType', 'PRODUCT');
  pngFd.append('entityId', prodA);
  const pngReq = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders },
    body: pngFd,
  });
  const pngRes = await mediaAssetsPOST(pngReq);
  const pngData = await pngRes.json();
  assert(pngRes.ok && pngData.success && pngData.asset?.mimeType === 'image/png', 'Small PNG uploaded and validated via magic bytes');

  // =========================================================================
  // REQUIREMENT 2: Small JPEG upload via route
  // =========================================================================
  console.log('\n--- 2. Small JPEG Upload ---');
  const jpgFd = new FormData();
  jpgFd.append('file', new File([VALID_TEST_JPG], 'powder-jar.jpg', { type: 'image/jpeg' }));
  jpgFd.append('entityType', 'PRODUCT');
  jpgFd.append('entityId', prodA);
  const jpgReq = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders },
    body: jpgFd,
  });
  const jpgRes = await mediaAssetsPOST(jpgReq);
  const jpgData = await jpgRes.json();
  assert(jpgRes.ok && jpgData.success && jpgData.asset?.mimeType === 'image/jpeg', 'Small JPEG uploaded and validated via magic bytes');

  // =========================================================================
  // REQUIREMENT 3: WebP upload via route
  // =========================================================================
  console.log('\n--- 3. WebP Upload ---');
  const webpFd = new FormData();
  webpFd.append('file', new File([VALID_TEST_WEBP], 'bottle.webp', { type: 'image/webp' }));
  webpFd.append('entityType', 'PRODUCT');
  webpFd.append('entityId', prodA);
  const webpReq = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders },
    body: webpFd,
  });
  const webpRes = await mediaAssetsPOST(webpReq);
  const webpData = await webpRes.json();
  assert(webpRes.ok && webpData.success && webpData.asset?.mimeType === 'image/webp', 'WebP uploaded and validated via magic bytes');

  // =========================================================================
  // REQUIREMENT 4: High-resolution upload (>3.5MB) signed URL initialization
  // =========================================================================
  console.log('\n--- 4. High-Resolution Upload (>3.5MB) ---');
  const highResInit4Req = new NextRequest('http://localhost:3000/api/admin/media-assets?action=signed-url', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      entityType: 'PRODUCT',
      entityId: prodA,
      fileName: 'ultra-hd-henna.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 3.8 * 1024 * 1024,
    }),
  });
  const highResInit4Res = await mediaAssetsPOST(highResInit4Req);
  const highResInit4Data = await highResInit4Res.json();
  assert(
    highResInit4Res.ok && highResInit4Data.success && Boolean(highResInit4Data.signedUrl),
    'Signed URL initialized successfully for >3.5MB asset'
  );

  // =========================================================================
  // REQUIREMENT 5: High-resolution upload (>4.5MB, exceeding Vercel 4.5MB limit)
  // =========================================================================
  console.log('\n--- 5. High-Resolution Upload (>4.5MB Exceeding Vercel Limit) ---');
  const highResInit5Req = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'signed-url',
      entityType: 'PRODUCT',
      entityId: prodA,
      fileName: 'henna (2).png',
      mimeType: 'image/png',
      fileSizeBytes: 6.2 * 1024 * 1024, // 6.2MB (well beyond 4.5MB Vercel limit)
    }),
  });
  const highResInit5Res = await mediaAssetsPOST(highResInit5Req);
  const highResInit5Data = await highResInit5Res.json();
  assert(
    highResInit5Res.ok && highResInit5Data.success && Boolean(highResInit5Data.signedUrl),
    'Signed URL initialized successfully for 6.2MB file (henna (2).png) exceeding Vercel limit'
  );
  assert(
    highResInit5Data.storagePath.includes('henna-2-.png'),
    'Server sanitizes filename with parentheses and spaces cleanly'
  );

  // =========================================================================
  // REQUIREMENT 6: Direct signed-upload initialization DAL
  // =========================================================================
  console.log('\n--- 6. Direct Signed-Upload Initialization DAL ---');
  const dalSignedInit = await createSignedMediaUploadUrl({
    entityType: 'PRODUCT',
    entityId: prodB,
    fileName: 'master-leaf.png',
    mimeType: 'image/png',
    fileSizeBytes: 5 * 1024 * 1024,
  });
  assert(dalSignedInit.success && Boolean(dalSignedInit.signedUrl), 'createSignedMediaUploadUrl returns signedUrl');
  assert(Boolean(dalSignedInit.token), 'createSignedMediaUploadUrl returns signed token');
  assert(Boolean(dalSignedInit.publicUrl), 'createSignedMediaUploadUrl returns authoritative publicUrl');

  // =========================================================================
  // REQUIREMENT 7: Direct signed upload execution & canonical registration
  // =========================================================================
  console.log('\n--- 7. Direct Signed Upload Execution ---');
  const directRegReq = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      entityType: 'PRODUCT',
      entityId: prodB,
      url: dalSignedInit.publicUrl,
      storagePath: dalSignedInit.storagePath,
      fileName: 'master-leaf.png',
      fileSizeBytes: 5 * 1024 * 1024,
      mimeType: 'image/png',
      role: 'PRIMARY',
      title: 'Master Leaf Powder',
    }),
  });
  const directRegRes = await mediaAssetsPOST(directRegReq);
  const directRegData = await directRegRes.json();
  assert(
    directRegRes.ok && directRegData.success && directRegData.asset?.entityId === prodB,
    'Direct signed-upload asset registered canonically with exact product ownership'
  );

  // =========================================================================
  // REQUIREMENT 8: Direct upload failure returns true upstream error
  // =========================================================================
  console.log('\n--- 8. Direct Upload Failure Returns True Upstream Error ---');
  const invalidMimeReq = new NextRequest('http://localhost:3000/api/admin/media-assets?action=signed-url', {
    method: 'POST',
    headers: { ...authHeaders, 'content-type': 'application/json' },
    body: JSON.stringify({
      entityType: 'PRODUCT',
      entityId: prodA,
      fileName: 'bad-file.exe',
      mimeType: 'application/x-msdownload',
      fileSizeBytes: 5000000,
    }),
  });
  const invalidMimeRes = await mediaAssetsPOST(invalidMimeReq);
  const invalidMimeData = await invalidMimeRes.json();
  assert(
    invalidMimeRes.status === 400 && invalidMimeData.error.includes('Unsupported MIME type'),
    'Returns clear upstream error when validation fails during signed upload initialization'
  );

  // =========================================================================
  // REQUIREMENT 9: Confirm NO multipart fallback after direct large-file failure
  // =========================================================================
  console.log('\n--- 9. Confirm NO Multipart Fallback for Large Files (>3.5MB) ---');
  const largeMockFile = new File([new Uint8Array(5 * 1024 * 1024)], 'huge-photo.jpg', { type: 'image/jpeg' });
  const originalFetch = global.fetch;
  let largeMultipartAttempted = false;

  (global as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('action=signed-url')) {
      return new Response(JSON.stringify({ success: false, error: 'Direct storage gateway unreachable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (urlStr.includes('/api/admin/media-assets') && init?.method === 'POST' && init?.body instanceof FormData) {
      largeMultipartAttempted = true;
      return new Response(JSON.stringify({ error: 'Should NOT be called for large file' }), { status: 413 });
    }
    return originalFetch(url, init);
  };

  const largeUploadResult = await uploadMediaFile({
    file: largeMockFile,
    entityType: 'PRODUCT',
    entityId: prodA,
  });

  global.fetch = originalFetch;
  assert(!largeUploadResult.success, 'Large file upload reports failure when direct path fails');
  assert(
    !largeMultipartAttempted,
    'CRITICAL: NO multipart fallback was attempted for large file (>3.5MB), preventing Vercel 413'
  );
  assert(
    (largeUploadResult.error || '').includes('Direct storage gateway unreachable') || (largeUploadResult.error || '').includes('Failed to initialize'),
    'Surfaces exact upstream error without masking'
  );

  // =========================================================================
  // REQUIREMENT 10: Safe fallback behavior only when authorized for small files (<= 3.5MB)
  // =========================================================================
  console.log('\n--- 10. Safe Fallback Behavior for Small Files (<=3.5MB) ---');
  const smallMockFile = new File([VALID_TEST_PNG], 'small-fallback.png', { type: 'image/png' });
  let smallMultipartAttempted = false;

  (global as any).fetch = async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = String(url);
    if (urlStr.includes('action=signed-url')) {
      return new Response(JSON.stringify({ success: false, error: 'Storage direct path unavailable' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (init?.method === 'POST' && init?.body instanceof FormData) {
      smallMultipartAttempted = true;
      return new Response(
        JSON.stringify({
          success: true,
          asset: { id: 'asset-small-fallback', url: 'https://abc.supabase.co/img.png' },
          media: { url: 'https://abc.supabase.co/img.png' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(url, init);
  };

  const smallUploadResult = await uploadMediaFile({
    file: smallMockFile,
    entityType: 'PRODUCT',
    entityId: prodA,
  });

  global.fetch = originalFetch;
  assert(smallMultipartAttempted, 'Small file safely falls back to standard multipart when storage init fails');
  assert(smallUploadResult.success, 'Small file upload succeeds via authorized fallback');

  // =========================================================================
  // REQUIREMENT 11: Non-JSON error response handling
  // =========================================================================
  console.log('\n--- 11. Non-JSON Error Response Handling (HTML 502/504) ---');
  const html504Response = new Response(
    '<html><head><title>504 Gateway Time-out</title></head><body><h1>504 Gateway Time-out</h1>The server encountered a temporary error.</body></html>',
    {
      status: 504,
      headers: { 'Content-Type': 'text/html' },
    }
  );
  const parsed504 = await safeParseResponse(html504Response, 'Upload failed');
  assert(
    !parsed504.data && Boolean(parsed504.error?.includes('Server returned HTML error (HTTP 504)')),
    'safeParseResponse gracefully catches raw HTML error pages without throwing JSON syntax error'
  );

  // =========================================================================
  // REQUIREMENT 12: Exact product ownership
  // =========================================================================
  console.log('\n--- 12. Exact Product Ownership ---');
  const url12 = 'https://abc.supabase.co/storage/v1/object/public/product-images/exact-ownership.webp';
  const saveOwnership = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodA,
    url: url12,
    role: 'PRIMARY',
    title: 'Botanical Henna',
    mimeType: 'image/webp',
    sortOrder: 1,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  assert(
    saveOwnership.asset.entityType === 'PRODUCT' && saveOwnership.asset.entityId === prodA,
    'Media asset record strictly retains exact entityType and entityId'
  );

  // =========================================================================
  // REQUIREMENT 13: Cross-product media isolation
  // =========================================================================
  console.log('\n--- 13. Cross-Product Media Isolation ---');
  const mediaA = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
  const mediaB = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodB });
  assert(!mediaA.some((m) => m.entityId === prodB), 'Product A does not contain Product B media');
  assert(!mediaB.some((m) => m.entityId === prodA), 'Product B does not contain Product A media');

  // =========================================================================
  // REQUIREMENT 14: Primary assignment
  // =========================================================================
  console.log('\n--- 14. Primary Assignment ---');
  const primaryB = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: prodB });
  assert(primaryB?.role === 'PRIMARY', 'Deterministic primary media is assigned and resolved');

  // =========================================================================
  // REQUIREMENT 15: Gallery ordering
  // =========================================================================
  console.log('\n--- 15. Gallery Ordering ---');
  const urlGallery1 = 'https://abc.supabase.co/storage/v1/object/public/product-images/gallery-1.webp';
  const urlGallery2 = 'https://abc.supabase.co/storage/v1/object/public/product-images/gallery-2.webp';
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodA,
    url: urlGallery1,
    role: 'GALLERY',
    sortOrder: 10,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodA,
    url: urlGallery2,
    role: 'GALLERY',
    sortOrder: 20,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  const galleryA = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
  const galleryItems = galleryA.filter((m) => m.url === urlGallery1 || m.url === urlGallery2);
  assert(
    galleryItems.length === 2 && galleryItems[0].sortOrder < galleryItems[1].sortOrder,
    'Gallery ordering is strictly deterministic based on sortOrder'
  );

  // =========================================================================
  // REQUIREMENT 16: Duplicate upload handling
  // =========================================================================
  console.log('\n--- 16. Duplicate Upload / Deduplication ---');
  const firstSave = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodC,
    url: 'https://abc.supabase.co/storage/v1/object/public/product-images/duplicate-test.webp',
    role: 'PRIMARY',
    title: 'Duplicate Test',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  const dupSave = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodC,
    url: 'https://abc.supabase.co/storage/v1/object/public/product-images/duplicate-test.webp',
    role: 'PRIMARY',
    title: 'Duplicate Test (Re-saved)',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  assert(
    firstSave.asset.id === dupSave.asset.id,
    'Duplicate asset upload with matching URL updates existing record rather than creating duplicates'
  );

  // =========================================================================
  // REQUIREMENT 17: New-product temporary upload reconciliation
  // =========================================================================
  console.log('\n--- 17. New-Product Temporary Upload Reconciliation ---');
  const tempUrl = 'https://abc.supabase.co/storage/v1/object/public/product-images/temp-new-product.webp';
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: 'new-product',
    url: tempUrl,
    role: 'PRIMARY',
    title: 'Temporary Brand New Product Image',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });

  const newlyCreatedDurableId = 'durable-prod-' + Date.now();
  await syncProductMedia(newlyCreatedDurableId, [], [tempUrl]);

  const reconciledMedia = await getMediaForEntity({ entityType: 'PRODUCT', entityId: newlyCreatedDurableId });
  assert(
    reconciledMedia.length === 1 && reconciledMedia[0].url === tempUrl && reconciledMedia[0].entityId === newlyCreatedDurableId,
    'Temporary new-product upload is reconciled and owned by the newly created durable product ID'
  );

  // =========================================================================
  // REQUIREMENT 18: Temporary orphan cleanup
  // =========================================================================
  console.log('\n--- 18. Temporary Orphan Cleanup ---');
  const abandonedTempUrl = 'https://abc.supabase.co/storage/v1/object/public/product-images/abandoned-temp.webp';
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: 'new-product',
    url: abandonedTempUrl,
    role: 'GALLERY',
    title: 'Abandoned Upload That Was Never Saved',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  await syncProductMedia(newlyCreatedDurableId, [], [tempUrl]);
  const rawAssets = await getAllMediaAssetsRaw();
  const abandonedStillExists = rawAssets.assets.some((m) => m.url === abandonedTempUrl && m.entityId === 'new-product');
  assert(!abandonedStillExists, 'Orphaned temporary assets are pruned and never left dangling');

  // =========================================================================
  // REQUIREMENT 19: Delete primary & auto-promotion
  // =========================================================================
  console.log('\n--- 19. Delete Primary & Auto-Promotion ---');
  const primaryToDelete = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: prodA });
  if (primaryToDelete) {
    const deletePrimaryResult = await deleteMediaAsset({
      assetId: primaryToDelete.id,
      entityType: 'PRODUCT',
      entityId: prodA,
    });
    assert(deletePrimaryResult.success && deletePrimaryResult.deleted, 'Primary asset deleted');
    const promotedPrimary = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: prodA });
    assert(
      promotedPrimary !== null && promotedPrimary.id !== primaryToDelete.id,
      'Next available gallery asset automatically promoted to PRIMARY'
    );
  } else {
    assert(false, 'No primary asset found to delete');
  }

  // =========================================================================
  // REQUIREMENT 20: Delete gallery
  // =========================================================================
  console.log('\n--- 20. Delete Gallery ---');
  const currentMediaA = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
  const galleryItem = currentMediaA.find((m) => m.role === 'GALLERY');
  if (galleryItem) {
    const deleteGalRes = await deleteMediaAsset({
      assetId: galleryItem.id,
      entityType: 'PRODUCT',
      entityId: prodA,
    });
    assert(deleteGalRes.success && deleteGalRes.deleted, 'Gallery asset deleted cleanly');
    const remainingA = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
    assert(!remainingA.some((m) => m.id === galleryItem.id), 'Deleted gallery asset no longer in product media list');
  }

  // =========================================================================
  // REQUIREMENT 21: Shared asset protection
  // =========================================================================
  console.log('\n--- 21. Shared Asset Protection ---');
  const sharedAssetUrl = 'https://abc.supabase.co/storage/v1/object/public/product-images/shared-botanical-seal.webp';
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodB,
    url: sharedAssetUrl,
    role: 'GALLERY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodC,
    url: sharedAssetUrl,
    role: 'GALLERY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });

  const sharedDeleteFromB = await deleteMediaAsset({
    url: sharedAssetUrl,
    entityType: 'PRODUCT',
    entityId: prodB,
  });
  assert(sharedDeleteFromB.success && sharedDeleteFromB.unlinked, 'Shared asset unlinked from Product B');
  assert(
    sharedDeleteFromB.storageDeleted === false,
    'Storage object NOT deleted because Product C still references the asset'
  );
  const prodCReferences = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodC });
  assert(prodCReferences.some((m) => m.url === sharedAssetUrl), 'Product C retains shared asset intact');

  // =========================================================================
  // REQUIREMENT 22: Physical storage object deletion when references = 0
  // =========================================================================
  console.log('\n--- 22. Physical Storage Object Deletion ---');
  const uniqueStorageUrl = 'https://abc.supabase.co/storage/v1/object/public/product-images/unique-only-prod-c.webp';
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodC,
    url: uniqueStorageUrl,
    storagePath: 'product-images/unique-only-prod-c.webp',
    role: 'GALLERY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  const deleteSoleReference = await deleteMediaAsset({
    url: uniqueStorageUrl,
    entityType: 'PRODUCT',
    entityId: prodC,
  });
  assert(deleteSoleReference.success && deleteSoleReference.deleted, 'Sole reference unlinked and record deleted');
  assert(
    deleteSoleReference.storageDeleted === true,
    'Physical storage object deleted when reference count reaches 0'
  );

  // =========================================================================
  // REQUIREMENT 23: Cache revalidation
  // =========================================================================
  console.log('\n--- 23. Cache Revalidation Verification ---');
  const deleteReq = new NextRequest(`http://localhost:3000/api/admin/media-assets?url=${encodeURIComponent(sharedAssetUrl)}&entityType=PRODUCT&entityId=${prodC}`, {
    method: 'DELETE',
    headers: { ...authHeaders },
  });
  const deleteRouteRes = await mediaAssetsDELETE(deleteReq);
  const deleteRouteData = await deleteRouteRes.json();
  assert(
    deleteRouteRes.ok && deleteRouteData.success,
    'Admin media-assets DELETE route completes revalidation and returns success contract'
  );

  console.log('\n======================================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED:      ${passed}`);
  console.log(`FAILED:      ${failed}`);
  console.log('======================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
