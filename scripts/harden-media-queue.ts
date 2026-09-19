/**
 * MUSKY DOSE — MEDIA QUEUE AUDIT & HARDENING SCRIPT
 * 
 * Safely audits all active/pending media_jobs in the live database:
 * - Reclaims stale IN_PROGRESS leases
 * - Evaluates entity existence in live tables
 * - Safely transitions test/demo/invalid entity jobs to BLOCKED
 * - Preserves all rows for auditability (zero deletions)
 * - Leaves real catalog product jobs untouched and ready
 */

import fs from 'fs';
import path from 'path';

// 1. Safe Environment Loader
if (fs.existsSync('.env.local')) {
  const envContent = fs.readFileSync('.env.local', 'utf8');
  envContent.split('\n').forEach((line) => {
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

import { auditAndHardenMediaJobsQueue } from '../lib/growth/media-jobs-engine';
import { getSupabaseAdmin } from '../lib/supabase';

async function main() {
  console.log('===============================================================');
  console.log('MUSKY DOSE — MEDIA QUEUE AUDIT & HARDENING');
  console.log('===============================================================');

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error('❌ Supabase admin client unavailable.');
    process.exit(1);
  }

  // Initial count of media_assets to prove zero deletions
  const { count: initialAssetCount } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact', head: true });

  console.log(`Live media_assets count before audit: ${initialAssetCount}`);

  console.log('Scanning media_jobs queue and evaluating eligibility...');
  const result = await auditAndHardenMediaJobsQueue();

  console.log('\n--- AUDIT SUMMARY ---');
  console.log(`Total jobs scanned:         ${result.scanned}`);
  console.log(`Total jobs blocked:         ${result.blocked}`);
  console.log(`Stale leases reclaimed:     ${result.reclaimedStale}`);
  console.log(`Preserved eligible jobs:    ${result.preservedEligible}`);

  if (result.details.length > 0) {
    console.log('\n--- BLOCKED JOBS BREAKDOWN ---');
    const reasonGroups: Record<string, number> = {};
    const entityGroups: Record<string, number> = {};
    for (const d of result.details) {
      reasonGroups[d.reason] = (reasonGroups[d.reason] || 0) + 1;
      entityGroups[d.entityId] = (entityGroups[d.entityId] || 0) + 1;
    }
    console.log('By Entity:', entityGroups);
    console.log('By Reason:', reasonGroups);
  }

  // Verify asset count post-audit
  const { count: finalAssetCount } = await supabase
    .from('media_assets')
    .select('*', { count: 'exact', head: true });

  console.log(`\nLive media_assets count after audit:  ${finalAssetCount}`);
  if (initialAssetCount === finalAssetCount) {
    console.log('✅ Zero media assets deleted. Total count preserved exactly.');
  } else {
    console.error(`⚠️ Asset count changed from ${initialAssetCount} to ${finalAssetCount}!`);
  }

  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});

