import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { processBulkImportItem, BulkImportItemResult } from '@/lib/media/bulk-import-engine';
import { resetMediaCache } from '@/lib/db/media';
import { recordAuditLog } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_FILES = 20;
const MAX_FILE_SIZE_BYTES = 16 * 1024 * 1024;
const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const formData = await req.formData();
    const files = formData.getAll('files').filter((item): item is File => item instanceof File);
    const isRealOwnerPhoto = formData.get('isRealOwnerPhoto') === 'true';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for bulk upload' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Bulk upload is limited to ${MAX_FILES} files per request.` },
        { status: 413 }
      );
    }

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const oversizedFile = files.find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFile) {
      return NextResponse.json(
        { error: `File "${oversizedFile.name}" exceeds the 16MB per-file bulk upload limit.` },
        { status: 413 }
      );
    }

    if (totalSize > MAX_TOTAL_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'Bulk upload total payload exceeds the 100MB limit.' },
        { status: 413 }
      );
    }

    const results: BulkImportItemResult[] = [];
    let assignedCount = 0;
    let unmatchedCount = 0;
    let failedCount = 0;

    for (const file of files) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const itemRes = await processBulkImportItem({
          filename: file.name,
          buffer,
          providedMime: file.type,
          isRealOwnerPhoto,
        });

        results.push(itemRes);
        if (itemRes.status === 'ASSIGNED') assignedCount++;
        else if (itemRes.status === 'UNMATCHED_REVIEW') unmatchedCount++;
        else failedCount++;
      } catch (itemErr: any) {
        results.push({
          fileName: file.name,
          status: 'ERROR',
          reason: itemErr.message || 'Unexpected processing error',
        });
        failedCount++;
      }
    }

    resetMediaCache();

    await recordAuditLog({
      action: 'MEDIA_BULK_UPLOAD',
      resource: 'media-requirements',
      details: {
        totalProcessed: files.length,
        assignedCount,
        unmatchedCount,
        failedCount,
        isRealOwnerPhoto,
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      totalProcessed: files.length,
      assignedCount,
      unmatchedCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to process media bulk upload.');
  }
}

