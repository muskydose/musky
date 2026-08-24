import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import {
  getProductMarketMatrix,
  getProductPerformance,
  getCampaignAnalytics,
  getDataQualityAudit,
} from '@/lib/growth/analytics';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
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
