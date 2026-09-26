import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <token>' },
        { status: 401 }
      );
    }

    const bearerToken = authHeader.substring(7).trim();
    if (!bearerToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Empty Bearer token.' },
        { status: 401 }
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: CRON_SECRET is not configured on server.' },
        { status: 401 }
      );
    }

    if (!secureCompare(bearerToken, cronSecret)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid CRON_SECRET token' },
        { status: 401 }
      );
    }

    // Dispatch through Central Execution Queue (Enqueue-only)
    const dateMinuteKey = new Date().toISOString().slice(0, 16);
    const queue = (await import('@/lib/agent/central-queue')).CentralExecutionQueue.getInstance();
    const task = await queue.enqueue({
      domain: 'MEDIA',
      action: 'PROCESS_MEDIA_QUEUE_BATCH',
      lane: 'BACKGROUND',
      worker: 'media_visual',
      priority: 85,
      idempotencyKey: `cron-media-queue-${dateMinuteKey}`,
      title: 'Scheduled Autonomous Media Queue Consumer',
    });

    return NextResponse.json({
      success: true,
      service: 'musky-dose-media-queue',
      timestamp: new Date().toISOString(),
      dispatched: true,
      task: {
        id: task.id,
        status: task.status,
        lane: task.lane,
        worker: task.worker,
        title: task.title,
      },
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Media queue cron failed.');
  }
}
