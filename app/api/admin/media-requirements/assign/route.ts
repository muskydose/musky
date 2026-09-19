import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { performZeroDowntimeReplacement } from '@/lib/growth/media-replacement-engine';
import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';
import { recordAuditLog } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const body = await req.json();
    const { entityType, entityId, role, assetId, consumingRoute, reason } = body;

    if (!entityType || !entityId || !role || !assetId) {
      return NextResponse.json({ error: 'Missing required parameters (entityType, entityId, role, assetId)' }, { status: 400 });
    }

    const result = await performZeroDowntimeReplacement({
      entityType: entityType as MediaEntityType,
      entityId,
      role: role as MediaAssetRole,
      newAssetId: assetId,
      consumingRoute: consumingRoute || `/products/${entityId}`,
      reason: reason || 'admin_assigned_slot',
    });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    await recordAuditLog({
      action: 'MEDIA_SLOT_ASSIGN',
      resource: assetId,
      details: {
        entityType,
        entityId,
        role,
        consumingRoute: consumingRoute || `/products/${entityId}`,
        reason: reason || 'admin_assigned_slot',
        previousAssetId: result.previousAssetId || null,
      },
    }).catch(() => null);

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to assign media slot.');
  }
}

