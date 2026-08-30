import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMarketMetrics, getLeads, getKeywords } from '@/lib/growth/growth-db';
import { getOrdersForAnalytics } from '@/lib/db/orders';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id: marketId } = await params;
    const metrics = await getMarketMetrics();
    const market = metrics.find((m) => m.marketId === marketId || m.id === marketId);

    if (!market) {
      return NextResponse.json({ success: false, error: 'Market not found' }, { status: 404 });
    }

    // Related orders matched relationally by state, district, city
    const allOrders = await getOrdersForAnalytics();
    const marketOrders = allOrders.filter((o) => {
      const st = (o as any).state || o.customerState || '';
      const dt = (o as any).district || (o as any).customerDistrict || '';
      const ct = (o as any).city || o.customerCity || '';
      const stateMatch = st.toLowerCase() === market.state.toLowerCase();
      const districtMatch = !market.district || market.district === 'General' || dt.toLowerCase() === market.district.toLowerCase();
      const cityMatch = !market.city || market.city === 'General' || ct.toLowerCase() === market.city.toLowerCase();
      return stateMatch && districtMatch && cityMatch;
    });

    // Related leads matched relationally
    const allLeads = await getLeads();
    const marketLeads = allLeads.filter((l) => {
      const stateMatch = l.state?.toLowerCase() === market.state.toLowerCase();
      const districtMatch = !market.district || market.district === 'General' || l.district?.toLowerCase() === market.district.toLowerCase();
      return stateMatch && districtMatch;
    });

    // Related keywords
    const allKeywords = await getKeywords();
    const marketKeywords = allKeywords.filter((k) => k.state?.toLowerCase() === market.state.toLowerCase() || !k.state);

    return NextResponse.json({
      success: true,
      market,
      orders: marketOrders,
      leads: marketLeads,
      keywords: marketKeywords,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch market detail.');
  }
}
