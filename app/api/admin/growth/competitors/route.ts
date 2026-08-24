import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getCompetitors, saveCompetitorRecord } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const competitors = await getCompetitors();
    return NextResponse.json({ success: true, competitors });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch competitors.');
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
    if (!body || !body.name) {
      return NextResponse.json({ success: false, error: 'Competitor name is required' }, { status: 400 });
    }

    const id = body.id || `comp_${Date.now()}`;
    const competitorRecord = {
      id,
      name: String(body.name).trim(),
      website: body.website || undefined,
      instagram: body.instagram || undefined,
      facebook: body.facebook || undefined,
      state: body.state || undefined,
      district: body.district || undefined,
      city: body.city || undefined,
      productCategories: Array.isArray(body.productCategories) ? body.productCategories : [],
      positioning: body.positioning || undefined,
      notes: body.notes || undefined,
      sourceTier: body.sourceTier || 'IMPORTED',
      sourceName: body.sourceName || 'Manual Entry',
      lastCheckedAt: new Date().toISOString(),
      createdAt: body.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveCompetitorRecord(competitorRecord);
    return NextResponse.json({ success: true, competitor: competitorRecord });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save competitor record.');
  }
}
