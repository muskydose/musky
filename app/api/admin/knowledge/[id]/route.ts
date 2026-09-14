import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';
import {
  getAllKnowledgeEntitiesAdmin,
  saveKnowledgeEntity,
  archiveKnowledgeEntity,
  SaveKnowledgeEntityInput,
} from '@/lib/db/knowledge';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id } = await params;
    const cleanId = id?.trim();
    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: 'Entity identifier is required.', requestId },
        { status: 400 }
      );
    }

    const allEntities = await getAllKnowledgeEntitiesAdmin();
    const entity = allEntities.find(
      (e) =>
        e.id === cleanId ||
        e.slug === cleanId.toLowerCase() ||
        e.entityKey === cleanId.toUpperCase()
    );

    if (!entity) {
      return NextResponse.json(
        { success: false, error: `Knowledge entity "${cleanId}" not found.`, requestId },
        { status: 404 }
      );
    }

    return createSuccessResponse({ entity }, undefined, requestId);
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch knowledge entity.', 500, requestId);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id } = await params;
    const cleanId = id?.trim();
    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: 'Entity identifier is required.', requestId },
        { status: 400 }
      );
    }

    const allEntities = await getAllKnowledgeEntitiesAdmin();
    const existing = allEntities.find(
      (e) =>
        e.id === cleanId ||
        e.slug === cleanId.toLowerCase() ||
        e.entityKey === cleanId.toUpperCase()
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Knowledge entity "${cleanId}" not found.`, requestId },
        { status: 404 }
      );
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed or missing JSON request body.', requestId },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Request body must be a valid JSON object.', requestId },
        { status: 400 }
      );
    }

    // 1. Entity Key Immutability Guard (Requirement 4)
    const incomingKey = body.entityKey || body.entity_key;
    if (incomingKey && incomingKey.toUpperCase().trim() !== existing.entityKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Entity key is immutable and cannot be modified after creation.',
          requestId,
        },
        { status: 400 }
      );
    }

    // 2. UNKNOWN Sentinel Publishing Guard (Requirement 6)
    const isUnknown = existing.entityKey === 'UNKNOWN';
    const status = (body.status || body.dbStatus || existing.dbStatus) as string;
    const published =
      body.published !== undefined ? Boolean(body.published) : existing.published;

    if (isUnknown && (status === 'published' || published === true)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Sentinel entity "UNKNOWN" cannot be published.',
          requestId,
        },
        { status: 400 }
      );
    }

    // 3. Status Lifecycle & Accidental Publication Guard (Requirements 7, 8)
    const validStatuses = ['draft', 'published', 'needs_review', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid status "${status}". Allowed values: draft, published, needs_review, archived.`,
          requestId,
        },
        { status: 400 }
      );
    }

    if (status !== 'published' && published === true) {
      return NextResponse.json(
        {
          success: false,
          error: 'Draft, needs_review, or archived entities cannot have published=true.',
          requestId,
        },
        { status: 400 }
      );
    }

    if (status === 'published' && !published) {
      return NextResponse.json(
        {
          success: false,
          error: 'Public publishing requires both published=true and status="published".',
          requestId,
        },
        { status: 400 }
      );
    }

    // 4. Slug Validation (Requirement 5 & 11)
    if (body.slug) {
      const cleanSlug = body.slug.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      if (!cleanSlug || cleanSlug.length < 2) {
        return NextResponse.json(
          {
            success: false,
            error: 'Slug must be a valid URL-safe string (minimum 2 characters).',
            requestId,
          },
          { status: 400 }
        );
      }

      const slugConflict = allEntities.find(
        (e) => e.slug === cleanSlug && e.id !== existing.id
      );
      if (slugConflict) {
        return NextResponse.json(
          {
            success: false,
            error: `Slug "${cleanSlug}" is already in use by entity "${slugConflict.canonicalName}".`,
            requestId,
          },
          { status: 409 }
        );
      }
    }

    // 5. Save Knowledge Entity
    const input: SaveKnowledgeEntityInput = {
      ...body,
      id: existing.id,
      entityKey: existing.entityKey,
      canonicalName: body.canonicalName || body.canonical_name || existing.canonicalName,
      status: status as any,
      published,
    };

    const updated = await saveKnowledgeEntity(input, { isCreate: false });

    await recordAuditLog({
      action: 'KNOWLEDGE_UPDATE',
      resource: updated.slug,
      details: {
        id: existing.id,
        entityKey: existing.entityKey,
        previousSlug: existing.slug,
        newSlug: updated.slug,
        status: updated.dbStatus,
        published: updated.published,
      },
    });

    return createSuccessResponse({ entity: updated }, undefined, requestId);
  } catch (error: any) {
    const rawMsg = String(error?.message || '');
    if (
      rawMsg.includes('already in use') ||
      rawMsg.includes('already exists')
    ) {
      return NextResponse.json(
        { success: false, error: rawMsg, requestId },
        { status: 409 }
      );
    }
    if (
      rawMsg.includes('Governance violation') ||
      rawMsg.includes('immutable') ||
      rawMsg.includes('cannot be published') ||
      rawMsg.includes('required')
    ) {
      return NextResponse.json(
        { success: false, error: rawMsg, requestId },
        { status: 400 }
      );
    }
    return sanitizeAdminError(error, 'Failed to update knowledge entity.', 500, requestId);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { id } = await params;
    const cleanId = id?.trim();
    if (!cleanId) {
      return NextResponse.json(
        { success: false, error: 'Entity identifier is required.', requestId },
        { status: 400 }
      );
    }

    const allEntities = await getAllKnowledgeEntitiesAdmin();
    const existing = allEntities.find(
      (e) =>
        e.id === cleanId ||
        e.slug === cleanId.toLowerCase() ||
        e.entityKey === cleanId.toUpperCase()
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: `Knowledge entity "${cleanId}" not found.`, requestId },
        { status: 404 }
      );
    }

    // UNKNOWN sentinel protection
    if (existing.entityKey === 'UNKNOWN') {
      return NextResponse.json(
        {
          success: false,
          error: 'Sentinel entity "UNKNOWN" cannot be archived or deleted.',
          requestId,
        },
        { status: 400 }
      );
    }

    // Soft-delete: status = 'archived', published = false (Requirement 9)
    const archived = await archiveKnowledgeEntity(existing.id);

    await recordAuditLog({
      action: 'KNOWLEDGE_ARCHIVE',
      resource: archived.slug,
      details: {
        id: existing.id,
        entityKey: existing.entityKey,
        status: archived.dbStatus,
        published: archived.published,
      },
    });

    return createSuccessResponse(
      { success: true, archived: true, entity: archived },
      undefined,
      requestId
    );
  } catch (error: any) {
    const rawMsg = String(error?.message || '');
    if (rawMsg.includes('cannot be archived') || rawMsg.includes('not found')) {
      return NextResponse.json(
        { success: false, error: rawMsg, requestId },
        { status: 400 }
      );
    }
    return sanitizeAdminError(error, 'Failed to archive knowledge entity.', 500, requestId);
  }
}

