import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMediaJobById } from '@/lib/growth/media-jobs-engine';
import { composeVisualPrompt } from '@/lib/growth/visual-prompt-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const jobId = String(req.nextUrl.searchParams.get('jobId') || '').trim();
    if (!jobId) return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });

    const job = await getMediaJobById(jobId);
    if (!job) return NextResponse.json({ success: false, error: 'Media job not found' }, { status: 404 });

    const promptResult = await composeVisualPrompt({
      entityType: job.entityType,
      entityId: job.entityId,
      role: job.role as any,
      hasSuppliedReferenceImage: false,
    });

    return NextResponse.json({
      success: true,
      jobId,
      entityType: job.entityType,
      entityId: job.entityId,
      slotKey: job.slotKey,
      aspectRatio: promptResult.aspectRatio,
      prompt: promptResult.finalPrompt,
      negativePrompt: 'ugly, blurry, low resolution, distorted anatomy, warped packaging, invented logos, invented labels, watermark, text artifacts',
      facts: promptResult.facts,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to build media prompt.');
  }
}
