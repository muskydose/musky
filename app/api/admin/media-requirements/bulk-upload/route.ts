import { NextRequest, NextResponse } from 'next/server';
import { processBulkImportItem, BulkImportItemResult } from '@/lib/media/bulk-import-engine';
import { resetMediaCache } from '@/lib/db/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll('files') as File[];
    const isRealOwnerPhoto = formData.get('isRealOwnerPhoto') === 'true';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided for bulk upload' }, { status: 400 });
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

    return NextResponse.json({
      success: true,
      totalProcessed: files.length,
      assignedCount,
      unmatchedCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    console.error('[BulkUploadRoute] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

