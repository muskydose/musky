import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { generateProductAutoFillDraft, ProductAutoFillInput } from '@/lib/ai/product-autofill';
import { getCategories } from '@/lib/db/categories';
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
    const productName = String(body.productName || '').trim();

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

    // 3. Fetch store categories for smart matching
    let existingCategories: { id: string; name: string }[] = [];
    try {
      const categories = await getCategories();
      existingCategories = categories.map((c) => ({ id: c.id, name: c.name }));
    } catch (err) {
      console.warn('Failed to load categories for auto-fill matching:', err);
    }

    const input: ProductAutoFillInput = {
      productName,
      categoryId: body.categoryId,
      categoryName: body.categoryName,
      productType: body.productType,
      quantityOrWeight: body.quantityOrWeight,
      hints: body.hints,
      existingCategories,
    };

    // 4. Generate Draft via Server-Side AI Engine
    const draft = await generateProductAutoFillDraft(input);

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to generate product draft.');
  }
}
