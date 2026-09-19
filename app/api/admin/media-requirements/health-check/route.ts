import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { scanAndRepairBrokenMedia } from '@/lib/growth/media-health-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const summary = await scanAndRepairBrokenMedia();
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to run media health scan.');
  }
}

