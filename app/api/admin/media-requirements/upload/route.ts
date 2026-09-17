import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, getSupabase } from '@/lib/supabase';
import { validateUploadBuffer } from '@/lib/media/upload-validator';
import { MediaEntityType, MediaAssetRole } from '@/lib/db/media';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const entityType = (formData.get('entityType') as string || 'PRODUCT').toUpperCase() as MediaEntityType;
    const entityId = formData.get('entityId') as string || 'global';
    const slotKey = formData.get('slotKey') as string || '';
    const role = (formData.get('role') as string || 'PRIMARY') as MediaAssetRole;
    const autoApprove = formData.get('autoApprove') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Rigorous Image Validation (binary, decode, dimensions, aspect ratio, hash)
    const validationResult = await validateUploadBuffer(buffer, slotKey, file.type);

    if (!validationResult.isValid || validationResult.verdict === 'ERROR') {
      return NextResponse.json({
        success: false,
        error: 'Validation failed. Upload rejected.',
        validationResult,
      }, { status: 400 });
    }

    const supabase = getSupabaseAdmin() || getSupabase();
    if (!supabase) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 });
    }

    // 2. Upload to Supabase Storage
    const ext = validationResult.metadata.format || 'webp';
    const cleanEntityId = entityId.replace(/[^a-zA-Z0-9_-]/g, '-');
    const storagePath = `manual/${entityType.toLowerCase()}/${cleanEntityId}-${role.toLowerCase()}-${Date.now()}.${ext}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('product-images')
      .upload(storagePath, buffer, {
        contentType: validationResult.metadata.mimeType,
        cacheControl: '31536000',
        upsert: true,
      });

    if (uploadErr) {
      return NextResponse.json({
        success: false,
        error: `Storage upload failed: ${uploadErr.message}`,
        validationResult,
      }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(storagePath);

    const publicUrl = urlData.publicUrl;

    // 3. Create media_assets record
    const assetId = `med-manual-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const newAssetRow = {
      id: assetId,
      entity_type: entityType,
      entity_id: entityId,
      url: publicUrl,
      storage_path: storagePath,
      storage_bucket: 'product-images',
      file_hash: validationResult.metadata.hash,
      file_name: file.name,
      mime_type: validationResult.metadata.mimeType,
      file_size_bytes: validationResult.metadata.byteLength,
      width: validationResult.metadata.width,
      height: validationResult.metadata.height,
      aspect_ratio: validationResult.metadata.aspectRatio,
      role,
      source: 'MANUAL_UPLOAD',
      status: autoApprove ? 'approved' : 'suggested',
      is_locked: autoApprove && role === 'PRIMARY',
      title: `${entityType} ${role} Asset`,
      altText: `${entityType} ${role} image`,
      sort_order: role === 'PRIMARY' ? 1 : 10,
      visual_context: {
        slotKey,
        manualUpload: true,
        originalFileName: file.name,
      },
      ai_metadata: {
        validation: validationResult,
        uploadedAt: now,
      },
      created_at: now,
      updated_at: now,
    };

    const { data: insertData, error: insertErr } = await supabase
      .from('media_assets')
      .insert(newAssetRow)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({
        success: false,
        error: `Database record creation failed: ${insertErr.message}`,
        validationResult,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      asset: insertData,
      validationResult,
    });
  } catch (error: any) {
    console.error('Failed to upload manual media:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

