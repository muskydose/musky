import fs from 'fs';
import path from 'path';

// Safe Environment Loader
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

import { runMediaMigration } from '../lib/growth/media-migration-engine';

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  console.log('===============================================================');
  console.log(`RUNNING UNIVERSAL MEDIA MIGRATION & CATALOG BACKFILL (${dryRun ? 'DRY-RUN' : 'LIVE'})`);
  console.log('===============================================================');

  const metrics = await runMediaMigration({ dryRun });

  console.log('\n--- MIGRATION RESULTS ---');
  console.log('Entities Scanned:');
  console.log(`  - Products:           ${metrics.entityCounts.products}`);
  console.log(`  - Categories:         ${metrics.entityCounts.categories}`);
  console.log(`  - Guides:             ${metrics.entityCounts.guides}`);
  console.log(`  - Knowledge Entities: ${metrics.entityCounts.knowledgeEntities}`);
  console.log(`  - Site Settings:      ${metrics.entityCounts.siteSettings}`);
  console.log(`\nSource Records Processed: ${metrics.sourceRecordsProcessed}`);
  console.log(`Media Assets Created:     ${metrics.mediaAssetsCreated}`);
  console.log(`Duplicates Deduplicated:   ${metrics.duplicatesDeduplicated}`);
  console.log(`Primary Assets Assigned:   ${metrics.primaryAssignedCount}`);
  console.log(`Orphan Assets Detected:   ${metrics.orphanAssetsDetected.length}`);
  if (metrics.orphanAssetsDetected.length > 0) {
    metrics.orphanAssetsDetected.forEach((o) => {
      console.log(`  - ${o.bucket}/${o.path} (${o.sizeBytes || 0} bytes)`);
    });
  }
  console.log(`Missing/Broken URLs:      ${metrics.missingOrBrokenUrls.length}`);
  if (metrics.missingOrBrokenUrls.length > 0) {
    metrics.missingOrBrokenUrls.forEach((m) => {
      console.log(`  - [${m.entityType} ${m.entityId || ''}] ${m.url}: ${m.reason}`);
    });
  }
  console.log(`\nExecution Time: ${metrics.durationMs}ms`);
  console.log('===============================================================');
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

