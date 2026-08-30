import { NextRequest, NextResponse } from 'next/server';
import { getActiveProductsForStore } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { resolveSmartKeywordRoute } from '@/lib/growth/smart-keyword-router';
import { checkRateLimitAsync, getClientIp } from '@/lib/rate-limit';
import { sanitizePublicError } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimitAsync(`search_route:${ip}`, 60, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json({ success: false, error: 'Too many search requests.' }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const rawQ = searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '';
    const q = rawQ.trim().substring(0, 200);

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
    return sanitizePublicError(error, 'Failed to resolve search route.');
  }
}
