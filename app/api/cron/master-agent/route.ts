// ============================================================================
// MUSKY DOSE — AUTONOMOUS MASTER AGENT CRON ENDPOINT
// Schedule: 30 20 * * * (Every 24 hours at 20:30 UTC / 2:00 AM IST via Vercel Cron)
// Mandatory: Authorization: Bearer <CRON_SECRET>
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { MuskyDoseMasterAgent } from '@/lib/agent/master-agent';
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

    const agent = MuskyDoseMasterAgent.getInstance();
    // Daily Autonomous Maintenance Sweep (True Enqueue-Only Dispatcher):
    // 1. Reclaims stuck task leases
    // 2. Observes full system context & refreshes health scores
    // 3. Enqueues prioritized, dependency-ordered safe maintenance tasks
    // 4. Returns immediately without inline worker execution (<50ms)
    // Durable execution is processed asynchronously by the background queue drainer
    const sweep = await agent.runDailyAutonomousSweep({
      enqueueOnly: true,
    });

    return NextResponse.json({
      success: true,
      service: 'musky-dose-master-agent',
      timestamp: new Date().toISOString(),
      dispatched: true,
      schedule: sweep.schedule,
      summary: sweep,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/master-agent');
  }
}

