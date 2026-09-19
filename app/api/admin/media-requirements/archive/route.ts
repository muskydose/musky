import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { archiveLegacyMediaRecords } from '@/lib/growth/media-replacement-engine';
import { recordAuditLog } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const result = await archiveLegacyMediaRecords();
    await recordAuditLog({
      action: 'MEDIA_LEGACY_ARCHIVE',
      resource: 'media-requirements',
      details: {
        archivedCount: result.archivedCount,
        preservedCount: result.preservedCount,
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: `Safely archived ${result.archivedCount} legacy/stock assets. Preserved ${result.preservedCount} brand assets.`,
      result,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to archive legacy media.');
  }
}

