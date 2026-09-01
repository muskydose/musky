import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { deriveProductGuide } from '@/lib/growth/guide-generator';
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
    const productId = String(body.productId || '').trim();
    const productName = String(body.productName || body.title || '').trim();

    if (!productId && !productName) {
      return NextResponse.json(
        { success: false, error: 'Product ID or Product Name is required to generate guide auto-fill details.' },
        { status: 400 }
      );
    }

    // 3. Fetch store context
    const [products, guides] = await Promise.all([
      getProducts().catch(() => []),
      getGuides().catch(() => []),
    ]);

    const targetProduct = products.find(
      (p) => p.id === productId || p.name.toLowerCase() === productName.toLowerCase()
    ) || {
      id: productId || 'temp-product',
      name: productName || 'Botanical Product',
      slug: body.slug || productName.toLowerCase().replace(/\s+/g, '-'),
      categoryName: body.categoryName || body.category || 'Herbal',
      shortDescription: body.shortDescription || '',
      ingredients: body.ingredients || [],
      benefits: body.benefits || [],
      usageInstructions: body.usageInstructions || '',
    };

    // 4. Derive complete, truth-grounded guide draft
    const draft = deriveProductGuide(targetProduct, products, guides);

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to generate guide auto-fill draft.');
  }
}
