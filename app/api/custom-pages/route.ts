import { NextRequest, NextResponse } from 'next/server';
import { getCustomPages, getCustomPageBySlug, saveCustomPage, deleteCustomPage, sanitizeSlug } from '@/lib/db/custom-pages';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated } from '@/lib/admin-middleware';
import { UniversalGovernanceCore } from '@/lib/governance';
import { revalidateEntitySurfaces } from '@/lib/revalidation';
import { recordAuditLog } from '@/lib/auth';
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
      title: String(body.title).trim().substring(0, 200),
      slug: cleanSlug.substring(0, 100),
      description: body.description ? String(body.description).substring(0, 1000) : '',
      seoTitle: body.seoTitle ? String(body.seoTitle).substring(0, 200) : '',
      seoDescription: body.seoDescription ? String(body.seoDescription).substring(0, 500) : '',
      published: Boolean(body.published),
      sections: Array.isArray(body.sections) ? body.sections : [],
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Universal Platform Governance Validation
    const govCheck = UniversalGovernanceCore.validateEntity('PAGE', pageToSave, !body.id);
    if (!govCheck.isValid) {
      return NextResponse.json(
        { success: false, error: `Governance validation failed: ${govCheck.errors.join('; ')}`, requestId },
        { status: 400 }
      );
    }

    const savedPage = await saveCustomPage(pageToSave);
    await recordAuditLog({ action: 'CUSTOM_PAGE_SAVE', resource: savedPage.title || savedPage.id });

    // 2. Centralized Page Revalidation
    await revalidateEntitySurfaces('PAGE', [savedPage.slug]).catch((revErr: any) => {
      console.warn('[API CustomPages] Revalidation notice:', revErr?.message);
    });

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

    const allPages = await getCustomPages();
    const existing = allPages.find((p) => p.id === id);

    await deleteCustomPage(id);
    await UniversalGovernanceCore.executeDeletionLifecycle('PAGE', id, existing?.slug);

    await recordAuditLog({ action: 'CUSTOM_PAGE_DELETE', resource: id });

    // Centralized Page Revalidation
    await revalidateEntitySurfaces('PAGE', [existing?.slug]).catch((revErr: any) => {
      console.warn('[API CustomPages] Revalidation notice:', revErr?.message);
    });

    return createSuccessResponse({ message: 'Custom page deleted successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete custom page.', 500, requestId);
  }
}
