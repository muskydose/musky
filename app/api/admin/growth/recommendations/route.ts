import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { generateGrowthRecommendations } from '@/lib/growth/recommendations';
import { getRecommendations, saveRecommendation } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }

    const recommendations = await getRecommendations();
    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch recommendations.');
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

    const recommendations = await generateGrowthRecommendations();
    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to generate recommendations.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json({ success: false, error: 'Unauthorized admin access' }, { status: 401 });
    }
    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json({ success: false, error: 'Forbidden: CSRF / Origin mismatch' }, { status: 403 });
    }

    const body = await req.json();
    if (!body || !body.id || !body.status) {
      return NextResponse.json({ success: false, error: 'Recommendation ID and new status required' }, { status: 400 });
    }

    const existing = (await getRecommendations()).find((r) => r.id === body.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });
    }

    const updated = {
      ...existing,
      status: body.status,
      updatedAt: new Date().toISOString(),
    };

    await saveRecommendation(updated);
    return NextResponse.json({ success: true, recommendation: updated });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to update recommendation status.');
  }
}
