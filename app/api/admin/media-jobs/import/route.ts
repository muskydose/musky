import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getMediaJobById } from '@/lib/growth/media-jobs-engine';
import { executeUniversalMediaJob } from '@/lib/growth/media-execution-engine';
import { ManualAiStudioProvider } from '@/lib/ai/visual-engine';
import { validateUploadBuffer } from '@/lib/media/upload-validator';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const formData = await req.formData();
    const jobId = String(formData.get('jobId') || '').trim();
    const file = formData.get('file') as File | null;

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'jobId is required' }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ success: false, error: 'Image file is required' }, { status: 400 });
    }

    const job = await getMediaJobById(jobId);
    if (!job) {
      return NextResponse.json({ success: false, error: 'Media job not found' }, { status: 404 });
    }
    if (!['PENDING', 'WAITING_PROVIDER'].includes(job.status)) {
      return NextResponse.json(
        { success: false, error: `Job is not importable in current state: ${job.status}` },
        { status: 409 }
      );
    }
    if (job.strategy !== 'AI' && job.strategy !== 'TEMPORARY') {
      return NextResponse.json(
        { success: false, error: 'Free AI Studio import is only allowed for AI/TEMPORARY jobs.' },
        { status: 409 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const validation = await validateUploadBuffer(buffer, job.slotKey, file.type);
    if (!validation.isValid || validation.verdict === 'ERROR') {
      return NextResponse.json(
        { success: false, error: 'Imported image failed canonical media validation.', validationResult: validation },
        { status: 400 }
      );
    }

    const result = await executeUniversalMediaJob({
      jobId: job.id,
      entityType: job.entityType,
      entityId: job.entityId,
      slotKey: job.slotKey,
      strategy: job.strategy,
      provider: new ManualAiStudioProvider(),
      workerId: 'free-ai-studio-import',
      promptOverride: job.blueprintPrompt || undefined,
      imageBuffer: buffer,
      imageMimeType: validation.metadata.mimeType || file.type,
      imageFileName: file.name,
    });

    if (result.status !== 'COMPLETED') {
      return NextResponse.json(
        { success: false, result, error: result.errorMessage || `Media job ended in ${result.status}` },
        { status: result.status === 'WAITING_PROVIDER' ? 503 : 409 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: 'manual-studio',
      cost: '₹0',
      result,
      validationResult: validation,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Free AI Studio import failed.');
  }
}
