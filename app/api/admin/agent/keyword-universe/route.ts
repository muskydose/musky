// ============================================================================
// MUSKY DOSE — KEYWORD UNIVERSE ADMIN API
// Provides full keyword registry telemetry, filters, and sweep controls
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { KeywordUniverseEngine } from '@/lib/agent/seo-intelligence/keyword-universe-engine';
import { KeywordUniverseStore } from '@/lib/agent/seo-intelligence/keyword-universe-store';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const store = KeywordUniverseStore.getInstance();
    await store.ensureLoaded();

    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source') as any;
    const intent = searchParams.get('intent') as any;
    const cluster = searchParams.get('cluster') as any;
    const language = searchParams.get('language') as any;
    const confidence = searchParams.get('confidence') as any;
    const search = searchParams.get('search') || undefined;

    const filtered = store.getFiltered({
      source,
      intent,
      cluster,
      language,
      confidence,
      search,
    });

    const summary = store.getSummaryStats();

    return NextResponse.json({
      success: true,
      summary,
      totalCount: filtered.length,
      keywords: filtered.slice(0, 200), // Return top 200 for UI performance
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'GET /api/admin/agent/keyword-universe');
  }
}

export async function POST(req: NextRequest) {
  try {
    const engine = KeywordUniverseEngine.getInstance();
    const result = await engine.runAutonomousKeywordSweep();
    const store = KeywordUniverseStore.getInstance();
    const summary = store.getSummaryStats();

    return NextResponse.json({
      success: true,
      sweepResult: result,
      summary,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'POST /api/admin/agent/keyword-universe');
  }
}
