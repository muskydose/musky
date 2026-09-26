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

    // 2. Dispatch through Central Execution Queue
    const dateDayKey = new Date().toISOString().slice(0, 10);
    const queue = (await import('@/lib/agent/central-queue')).CentralExecutionQueue.getInstance();
    const task = await queue.enqueue({
      domain: 'SEO',
      action: 'GENERATE_SEO_BRIEF',
      lane: 'BACKGROUND',
      worker: 'seo_guardian',
      priority: 80,
      idempotencyKey: `cron-seo-report-${dateDayKey}`,
      title: 'Scheduled Daily SEO Intelligence Brief',
    });

    const executionSummary = await queue.executeSingleTask(task);

    return NextResponse.json({
      success: executionSummary.status === 'COMPLETED',
      schedule: {
        cronUtc: '30 2 * * *',
        istExecutionTime: '08:00 AM IST daily',
        timezone: 'Asia/Kolkata (UTC+05:30)',
      },
      report: task.result?.brief || executionSummary,
      executionSummary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/seo-report');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

