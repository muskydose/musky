import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getCompetitors, saveCompetitorRecord } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const competitors = await getCompetitors();
    return NextResponse.json({ success: true, competitors });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch competitors.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    if (!body || !body.name) {
      return NextResponse.json({ success: false, error: 'Competitor name is required' }, { status: 400 });
    }

    const id = body.id || `comp_${Date.now()}`;
    const competitorRecord = {
      id,
      name: String(body.name).trim().substring(0, 150),
      website: body.website ? String(body.website).trim().substring(0, 255) : undefined,
      instagram: body.instagram ? String(body.instagram).trim().substring(0, 100) : undefined,
      facebook: body.facebook ? String(body.facebook).trim().substring(0, 100) : undefined,
      state: body.state ? String(body.state).trim().substring(0, 100) : undefined,
      district: body.district ? String(body.district).trim().substring(0, 100) : undefined,
      city: body.city ? String(body.city).trim().substring(0, 100) : undefined,
      productCategories: Array.isArray(body.productCategories) ? body.productCategories.slice(0, 50) : [],
      positioning: body.positioning ? String(body.positioning).trim().substring(0, 255) : undefined,
      notes: body.notes ? String(body.notes).trim().substring(0, 2000) : undefined,
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
