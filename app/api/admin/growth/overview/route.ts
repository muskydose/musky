import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMarketMetrics, getLeads, getRecommendations, getDataSources } from '@/lib/growth/growth-db';
import { getOrdersForAnalytics, getCustomersAdmin } from '@/lib/db/orders';
import { getWholesaleEnquiries } from '@/lib/db/wholesale';
import { getDataQualityAudit } from '@/lib/growth/analytics';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    // Read stored metrics & records without blocking GET on external sync
    const metrics = await getMarketMetrics();
    const leads = await getLeads();
    const recommendations = await getRecommendations();
    const dataSources = await getDataSources();
    const orders = await getOrdersForAnalytics();
    const customers = await getCustomersAdmin();
    const wholesale = await getWholesaleEnquiries();
    const dataQuality = await getDataQualityAudit();

    const totalRevenue = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const newLeadsCount = leads.filter((l) => l.status === 'New').length + wholesale.length;
    
    // Top market by revenue
    const sortedMarkets = [...metrics].sort((a, b) => b.revenue - a.revenue);
    const topMarket = sortedMarkets[0] || null;

    // Highest Opportunity Market
    const highestOppMarket = [...metrics].sort((a, b) => b.marketOpportunityScore - a.marketOpportunityScore)[0] || null;

    return NextResponse.json({
      success: true,
      summary: {
        totalCustomers: customers.length,
        totalOrders: orders.length,
        totalRevenue,
        wholesaleLeadsCount: wholesale.length,
        newLeadsCount,
        topMarket: topMarket ? topMarket.marketName : 'No Verified Market Yet',
        highestOpportunityMarket: highestOppMarket ? `${highestOppMarket.marketName} (${highestOppMarket.marketOpportunityScore}/100)` : 'No Verified Market Yet',
      },
      marketMetrics: metrics,
      recommendations: recommendations.slice(0, 5),
      dataSources,
      dataQuality,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to retrieve Growth AI overview data.');
  }
}
