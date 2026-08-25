import { NextRequest, NextResponse } from 'next/server';
import { getProductByIdOrSlug } from '@/lib/db/products';
import { getProductKeywordUniverse, syncProductKeywordUniverse } from '@/lib/growth/product-keyword-engine';
import { isRequestAdminAuthenticated } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access', requestId }, { status: 401 });
    }

    const { id } = await params;
    const product = await getProductByIdOrSlug(id, true);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found', requestId }, { status: 404 });
    }

    const universe = await getProductKeywordUniverse(product);
    return createSuccessResponse({ universe }, undefined, requestId);
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
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access', requestId }, { status: 401 });
    }

    const { id } = await params;
    const product = await getProductByIdOrSlug(id, true);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found', requestId }, { status: 404 });
    }

    // Explicit re-sync / refresh
    const universe = await syncProductKeywordUniverse(product);
    return createSuccessResponse({ universe, message: 'Keyword universe re-synced successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to sync product keyword universe.', 500, requestId);
  }
}

