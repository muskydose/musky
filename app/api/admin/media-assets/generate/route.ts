import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import {
  generateAndSaveVisualForEntity,
  getProviderCapabilities,
  composeVisualPrompt,
  VisualVariant,
} from '@/lib/ai/visual-engine';
import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';

/**
 * GET: Returns provider capabilities (free/local/paid tiers) and prompt preview
 */
export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as MediaEntityType | null;
    const entityId = searchParams.get('entityId');
    const variant = (searchParams.get('variant') as VisualVariant) || 'packshot';
    const role = (searchParams.get('role') as MediaAssetRole) || 'GALLERY';
    const promptOverride = searchParams.get('promptOverride') || undefined;

    const capabilities = await getProviderCapabilities();

    let promptPreview = null;
    if (entityType && entityId) {
      promptPreview = await composeVisualPrompt({
        entityType,
        entityId: entityId.trim(),
        variant,
        role,
        promptOverride,
      });
    }

    return NextResponse.json({
      success: true,
      capabilities,
      promptPreview,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to retrieve provider capabilities or prompt preview.');
  }
}

/**
 * POST: Generates or imports an AI visual via selected provider (Fail-closed & Free-First)
 */
export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const contentType = req.headers.get('content-type') || '';
    let entityType: MediaEntityType;
    let entityId: string;
    let role: MediaAssetRole = 'GALLERY';
    let variant: VisualVariant = 'packshot';
    let promptOverride: string | undefined;
    let providerId: string = 'manual-studio';
    let imageBuffer: Buffer | undefined;
    let imageMimeType: string | undefined;
    let imageFileName: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      entityType = formData.get('entityType') as MediaEntityType;
      entityId = (formData.get('entityId') as string) || '';
      role = ((formData.get('role') as MediaAssetRole) || 'GALLERY');
      variant = ((formData.get('variant') as VisualVariant) || 'packshot');
      promptOverride = (formData.get('promptOverride') as string) || undefined;
      providerId = (formData.get('providerId') as string) || 'manual-studio';

      const file = formData.get('file') as File | null;
      if (file && typeof file.arrayBuffer === 'function') {
        const arrayBuf = await file.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuf);
        imageMimeType = file.type || 'image/jpeg';
        imageFileName = file.name || `free-studio-${Date.now()}.jpg`;
      }
    } else {
      const body = await req.json();
      entityType = body.entityType as MediaEntityType;
      entityId = body.entityId ? String(body.entityId).trim() : '';
      role = (body.role as MediaAssetRole) || 'GALLERY';
      variant = (body.variant as VisualVariant) || 'packshot';
      promptOverride = body.promptOverride;
      providerId = body.providerId || 'manual-studio';
    }

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'Both entityType and entityId are required for AI visual processing.' },
        { status: 400 }
      );
    }

    // Call Provider-Agnostic Visual Engine (Async & Admin-triggered only)
    try {
      const result = await generateAndSaveVisualForEntity({
        entityType,
        entityId,
        role,
        variant,
        promptOverride,
        providerId,
        imageBuffer,
        imageMimeType,
        imageFileName,
      });

      await recordAuditLog({
        action: 'AI_VISUAL_GENERATE',
        resource: result.asset.id,
        details: {
          entityType,
          entityId,
          variant,
          provider: result.provider,
          tier: result.tier,
          cost: result.cost,
          promptUsed: result.promptUsed,
          status: result.asset.status, // Strictly 'suggested'
        },
      });

      return NextResponse.json({
        success: true,
        asset: result.asset,
        promptUsed: result.promptUsed,
        provider: result.provider,
        tier: result.tier,
        cost: result.cost,
      });
    } catch (genError: any) {
      console.warn('AI Visual generation failed:', genError?.message);
      return NextResponse.json(
        {
          success: false,
          error: genError?.message || 'Failed to process visual with selected provider.',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to process visual generation request.');
  }
}
