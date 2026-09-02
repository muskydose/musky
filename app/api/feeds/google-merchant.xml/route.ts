import { NextRequest, NextResponse } from 'next/server';
import { getProducts } from '@/lib/db/products';
import { generateGoogleMerchantXmlFeed } from '@/lib/growth/merchant-feed-engine';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Cache for 1 hour

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://muskydose.in';
    const products = await getProducts();
    const xml = generateGoogleMerchantXmlFeed(products, baseUrl);

    return new NextResponse(xml, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error: any) {
    console.error('[GET /api/feeds/google-merchant.xml] Error:', error);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><error>Failed to generate feed</error>',
      {
        status: 500,
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
      }
    );
  }
}

