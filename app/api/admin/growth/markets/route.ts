import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMarketMetrics } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const metrics = await getMarketMetrics();
    return NextResponse.json({ success: true, markets: metrics });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch growth market metrics.');
  }
}
