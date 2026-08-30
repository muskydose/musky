import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import {
  getProductMarketMatrix,
  getProductPerformance,
  getCampaignAnalytics,
  getDataQualityAudit,
} from '@/lib/growth/analytics';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'all';

    let matrix = null;
    let products = null;
    let campaigns = null;
    let audit = null;

    if (view === 'matrix' || view === 'all') {
      matrix = await getProductMarketMatrix();
    }
    if (view === 'products' || view === 'all') {
      products = await getProductPerformance();
    }
    if (view === 'campaigns' || view === 'all') {
      campaigns = await getCampaignAnalytics();
    }
    if (view === 'audit' || view === 'all') {
      audit = await getDataQualityAudit();
    }

    return NextResponse.json({
      success: true,
      matrix,
      products,
      campaigns,
      audit,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch analytics data.');
  }
}
