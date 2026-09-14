import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { generateAndSaveVisualForEntity, VisualVariant } from '@/lib/ai/visual-engine';
import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { entityType, entityId, role, variant, promptOverride } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'Both entityType and entityId are required for AI visual generation.' },
        { status: 400 }
      );
    }

    // Call Provider-Agnostic Visual Engine (Async & Admin-triggered only)
    try {
      const result = await generateAndSaveVisualForEntity({
        entityType: entityType as MediaEntityType,
        entityId: String(entityId).trim(),
        role: (role as MediaAssetRole) || 'GALLERY',
        variant: variant as VisualVariant,
        promptOverride,
      });

      await recordAuditLog({
        action: 'AI_VISUAL_GENERATE',
        resource: result.asset.id,
        details: {
          entityType,
          entityId,
          variant,
          provider: result.provider,
          promptUsed: result.promptUsed,
          status: result.asset.status, // Strictly 'suggested'
        },
      });

      return NextResponse.json({
        success: true,
        asset: result.asset,
        promptUsed: result.promptUsed,
        provider: result.provider,
      });
    } catch (genError: any) {
      console.warn('AI Visual generation failed:', genError?.message);
      return NextResponse.json(
        {
          success: false,
          error: genError?.message || 'Failed to generate visual with AI provider.',
        },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to process visual generation request.');
  }
}

