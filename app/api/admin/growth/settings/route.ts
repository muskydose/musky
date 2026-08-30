import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getGrowthSettings, saveGrowthSettings } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const settings = await getGrowthSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch Growth AI settings.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    if (!body || !body.weights) {
      return NextResponse.json({ success: false, error: 'Invalid settings body' }, { status: 400 });
    }

    await saveGrowthSettings({
      weights: body.weights,
      minOrdersForScore: Number(body.minOrdersForScore || 1),
      staleDataDays: Number(body.staleDataDays || 14),
      aiEnabled: Boolean(body.aiEnabled),
      minConfidenceThreshold: Number(body.minConfidenceThreshold || 60),
    });

    await recordAuditLog({
      action: 'GROWTH_SETTINGS_UPDATE',
      resource: 'growth_settings',
    });

    const updated = await getGrowthSettings();
    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save Growth AI settings.');
  }
}
