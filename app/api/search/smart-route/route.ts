import { NextRequest, NextResponse } from 'next/server';
import { getActiveProductsForStore } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { resolveSmartKeywordRoute } from '@/lib/growth/smart-keyword-router';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '';

    const [products, categories] = await Promise.all([
      getActiveProductsForStore(),
      getCategories(),
    ]);

    const result = resolveSmartKeywordRoute({
      rawQuery: q,
      products,
      categories,
    });

    return NextResponse.json({
      success: true,
      result,
      destinationUrl: result.destinationUrl,
      confidence: result.confidence,
      routeType: result.routeType,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to resolve smart keyword route',
        destinationUrl: `/products?search=${encodeURIComponent(req.nextUrl.searchParams.get('q') || '')}`,
        routeType: 'SEARCH',
        confidence: 'LOW',
      },
      { status: 500 }
    );
  }
}

