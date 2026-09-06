import { NextRequest, NextResponse } from 'next/server';
import { getBusinessContentItems, getPublishedBusinessContentItems, getBusinessContentByLocation, saveBusinessContentItem, deleteBusinessContentItem } from '@/lib/db/business-content';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated } from '@/lib/admin-middleware';
import { UniversalGovernanceCore } from '@/lib/governance';
import { revalidateEntitySurfaces } from '@/lib/revalidation';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location');
    const type = searchParams.get('type');
    const id = searchParams.get('id');
    const isAdmin = isRequestAdminAuthenticated(req);

    if (id) {
      const items = isAdmin ? await getBusinessContentItems() : await getPublishedBusinessContentItems();
      const item = items.find((i) => i.id === id || i.slug === id);
      if (!item) {
        return NextResponse.json({ success: false, error: 'Document not found', requestId }, { status: 404 });
      }
      return createSuccessResponse({ item }, undefined, requestId);
    }

    if (location) {
      const items = await getBusinessContentByLocation(location);
      return createSuccessResponse({ items }, undefined, requestId);
    }

    let items = isAdmin ? await getBusinessContentItems() : await getPublishedBusinessContentItems();

    if (type) {
      items = items.filter((i) => i.type.toLowerCase() === type.toLowerCase());
    }

    return createSuccessResponse({ items }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch business content items', 500, requestId);
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

    // 1. Universal Platform Governance Validation
    const govCheck = UniversalGovernanceCore.validateEntity('BUSINESS_DOCUMENT', body, !body.id);
    if (!govCheck.isValid) {
      return NextResponse.json(
        { success: false, error: `Governance validation failed: ${govCheck.errors.join('; ')}`, requestId },
        { status: 400 }
      );
    }

    if (!body || !body.title) {
      return NextResponse.json({ success: false, error: 'Title is required', requestId }, { status: 400 });
    }

    const saved = await saveBusinessContentItem(body);
    await recordAuditLog({ action: 'BUSINESS_CONTENT_SAVE', resource: saved.title || saved.id });

    // 2. Centralized Document Revalidation
    await revalidateEntitySurfaces('BUSINESS_DOCUMENT', [saved.slug]).catch((revErr: any) => {
      console.warn('[API BusinessContent] Revalidation notice:', revErr?.message);
    });

    return createSuccessResponse({ item: saved }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save business content item.', 500, requestId);
  }
}

export async function PUT(req: NextRequest) {
  return POST(req);
}

export async function DELETE(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ success: false, error: 'Document ID is required', requestId }, { status: 400 });
    }

    const allItems = await getBusinessContentItems();
    const existing = allItems.find((i) => i.id === id);

    await deleteBusinessContentItem(id);
    await UniversalGovernanceCore.executeDeletionLifecycle('BUSINESS_DOCUMENT', id, existing?.slug);

    await recordAuditLog({ action: 'BUSINESS_CONTENT_DELETE', resource: id });

    // Centralized Document Revalidation
    await revalidateEntitySurfaces('BUSINESS_DOCUMENT', [existing?.slug]).catch((revErr: any) => {
      console.warn('[API BusinessContent] Revalidation notice:', revErr?.message);
    });

    return createSuccessResponse({ message: 'Item deleted successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete business content item.', 500, requestId);
  }
}
