// ============================================================
// MUSKY DOSE — CRON GUARDIAN ENDPOINT (STRICT AUTHENTICATION)
// Scheduled Synthetic Reliability & Health Monitoring Webhook
// Mandatory: Authorization: Bearer <CRON_SECRET> (No bypasses)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { WebsiteGuardian } from '@/lib/guardian/guardian-core';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max duration (aligned with master-agent and seo-report)

function secureCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  try {
    // 1. Mandatory Authorization Header Check (Strictly NO bypass)
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

    // 2. Dispatch through Central Execution Queue
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : undefined;
    const dateHourKey = new Date().toISOString().slice(0, 13);

    const queue = (await import('@/lib/agent/central-queue')).CentralExecutionQueue.getInstance();
    const task = await queue.enqueue({
      domain: 'GUARDIAN',
      action: 'SYNTHETIC_DIAGNOSTIC_SWEEP',
      lane: 'MAINTENANCE',
      worker: 'website_guardian',
      priority: 95,
      idempotencyKey: `cron-guardian-${dateHourKey}`,
      title: 'Scheduled Synthetic Route & Integrity Diagnostic Sweep',
      input: { baseUrl },
    });

    const executionSummary = await queue.executeSingleTask(task);

    return NextResponse.json({
      success: executionSummary.status === 'COMPLETED',
      service: 'musky-dose-guardian',
      timestamp: new Date().toISOString(),
      summary: (task.result?.summary as any) || executionSummary,
      executionSummary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/guardian');
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
