import { NextRequest, NextResponse } from 'next/server';
import { performZeroDowntimeReplacement } from '@/lib/growth/media-replacement-engine';
import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
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

    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    console.error('Failed to assign media slot:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

