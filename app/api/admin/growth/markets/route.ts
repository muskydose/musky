import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMarketMetrics } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const metrics = await getMarketMetrics();
    return NextResponse.json({ success: true, markets: metrics });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch growth market metrics.');
  }
}
