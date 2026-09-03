// ============================================================
// MUSKY DOSE — PUBLIC HEALTH ENDPOINT (LAYERED)
// Ultra-Lightweight Uptime & Guardian Heartbeat Ping
// ============================================================

import { NextResponse } from 'next/server';
import { WebsiteGuardian } from '@/lib/guardian/guardian-core';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await WebsiteGuardian.getTelemetrySummary();
    const isDown = summary.overallStatus === 'DOWN';

    return NextResponse.json(
      {
        status: isDown ? 'DOWN' : 'UP',
        service: 'musky-dose',
        guardianStatus: summary.overallStatus,
        heartbeatStatus: summary.heartbeatStatus,
        layeredHealth: summary.layeredHealth,
        lastRunAt: summary.lastRunAt,
        timestamp: new Date().toISOString(),
      },
      { status: isDown ? 503 : 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: 'UP',
        service: 'musky-dose',
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }
}
