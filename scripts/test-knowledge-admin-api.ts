import assert from 'node:assert';
import fs from 'fs';
import { NextRequest } from 'next/server';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  });
}

process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'test-secret-key-32-chars-long-admin';

import { createAdminSessionToken } from '../lib/auth';
import {
  GET as adminKnowledgeGET,
  POST as adminKnowledgePOST,
} from '../app/api/admin/knowledge/route';
import {
  GET as adminKnowledgeByIdGET,
  PUT as adminKnowledgeByIdPUT,
  DELETE as adminKnowledgeByIdDELETE,
} from '../app/api/admin/knowledge/[id]/route';
import {
  getPublishedKnowledgeEntities,
  getKnowledgeBySlug,
  resetKnowledgeCache,
  revalidateKnowledgeSurfaces,
} from '../lib/db/knowledge';

function createAuthHeaders(options?: { csrfMismatch?: boolean; unauthenticated?: boolean }): Record<string, string> {
  if (options?.unauthenticated) {
    return {
      host: 'localhost:3000',
    };
  }

  const token = createAdminSessionToken('admin@muskydose.com');
  return {
    cookie: `md_admin_auth=${token}`,
    host: 'localhost:3000',
    origin: options?.csrfMismatch ? 'https://malicious-origin.com' : 'http://localhost:3000',
    'content-type': 'application/json',
  };
}

