import { NextRequest, NextResponse } from 'next/server';
import { getCustomPages, getCustomPageBySlug, saveCustomPage, deleteCustomPage, sanitizeSlug } from '@/lib/db/custom-pages';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated, recordAuditLog } from '@/lib/auth';
import { CustomPage } from '@/lib/types';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (slug) {
      const page = await getCustomPageBySlug(slug);
      if (!page) {
        return NextResponse.json({ success: false, error: 'Custom page not found', requestId }, { status: 404 });
      }

      const isAdmin = isRequestAdminAuthenticated(req);
      if (!page.published && !isAdmin) {
        return NextResponse.json({ success: false, error: 'Custom page not published', requestId }, { status: 403 });
      }

      return createSuccessResponse({ page }, undefined, requestId);
    }

    const pages = await getCustomPages();
    const isAdmin = isRequestAdminAuthenticated(req);
    const filteredPages = isAdmin ? pages : pages.filter((p) => p.published);

    return createSuccessResponse({ pages: filteredPages }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch custom pages.', 500, requestId);
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
      return NextResponse.json(
        { success: false, error: 'Page title is required', requestId },
        { status: 400 }
      );
    }

    const cleanSlug = sanitizeSlug(body.slug || body.title);
    if (!cleanSlug) {
      return NextResponse.json(
        { success: false, error: 'Page slug is invalid', requestId },
        { status: 400 }
      );
    }

    const pageToSave: CustomPage = {
      id: body.id || `page-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title: body.title.trim(),
      slug: cleanSlug,
      description: body.description || '',
      seoTitle: body.seoTitle || '',
      seoDescription: body.seoDescription || '',
      published: Boolean(body.published),
      sections: Array.isArray(body.sections) ? body.sections : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const savedPage = await saveCustomPage(pageToSave);
    await recordAuditLog({ action: 'CUSTOM_PAGE_SAVE', resource: savedPage.title || savedPage.id });
    return createSuccessResponse({ page: savedPage }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save custom page.', 500, requestId);
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
      return NextResponse.json({ success: false, error: 'Page ID is required', requestId }, { status: 400 });
    }

    await deleteCustomPage(id);
    await recordAuditLog({ action: 'CUSTOM_PAGE_DELETE', resource: id });
    return createSuccessResponse({ message: 'Custom page deleted successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete custom page.', 500, requestId);
  }
}
