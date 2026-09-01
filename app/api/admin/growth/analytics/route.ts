import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import {
  getProductMarketMatrix,
  getProductPerformance,
  getCampaignAnalytics,
  getDataQualityAudit,
} from '@/lib/growth/analytics';
import {
  getFunnelOverview,
  getProductConversionFunnel,
  getSearchInsights,
  getWhatsAppFunnelStats,
} from '@/lib/db/analytics-db';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'all';
    const days = Math.max(1, Math.min(365, parseInt(searchParams.get('days') || '30', 10)));

    let matrix = null;
    let products = null;
    let campaigns = null;
    let audit = null;
    let funnel = null;
    let productFunnel = null;
    let searchInsights = null;
    let whatsappStats = null;

    if (view === 'funnel' || view === 'all') {
      funnel = await getFunnelOverview(days);
      productFunnel = await getProductConversionFunnel(days);
      searchInsights = await getSearchInsights(days);
      whatsappStats = await getWhatsAppFunnelStats(days);
    }

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
      periodDays: days,
      funnel,
      productFunnel,
      searchInsights,
      whatsappStats,
      matrix,
      products,
      campaigns,
      audit,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch analytics data.');
  }
}
