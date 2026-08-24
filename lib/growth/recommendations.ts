import { GrowthRecommendation } from './types';
import { getMarketMetrics, getLeads, getRecommendations, saveRecommendation } from './growth-db';
import { getOrders } from '@/lib/db/orders';
import { getWholesaleEnquiries } from '@/lib/db/wholesale';

export async function generateGrowthRecommendations(): Promise<GrowthRecommendation[]> {
  const metrics = await getMarketMetrics();
  const leads = await getLeads();
  const orders = await getOrders();
  const wholesale = await getWholesaleEnquiries();

  const generated: GrowthRecommendation[] = [];

  // Rule 1: High Demand Market Expansion
  const topMarket = metrics.sort((a, b) => b.revenue - a.revenue)[0];
  if (topMarket && topMarket.revenue > 0) {
    generated.push({
      id: `rec_expand_${topMarket.marketId}`,
      title: `Prioritize Growth in ${topMarket.marketName}`,
      priority: 'HIGH',
      reason: `${topMarket.marketName} is your leading market with ₹${topMarket.revenue.toLocaleString()} in revenue across ${topMarket.ordersCount} verified order(s). Concentrating local promotion or wholesale contacts here yields highest ROI.`,
      supportingMetrics: [
        { label: 'Total Revenue', value: `₹${topMarket.revenue.toLocaleString()}`, sourceTier: 'VERIFIED' },
        { label: 'Verified Orders', value: topMarket.ordersCount, sourceTier: 'VERIFIED' },
        { label: 'Market Opportunity Score', value: `${topMarket.marketOpportunityScore}/100`, sourceTier: 'DERIVED' },
      ],
      dataSources: ['Musky Dose Store Orders'],
      recommendedActions: [
        {
          type: 'VIEW_MARKET',
          label: `Analyze ${topMarket.marketName} Market`,
          link: `/admin/growth/markets/${topMarket.marketId}`,
        },
        {
          type: 'CREATE_CAMPAIGN',
          label: 'Configure Regional Offer Campaign',
          link: '/admin/offers',
        },
      ],
      confidence: topMarket.ordersCount >= 5 ? 'HIGH' : 'MEDIUM',
      status: 'New',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Rule 2: Wholesale Opportunities Backlog
  const pendingLeads = leads.filter((l) => l.status === 'New');
  if (pendingLeads.length > 0 || wholesale.length > 0) {
    const leadCount = pendingLeads.length || wholesale.length;
    generated.push({
      id: 'rec_wholesale_followup',
      title: `Follow Up on ${leadCount} New Wholesale Enquiries`,
      priority: 'CRITICAL',
      reason: `There are ${leadCount} uncontacted wholesale lead(s). Prompt WhatsApp follow-up increases wholesale conversion rates significantly.`,
      supportingMetrics: [
        { label: 'New Wholesale Enquiries', value: leadCount, sourceTier: 'VERIFIED' },
      ],
      dataSources: ['Wholesale Enquiries', 'Growth CRM Leads'],
      recommendedActions: [
        {
          type: 'CREATE_LEAD',
          label: 'View Pending Leads in CRM',
          link: '/admin/growth/leads',
        },
      ],
      confidence: 'HIGH',
      status: 'New',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Rule 3: Insufficient Data Alert
  if (metrics.length === 0 || orders.length === 0) {
    generated.push({
      id: 'rec_insufficient_data',
      title: 'Import Verified Regional Market Data',
      priority: 'MEDIUM',
      reason: 'Your Growth Intelligence engine has limited historical order records. Importing verified market leads or campaign results will increase recommendation accuracy.',
      supportingMetrics: [
        { label: 'Verified Order Records', value: orders.length, sourceTier: 'VERIFIED' },
      ],
      dataSources: ['FirstPartyData'],
      recommendedActions: [
        {
          type: 'EXPORT_DATA',
          label: 'Import CSV Market Data',
          link: '/admin/growth/imports',
        },
      ],
      confidence: 'HIGH',
      status: 'New',
      generatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  for (const rec of generated) {
    await saveRecommendation(rec);
  }

  return getRecommendations();
}
