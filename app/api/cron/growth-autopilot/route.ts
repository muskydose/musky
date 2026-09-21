// ============================================================================
// MUSKY DOSE — AUTONOMOUS GROWTH AUTOPILOT SCHEDULED CRON ENDPOINT
// Schedule: 0 3 * * * (Daily at 03:00 UTC / 08:30 AM IST via Vercel Cron)
// Mandatory: Authorization: Bearer <CRON_SECRET> (Strict fail-closed)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { runAutopilotCycle } from '@/lib/growth/autopilot-engine';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max execution duration

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Mandatory Authorization Header Check (Strictly NO bypass in production)
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

    // 2. Execute Full Autonomous Growth Cycle
    const summary = await runAutopilotCycle();

    return NextResponse.json({
      success: summary.status === 'COMPLETED' || summary.status.startsWith('SKIPPED'),
      service: 'musky-dose-growth-autopilot',
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/growth-autopilot');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

