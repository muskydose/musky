// ============================================================
// MUSKY DOSE — ADMIN GUARDIAN TELEMETRY STATUS API
// Provides Live Reliability Metrics & Incidents to Admin Dashboard
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { WebsiteGuardian } from '@/lib/guardian/guardian-core';
import { guardianStore } from '@/lib/guardian/guardian-store';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const summary = await WebsiteGuardian.getTelemetrySummary();
    const recentChecks = guardianStore.getRecentChecks();

    return NextResponse.json({
      success: true,
      summary,
      recentChecks,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/admin/guardian/status');
  }
}

