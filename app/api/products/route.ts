import { NextRequest, NextResponse } from 'next/server';
import { revalidateCatalogSurfaces } from '@/lib/revalidation';
import { getProducts, getAllProductsAdmin, saveProduct } from '@/lib/db/products';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { isBase64ImageData } from '@/lib/media-upload';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';
import { validateProductTypeClassification } from '@/lib/growth/product-type-governance';
import { validateCatalogVariants } from '@/lib/growth/product-catalog-governance';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode');
    const category = searchParams.get('category');
    const featured = searchParams.get('featured');

    const isAdmin = isRequestAdminAuthenticated(req);

    let products = (mode === 'admin' && isAdmin) ? await getAllProductsAdmin() : await getProducts();

    if (category) {
      products = products.filter((p) => p.categoryId === category || p.categoryName?.toLowerCase() === category.toLowerCase());
    }

    if (featured === 'true') {
      products = products.filter((p) => p.isFeatured);
    }

    return createSuccessResponse({ products }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch products.', 500, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    if (!body.name || body.price === undefined || body.price === null) {
      return NextResponse.json(
        { success: false, error: 'Product name and price are required', requestId },
        { status: 400 }
      );
    }

    // Reject direct Base64 image payload in product images
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

    // Validate and sanitize variants against catalog unit family governance
    if (Array.isArray(body.variants)) {
      const variantCheck = validateCatalogVariants(body.variants, body.productType);
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

    const saved = await saveProduct(body);

    await recordAuditLog({
      action: 'PRODUCT_CREATE',
      resource: saved.name,
      details: { productId: saved.id, price: saved.price },
    });

    await revalidateCatalogSurfaces({
      slugs: [saved.slug],
      categorySlugsOrIds: [saved.categoryId, saved.categoryName],
    });

    return createSuccessResponse({ product: saved }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save product.', 500, requestId);
  }
}
