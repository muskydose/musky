import { NextRequest, NextResponse } from 'next/server';
import { getProductGuides, saveProductGuide, deleteProductGuide } from '@/lib/db/guides';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { UniversalGovernanceCore } from '@/lib/governance';
import { revalidateCatalogSurfaces } from '@/lib/revalidation';
import { recordAuditLog } from '@/lib/auth';
import { ProductGuide } from '@/lib/types';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
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

    // 1. Universal Platform Governance Validation
    const govCheck = UniversalGovernanceCore.validateEntity('GUIDE', body, !body.id);
    if (!govCheck.isValid) {
      return NextResponse.json(
        { success: false, error: `Governance validation failed: ${govCheck.errors.join('; ')}`, requestId },
        { status: 400 }
      );
    }

    // 2. AI Governance Gate: Unreviewed AI drafts cannot be directly published
    if ((body.isAiGenerated || body.aiGenerated) && body.published && !body.isReviewedByAdmin && !body.approvedBy) {
      return NextResponse.json(
        { success: false, error: 'AI Governance Violation: Unreviewed AI-generated guide content cannot be directly published without explicit admin verification.', requestId },
        { status: 400 }
      );
    }

    if (!body || !body.title) {
      return NextResponse.json({ success: false, error: 'Title is required', requestId }, { status: 400 });
    }

    const savedGuide = await saveProductGuide(body as Partial<ProductGuide> & { title: string });
    await recordAuditLog({ action: 'GUIDE_SAVE', resource: savedGuide.title || savedGuide.id });

    await revalidateCatalogSurfaces({
      guideSlugs: [savedGuide.slug],
    });

    return createSuccessResponse({ guide: savedGuide }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save product guide.', 500, requestId);
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
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID parameter required', requestId }, { status: 400 });
    }

    await deleteProductGuide(id);
    await UniversalGovernanceCore.executeDeletionLifecycle('GUIDE', id);

    await recordAuditLog({ action: 'GUIDE_DELETE', resource: id });

    await revalidateCatalogSurfaces({
      guideSlugs: [id],
    });

    return createSuccessResponse({ success: true }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to delete product guide.', 500, requestId);
  }
}
