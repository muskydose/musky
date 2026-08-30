import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { generateGrowthRecommendations } from '@/lib/growth/recommendations';
import { getRecommendations, saveRecommendation } from '@/lib/growth/growth-db';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const recommendations = await getRecommendations();
    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch recommendations.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const recommendations = await generateGrowthRecommendations();
    return NextResponse.json({ success: true, recommendations });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to generate recommendations.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
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
