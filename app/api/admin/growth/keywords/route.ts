import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getKeywords, saveKeywordRecord } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const keywords = await getKeywords();
    return NextResponse.json({ success: true, keywords });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch growth keywords.');
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
    if (!body || !body.keyword) {
      return NextResponse.json({ success: false, error: 'Keyword is required' }, { status: 400 });
    }

    const id = body.id || `kw_${body.keyword.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
    const kwRecord = {
      id,
      keyword: String(body.keyword).trim(),
      language: body.language || 'en',
      country: body.country || 'India',
      state: body.state || undefined,
      district: body.district || undefined,
      city: body.city || undefined,
      category: body.category || undefined,
      productId: body.productId || undefined,
      searchVolume: typeof body.searchVolume === 'number' ? body.searchVolume : null,
      competition: body.competition || 'MEDIUM',
      cpc: typeof body.cpc === 'number' ? body.cpc : null,
      trend: body.trend || 'STABLE',
      sourceTier: body.sourceTier || 'IMPORTED',
      sourceName: body.sourceName || 'Manual Entry',
      collectedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveKeywordRecord(kwRecord);
    return NextResponse.json({ success: true, keyword: kwRecord });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to save keyword record.');
  }
}
