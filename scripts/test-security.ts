import { requireAdminAuthAndCsrf } from '../lib/admin-middleware';
import { createAdminSessionToken, verifyAdminSessionToken } from '../lib/auth';
import { sanitizePublicError, sanitizeAdminError } from '../lib/api-errors';
import { NextRequest } from 'next/server';

console.log("=== RUNNING SECURITY HARDENING VERIFICATION TESTS ===");

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) {
    console.log(`[PASS] ${name}`);
    passed++;
  } else {
    console.error(`[FAIL] ${name}`);
    failed++;
  }
}

// 1. Unauthenticated Admin Rejection
const req1 = new NextRequest('http://localhost:3000/api/admin/products');
const unauthResult = requireAdminAuthAndCsrf(req1);
assert(unauthResult.authenticated === false, "Unauthenticated admin request returns authenticated: false");
assert(unauthResult.errorResponse?.status === 401, "Unauthenticated admin request returns HTTP 401");

// 2. Token Creation & Verification
process.env.ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "test-secret-key-32-chars-long-security";
const testToken = createAdminSessionToken("admin@muskydose.in");
assert(verifyAdminSessionToken(testToken) === true, "Valid admin session token verifies successfully");
assert(verifyAdminSessionToken("invalid.token.string") === false, "Forged/tampered session token is rejected");

// 3. Authenticated Admin Session
const req2 = new NextRequest('http://localhost:3000/api/admin/products', {
  headers: {
    cookie: `md_admin_auth=${testToken}`,
    host: 'localhost:3000',
    origin: 'http://localhost:3000'
  }
});
const authResult = requireAdminAuthAndCsrf(req2);
assert(authResult.authenticated === true, "Authenticated admin session is accepted");

// 4. CSRF / Origin Mismatch Rejection on Mutations (POST)
const req3 = new NextRequest('http://localhost:3000/api/admin/products', {
  method: 'POST',
  headers: {
    cookie: `md_admin_auth=${testToken}`,
    host: 'muskydose.in',
    origin: 'https://evil-attacker.com'
  }
});
const csrfResult = requireAdminAuthAndCsrf(req3);
assert(csrfResult.authenticated === false, "CSRF / Origin mismatch rejects mutation");
assert(csrfResult.errorResponse?.status === 403, "CSRF / Origin mismatch returns HTTP 403");

// 5. Error Sanitization (Zero sensitive leakages)
const sensitiveError = new Error("syntax error at or near 'SELECT' in postgres relation admin_users unique constraint PGRST200");
const publicRes = sanitizePublicError(sensitiveError);
assert(publicRes.status === 500, "Sanitized public error returns 500");

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
