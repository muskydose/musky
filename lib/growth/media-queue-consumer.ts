import { getPendingMediaJobs, completeMediaJob } from '@/lib/growth/media-jobs-engine';
import { archiveDiagnosticMediaAssets } from '@/lib/db/media';
import { executeUniversalMediaJob } from '@/lib/growth/media-execution-engine';

export interface MediaQueueConsumerOptions {
  limit?: number;
  workerId?: string;
}

export interface MediaQueueConsumerResult {
  scanned: number;
  diagnosticsArchived: number;
  attempted: number;
  completed: number;
  waitingProvider: number;
  failed: number;
  blocked: number;
  inProgress: number;
  details: Array<{
    jobId: string;
    entityType: string;
    entityId: string;
    slotKey: string;
    beforeStatus: string;
    afterStatus: string;
    resultAssetId: string | null;
    errorMessage?: string;
  }>;
}

/**
 * Universal durable media queue consumer.
 * Every job is executed only through the authoritative Universal Media Execution Engine.
 */
export async function processPendingMediaJobs(
  options: MediaQueueConsumerOptions = {}
): Promise<MediaQueueConsumerResult> {
  const limit = Math.max(1, Math.min(options.limit ?? 3, 10));
  const workerId =
    options.workerId ||
    `media-queue-consumer-${process.env.VERCEL_REGION || 'server'}`;

  const diagnostics = await archiveDiagnosticMediaAssets();
  const jobs = await getPendingMediaJobs(limit, { filterEligible: true });

  const summary: MediaQueueConsumerResult = {
    scanned: jobs.length,
    diagnosticsArchived: diagnostics.archived,
    attempted: 0,
    completed: 0,
    waitingProvider: 0,
    failed: 0,
    blocked: 0,
    inProgress: 0,
    details: [],
  };

  for (const job of jobs) {
    const beforeStatus = job.status;
    summary.attempted += 1;

    try {
      const result = await executeUniversalMediaJob({
        jobId: job.id,
        entityType: job.entityType,
        entityId: job.entityId,
        slotKey: job.slotKey,
        role: job.role,
        strategy: job.strategy,
        provider: undefined,
        workerId,
      });

      if (result.status === 'COMPLETED') summary.completed += 1;
      else if (result.status === 'WAITING_PROVIDER') summary.waitingProvider += 1;
      else if (result.status === 'FAILED') summary.failed += 1;
      else if (result.status === 'BLOCKED') summary.blocked += 1;
      else if (result.status === 'IN_PROGRESS') summary.inProgress += 1;

      summary.details.push({
        jobId: result.jobId,
        entityType: result.entityType,
        entityId: result.entityId,
        slotKey: result.slotKey,
        beforeStatus,
        afterStatus: result.status,
        resultAssetId: result.resultAssetId || null,
        errorMessage: result.errorMessage,
      });
    } catch (error: any) {
      const message = error?.message || 'Unknown queue consumer error';
      await completeMediaJob({
        jobId: job.id,
        status: 'FAILED',
        errorMessage: message,
      });
      summary.failed += 1;
      summary.details.push({
        jobId: job.id,
        entityType: job.entityType,
        entityId: job.entityId,
        slotKey: job.slotKey,
        beforeStatus,
        afterStatus: 'FAILED',
        resultAssetId: null,
        errorMessage: message,
      });
    }
  }

  return summary;
}
