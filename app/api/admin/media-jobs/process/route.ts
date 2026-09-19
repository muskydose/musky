import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { processPendingMediaJobs } from '@/lib/growth/media-queue-consumer';

export const dynamic = 'force-dynamic';

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const body = await req.json().catch(() => ({}));
    const limit = Number.isFinite(Number(body?.limit))
      ? Math.max(1, Math.min(Number(body.limit), 5))
      : 1;

    const summary = await processPendingMediaJobs({
      limit,
      workerId: 'admin-media-queue',
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to process media queue.');
  }
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
      limit: 3,
      workerId: 'cron-media-queue',
    });

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to process media queue.');
  }
}
