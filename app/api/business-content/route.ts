import { NextRequest, NextResponse } from 'next/server';
import { getBusinessContentItems, getPublishedBusinessContentItems, getBusinessContentByLocation, saveBusinessContentItem, deleteBusinessContentItem } from '@/lib/db/business-content';
import { requireAdminAuthAndCsrf, isRequestAdminAuthenticated } from '@/lib/admin-middleware';
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
    if (!body || !body.title) {
      return NextResponse.json({ success: false, error: 'Title is required', requestId }, { status: 400 });
    }

    const saved = await saveBusinessContentItem(body);
    await recordAuditLog({ action: 'BUSINESS_CONTENT_SAVE', resource: saved.title || saved.id });
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

    await deleteBusinessContentItem(id);
    await recordAuditLog({ action: 'BUSINESS_CONTENT_DELETE', resource: id });
    return createSuccessResponse({ message: 'Item deleted successfully' }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete business content item.', 500, requestId);
  }
}
