import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { getPageSeoConfigs, savePageSeoConfig } from '@/lib/db/seo';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  const authCheck = requireAdminAuthAndCsrf(req);
  if (!authCheck.authenticated) {
    return authCheck.errorResponse!;
  }

  try {
    const configs = await getPageSeoConfigs();
    return createSuccessResponse({ configs }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to fetch page SEO configs.', 500, requestId);
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
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Page ID is required.', requestId }, { status: 400 });
    }

    const saved = await savePageSeoConfig(body);
    await recordAuditLog({ action: 'PAGE_SEO_SAVE', resource: body.id });
    return createSuccessResponse({ config: saved }, undefined, requestId);
  } catch (err: any) {
    return sanitizeAdminError(err, 'Failed to save page SEO configuration.', 400, requestId);
  }
}
