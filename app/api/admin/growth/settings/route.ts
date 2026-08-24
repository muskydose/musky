import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin, recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getGrowthSettings, saveGrowthSettings } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const settings = await getGrowthSettings();
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch Growth AI settings.');
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }
    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden: CSRF / Origin mismatch' }, { status: 403 });
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
