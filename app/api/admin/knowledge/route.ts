import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError, createSuccessResponse, getRequestId } from '@/lib/api-errors';
import {
  getAllKnowledgeEntitiesAdmin,
  saveKnowledgeEntity,
  SaveKnowledgeEntityInput,
} from '@/lib/db/knowledge';

export async function GET(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const entities = await getAllKnowledgeEntitiesAdmin();
    return createSuccessResponse(
      { entities, total: entities.length },
      undefined,
      requestId
    );
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch knowledge entities.', 500, requestId);
  }
}

export async function POST(req: NextRequest) {
  const requestId = getRequestId();
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
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

    // 1. Validate Canonical Name
    const canonicalName = String(body.canonicalName || body.canonical_name || '').trim();
    if (!canonicalName || canonicalName.length < 2) {
      return NextResponse.json(
        { success: false, error: 'Canonical name is required (minimum 2 characters).', requestId },
        { status: 400 }
      );
    }

    // 2. Validate Entity Key
    const entityKey = String(body.entityKey || body.entity_key || '').toUpperCase().trim();
    if (!entityKey) {
      return NextResponse.json(
        { success: false, error: 'Entity key is required for new knowledge entities.', requestId },
        { status: 400 }
      );
    }
    if (!/^[A-Z0-9_]{2,50}$/.test(entityKey)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Entity key must contain only uppercase letters, numbers, and underscores (2-50 characters).',
          requestId,
        },
        { status: 400 }
      );
    }
    if (entityKey === 'UNKNOWN') {
      return NextResponse.json(
        { success: false, error: 'Sentinel entity "UNKNOWN" cannot be manually created.', requestId },
        { status: 400 }
      );
    }

    // 3. Validate Status and Publishing Rules
    const status = (body.status || body.dbStatus || 'draft') as string;
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

    // Accidental publication guard: draft/needs_review/archived cannot have published = true
    const published = Boolean(body.published);
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

    // Public publishing requires published = true AND status = published
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

    // 4. Save Knowledge Entity
    const input: SaveKnowledgeEntityInput = {
      ...body,
      canonicalName,
      entityKey,
      status: status as any,
      published,
    };

    const saved = await saveKnowledgeEntity(input, { isCreate: true });

    await recordAuditLog({
      action: 'KNOWLEDGE_CREATE',
      resource: saved.slug,
      details: {
        id: saved.id,
        entityKey: saved.entityKey,
        status: saved.dbStatus,
        published: saved.published,
      },
    });

    return createSuccessResponse({ entity: saved }, { status: 201 }, requestId);
  } catch (error: any) {
    const rawMsg = String(error?.message || '');
    if (
      rawMsg.includes('already exists') ||
      rawMsg.includes('already in use')
    ) {
      return NextResponse.json(
        { success: false, error: rawMsg, requestId },
        { status: 409 }
      );
    }
    if (
      rawMsg.includes('Governance violation') ||
      rawMsg.includes('cannot be published') ||
      rawMsg.includes('required')
    ) {
      return NextResponse.json(
        { success: false, error: rawMsg, requestId },
        { status: 400 }
      );
    }
    return sanitizeAdminError(error, 'Failed to create knowledge entity.', 500, requestId);
  }
}

