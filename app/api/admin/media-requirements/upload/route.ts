import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { validateUploadBuffer } from '@/lib/media/upload-validator';
import { MediaEntityType, MediaAssetRole, resetMediaCache, saveMediaAsset } from '@/lib/db/media';
import { performZeroDowntimeReplacement } from '@/lib/growth/media-replacement-engine';
import { generateMediaDerivative } from '@/lib/media/derived-media-engine';
import { reconcileCanonicalSlot } from '@/lib/growth/media-specs';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) return authCheck.errorResponse!;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const entityType = ((formData.get('entityType') as string) || 'PRODUCT').toUpperCase() as MediaEntityType;
    const entityId = (formData.get('entityId') as string) || 'global';
    const rawSlot = (formData.get('slotKey') as string) || '';
    const isRealOwnerPhoto = formData.get('isRealOwnerPhoto') === 'true' || formData.get('isRealOwner') === 'true';
    const autoApprove = formData.get('autoApprove') !== 'false';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const spec = reconcileCanonicalSlot(rawSlot, entityType);
    const role = (spec.role || 'PRIMARY') as MediaAssetRole;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Rigorous Image Validation (magic bytes, decode, dimensions, aspect ratio, hash)
    const validationResult = await validateUploadBuffer(buffer, spec.slotKey, file.type);

    if (!validationResult.isValid || validationResult.verdict === 'ERROR') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed. Upload rejected.',
          validationResult,
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Upload to Supabase Storage
    const ext = validationResult.metadata.format || 'webp';
    const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, '-');
    const storagePath = `manual/${entityType.toLowerCase()}/${cleanEntityId}-${spec.slotKey.toLowerCase()}-${Date.now()}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: validationResult.metadata.mimeType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json(
        {
          success: false,
          error: `Storage upload failed: ${uploadErr.message}`,
          validationResult,
        },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // 3. Create canonical media_assets record
    const isPrimary = role === 'PRIMARY';
    const assetOrigin = isRealOwnerPhoto || isPrimary ? 'real_owner_photo' : 'manual_approved';

    let savedAsset: any = null;
    try {
      const res = await saveMediaAsset({
        entityType,
        entityId,
        url: publicUrl,
        storagePath,
        storageBucket: 'product-images',
        fileHash: validationResult.metadata.hash,
        fileName: file.name,
        mimeType: validationResult.metadata.mimeType,
        fileSizeBytes: validationResult.metadata.byteLength,
        width: validationResult.metadata.width,
        height: validationResult.metadata.height,
        aspectRatio: validationResult.metadata.aspectRatio,
        role,
        source: 'MANUAL_UPLOAD',
        status: autoApprove ? 'approved' : 'suggested',
        isLocked: isPrimary || isRealOwnerPhoto,
        assetOrigin,
        slotKey: spec.slotKey,
        title: `${entityType} ${spec.displayName} Asset`,
        altText: `${entityType} ${spec.displayName.toLowerCase()}`,
        sortOrder: isPrimary ? 1 : 10,
        visualContext: {
          slotKey: spec.slotKey,
          manualUpload: true,
          originalFileName: file.name,
          isRealOwnerPhoto: assetOrigin === 'real_owner_photo',
        },
      });
      savedAsset = res.asset;
    } catch (saveErr: any) {
      // Compensating rollback: Remove uploaded storage file to prevent storage orphans
      console.warn(`[UploadRoute] Compensating rollback for storage orphan ${storagePath}:`, saveErr.message);
      await supabase.storage.from('product-images').remove([storagePath]).catch(() => {});
      return NextResponse.json(
        {
          success: false,
          error: `Database record creation failed: ${saveErr.message}. Storage orphan safely rolled back.`,
          validationResult,
        },
        { status: 500 }
      );
    }

    // 4. If approved PRIMARY, perform zero-downtime switch and auto-derive OpenGraph & thumbnail
    const derivatives: string[] = [];
    if (autoApprove && isPrimary) {
      await performZeroDowntimeReplacement({
        entityType,
        entityId,
        role: 'PRIMARY',
        newAssetId: savedAsset.id,
        consumingRoute: `/${entityType.toLowerCase()}s/${entityId}`,
        reason: 'admin_real_photo_upload',
      });

      // Derive OG and Thumbnail from master
      try {
        const ogRes = await generateMediaDerivative({
          masterAsset: savedAsset,
          derivativeType: 'OPENGRAPH',
          sourceBuffer: buffer,
        });
        derivatives.push(`OPENGRAPH: ${ogRes.asset.id}`);

        const thumbRes = await generateMediaDerivative({
          masterAsset: savedAsset,
          derivativeType: 'THUMBNAIL',
          sourceBuffer: buffer,
        });
        derivatives.push(`THUMBNAIL: ${thumbRes.asset.id}`);
      } catch (derivErr: any) {
        console.warn(`[UploadRoute] Derivative creation notice for ${savedAsset.id}:`, derivErr.message);
      }
    }

    resetMediaCache();

    await recordAuditLog({
      action: 'MEDIA_REQUIREMENT_UPLOAD',
      resource: savedAsset.id,
      details: {
        entityType,
        entityId,
        slotKey: spec.slotKey,
        role,
        autoApprove,
        isRealOwnerPhoto,
        derivatives,
      },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      asset: savedAsset,
      derivatives,
      validationResult,
    });
  } catch (error: any) {
    console.error('Failed to upload manual media:', error);
    return sanitizeAdminError(error, 'Failed to upload manual media.');
  }
}
