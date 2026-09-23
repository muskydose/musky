/**
 * FINAL SECURITY VERIFICATION — analytics_events RLS + Migration 013
 * Uses project's own Supabase clients, no external dotenv dependency.
 * READ ONLY — does not modify any source code or tests.
 */
import fs from 'fs';
import path from 'path';

// ── Parse .env.local without external deps ───────────────────────────────────
try {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx > 0) {
        const key = trimmed.substring(0, idx).trim();
        let val = trimmed.substring(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch (e) {
  console.error('Error reading .env.local:', e);
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('ABORT: Missing Supabase env vars in .env.local');
  process.exit(1);
}

const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

let passed = 0;
let failed = 0;
const results: string[] = [];

function pass(label: string, evidence: string) {
  console.log(`  [PASS] ${label}`);
  console.log(`         ${evidence}`);
  results.push(`PASS | ${label}`);
  passed++;
}

function fail(label: string, evidence: string) {
  console.log(`  [FAIL] ${label}`);
  console.log(`         ${evidence}`);
  results.push(`FAIL | ${label}`);
  failed++;
}

function info(msg: string) {
  console.log(`  [INFO] ${msg}`);
}

async function main() {
  console.log('\n============================================================');
  console.log('  MUSKY DOSE — FINAL SECURITY VERIFICATION');
  console.log('  analytics_events RLS | Migration 013 | Ingestion Path');
  console.log('============================================================\n');

  // TEST 1: service_role table access
  console.log('[TEST 1] service_role table access (table exists + not broken for admin)');
  const { count: svcCount, error: svcCountErr } = await service
    .from('analytics_events')
    .select('*', { count: 'exact', head: true });

  if (svcCountErr) {
    fail('service_role can access analytics_events', `ERROR ${svcCountErr.code}: ${svcCountErr.message}`);
  } else {
    pass('service_role can access analytics_events', `Table accessible, count=${svcCount ?? '>=0'}. RLS not blocking service_role.`);
  }

  // TEST 2: anon SELECT — must return 0 rows
  console.log('\n[TEST 2] anon SELECT — must be denied by RLS');
  const { data: anonRows, error: anonSelErr } = await anon
    .from('analytics_events')
    .select('id, event_name')
    .limit(10);

  if (anonSelErr) {
    pass('anon SELECT denied by RLS', `DB error code=${anonSelErr.code} — ${anonSelErr.message}`);
  } else if (Array.isArray(anonRows) && anonRows.length === 0) {
    pass('anon SELECT returns 0 rows (RLS enforced)', `Empty result — no rows visible to anon role.`);
  } else {
    fail('anon SELECT SHOULD be denied', `Returned ${anonRows?.length} rows — RLS may not be applied!`);
  }

  // TEST 3: anon UPDATE — must affect 0 rows or error
  console.log('\n[TEST 3] anon UPDATE — must be denied by RLS');
  const { data: anonUpd, error: anonUpdErr } = await anon
    .from('analytics_events')
    .update({ event_name: 'rls-tamper-attempt' })
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');

  if (anonUpdErr) {
    pass('anon UPDATE denied by RLS', `DB error code=${anonUpdErr.code} — ${anonUpdErr.message}`);
  } else if (!Array.isArray(anonUpd) || anonUpd.length === 0) {
    pass('anon UPDATE affects 0 rows (RLS enforced)', `No rows updated — anon has no UPDATE visibility.`);
  } else {
    fail('anon UPDATE SHOULD be denied', `Updated ${anonUpd.length} rows — CRITICAL: RLS not protecting UPDATE!`);
  }

  // TEST 4: anon DELETE — must affect 0 rows or error
  console.log('\n[TEST 4] anon DELETE — must be denied by RLS');
  const { data: anonDel, error: anonDelErr } = await anon
    .from('analytics_events')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id');

  if (anonDelErr) {
    pass('anon DELETE denied by RLS', `DB error code=${anonDelErr.code} — ${anonDelErr.message}`);
  } else if (!Array.isArray(anonDel) || anonDel.length === 0) {
    pass('anon DELETE affects 0 rows (RLS enforced)', `No rows deleted — anon has no DELETE visibility.`);
  } else {
    fail('anon DELETE SHOULD be denied', `Deleted ${anonDel.length} rows — CRITICAL: RLS not protecting DELETE!`);
  }

  // TEST 5: anon INSERT — document actual behavior per migration 013 design
  console.log('\n[TEST 5] anon INSERT — documenting per migration 013 design intent');
  const anonProbeId = `anon-probe-${Date.now()}`;
  const { error: anonInsErr } = await anon
    .from('analytics_events')
    .insert([{
      event_name: 'security_anon_probe',
      session_id: anonProbeId,
      pathname: '/verify-rls-test',
      created_at: new Date().toISOString(),
      result_count: 0,
      quantity: 1,
      value: 0,
      metadata: { source: 'security-verification' },
    }]);

  if (anonInsErr === null) {
    // Cleanup probe row
    const { error: cleanupErr } = await service
      .from('analytics_events')
      .delete()
      .eq('session_id', anonProbeId);

    info(`anon INSERT: ALLOWED — migration 013 policy "Allow public event ingestion" FOR INSERT WITH CHECK (true)`);
    info(`This is INTENTIONAL per migration 013 design.`);
    info(`App-layer /api/analytics/events enforces: event allowlist, rate limiting, input validation.`);
    info(`Direct anon INSERT: no SELECT readback possible (TEST 2 confirmed). Data is write-only for anon.`);
    info(`Cleanup: ${cleanupErr ? 'FAILED — ' + cleanupErr.message : 'OK — probe row deleted.'}`);
    passed++;
  } else {
    pass('anon INSERT DENIED (stricter than migration 013 minimum)', `code=${anonInsErr.code} — ${anonInsErr.message}`);
  }

  // TEST 6: service_role INSERT — actual ingestion path in saveAnalyticsEvent()
  console.log('\n[TEST 6] service_role INSERT — actual server-side ingestion path (saveAnalyticsEvent)');
  const svcProbeId = `svc-probe-${Date.now()}`;
  const { error: svcInsErr } = await service
    .from('analytics_events')
    .insert([{
      event_name: 'security_service_probe',
      session_id: svcProbeId,
      pathname: '/verify-rls-test',
      created_at: new Date().toISOString(),
      result_count: 0,
      quantity: 1,
      value: 0,
      metadata: { source: 'security-verification', ingestion: 'service_role' },
    }]);

  if (svcInsErr) {
    fail('service_role INSERT (ingestion path)', `ERROR ${svcInsErr.code}: ${svcInsErr.message}`);
  } else {
    pass('service_role INSERT succeeds', `session_id=${svcProbeId} — same path as saveAnalyticsEvent() in analytics-db.ts line 58.`);
  }

  // TEST 7: service_role SELECT readback
  console.log('\n[TEST 7] service_role SELECT — reads back inserted probe row');
  const { data: svcRead, error: svcReadErr } = await service
    .from('analytics_events')
    .select('session_id, event_name, metadata')
    .eq('session_id', svcProbeId)
    .limit(1);

  if (svcReadErr) {
    fail('service_role SELECT readback', `ERROR ${svcReadErr.code}: ${svcReadErr.message}`);
  } else if (Array.isArray(svcRead) && svcRead.length === 1) {
    pass('service_role SELECT readback confirmed', `event_name=${svcRead[0].event_name}, session_id=${svcRead[0].session_id}`);
  } else {
    fail('service_role SELECT readback', `Expected 1 row, got ${svcRead?.length ?? 0}`);
  }

  // TEST 8: service_role DELETE (cleanup)
  console.log('\n[TEST 8] service_role DELETE — cleanup probe row');
  const { error: svcCleanErr } = await service
    .from('analytics_events')
    .delete()
    .eq('session_id', svcProbeId);

  if (svcCleanErr) {
    fail('service_role DELETE (cleanup)', `ERROR ${svcCleanErr.code}: ${svcCleanErr.message}`);
  } else {
    pass('service_role DELETE succeeds', `Probe row removed. No test data remains in analytics_events.`);
  }

  // TEST 9: Regression — anon SELECT still blocked after all operations
  console.log('\n[TEST 9] Regression: anon SELECT still returns 0 rows after operations');
  const { data: regrRows, error: regrErr } = await anon
    .from('analytics_events')
    .select('id')
    .limit(5);

  if (regrErr) {
    pass('anon SELECT post-operations still denied', `code=${regrErr.code}`);
  } else if (Array.isArray(regrRows) && regrRows.length === 0) {
    pass('anon SELECT post-operations returns 0 rows', `RLS stable — no data leakage after INSERT/DELETE cycle.`);
  } else {
    fail('REGRESSION: anon can SELECT rows', `Returned ${regrRows?.length} rows — data exposed!`);
  }

  // SUMMARY
  console.log('\n============================================================');
  console.log(`  RESULT: ${passed} passed / ${failed} failed`);
  if (failed === 0) {
    console.log('  ALL SECURITY CHECKS PASSED');
    console.log('  analytics_events RLS is correctly configured.');
    console.log('  Migration 013 behavior verified in live Supabase.');
  } else {
    console.log('  SECURITY FAILURES DETECTED');
  }
  console.log('============================================================\n');

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\nVerification script crashed:', err.message);
  process.exit(1);
});
