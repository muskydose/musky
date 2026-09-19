import React from 'react';
import { getAllMediaAssetsRaw } from '@/lib/db/media';
import { getSupabaseAdmin } from '@/lib/supabase';
import { getPendingMediaJobs } from '@/lib/growth/media-jobs-engine';
import { processPendingMediaJobs } from '@/lib/growth/media-queue-consumer';
import MediaLibraryClient from './MediaLibraryClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'All Media Assets — Musky Dose Admin',
  description: 'Complete canonical media library and universal media queue control center.',
};

export default async function AdminMediaPage() {
  // Execute a tiny safe batch whenever the admin library is opened.
  // This makes durable PENDING jobs observable without weakening cron/manual processing.
  await processPendingMediaJobs({ limit: 1, workerId: 'admin-media-page' }).catch(() => null);

  const [{ assets }, pending] = await Promise.all([
    getAllMediaAssetsRaw(),
    getPendingMediaJobs(500, { filterEligible: false }),
  ]);

  const queueSummary = {
    pending: pending.filter((j) => j.status === 'PENDING').length,
    waitingProvider: pending.filter((j) => j.status === 'WAITING_PROVIDER').length,
    completed: 0,
    failed: 0,
    blocked: 0,
  };

  const supabase = getSupabaseAdmin();
  if (supabase) {
    const { data } = await supabase
      .from('media_jobs')
      .select('status')
      .in('status', ['COMPLETED', 'FAILED', 'BLOCKED'])
      .limit(1000);

    for (const row of data || []) {
      if (row.status === 'COMPLETED') queueSummary.completed++;
      else if (row.status === 'FAILED') queueSummary.failed++;
      else if (row.status === 'BLOCKED') queueSummary.blocked++;
    }
  }

  return <MediaLibraryClient initialAssets={assets} queueSummary={queueSummary} />;
}
