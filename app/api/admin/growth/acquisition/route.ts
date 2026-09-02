import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { getProducts } from '@/lib/db/products';
import { getPublishedGuides } from '@/lib/db/guides';
import { getAllLeads } from '@/lib/growth/lead-engine';
import {
  evaluateProductAcquisitionReadiness,
  evaluateAcquisitionOpportunities,
  getAcquisitionDashboardMetrics,
} from '@/lib/growth/acquisition-engine';
import { getMerchantFeedHealthSummary } from '@/lib/growth/merchant-feed-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
    const [products, guides] = await Promise.all([getProducts(), getPublishedGuides()]);
    const leads = getAllLeads();

    const readinessList = products
      .filter((p) => p.isActive !== false)
      .map((p) => {
        const hasGuide = guides.some(
          (g) => g.productId === p.id || (g.title && g.title.toLowerCase().includes(p.name.toLowerCase()))
        );
        return evaluateProductAcquisitionReadiness(p, baseUrl, hasGuide);
      });

    const feedSummary = getMerchantFeedHealthSummary(products, baseUrl);
    const metrics = getAcquisitionDashboardMetrics(products, readinessList, leads);
    const opportunities = evaluateAcquisitionOpportunities(products, readinessList, leads);

    return NextResponse.json({
      success: true,
      metrics,
      readinessList,
      feedSummary,
      opportunities,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/growth/acquisition] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to calculate acquisition metrics' },
      { status: 500 }
    );
  }
}

