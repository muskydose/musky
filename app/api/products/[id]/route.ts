import { NextRequest, NextResponse } from 'next/server';
import { revalidateCatalogSurfaces } from '@/lib/revalidation';
import { getProductByIdOrSlug, saveProduct, deleteProduct } from '@/lib/db/products';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { isBase64ImageData } from '@/lib/media-upload';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';
import { validateProductTypeClassification } from '@/lib/growth/product-type-governance';
import { validateCatalogVariants } from '@/lib/growth/product-catalog-governance';

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

    // Fetch existing product for context if needed
    const existingProduct = await getProductByIdOrSlug(id, true);

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

    // Validate and sanitize variants against catalog unit family governance
    if (Array.isArray(body.variants)) {
      const effectiveType = body.productType || existingProduct?.productType;
      const variantCheck = validateCatalogVariants(body.variants, effectiveType);
      if (!variantCheck.valid) {
        return NextResponse.json(
          {
            success: false,
            error: `Variant validation failed: ${variantCheck.errors.join('; ')}`,
            requestId,
          },
          { status: 400 }
        );
      }
      body.variants = variantCheck.sanitizedVariants;

      // Synchronize root commercial fields with primary default variant
      if (body.variants.length > 0) {
        const defaultVar = body.variants.find((v: any) => v.isDefault) || body.variants[0];
        if (defaultVar) {
          body.price = defaultVar.price;
          if (defaultVar.compareAtPrice !== undefined) body.compareAtPrice = defaultVar.compareAtPrice;
          body.quantityOrWeight = defaultVar.weight;
        }
      }
    }

    const updated = await saveProduct({ ...body, id });

    await recordAuditLog({
      action: 'PRODUCT_UPDATE',
      resource: updated.name,
      details: { productId: id },
    });

    await revalidateCatalogSurfaces({
      slugs: [existingProduct?.slug, updated.slug],
      categorySlugsOrIds: [updated.categoryId, existingProduct?.categoryId],
    });

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
    const existingProduct = await getProductByIdOrSlug(id, true);

    await deleteProduct(id);

    await recordAuditLog({
      action: 'PRODUCT_DELETE',
      resource: id,
    });

    await revalidateCatalogSurfaces({
      slugs: [existingProduct?.slug],
      categorySlugsOrIds: [existingProduct?.categoryId],
    });

    return createSuccessResponse({ message: 'Product deleted successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete product.', 500, requestId);
  }
}
