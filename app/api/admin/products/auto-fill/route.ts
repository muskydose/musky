import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { deriveProductAutoFill } from '@/lib/growth/product-autofill-engine';
import { getCategories } from '@/lib/db/categories';
import { getProducts } from '@/lib/db/products';
import { getGuides } from '@/lib/db/guides';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Enforce Admin Session Authentication & CSRF Protection
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    // 2. Parse and Validate Request Payload
    const body = await req.json();
    const productName = String(body.productName || body.name || '').trim();

    if (!productName) {
      return NextResponse.json(
        { success: false, error: 'Product name is required to generate auto-fill details.' },
        { status: 400 }
      );
    }

    if (productName.length > 200) {
      return NextResponse.json(
        { success: false, error: 'Product name is too long (maximum 200 characters).' },
        { status: 400 }
      );
    }

    // 3. Fetch store context for smart matching and internal linking
    const [categories, products, guides] = await Promise.all([
      getCategories().catch(() => []),
      getProducts().catch(() => []),
      getGuides().catch(() => []),
    ]);

    // 4. Derive complete, truth-grounded, taxonomy-aware product draft
    const draft = deriveProductAutoFill(
      {
        productName,
        categoryId: body.categoryId,
        categoryName: body.categoryName,
        productType: body.productType,
        quantityOrWeight: body.quantityOrWeight,
        sellingUnit: body.sellingUnit,
        packQuantity: body.packQuantity,
        packUnit: body.packUnit,
        pricingUnit: body.pricingUnit,
        wholesaleUnit: body.wholesaleUnit,
        minWholesaleQuantity: body.minWholesaleQuantity,
        maxWholesaleQuantity: body.maxWholesaleQuantity,
        conversionRule: body.conversionRule,
        price: typeof body.price === 'number' ? body.price : undefined,
        compareAtPrice: typeof body.compareAtPrice === 'number' ? body.compareAtPrice : undefined,
        sku: body.sku,
        images: body.images,
        lockedFields: body.lockedFields,
        fieldMetadata: body.fieldMetadata,
      },
      categories,
      products,
      guides
    );

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to generate product draft.');
  }
}
