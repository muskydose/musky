import { NextRequest, NextResponse } from 'next/server';
import { getProductGuides, saveProductGuide, deleteProductGuide } from '@/lib/db/guides';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated, recordAuditLog } from '@/lib/auth';
import { ProductGuide } from '@/lib/types';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized', requestId }, { status: 401 });
    }
    const guides = await getProductGuides();
    return createSuccessResponse({ guides }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch product guides.', 500, requestId);
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
    if (!body || !body.title) {
      return NextResponse.json({ success: false, error: 'Title is required', requestId }, { status: 400 });
    }

    const savedGuide = await saveProductGuide(body as Partial<ProductGuide> & { title: string });
    await recordAuditLog({ action: 'GUIDE_SAVE', resource: savedGuide.title || savedGuide.id });
    return createSuccessResponse({ guide: savedGuide }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save product guide.', 500, requestId);
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
      return NextResponse.json({ success: false, error: 'ID parameter required', requestId }, { status: 400 });
    }

    await deleteProductGuide(id);
    await recordAuditLog({ action: 'GUIDE_DELETE', resource: id });
    return createSuccessResponse({ success: true }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete product guide.', 500, requestId);
  }
}
