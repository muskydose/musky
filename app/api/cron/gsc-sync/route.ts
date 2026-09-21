import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SearchConsoleDataSourceAdapter, isSearchConsoleConfigured } from '@/lib/growth/sources/search-console-adapter';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 30; // 30 seconds max duration

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Missing or malformed Authorization header. Expected Bearer <token>',
        },
        { status: 401 }
      );
    }

    const bearerToken = authHeader.substring(7).trim();
    if (!bearerToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Empty Bearer token.',
        },
        { status: 401 }
      );
    }

    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: CRON_SECRET is not configured on server.',
        },
        { status: 401 }
      );
    }

    const isAuthorized = secureCompare(bearerToken, cronSecret);
    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: Invalid Bearer token.',
        },
        { status: 401 }
      );
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

