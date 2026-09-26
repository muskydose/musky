// ============================================================================
// MUSKY DOSE — CANONICAL DURABLE QUEUE DRAINER
// Universal Background & Maintenance Lane Execution Heartbeat
// Mandatory: Authorization: Bearer <CRON_SECRET> (Strict fail-closed)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { CentralExecutionQueue } from '@/lib/agent/central-queue';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds bounded execution limit

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Mandatory Authorization Header Check (Strictly fail-closed)
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <token>',
        },
        { status: 401 }
      );
    }

    const bearerToken = authHeader.substring(7).trim();
    if (!bearerToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Empty Bearer token.',
        },
        { status: 401 }
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: CRON_SECRET is not configured on server.',
        },
        { status: 401 }
      );
    }

    if (!secureCompare(bearerToken, cronSecret)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid Bearer token.',
        },
        { status: 401 }
      );
    }

    const queue = CentralExecutionQueue.getInstance();

    // 2. Reclaim expired task leases (worker / serverless crash recovery)
    const reclaimed = await queue.reclaimStuckTasks();

    // 3. Process bounded batch from BACKGROUND lane (up to 25s budget)
    const backgroundSummaries = await queue.processBackgroundLane({
      timeLimitMs: 25000,
      maxBatch: 5,
    });

    // 4. Process bounded batch from MAINTENANCE lane (up to 20s budget)
    const maintenanceSummaries = await queue.processMaintenanceLane({
      timeLimitMs: 20000,
    });

    // 5. Gather queue telemetry
    const queueStatus = queue.getStatus();

    return NextResponse.json({
      success: true,
      service: 'musky-dose-queue-drainer',
      timestamp: new Date().toISOString(),
      reclaimedCount: reclaimed.length,
      backgroundExecuted: backgroundSummaries.length,
      maintenanceExecuted: maintenanceSummaries.length,
      queueStatus,
      telemetry: {
        background: backgroundSummaries,
        maintenance: maintenanceSummaries,
      },
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/drain-queue');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
