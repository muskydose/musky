import { NextRequest, NextResponse } from 'next/server';
import { SearchConsoleDataSourceAdapter, isSearchConsoleConfigured } from '@/lib/growth/sources/search-console-adapter';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max duration

export async function GET(req: NextRequest) {
  try {
    // Check optional CRON_SECRET if configured
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: 'Unauthorized cron trigger' }, { status: 401 });
    }

    if (!isSearchConsoleConfigured()) {
      return NextResponse.json({
        success: true,
        status: 'NOT_CONFIGURED',
        message: 'GSC not configured in environment. Automated sync skipped cleanly.',
        recordsImported: 0,
      });
    }

    const adapter = new SearchConsoleDataSourceAdapter();
    const conn = await adapter.checkConnection();
    if (!conn.connected) {
      return NextResponse.json({
        success: false,
        status: conn.status,
        message: conn.message,
        recordsImported: 0,
      });
    }

    const syncResult = await adapter.sync();

    return NextResponse.json({
      success: syncResult.success,
      status: 'CONNECTED',
      message: `GSC sync completed in ${syncResult.durationMs}ms.`,
      recordsImported: syncResult.recordsImported,
      lastSyncedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/gsc-sync');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

