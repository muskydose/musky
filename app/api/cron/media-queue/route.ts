import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { sanitizeAdminError } from '@/lib/api-errors';
import { processPendingMediaJobs } from '@/lib/growth/media-queue-consumer';

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
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
      if (!authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      const token = authHeader.substring(7).trim();
      if (!secureCompare(token, cronSecret)) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
    }

    const summary = await processPendingMediaJobs({
      limit: 5,
      workerId: 'cron-media-queue',
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Media queue cron failed.');
  }
}
