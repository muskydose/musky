import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { getAllProductsAdmin } from '@/lib/db/products';
import { getGuides } from '@/lib/db/guides';
import { deriveProductGuide } from '@/lib/growth/guide-generator';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json().catch(() => ({}));
    const { productId, productDraft } = body;

    const [allProducts, allGuides] = await Promise.all([
      getAllProductsAdmin(),
      getGuides(),
    ]);

    let targetProduct = productDraft;
    if (productId) {
      const found = allProducts.find((p) => p.id === productId);
      if (found) {
        targetProduct = { ...found, ...(productDraft || {}) };
      }
    }

    if (!targetProduct || !targetProduct.name) {
      return NextResponse.json(
        { success: false, error: 'A valid product or product draft with a name is required.', requestId },
        { status: 400 }
      );
    }

    const draft = deriveProductGuide(targetProduct, allProducts, allGuides);

    return createSuccessResponse({ draft }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to auto-generate product guide draft.', 500, requestId);
  }
}

