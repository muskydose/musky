// ============================================================================
// MUSKY DOSE — SEO INTELLIGENCE DAILY BRIEF CRON ENDPOINT
// Schedule: 30 2 * * * (Every day at 8:00 AM IST / 02:30 UTC via Vercel Cron)
// Mandatory: Authorization: Bearer <CRON_SECRET>
// Purpose: Daily SEO Brief & Intelligence Reporting (Does NOT re-run maintenance sweep)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { SeoIntelligenceEngine } from '@/lib/agent/seo-intelligence/seo-intelligence-engine';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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

    if (!secureCompare(bearerToken, cronSecret)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Invalid CRON_SECRET token' },
        { status: 401 }
      );
    }

    // 8:00 AM IST SEO Intelligence Brief:
    // 1. Ingests GSC 7-day vs previous 7-day query/page snapshots
    // 2. Evaluates deterministic opportunities (CTR, Ranking, Declines, Gaps, Links)
    // 3. Summarizes overnight Master Agent autonomous work
    // 4. Distinguishes Observed Data vs Recommendations vs Automatic Safe Actions vs Approval Required
    const engine = SeoIntelligenceEngine.getInstance();
    const brief = await engine.generateDailySeoBrief();

    return NextResponse.json({
      success: true,
      schedule: {
        cronUtc: '30 2 * * *',
        istExecutionTime: '08:00 AM IST daily',
        timezone: 'Asia/Kolkata (UTC+05:30)',
      },
      report: brief,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/seo-report');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

