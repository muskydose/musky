import { NextRequest, NextResponse } from 'next/server';
import { scanAndRepairBrokenMedia } from '@/lib/growth/media-health-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const summary = await scanAndRepairBrokenMedia();
    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error: any) {
    console.error('[MediaHealthCheckRoute] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

