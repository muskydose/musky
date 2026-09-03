// ============================================================
// MUSKY DOSE — ADMIN GUARDIAN MANUAL RUN API
// Triggers On-Demand Diagnostic Audit Cycle from Admin UI
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { WebsiteGuardian } from '@/lib/guardian/guardian-core';
import { guardianStore } from '@/lib/guardian/guardian-store';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = host ? `${protocol}://${host}` : undefined;

    const summary = await WebsiteGuardian.executeFullDiagnosticCycle(baseUrl);
    const recentChecks = guardianStore.getRecentChecks();

    return NextResponse.json({
      success: true,
      message: 'Website Guardian diagnostic audit completed successfully',
      summary,
      recentChecks,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'POST /api/admin/guardian/run');
  }
}

