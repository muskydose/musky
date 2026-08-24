import { NextRequest, NextResponse } from 'next/server';
import { getCategories, saveCategory, deleteCategory } from '@/lib/db/categories';
import { requireAdminAuthAndCsrf, recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET() {
  const requestId = getRequestId();
  try {
    const categories = await getCategories();
    return createSuccessResponse({ categories }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch categories.', 500, requestId);
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
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ success: false, error: 'Category name is required', requestId }, { status: 400 });
    }
    const category = await saveCategory(body);

    await recordAuditLog({
      action: 'CATEGORY_SAVE',
      resource: category.name,
      details: { categoryId: category.id },
    });

    return createSuccessResponse({ category }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save category.', 500, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Category ID is required', requestId }, { status: 400 });
    }
    await deleteCategory(id);

    await recordAuditLog({
      action: 'CATEGORY_DELETE',
      resource: id,
    });

    return createSuccessResponse({ message: 'Category deleted' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete category.', 400, requestId);
  }
}
