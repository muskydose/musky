import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getKeywords } from '@/lib/growth/growth-db';
import { getOrdersForAnalytics } from '@/lib/db/orders';
import { getSearchConsoleQueries } from '@/lib/growth/sources/search-console-adapter';
import {
  getGrowthOpportunitiesDashboard,
  generateProductInternalLinks,
  mapKeywordsToProducts,
  generateActionDraftTemplate,
  calculateProductSeoHealth,
} from '@/lib/growth/seo-opportunity-engine';
import { GrowthOpportunity } from '@/lib/growth/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const type = searchParams.get('type') || undefined;
    const priority = searchParams.get('priority') || undefined;
    const productId = searchParams.get('productId') || undefined;
    const search = searchParams.get('search') || searchParams.get('q') || undefined;

    const [products, keywords, categories, orders, gscResult] = await Promise.all([
      getAllProductsAdmin(),
      getKeywords(),
      getCategories(),
      getOrdersForAnalytics(90),
      getSearchConsoleQueries(),
    ]);

    const dashboard = await getGrowthOpportunitiesDashboard(
      products,
      keywords,
      gscResult.queries,
      orders,
      { page, limit, type, priority, productId, search }
    );

    // Also compute product SEO health summary
    const productHealthSummaries = products.map((p) => {
      const health = calculateProductSeoHealth(p, undefined, keywords);
      const links = generateProductInternalLinks(p, products, categories);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        categoryName: p.categoryName || 'Botanicals',
        price: p.price,
        inStock: p.stockStatus === 'in_stock',
        seoHealth: health,
        internalLinksCount: links.length,
      };
    });

    // Market to product mappings
    const marketMappings = mapKeywordsToProducts(keywords.slice(0, 50), products);

    return NextResponse.json({
      success: true,
      data: {
        opportunities: dashboard.opportunities,
        stats: dashboard.stats,
        pagination: {
          total: dashboard.total,
          page: dashboard.page,
          limit: dashboard.limit,
          totalPages: dashboard.totalPages,
        },
        productHealthSummaries,
        marketMappings,
      },
    });
  } catch (error) {
    return sanitizeAdminError(error, 'GET /api/admin/growth/opportunities');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { action, opportunity, productId } = body;

    if (action === 'GENERATE_DRAFT') {
      if (!opportunity) {
        return NextResponse.json({ success: false, error: 'Opportunity payload required' }, { status: 400 });
      }

      const products = await getAllProductsAdmin();
      const product = products.find((p) => p.id === (productId || opportunity.productId));

      const draft = generateActionDraftTemplate(opportunity as GrowthOpportunity, product);
      return NextResponse.json({ success: true, draft });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    return sanitizeAdminError(error, 'POST /api/admin/growth/opportunities');
  }
}
