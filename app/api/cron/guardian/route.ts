// ============================================================
// MUSKY DOSE — CRON GUARDIAN ENDPOINT (PRODUCTION HARDENED)
// Scheduled Synthetic Reliability & Health Monitoring Webhook
// Supports: Authorization: Bearer <CRON_SECRET> ONLY (No query string tokens)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { WebsiteGuardian } from '@/lib/guardian/guardian-core';
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
    // 1. Strict Authorization check: Bearer token in header ONLY
    const isVercelCron = req.headers.get('x-vercel-cron') === '1';
    const authHeader = req.headers.get('authorization') || '';
    const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.substring(7).trim() : '';

    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && !isVercelCron) {
      if (!bearerToken) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized. Provide Authorization: Bearer <CRON_SECRET> header.',
          },
          { status: 401 }
        );
      }

      const isAuthorized = secureCompare(bearerToken, cronSecret);
      if (!isAuthorized) {
        return NextResponse.json(
          {
            success: false,
            error: 'Unauthorized. Invalid Bearer token.',
          },
          { status: 401 }
        );
      }
    }

    // 2. Execute full Guardian cycle
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : undefined;

    const summary = await WebsiteGuardian.executeFullDiagnosticCycle(baseUrl);

    return NextResponse.json({
      success: true,
      service: 'musky-dose-guardian',
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/guardian');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
