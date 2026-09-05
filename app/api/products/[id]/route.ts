import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getProductByIdOrSlug, saveProduct, deleteProduct } from '@/lib/db/products';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { isBase64ImageData } from '@/lib/media-upload';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';
import { validateProductTypeClassification } from '@/lib/growth/product-type-governance';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const { id } = await params;
    const product = await getProductByIdOrSlug(id);
    if (!product) {
      return NextResponse.json({ success: false, error: 'Product not found', requestId }, { status: 404 });
    }
    return createSuccessResponse({ product }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch product.', 500, requestId);
  }
}

export async function PUT(
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
    const body = await req.json();

    if (Array.isArray(body.images)) {
      const hasBase64 = body.images.some((img: string) => isBase64ImageData(img));
      if (hasBase64) {
        return NextResponse.json(
          {
            success: false,
            error: 'Direct Base64 images are not allowed in product records. Please upload image files via the Media uploader first.',
            requestId,
          },
          { status: 400 }
        );
      }
    }

    // Validate commercial product type classification if provided
    if (body.productType !== undefined) {
      const typeCheck = validateProductTypeClassification(body.productType);
      if (!typeCheck.valid) {
        return NextResponse.json(
          { success: false, error: typeCheck.error || 'Invalid product type classification', requestId },
          { status: 400 }
        );
      }
      body.productType = typeCheck.sanitizedValue;
    }

    const updated = await saveProduct({ ...body, id });

    await recordAuditLog({
      action: 'PRODUCT_UPDATE',
      resource: updated.name,
      details: { productId: id },
    });

    try {
      revalidatePath('/products');
      revalidatePath(`/products/${updated.slug}`);
      revalidatePath('/wholesale');
      revalidatePath('/');
    } catch (revalErr) {
      console.warn('Revalidation warning:', revalErr);
    }

    return createSuccessResponse({ product: updated }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to update product.', 500, requestId);
  }
}

export async function DELETE(
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
    await deleteProduct(id);

    await recordAuditLog({
      action: 'PRODUCT_DELETE',
      resource: id,
    });

    return createSuccessResponse({ message: 'Product deleted successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete product.', 500, requestId);
  }
}
