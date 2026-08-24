import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated, recordAuditLog } from '@/lib/auth';
import { getSeoKeywords, saveSeoKeyword, deleteSeoKeyword } from '@/lib/db/seo';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  if (!isRequestAdminAuthenticated(req)) {
    return NextResponse.json({ success: false, error: 'Unauthorized admin access.', requestId }, { status: 401 });
  }

  try {
    const keywords = await getSeoKeywords();
    return createSuccessResponse({ keywords }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to fetch SEO keywords.', 500, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  const authCheck = requireAdminAuthAndCsrf(req);
  if (!authCheck.authenticated) {
    return authCheck.errorResponse!;
  }

  try {
    const body = await req.json();
    const saved = await saveSeoKeyword(body);
    await recordAuditLog({ action: 'SEO_KEYWORD_SAVE', resource: saved.keyword || saved.id });
    return createSuccessResponse({ keyword: saved }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to save SEO keyword.', 400, requestId);
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId();
  const authCheck = requireAdminAuthAndCsrf(req);
  if (!authCheck.authenticated) {
    return authCheck.errorResponse!;
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Keyword ID is required.', requestId }, { status: 400 });
    }

    await deleteSeoKeyword(id);
    await recordAuditLog({ action: 'SEO_KEYWORD_DELETE', resource: id });
    return createSuccessResponse({ message: 'Keyword deleted successfully.' }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to delete SEO keyword.', 500, requestId);
  }
}