async function runKnowledgeAdminApiTests() {
  console.log('===============================================================');
  console.log('STARTING PHASE 2 STEP 2C: KNOWLEDGE ADMIN API VERIFICATION');
  console.log('===============================================================');

  // Reset cache before starting
  resetKnowledgeCache({ resetFallbackStore: true });

  // --------------------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & GOVERNANCE GUARDS
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 1: Admin Auth & Governance Protection ---');

  // 1.1 Unauthenticated GET must return 401
  const unauthGetReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    headers: createAuthHeaders({ unauthenticated: true }),
  });
  const unauthGetRes = await adminKnowledgeGET(unauthGetReq);
  assert.strictEqual(unauthGetRes.status, 401, 'Unauthenticated GET must return HTTP 401');
  console.log('  ✓ Unauthenticated GET rejected with 401 Unauthorized (PASSED)');

  // 1.2 Unauthenticated POST must return 401
  const unauthPostReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders({ unauthenticated: true }),
    body: JSON.stringify({ canonicalName: 'Test' }),
  });
  const unauthPostRes = await adminKnowledgePOST(unauthPostReq);
  assert.strictEqual(unauthPostRes.status, 401, 'Unauthenticated POST must return HTTP 401');
  console.log('  ✓ Unauthenticated POST rejected with 401 Unauthorized (PASSED)');

  // 1.3 CSRF Origin mismatch on mutation must return 403
  const csrfReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders({ csrfMismatch: true }),
    body: JSON.stringify({ canonicalName: 'Test' }),
  });
  const csrfRes = await adminKnowledgePOST(csrfReq);
  assert.strictEqual(csrfRes.status, 403, 'CSRF Origin mismatch must return HTTP 403');
  console.log('  ✓ CSRF/Origin mismatch rejected with 403 Forbidden (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 2: GET OPERATIONS (LIST & BY ID)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 2: GET Endpoints (List & ID Resolution) ---');

  // 2.1 GET /api/admin/knowledge (List all admin entities)
  const listReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    headers: createAuthHeaders(),
  });
  const listRes = await adminKnowledgeGET(listReq);
  assert.strictEqual(listRes.status, 200, 'GET /api/admin/knowledge must return 200');
  const listJson = await listRes.json();
  assert.strictEqual(listJson.success, true);
  assert.strictEqual(Array.isArray(listJson.entities), true);
  assert.strictEqual(listJson.total >= 18, true, 'Must return at least 18 entities (17 published + 1 UNKNOWN)');
  assert.ok(listJson.entities.some((e: any) => e.entityKey === 'UNKNOWN'), 'Admin list must include UNKNOWN sentinel');
  console.log(`  ✓ GET /api/admin/knowledge returned ${listJson.total} entities including UNKNOWN (PASSED)`);

  // 2.2 GET /api/admin/knowledge/[id] by ID
  const getByIdReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-henna-mehndi', {
    headers: createAuthHeaders(),
  });
  const getByIdRes = await adminKnowledgeByIdGET(getByIdReq, {
    params: Promise.resolve({ id: 'ent-henna-mehndi' }),
  });
  assert.strictEqual(getByIdRes.status, 200);
  const getByIdJson = await getByIdRes.json();
  assert.strictEqual(getByIdJson.success, true);
  assert.strictEqual(getByIdJson.entity.entityKey, 'HENNA_MEHNDI');
  assert.strictEqual(getByIdJson.entity.slug, 'henna-mehndi');
  console.log('  ✓ GET /api/admin/knowledge/[id] resolved by primary ID "ent-henna-mehndi" (PASSED)');

  // 2.3 GET /api/admin/knowledge/[id] by slug
  const getBySlugReq = new NextRequest('http://localhost:3000/api/admin/knowledge/indigo', {
    headers: createAuthHeaders(),
  });
  const getBySlugRes = await adminKnowledgeByIdGET(getBySlugReq, {
    params: Promise.resolve({ id: 'indigo' }),
  });
  assert.strictEqual(getBySlugRes.status, 200);
  const getBySlugJson = await getBySlugRes.json();
  assert.strictEqual(getBySlugJson.entity.entityKey, 'INDIGO');
  console.log('  ✓ GET /api/admin/knowledge/[id] resolved by slug "indigo" (PASSED)');

  // 2.4 GET /api/admin/knowledge/[id] non-existent ID returns 404
  const notFoundReq = new NextRequest('http://localhost:3000/api/admin/knowledge/non-existent-entity-id', {
    headers: createAuthHeaders(),
  });
  const notFoundRes = await adminKnowledgeByIdGET(notFoundReq, {
    params: Promise.resolve({ id: 'non-existent-entity-id' }),
  });
  assert.strictEqual(notFoundRes.status, 404);
  console.log('  ✓ GET /api/admin/knowledge/[id] with non-existent ID returns 404 Not Found (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 3: POST CREATE & VALIDATION RULES
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 3: POST Create & Input Validation ---');

  // 3.1 Create new published botanical entity
  const newEntityPayload = {
    canonicalName: 'Senna (Cassia)',
    entityKey: 'SENNA',
    slug: 'senna-cassia',
    scientificName: 'Senna alexandrina',
    botanicalFamily: 'Fabaceae',
    productFamily: 'BOTANICAL_SINGLE',
    entityClass: 'BOTANICAL_SINGLE',
    aliases: ['Senna', 'Cassia', 'Swarnapatri'],
    supportedScopes: ['HAIR'],
    safeUseCases: ['hair_conditioning', 'natural_shine'],
    status: 'published',
    published: true,
    description: 'High sennosides sun-dried Rajasthani senna leaves.',
  };

  const createReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify(newEntityPayload),
  });
  const createRes = await adminKnowledgePOST(createReq);
  const createJson = await createRes.json();
  assert.strictEqual(createRes.status, 201, 'Valid creation must return HTTP 201');
  assert.strictEqual(createJson.success, true);
  assert.strictEqual(createJson.entity.entityKey, 'SENNA');
  assert.strictEqual(createJson.entity.slug, 'senna-cassia');
  assert.strictEqual(createJson.entity.published, true);
  assert.strictEqual(createJson.entity.dbStatus, 'published');
  assert.deepStrictEqual(createJson.entity.normalizedAliases, ['senna', 'cassia', 'swarnapatri']);
  console.log('  ✓ POST created new published botanical entity "SENNA" (PASSED)');

  // 3.2 Accidental Publication Guard: draft cannot have published=true
  const accidentalReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      canonicalName: 'Accidental Draft Entity',
      entityKey: 'ACCIDENTAL_DRAFT',
      status: 'draft',
      published: true, // Contradictory!
    }),
  });
  const accidentalRes = await adminKnowledgePOST(accidentalReq);
  assert.strictEqual(accidentalRes.status, 400, 'Draft with published=true must be rejected');
  console.log('  ✓ Accidental publication guard rejected contradictory draft with published=true (PASSED)');

  // 3.3 Draft Entity Creation: properly sets published=false and isolates from public
  const draftReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      canonicalName: 'Experimental Botanical Herb',
      entityKey: 'EXPERIMENTAL_HERB',
      status: 'draft',
      published: false,
    }),
  });
  const draftRes = await adminKnowledgePOST(draftReq);
  assert.strictEqual(draftRes.status, 201);
  const draftJson = await draftRes.json();
  assert.strictEqual(draftJson.entity.published, false);
  assert.strictEqual(draftJson.entity.dbStatus, 'draft');

  // Verify public retrieval strictly excludes draft
  const publicEntities = await getPublishedKnowledgeEntities();
  assert.strictEqual(
    publicEntities.some((e) => e.entityKey === 'EXPERIMENTAL_HERB'),
    false,
    'Draft entity must never appear in public getPublishedKnowledgeEntities()'
  );
  console.log('  ✓ Draft entity created safely and isolated from public visibility (PASSED)');

  // 3.4 Sentinel UNKNOWN publication rejection
  const unknownPubReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      canonicalName: 'Unknown Sentinel',
      entityKey: 'UNKNOWN',
      status: 'published',
      published: true,
    }),
  });
  const unknownPubRes = await adminKnowledgePOST(unknownPubReq);
  assert.strictEqual(unknownPubRes.status, 400, 'UNKNOWN sentinel publication must be rejected');
  console.log('  ✓ Sentinel UNKNOWN manual publication rejected with 400 (PASSED)');

  // 3.5 Duplicate Entity Key Rejection
  const dupKeyReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      canonicalName: 'Another Henna',
      entityKey: 'HENNA_MEHNDI', // Existing key
      slug: 'another-henna',
    }),
  });
  const dupKeyRes = await adminKnowledgePOST(dupKeyReq);
  assert.strictEqual(dupKeyRes.status, 409, 'Duplicate entityKey must return 409 Conflict');
  console.log('  ✓ Duplicate entityKey rejected with 409 Conflict (PASSED)');

  // 3.6 Duplicate Slug Rejection
  const dupSlugReq = new NextRequest('http://localhost:3000/api/admin/knowledge', {
    method: 'POST',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      canonicalName: 'Different Name',
      entityKey: 'DIFFERENT_ENTITY_KEY',
      slug: 'indigo', // Existing slug
    }),
  });
  const dupSlugRes = await adminKnowledgePOST(dupSlugReq);
  assert.strictEqual(dupSlugRes.status, 409, 'Duplicate slug must return 409 Conflict');
  console.log('  ✓ Duplicate slug rejected with 409 Conflict (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 4: PUT UPDATE, IMMUTABILITY & REDIRECT PRESERVATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 4: PUT Update, Immutability & Redirects ---');

  // 4.1 Update description and botanical fields
  const updateReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-senna-cassia', {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      scientificName: 'Senna alexandrina Mill.',
      description: 'Updated botanical monograph for verified Rajasthan senna sourcing.',
    }),
  });
  const updateRes = await adminKnowledgeByIdPUT(updateReq, {
    params: Promise.resolve({ id: 'ent-senna-cassia' }),
  });
  assert.strictEqual(updateRes.status, 200);
  const updateJson = await updateRes.json();
  assert.strictEqual(updateJson.entity.scientificName, 'Senna alexandrina Mill.');
  console.log('  ✓ PUT successfully updated botanical attributes (PASSED)');

  // 4.2 Entity Key Immutability Guard
  const immutableKeyReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-senna-cassia', {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      entityKey: 'NEW_MODIFIED_KEY', // Forbidden mutation
    }),
  });
  const immutableKeyRes = await adminKnowledgeByIdPUT(immutableKeyReq, {
    params: Promise.resolve({ id: 'ent-senna-cassia' }),
  });
  assert.strictEqual(immutableKeyRes.status, 400, 'Attempting to change entityKey must return 400');
  console.log('  ✓ Immutable entityKey enforcement prevented key mutation on PUT (PASSED)');

  // 4.3 UNKNOWN Sentinel Publication Guard on PUT
  const unknownPutReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-unknown', {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      status: 'published',
      published: true,
    }),
  });
  const unknownPutRes = await adminKnowledgeByIdPUT(unknownPutReq, {
    params: Promise.resolve({ id: 'ent-unknown' }),
  });
  assert.strictEqual(unknownPutRes.status, 400, 'Attempting to publish UNKNOWN on PUT must return 400');
  console.log('  ✓ Sentinel UNKNOWN publication rejected on PUT (PASSED)');

  // 4.4 Slug Change with 308 Redirect Preservation (Requirement 11)
  const slugChangeReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-senna-cassia', {
    method: 'PUT',
    headers: createAuthHeaders(),
    body: JSON.stringify({
      slug: 'senna-botanical-powder', // Old slug was 'senna-cassia'
    }),
  });
  const slugChangeRes = await adminKnowledgeByIdPUT(slugChangeReq, {
    params: Promise.resolve({ id: 'ent-senna-cassia' }),
  });
  assert.strictEqual(slugChangeRes.status, 200);
  const slugChangeJson = await slugChangeRes.json();
  assert.strictEqual(slugChangeJson.entity.slug, 'senna-botanical-powder');
  assert.ok(
    slugChangeJson.entity.redirectSlugs.includes('senna-cassia'),
    'Old slug "senna-cassia" must be automatically preserved in redirectSlugs'
  );

  // Verify that querying DAL for old slug yields 308 redirect intent
  const redirectCheck = await getKnowledgeBySlug('senna-cassia');
  assert.ok(redirectCheck.entity, 'Old slug must resolve to updated entity');
  assert.strictEqual(redirectCheck.isRedirect, true, 'Old slug lookup must signal 308 redirect intent');
  assert.strictEqual(redirectCheck.redirectCanonicalSlug, 'senna-botanical-powder');
  console.log('  ✓ Slug update preserved previous slug as 308 redirect without URL destruction (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 5: DELETE SOFT-DELETE (ARCHIVE)
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 5: Soft-Delete (Archive Lifecycle) ---');

  // 5.1 Soft-delete entity
  const deleteReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-senna-cassia', {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });
  const deleteRes = await adminKnowledgeByIdDELETE(deleteReq, {
    params: Promise.resolve({ id: 'ent-senna-cassia' }),
  });
  assert.strictEqual(deleteRes.status, 200);
  const deleteJson = await deleteRes.json();
  assert.strictEqual(deleteJson.success, true);
  assert.strictEqual(deleteJson.archived, true);
  assert.strictEqual(deleteJson.entity.dbStatus, 'archived');
  assert.strictEqual(deleteJson.entity.published, false);

  // Verify removed from public listing
  const pubAfterDelete = await getPublishedKnowledgeEntities();
  assert.strictEqual(
    pubAfterDelete.some((e) => e.entityKey === 'SENNA'),
    false,
    'Archived entity must be removed from public storefront listing'
  );

  // Verify still exists in admin listing
  const adminListAfterDelete = await adminKnowledgeGET(
    new NextRequest('http://localhost:3000/api/admin/knowledge', { headers: createAuthHeaders() })
  );
  const adminListAfterDeleteJson = await adminListAfterDelete.json();
  const archivedInAdmin = adminListAfterDeleteJson.entities.find((e: any) => e.entityKey === 'SENNA');
  assert.ok(archivedInAdmin, 'Archived entity must be retained in admin ledger for audit trail');
  assert.strictEqual(archivedInAdmin.dbStatus, 'archived');
  console.log('  ✓ Soft-delete successfully transitioned entity to status: archived, published: false (PASSED)');

  // 5.2 Attempt to delete UNKNOWN sentinel must fail
  const deleteUnknownReq = new NextRequest('http://localhost:3000/api/admin/knowledge/ent-unknown', {
    method: 'DELETE',
    headers: createAuthHeaders(),
  });
  const deleteUnknownRes = await adminKnowledgeByIdDELETE(deleteUnknownReq, {
    params: Promise.resolve({ id: 'ent-unknown' }),
  });
  assert.strictEqual(deleteUnknownRes.status, 400, 'Deleting UNKNOWN sentinel must return 400');
  console.log('  ✓ UNKNOWN sentinel protected against deletion/archival (PASSED)');

  // --------------------------------------------------------------------------
  // SUITE 6: REVALIDATION PATH GENERATION
  // --------------------------------------------------------------------------
  console.log('\n--- SUITE 6: Revalidation Surface Safety ---');
  await assert.doesNotReject(async () => {
    await revalidateKnowledgeSurfaces(['henna-mehndi', 'indigo', 'senna-botanical-powder']);
  }, 'revalidateKnowledgeSurfaces must execute gracefully without throwing in any environment');
  console.log('  ✓ Revalidation surface runner executed safely with zero exceptions (PASSED)');

  console.log('\n===============================================================');
  console.log('ALL PHASE 2 STEP 2C KNOWLEDGE ADMIN API TESTS PASSED! (6/6)');
  console.log('===============================================================');
}

runKnowledgeAdminApiTests().catch((err) => {
  console.error('\n❌ KNOWLEDGE ADMIN API TEST SUITE FAILED:', err);
  process.exit(1);
});
