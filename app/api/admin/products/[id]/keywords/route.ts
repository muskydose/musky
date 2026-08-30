import { NextRequest, NextResponse } from 'next/server';
import { getProductByIdOrSlug, getAllProductsAdmin } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getKeywords } from '@/lib/growth/growth-db';
import { getProductKeywordUniverse, syncProductKeywordUniverse } from '@/lib/growth/product-keyword-engine';
import { calculateProductSeoHealth, generateProductInternalLinks } from '@/lib/growth/seo-opportunity-engine';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id } = await params;
    const product = await getProductByIdOrSlug(id, true);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found', requestId }, { status: 404 });
    }

    const [universe, allProducts, categories, keywords] = await Promise.all([
      getProductKeywordUniverse(product),
      getAllProductsAdmin(),
      getCategories(),
      getKeywords(),
    ]);

    const seoHealth = calculateProductSeoHealth(product, universe, keywords);
    const internalLinks = generateProductInternalLinks(product, allProducts, categories);

    return createSuccessResponse({ universe, seoHealth, internalLinks }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch product keyword universe.', 500, requestId);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id } = await params;
    const product = await getProductByIdOrSlug(id, true);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found', requestId }, { status: 404 });
    }

    // Explicit re-sync / refresh
    const [universe, allProducts, categories, keywords] = await Promise.all([
      syncProductKeywordUniverse(product),
      getAllProductsAdmin(),
      getCategories(),
      getKeywords(),
    ]);

    const seoHealth = calculateProductSeoHealth(product, universe, keywords);
    const internalLinks = generateProductInternalLinks(product, allProducts, categories);

    return createSuccessResponse({ universe, seoHealth, internalLinks, message: 'Keyword universe re-synced successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to sync product keyword universe.', 500, requestId);
  }
}
