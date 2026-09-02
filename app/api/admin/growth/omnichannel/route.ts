import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { getProducts } from '@/lib/db/products';
import { getAllLeads } from '@/lib/growth/lead-engine';
import {
  generateProductOmnichannelLaunch,
  generateSocialContentQueue,
  getOmnichannelChannelPerformance,
  getOmnichannelDashboardMetrics,
  evaluateOmnichannelOpportunities,
  calculateChannelOpportunityScore,
} from '@/lib/growth/omnichannel-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
    const products = await getProducts();
    const leads = getAllLeads();

    const metrics = getOmnichannelDashboardMetrics(products, leads);
    const opportunities = evaluateOmnichannelOpportunities(products, leads);

    const launchPackages = products
      .filter((p) => p.isActive !== false)
      .slice(0, 10)
      .map((p) => generateProductOmnichannelLaunch(p, baseUrl));

    const channelScores = [
      { channel: 'WHATSAPP' as const, label: 'WhatsApp Direct', ...calculateChannelOpportunityScore('WHATSAPP', leads) },
      { channel: 'GOOGLE_ORGANIC' as const, label: 'Google Organic Search', ...calculateChannelOpportunityScore('GOOGLE_ORGANIC', leads) },
      { channel: 'GOOGLE_MERCHANT' as const, label: 'Google Merchant Free Listings', ...calculateChannelOpportunityScore('GOOGLE_MERCHANT', leads) },
      { channel: 'INSTAGRAM' as const, label: 'Instagram (Reels & Posts)', ...calculateChannelOpportunityScore('INSTAGRAM', leads) },
      { channel: 'YOUTUBE' as const, label: 'YouTube (Shorts & Video)', ...calculateChannelOpportunityScore('YOUTUBE', leads) },
      { channel: 'FACEBOOK' as const, label: 'Facebook Page', ...calculateChannelOpportunityScore('FACEBOOK', leads) },
      { channel: 'GOOGLE_BUSINESS' as const, label: 'Google Business Profile', ...calculateChannelOpportunityScore('GOOGLE_BUSINESS', leads) },
    ];

    return NextResponse.json({
      success: true,
      metrics,
      opportunities,
      launchPackages,
      channelScores,
    });
  } catch (error: any) {
    console.error('[GET /api/admin/growth/omnichannel] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch omnichannel metrics' },
      { status: 500 }
    );
  }
}

