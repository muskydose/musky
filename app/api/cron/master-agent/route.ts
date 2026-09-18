// ============================================================================
// MUSKY DOSE — AUTONOMOUS MASTER AGENT CRON ENDPOINT
// Schedule: */10 * * * * (Every 10 minutes via Vercel Cron)
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
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret) {
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
      if (!secureCompare(bearerToken, cronSecret)) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Invalid CRON_SECRET token' },
          { status: 401 }
        );
      }
    }

    const agent = MuskyDoseMasterAgent.getInstance();
    const summary = await agent.tick();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/cron/master-agent');
  }
}

