import fs from 'fs';
import path from 'path';
import {
  MediaAsset,
  getAllMediaAssetsRaw,
  updateMediaAsset,
  resetMediaCache,
} from '@/lib/db/media';
import { enqueueMediaJob } from '@/lib/growth/media-jobs-engine';

export interface MediaUrlHealthCheckResult {
  isHealthy: boolean;
  statusCode?: number;
  error?: string;
  contentType?: string;
}

/**
 * Checks whether an image URL actually resolves to an accessible 200 OK image binary.
 */
export async function verifyMediaAssetUrlHealth(url: string): Promise<MediaUrlHealthCheckResult> {
  if (!url || typeof url !== 'string') {
    return { isHealthy: false, error: 'Empty or invalid URL string' };
  }

  const cleanUrl = url.trim();

  // 1. Local static assets in public/
  if (cleanUrl.startsWith('/')) {
    const localPath = path.join(process.cwd(), 'public', cleanUrl.replace(/^\//, ''));
    if (fs.existsSync(localPath)) {
      try {
        const stat = fs.statSync(localPath);
        if (stat.size > 0) {
          return { isHealthy: true, statusCode: 200, contentType: 'image/local' };
        }
      } catch (err: any) {
        return { isHealthy: false, error: err.message };
      }
    }
    return { isHealthy: false, statusCode: 404, error: `Local file not found at ${localPath}` };
  }

  // 2. Remote URLs (Supabase Storage or CDN)
  if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      // Perform HEAD request first
      let res = await fetch(cleanUrl, {
        method: 'HEAD',
        signal: controller.signal,
      });

      // If HEAD returns 405 Method Not Allowed, retry with GET range 0-100 bytes
      if (res.status === 405) {
        res = await fetch(cleanUrl, {
          method: 'GET',
          headers: { Range: 'bytes=0-100' },
          signal: controller.signal,
        });
      }

      clearTimeout(timeout);

      const contentType = res.headers.get('content-type') || '';
      const isHealthy = res.ok && (contentType.includes('image/') || contentType.includes('octet-stream'));

      return {
        isHealthy,
        statusCode: res.status,
        contentType,
        error: !isHealthy ? `HTTP ${res.status} or invalid content-type (${contentType})` : undefined,
      };
    } catch (fetchErr: any) {
      return { isHealthy: false, error: fetchErr.name === 'AbortError' ? 'Request timed out' : fetchErr.message };
    }
  }

  return { isHealthy: false, error: `Unrecognized URL format: ${cleanUrl}` };
}

/**
 * Scans active approved assets, verifies reachability, marks broken assets UNHEALTHY,
 * and enqueues self-healing repair tasks in the Master Agent queue.
 */
export async function scanAndRepairBrokenMedia(): Promise<{
  totalChecked: number;
  healthyCount: number;
  brokenCount: number;
  repairedJobsEnqueued: number;
  brokenAssets: Array<{ id: string; url: string; error?: string }>;
}> {
  const { assets } = await getAllMediaAssetsRaw();
  const activeAssets = assets.filter((a) => a.status === 'approved');

  let healthyCount = 0;
  let brokenCount = 0;
  let repairedJobsEnqueued = 0;
  const brokenAssets: Array<{ id: string; url: string; error?: string }> = [];

  for (const asset of activeAssets) {
    const check = await verifyMediaAssetUrlHealth(asset.url);
    if (check.isHealthy) {
      healthyCount++;
      if (asset.healthStatus === 'UNHEALTHY') {
        await updateMediaAsset(asset.id, { healthStatus: 'HEALTHY' });
      }
    } else {
      brokenCount++;
      brokenAssets.push({ id: asset.id, url: asset.url, error: check.error });

      // Mark unhealthy without immediately deleting the record
      const res = await markMediaAssetUnhealthy(asset, check.error);
      if (res.jobEnqueued) {
        repairedJobsEnqueued++;
      }
    }
  }

  if (brokenCount > 0) {
    resetMediaCache();
  }

  return {
    totalChecked: activeAssets.length,
    healthyCount,
    brokenCount,
    repairedJobsEnqueued,
    brokenAssets,
  };
}

/**
 * Marks a specific asset UNHEALTHY and enqueues a repair job without deleting it.
 */
export async function markMediaAssetUnhealthy(
  asset: MediaAsset,
  errorReason?: string
): Promise<{ markedUnhealthy: boolean; jobEnqueued: boolean; repairedAsset: MediaAsset }> {
  const updated = await updateMediaAsset(asset.id, {
    healthStatus: 'UNHEALTHY',
    visualContext: {
      ...(asset.visualContext || {}),
      unhealthyIncidentAt: new Date().toISOString(),
      unhealthyError: errorReason,
    },
  });

  let jobEnqueued = false;
  if (asset.entityId) {
    const enqueueRes = await enqueueMediaJob({
      entityType: asset.entityType,
      entityId: asset.entityId,
      slotKey: asset.slotKey || asset.role,
      strategy: asset.source === 'MANUAL_UPLOAD' ? 'MANUAL_REQUIRED' : 'AI',
      priority: 'P0', // Urgent repair
      blueprintPrompt: `Repair broken visual asset for ${asset.entityType} ${asset.entityId}. Previous URL returned ${errorReason}.`,
    });

    jobEnqueued = enqueueRes.wasCreated;
  }

  return {
    markedUnhealthy: true,
    jobEnqueued,
    repairedAsset: updated || { ...asset, healthStatus: 'UNHEALTHY' },
  };
}

