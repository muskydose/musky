import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import {
  deriveProductIntelligence,
  generateProductKeywordUniverseV2,
  evaluateGuideOpportunities,
} from '@/lib/growth/guide-generator';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getSearchConsoleQueries } from '@/lib/growth/sources/search-console-adapter';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const productName = String(body.productName || body.name || '').trim();

    if (!productName) {
      return NextResponse.json(
        { success: false, error: 'Product name is required for intelligence analysis.' },
        { status: 400 }
      );
    }

    const [products, categories, guides, gscResult] = await Promise.all([
      getProducts().catch(() => []),
      getCategories().catch(() => []),
      getGuides().catch(() => []),
      getSearchConsoleQueries().catch(() => ({ queries: [], status: 'NOT_CONFIGURED', message: '' })),
    ]);

    const targetProduct = products.find(
      (p) => p.name.toLowerCase() === productName.toLowerCase() || p.id === body.id
    ) || {
      name: productName,
      categoryName: body.categoryName,
      quantityOrWeight: body.quantityOrWeight,
      sellingUnit: body.sellingUnit,
      pricingUnit: body.pricingUnit,
      wholesaleUnit: body.wholesaleUnit,
      isWholesaleEligible: body.isWholesaleEligible,
    };

    const intelligence = deriveProductIntelligence(targetProduct, products, categories);
    const keywordUniverse = generateProductKeywordUniverseV2({
      intelligence,
      gscQueries: gscResult.queries,
      adminKeywords: body.adminKeywords || [],
    });
    const guideOpportunities = evaluateGuideOpportunities(intelligence, guides);

    return NextResponse.json({
      success: true,
      intelligence,
      guideOpportunities,
      keywordUniverse,
      gscStatus: gscResult.status,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to derive product intelligence.');
  }
}

