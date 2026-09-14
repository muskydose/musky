import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAdminAuthAndCsrf } from '@/lib/admin-middleware';
import { recordAuditLog } from '@/lib/auth';
import { sanitizeAdminError } from '@/lib/api-errors';
import { getSupabaseAdmin } from '@/lib/supabase';
import {
  MediaAsset,
  MediaEntityType,
  MediaAssetRole,
  MediaAssetStatus,
  getAllMediaAssetsRaw,
  saveMediaAsset,
  updateMediaAsset,
  archiveMediaAsset,
  setPrimaryMedia,
  findAssetByHash,
} from '@/lib/db/media';

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
];

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  if (mimeType === 'image/webp') {
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  if (mimeType === 'image/avif') {
    const ftyp = buffer.toString('ascii', 4, 12);
    return ftyp.includes('ftyp') || ftyp.includes('avif') || ftyp.includes('mif1');
  }
  if (mimeType === 'image/svg+xml') {
    const head = buffer.toString('utf-8', 0, Math.min(buffer.length, 512)).toLowerCase();
    return head.includes('<svg') || head.includes('<?xml');
  }
  if (mimeType === 'video/mp4') {
    const ftyp = buffer.toString('ascii', 4, 16);
    return ftyp.includes('ftyp') || ftyp.includes('isom') || ftyp.includes('mp4');
  }
  if (mimeType === 'video/webm') {
    return buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3;
  }
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as MediaEntityType | null;
    const entityId = searchParams.get('entityId');
    const status = searchParams.get('status') as MediaAssetStatus | null;
    const role = searchParams.get('role') as MediaAssetRole | null;
    const source = searchParams.get('source');
    const search = searchParams.get('search')?.toLowerCase().trim();

    const { assets } = await getAllMediaAssetsRaw();

    let filtered = assets;

    if (entityType) {
      filtered = filtered.filter((a) => a.entityType === entityType);
    }
    if (entityId) {
      filtered = filtered.filter((a) => a.entityId === entityId);
    }
    if (status) {
      filtered = filtered.filter((a) => a.status === status);
    }
    if (role) {
      filtered = filtered.filter((a) => a.role === role);
    }
    if (source) {
      filtered = filtered.filter((a) => a.source === source);
    }
    if (search) {
      filtered = filtered.filter((a) => {
        return (
          a.fileName?.toLowerCase().includes(search) ||
          a.title?.toLowerCase().includes(search) ||
          a.altText?.toLowerCase().includes(search) ||
          a.url.toLowerCase().includes(search) ||
          a.entityId?.toLowerCase().includes(search)
        );
      });
    }

    return NextResponse.json({
      success: true,
      assets: filtered,
      count: filtered.length,
    });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to fetch media assets.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const contentTypeHeader = req.headers.get('content-type') || '';

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const entityType = ((formData.get('entityType') as string) || 'PRODUCT') as MediaEntityType;
      const entityId = (formData.get('entityId') as string) || undefined;
      const role = ((formData.get('role') as string) || 'GALLERY') as MediaAssetRole;
      const title = (formData.get('title') as string) || '';
      const altText = (formData.get('altText') as string) || '';
      const caption = (formData.get('caption') as string) || '';
      const isLocked = formData.get('isLocked') === 'true' || role === 'PRIMARY';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in request.' }, { status: 400 });
      }

      const isVideo = file.type.startsWith('video/');
      const MAX_SIZE = isVideo ? 25 * 1024 * 1024 : 16 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: `File size exceeds limit of ${isVideo ? '25MB' : '16MB'}.` },
          { status: 413 }
        );
      }

      const mimeType = file.type.toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          { success: false, error: `Unsupported MIME type: ${mimeType}` },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (!validateMagicBytes(buffer, mimeType)) {
        return NextResponse.json(
          { success: false, error: 'Security alert: File signature mismatch.' },
          { status: 400 }
        );
      }

      if (mimeType === 'image/svg+xml') {
        const svgContent = buffer.toString('utf-8').toLowerCase();
        if (
          svgContent.includes('<script') ||
          svgContent.includes('javascript:') ||
          svgContent.includes('onload=') ||
          svgContent.includes('onerror=') ||
          svgContent.includes('onclick=') ||
          svgContent.includes('<foreignobject')
        ) {
          return NextResponse.json(
            { success: false, error: 'Security alert: SVG file contains unsafe script or object tags.' },
            { status: 400 }
          );
        }
      }

      // Compute SHA-256 file hash
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check SHA-256 deduplication
      const existingSameHash = await findAssetByHash(fileHash);
      let publicUrl = existingSameHash ? existingSameHash.url : '';
      let storagePath = existingSameHash ? existingSameHash.storagePath : '';
      const bucketName = 'product-images';

      if (!existingSameHash) {
        const cleanName = sanitizeFileName(file.name);
        const folder = entityType.toLowerCase();
        storagePath = entityId
          ? `${folder}/${sanitizeFileName(entityId)}/${Date.now()}-${cleanName}`
          : `${folder}/${Date.now()}-${cleanName}`;

        const supabaseAdmin = getSupabaseAdmin();
        if (supabaseAdmin) {
          try {
            const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
              .from(bucketName)
              .upload(storagePath, buffer, {
                contentType: mimeType,
                upsert: true,
              });

            if (!uploadError && uploadData) {
              const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(storagePath);
              publicUrl = urlData.publicUrl;
            }
          } catch (storageErr) {
            console.error('Storage upload exception:', storageErr);
          }
        }
      }

      if (!publicUrl) {
        return NextResponse.json(
          { success: false, error: 'Failed to upload asset to storage.' },
          { status: 503 }
        );
      }

      // Save via canonical Media DAL
      const { asset, deduplicated } = await saveMediaAsset({
        entityType,
        entityId,
        url: publicUrl,
        storageBucket: bucketName,
        storagePath,
        fileHash,
        fileName: file.name,
        mimeType,
        fileSizeBytes: file.size,
        aspectRatio: '1:1',
        role,
        source: 'MANUAL_UPLOAD',
        status: 'approved',
        isLocked,
        title: title || file.name,
        altText: altText || title || file.name,
        caption: caption || undefined,
      });

      await recordAuditLog({
        action: 'MEDIA_ASSET_UPLOAD',
        resource: asset.id,
        details: { entityType, entityId, url: asset.url, deduplicated },
      });

      return NextResponse.json({
        success: true,
        asset,
        deduplicated,
      });
    }

    // JSON body registration
    const body = await req.json();
    const { entityType, entityId, url, role, title, altText, isLocked } = body;

    if (!url || !url.startsWith('http')) {
      return NextResponse.json({ success: false, error: 'Valid URL is required.' }, { status: 400 });
    }

    const { asset } = await saveMediaAsset({
      entityType: entityType || 'PRODUCT',
      entityId,
      url,
      role: role || 'GALLERY',
      source: 'EXTERNAL_IMPORT',
      status: 'approved',
      isLocked: Boolean(isLocked),
      title,
      altText,
    });

    await recordAuditLog({
      action: 'MEDIA_ASSET_REGISTER',
      resource: asset.id,
      details: { entityType, entityId, url },
    });

    return NextResponse.json({ success: true, asset });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to process media asset.');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const body = await req.json();
    const { id, status, role, isLocked, title, altText, caption, sortOrder, setPrimary } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Asset ID is required.' }, { status: 400 });
    }

    let updatedAsset: MediaAsset | null = null;

    if (setPrimary) {
      const { assets } = await getAllMediaAssetsRaw();
      const existing = assets.find((a) => a.id === id);
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Asset not found.' }, { status: 404 });
      }

      updatedAsset = await setPrimaryMedia({
        assetId: id,
        entityType: existing.entityType,
        entityId: existing.entityId,
        lockPrimary: isLocked !== undefined ? Boolean(isLocked) : existing.isLocked,
      });
    } else {
      updatedAsset = await updateMediaAsset(id, {
        status,
        role,
        isLocked,
        title,
        altText,
        caption,
        sortOrder,
      });
    }

    if (!updatedAsset) {
      return NextResponse.json({ success: false, error: 'Asset not found or failed to update.' }, { status: 404 });
    }

    await recordAuditLog({
      action: 'MEDIA_ASSET_UPDATE',
      resource: id,
      details: { status, role, isLocked },
    });

    return NextResponse.json({ success: true, asset: updatedAsset });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to update media asset.');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authCheck = requireAdminAuthAndCsrf(req);
    if (!authCheck.authenticated) {
      return authCheck.errorResponse!;
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Asset ID is required.' }, { status: 400 });
    }

    // Soft archive: status='archived', never drops data or storage file
    const success = await archiveMediaAsset(id);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Asset not found or already archived.' }, { status: 404 });
    }

    await recordAuditLog({
      action: 'MEDIA_ASSET_ARCHIVE',
      resource: id,
      details: { id },
    });

    return NextResponse.json({ success: true, archivedId: id });
  } catch (error: any) {
    return sanitizeAdminError(error, 'Failed to archive media asset.');
  }
}

