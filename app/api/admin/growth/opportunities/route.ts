import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getGuides } from '@/lib/db/guides';
import { getKeywords } from '@/lib/growth/growth-db';
import { getOrdersForAnalytics } from '@/lib/db/orders';
import { getSearchConsoleQueries, isSearchConsoleConfigured } from '@/lib/growth/sources/search-console-adapter';
import {
  getGrowthOpportunitiesDashboard,
  getGuideAttributionSummary,
  generateProductInternalLinks,
  mapKeywordsToProducts,
  generateActionDraftTemplate,
  calculateProductSeoHealth,
} from '@/lib/growth/seo-opportunity-engine';
import { GrowthOpportunity } from '@/lib/growth/types';
import {
  generateActionRecord,
  applyGrowthAction,
  verifyGrowthAction,
  getAllActions,
  calculateActionExecutionSummary,
} from '@/lib/growth/action-execution-service';

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
    const category = searchParams.get('category') || undefined;

    const [products, keywords, categories, guides, orders, gscResult] = await Promise.all([
      getAllProductsAdmin(),
      getKeywords(),
      getCategories(),
      getGuides(),
      getOrdersForAnalytics(90),
      getSearchConsoleQueries(),
    ]);

    const dashboard = await getGrowthOpportunitiesDashboard(
      products,
      keywords,
      gscResult.queries,
      orders,
      guides,
      { page, limit, type, priority, productId, search, category }
    );

    const guideAttribution = await getGuideAttributionSummary(30, guides);
    const gscConfigured = isSearchConsoleConfigured();

    // Compute product SEO health summary
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

    // Execution Layer Actions & Summary
    const actions = getAllActions();
    const executionSummary = calculateActionExecutionSummary(dashboard.opportunities, actions);

    return NextResponse.json({
      success: true,
      data: {
        opportunities: dashboard.opportunities,
        stats: dashboard.stats,
        guideAttribution,
        executionSummary,
        actions,
        gscStatus: {
          configured: gscConfigured,
          statusText: gscResult.status,
          message: gscResult.message,
          recordsCount: gscResult.queries.length,
        },
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
    const { action, opportunity, productId, opportunityId, actionId, newStatus, confirmExecution } = body;

    if (action === 'GENERATE_DRAFT' || action === 'GENERATE_ACTION') {
      if (!opportunity) {
        return NextResponse.json({ success: false, error: 'Opportunity payload required' }, { status: 400 });
      }

      const products = await getAllProductsAdmin();
      const product = products.find((p) => p.id === (productId || opportunity.productId));

      const actionRecord = generateActionRecord(opportunity as GrowthOpportunity, product);
      const draft = generateActionDraftTemplate(opportunity as GrowthOpportunity, product);

      return NextResponse.json({
        success: true,
        actionRecord,
        draft,
      });
    }

    if (action === 'APPLY_ACTION') {
      if (!actionId) {
        return NextResponse.json({ success: false, error: 'actionId required' }, { status: 400 });
      }

      const appliedRecord = await applyGrowthAction(actionId, {
        confirmExecution: Boolean(confirmExecution),
        actor: 'admin',
      });

      return NextResponse.json({
        success: true,
        actionRecord: appliedRecord,
        message: 'Action successfully applied.',
      });
    }

    if (action === 'VERIFY_ACTION') {
      if (!actionId) {
        return NextResponse.json({ success: false, error: 'actionId required' }, { status: 400 });
      }

      const verifiedRecord = await verifyGrowthAction(actionId, 'admin');

      return NextResponse.json({
        success: true,
        actionRecord: verifiedRecord,
        verified: verifiedRecord.status === 'DONE',
        message: verifiedRecord.status === 'DONE' ? 'Action verified and marked DONE.' : 'Verification failed.',
      });
    }

    if (action === 'UPDATE_STATUS' || action === 'APPROVE_OPPORTUNITY') {
      if (!opportunityId && !opportunity?.id) {
        return NextResponse.json({ success: false, error: 'opportunityId required' }, { status: 400 });
      }
      const targetId = opportunityId || opportunity?.id;
      const status = newStatus || (action === 'APPROVE_OPPORTUNITY' ? 'APPROVED' : 'OPEN');

      let actionRecord = null;
      if (opportunity && status === 'APPROVED') {
        const products = await getAllProductsAdmin();
        const product = products.find((p) => p.id === (productId || opportunity.productId));
        actionRecord = generateActionRecord(opportunity as GrowthOpportunity, product);
      }

      return NextResponse.json({
        success: true,
        opportunityId: targetId,
        status,
        actionRecord,
        message: `Opportunity status updated to ${status}`,
      });
    }

    return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error: any) {
    return sanitizeAdminError(error, 'POST /api/admin/growth/opportunities');
  }
}

