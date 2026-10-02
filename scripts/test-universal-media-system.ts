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
import { uploadMediaFile, deleteMediaAssetClient, isBase64ImageData } from '../lib/media-upload';
import { NextRequest } from 'next/server';
import { POST as mediaAssetsPOST, DELETE as mediaAssetsDELETE } from '../app/api/admin/media-assets/route';
import { POST as mediaPOST, DELETE as mediaDELETE } from '../app/api/admin/media/route';
import { createAdminSessionToken } from '../lib/auth';

process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'test-secret-key-32-chars-long-security-universal';

console.log('=== RUNNING MUSKY DOSE — UNIVERSAL MEDIA SYSTEM TESTS ===\n');

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

async function runTests() {
  const adminToken = createAdminSessionToken('admin@muskydose.in');
  const authHeaders = {
    cookie: `md_admin_auth=${adminToken}`,
    host: 'localhost:3000',
    origin: 'http://localhost:3000',
  };

  const prodA = 'test-prod-a-' + Date.now();
  const prodB = 'test-prod-b-' + Date.now();
  const prodC = 'test-prod-c-' + Date.now();

  const urlA = 'https://abc.supabase.co/storage/v1/object/public/product-images/test-a.webp';
  const urlB = 'https://abc.supabase.co/storage/v1/object/public/product-images/test-b.webp';
  const urlC = 'https://abc.supabase.co/storage/v1/object/public/product-images/test-c.webp';
  const urlShared = 'https://abc.supabase.co/storage/v1/object/public/product-images/shared-icon.webp';

  console.log('--- 1. Product A, B, C Upload & Registration ---');
  const saveA = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodA,
    url: urlA,
    role: 'PRIMARY',
    title: 'Product A Botanical View',
    altText: 'Product A Henna Leaf',
    mimeType: 'image/webp',
    sortOrder: 1,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  assert(saveA.asset.entityId === prodA && saveA.asset.role === 'PRIMARY', 'Product A upload registers exact entity ownership & PRIMARY role');

  const saveB = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodB,
    url: urlB,
    role: 'PRIMARY',
    title: 'Product B Powder View',
    altText: 'Product B Indigo Powder',
    mimeType: 'image/webp',
    sortOrder: 1,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  assert(saveB.asset.entityId === prodB && saveB.asset.role === 'PRIMARY', 'Product B upload registers exact entity ownership & PRIMARY role');

  const saveC = await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodC,
    url: urlC,
    role: 'PRIMARY',
    title: 'Product C Oil View',
    altText: 'Product C Eucalyptus Henna Oil',
    mimeType: 'image/webp',
    sortOrder: 1,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  assert(saveC.asset.entityId === prodC && saveC.asset.role === 'PRIMARY', 'Product C upload registers exact entity ownership & PRIMARY role');

  console.log('\n--- 2. Isolation & Anti-Leakage Verification ---');
  const mediaForA = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
  const mediaForB = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodB });
  const mediaForC = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodC });

  assert(mediaForA.every((m) => m.entityId === prodA), 'Product A media does not leak to or from other products');
  assert(mediaForB.every((m) => m.entityId === prodB), 'Product B media does not leak to or from other products');
  assert(mediaForC.every((m) => m.entityId === prodC), 'Product C media does not leak to or from other products');
  assert(!mediaForA.some((m) => m.url === urlB || m.url === urlC), 'Product A cannot see or inherit Product B/C assets');

  console.log('\n--- 3. Primary Selection & Deterministic Gallery Ordering ---');
  const urlA2 = 'https://abc.supabase.co/storage/v1/object/public/product-images/test-a-gallery-2.webp';
  const urlA3 = 'https://abc.supabase.co/storage/v1/object/public/product-images/test-a-gallery-3.webp';

  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodA,
    url: urlA2,
    role: 'GALLERY',
    sortOrder: 2,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });

  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodA,
    url: urlA3,
    role: 'GALLERY',
    sortOrder: 3,
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });

  const primaryA = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: prodA });
  assert(primaryA?.url === urlA, 'Primary media resolver returns deterministic PRIMARY asset');

  const orderedGallery = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
  assert(orderedGallery.length === 3, 'Product A now has exactly 3 assets');
  assert(
    orderedGallery[0].sortOrder === 1 && orderedGallery[1].sortOrder === 2 && orderedGallery[2].sortOrder === 3,
    'Gallery ordering is deterministic (sortOrder 1, 2, 3)'
  );

  console.log('\n--- 4. MIME, Magic Bytes, SVG Security, and Base64 Guards ---');
  assert(isBase64ImageData('data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=='), 'Detects Base64 image bloat');
  assert(!isBase64ImageData('https://abc.supabase.co/img.png'), 'Allows clean HTTPS URL');

  // Test SVG security scanner in media endpoint
  const maliciousSvg = Buffer.from('<svg><script>alert("xss")</script><rect width="100" height="100"/></svg>');
  const safeSvg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>');

  const svgReqMalicious = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders },
    body: (() => {
      const fd = new FormData();
      fd.append('file', new File([maliciousSvg], 'test.svg', { type: 'image/svg+xml' }));
      fd.append('entityType', 'PRODUCT');
      fd.append('entityId', prodA);
      return fd;
    })(),
  });
  const maliciousSvgRes = await mediaAssetsPOST(svgReqMalicious);
  const maliciousSvgData = await maliciousSvgRes.json();
  assert(maliciousSvgRes.status === 400 && maliciousSvgData.error.includes('unsafe script'), 'Unsafe SVG with script tag is rejected with HTTP 400');

  // Test Magic Bytes Signature mismatch
  const fakeJpg = Buffer.from('NOT_A_REAL_JPEG_JUST_TEXT');
  const fakeJpgReq = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: { ...authHeaders },
    body: (() => {
      const fd = new FormData();
      fd.append('file', new File([fakeJpg], 'fake.jpg', { type: 'image/jpeg' }));
      fd.append('entityType', 'PRODUCT');
      fd.append('entityId', prodA);
      return fd;
    })(),
  });
  const fakeJpgRes = await mediaAssetsPOST(fakeJpgReq);
  const fakeJpgData = await fakeJpgRes.json();
  assert(fakeJpgRes.status === 400 && fakeJpgData.error.includes('File signature does not match'), 'Fake JPEG with invalid magic bytes is rejected');

  console.log('\n--- 5. High-Resolution Signed Upload URL Pathway ---');
  const signedUrlReq = new NextRequest('http://localhost:3000/api/admin/media-assets?action=signed-url', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      entityType: 'PRODUCT',
      entityId: prodA,
      fileName: 'large-camera-photo.jpg',
      mimeType: 'image/jpeg',
      fileSizeBytes: 8 * 1024 * 1024, // 8MB (exceeds Vercel 4.5MB limit)
    }),
  });
  const signedUrlRes = await mediaAssetsPOST(signedUrlReq);
  const signedUrlData = await signedUrlRes.json();
  assert(
    signedUrlRes.ok && (signedUrlData.signedUrl || signedUrlData.fallbackUrl || signedUrlData.publicUrl),
    'High-resolution upload requests signed direct upload URL bypassing Vercel body limits'
  );

  console.log('\n--- 6. Deleting Primary Asset & Automatic Primary Promotion ---');
  // Delete primary asset (saveA.asset.id)
  const deletePrimaryRes = await deleteMediaAsset({
    assetId: saveA.asset.id,
    entityType: 'PRODUCT',
    entityId: prodA,
  });
  assert(deletePrimaryRes.success && deletePrimaryRes.deleted, 'Primary asset deleted from product');
  assert(deletePrimaryRes.promotedPrimaryId !== undefined, 'Next gallery asset automatically promoted to PRIMARY');

  const newPrimary = await getPrimaryMedia({ entityType: 'PRODUCT', entityId: prodA });
  assert(newPrimary?.url === urlA2, 'Promoted primary is deterministically the next available image in sortOrder');

  console.log('\n--- 7. Deleting Gallery Asset ---');
  const deleteGalleryRes = await deleteMediaAsset({
    url: urlA3,
    entityType: 'PRODUCT',
    entityId: prodA,
  });
  assert(deleteGalleryRes.success && deleteGalleryRes.deleted, 'Gallery asset deleted successfully');
  const remainingAfterGalleryDelete = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodA });
  assert(remainingAfterGalleryDelete.length === 1, 'Only promoted primary remains on Product A');

  console.log('\n--- 8. Safe Shared Asset Deletion (Preserves Storage) ---');
  // Register shared asset on Product B and Product C
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodB,
    url: urlShared,
    role: 'GALLERY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });
  await saveMediaAsset({
    entityType: 'PRODUCT',
    entityId: prodC,
    url: urlShared,
    role: 'GALLERY',
    source: 'MANUAL_UPLOAD',
    status: 'approved',
  });

  const refsBefore = await scanMediaReferences(urlShared);
  assert(refsBefore.length >= 2, 'scanMediaReferences detects shared asset usage across multiple products');

  // Delete from Product B
  const deleteSharedFromB = await deleteMediaAsset({
    url: urlShared,
    entityType: 'PRODUCT',
    entityId: prodB,
  });
  assert(deleteSharedFromB.success && deleteSharedFromB.unlinked, 'Shared asset unlinked from Product B');
  assert(deleteSharedFromB.storageDeleted === false, 'Physical storage object NOT deleted while Product C still references it');

  const mediaCStillHasIt = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodC });
  assert(mediaCStillHasIt.some((m) => m.url === urlShared), 'Product C still retains shared asset intact');

  console.log('\n--- 9. Product Save & syncProductMedia Reconciliation ---');
  const syncUrls = [urlB, 'https://abc.supabase.co/storage/v1/object/public/product-images/new-gallery-b.webp'];
  await syncProductMedia(prodB, [], syncUrls);

  const syncedMediaB = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodB });
  assert(syncedMediaB.length === 2, 'syncProductMedia synchronized exact image list');
  assert(syncedMediaB[0].url === urlB && syncedMediaB[0].role === 'PRIMARY', 'First synced URL is deterministically PRIMARY');
  assert(syncedMediaB[1].url === syncUrls[1] && syncedMediaB[1].role === 'GALLERY', 'Second synced URL is deterministically GALLERY');

  // Prune by saving with only 1 image
  await syncProductMedia(prodB, [], [urlB]);
  const prunedMediaB = await getMediaForEntity({ entityType: 'PRODUCT', entityId: prodB });
  assert(prunedMediaB.length === 1 && prunedMediaB[0].url === urlB, 'syncProductMedia prunes removed image from database');

  console.log('\n--- 10. Frontend / Server Response Contract Uniformity ---');
  const contractReq = new NextRequest('http://localhost:3000/api/admin/media-assets', {
    method: 'POST',
    headers: {
      ...authHeaders,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      entityType: 'PRODUCT',
      entityId: prodC,
      url: 'https://abc.supabase.co/storage/v1/object/public/product-images/contract-test.webp',
      role: 'GALLERY',
      title: 'Contract Test',
    }),
  });
  const contractRes = await mediaAssetsPOST(contractReq);
  const contractData = await contractRes.json();
  assert(
    contractData.success === true &&
      typeof contractData.asset === 'object' &&
      typeof contractData.asset.url === 'string' &&
      typeof contractData.media?.url === 'string',
    'Response contract satisfies universal { success, asset, media: { url } } structure'
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
