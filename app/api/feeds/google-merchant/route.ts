import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/db/products';
import { buildMerchantFeedItems, getMerchantFeedHealthSummary } from '@/lib/growth/merchant-feed-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
    const products = await getProducts();
    const items = buildMerchantFeedItems(products, baseUrl);
    const summary = getMerchantFeedHealthSummary(products, baseUrl);

    return NextResponse.json({
      success: true,
      summary,
      items,
    });
  } catch (error: any) {
    console.error('[GET /api/feeds/google-merchant] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate JSON product feed' },
      { status: 500 }
    );
  }
}

