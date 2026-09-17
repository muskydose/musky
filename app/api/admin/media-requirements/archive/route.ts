import { NextResponse } from 'next/server';
import { archiveLegacyMediaRecords } from '@/lib/growth/media-replacement-engine';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await archiveLegacyMediaRecords();
    return NextResponse.json({
      success: true,
      message: `Safely archived ${result.archivedCount} legacy/stock assets. Preserved ${result.preservedCount} brand assets.`,
      result,
    });
  } catch (error: any) {
    console.error('Failed to archive legacy media:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

