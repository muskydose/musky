import { NextRequest, NextResponse } from 'next/server';
import { isRequestAdminAuthenticated, verifyAdminCsrfAndOrigin, recordAuditLog } from '@/lib/auth';
import { getSiteSettings, updateSiteSettings } from '@/lib/db/settings';
import { getProducts } from '@/lib/db/products';
import { getCategories } from '@/lib/db/categories';
import { getSupabaseAdmin } from '@/lib/supabase';
import { MediaItem } from '@/lib/types';

// Helper to sanitize filenames
function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '-')
    .replace(/-+/g, '-');
}

// Module-level cache to prevent checking storage buckets on every single upload
let isBucketInitialized = false;

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  // JPEG
  if (mimeType === 'image/jpeg' || mimeType === 'image/jpg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  // PNG
  if (mimeType === 'image/png') {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  }
  // WEBP (RIFF)
  if (mimeType === 'image/webp') {
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }
  // AVIF
  if (mimeType === 'image/avif') {
    const ftyp = buffer.toString('ascii', 4, 12);
    return ftyp.includes('ftyp') || ftyp.includes('avif') || ftyp.includes('mif1');
  }
  // SVG
  if (mimeType === 'image/svg+xml') {
    const head = buffer.toString('utf-8', 0, Math.min(buffer.length, 512)).toLowerCase();
    return head.includes('<svg') || head.includes('<?xml');
  }

  return true;
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/svg+xml',
];

// Helper to scan references across the site
async function scanMediaUsage(url: string, mediaId: string) {
  const usedIn: string[] = [];

  try {
    const products = await getProducts();
    for (const p of products) {
      if (p.images && Array.isArray(p.images)) {
        if (p.images.some((img) => img === url || (mediaId && img.includes(mediaId)))) {
          usedIn.push(`Product: ${p.name}`);
        }
      }
    }

    const categories = await getCategories();
    for (const c of categories) {
      if (c.image && (c.image === url || (mediaId && c.image.includes(mediaId)))) {
        usedIn.push(`Category: ${c.name}`);
      }
    }

    const siteSettings = await getSiteSettings();
    if (siteSettings.logoUrl === url) usedIn.push('Brand Logo');
    if (siteSettings.faviconUrl === url) usedIn.push('Brand Favicon');
    if (siteSettings.heroImageUrl === url) usedIn.push('Homepage Hero Banner');
    if (siteSettings.factoryImageUrl === url) usedIn.push('Factory Story Banner');
    if (siteSettings.ogImageUrl === url) usedIn.push('SEO / OG Share Image');
  } catch (err) {
    console.warn('Error scanning media usage:', err);
  }

  return usedIn;
}

export async function GET(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    const siteSettings = await getSiteSettings();
    const mediaLibrary: MediaItem[] = siteSettings.mediaLibrary || [];

    const products = await getProducts();
    const categories = await getCategories();

    // Map through media items and update their real-time usage
    const updatedItems = mediaLibrary.map((item) => {
      const usedIn: string[] = [];

      for (const p of products) {
        if (p.images && p.images.includes(item.url)) {
          usedIn.push(`Product: ${p.name}`);
        }
      }

      for (const c of categories) {
        if (c.image === item.url) {
          usedIn.push(`Category: ${c.name}`);
        }
      }

      if (siteSettings.logoUrl === item.url) usedIn.push('Brand Logo');
      if (siteSettings.faviconUrl === item.url) usedIn.push('Brand Favicon');
      if (siteSettings.heroImageUrl === item.url) usedIn.push('Homepage Hero Banner');
      if (siteSettings.factoryImageUrl === item.url) usedIn.push('Factory Story Banner');
      if (siteSettings.ogImageUrl === item.url) usedIn.push('SEO / OG Share Image');

      return {
        ...item,
        usedIn: usedIn.length > 0 ? usedIn : item.usedIn || [],
      };
    });

    return NextResponse.json({
      success: true,
      mediaLibrary: updatedItems,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: CSRF / Origin mismatch' },
        { status: 403 }
      );
    }

    const contentTypeHeader = req.headers.get('content-type') || '';

    let mediaItem: MediaItem | null = null;

    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const category = (formData.get('category') as string) || 'general';
      const altText = (formData.get('altText') as string) || '';
      const customName = (formData.get('customName') as string) || '';
      const productId = (formData.get('productId') as string) || '';

      if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided in request' }, { status: 400 });
      }

      // Validate size (10MB hard limit)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { success: false, error: 'File size exceeds maximum limit of 10MB.' },
          { status: 400 }
        );
      }

      // Validate MIME type
      const mimeType = file.type.toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid file format (${file.type}). Allowed types: JPG, PNG, WEBP, AVIF, SVG.`,
          },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());

      // Validate file magic bytes signature
      if (!validateMagicBytes(buffer, mimeType)) {
        return NextResponse.json(
          { success: false, error: 'Security alert: File signature does not match declared MIME type.' },
          { status: 400 }
        );
      }

      // SVG sanitation check
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
            { success: false, error: 'Security alert: SVG file contains unsafe script or object content.' },
            { status: 400 }
          );
        }
      }

      let publicUrl = '';
      const cleanName = sanitizeFileName(customName || file.name);
      const storagePath = productId
        ? `products/${sanitizeFileName(productId)}/${Date.now()}-${cleanName}`
        : `${category}/${Date.now()}-${cleanName}`;
      const bucketName = 'product-images';

      // Upload to Supabase Storage
      const supabaseAdmin = getSupabaseAdmin();
      if (supabaseAdmin) {
        try {
          if (!isBucketInitialized) {
            const { data: buckets } = await supabaseAdmin.storage.listBuckets();
            const bucketExists = buckets?.some((b) => b.name === bucketName);
            if (!bucketExists) {
              await supabaseAdmin.storage.createBucket(bucketName, { public: true });
            }
            isBucketInitialized = true;
          }

          const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
            .from(bucketName)
            .upload(storagePath, buffer, {
              contentType: mimeType,
              upsert: true,
            });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabaseAdmin.storage
              .from(bucketName)
              .getPublicUrl(storagePath);
            publicUrl = urlData.publicUrl;
          } else if (uploadError) {
            console.error('Supabase storage upload error:', uploadError);
          }
        } catch (err) {
          console.error('Supabase storage upload exception:', err);
        }
      }

      // Return explicit error if storage upload failed rather than Base64 fallback in production
      if (!publicUrl) {
        return NextResponse.json(
          {
            success: false,
            error: 'Storage service unavailable. Failed to upload media file to cloud storage bucket.',
          },
          { status: 503 }
        );
      }

      mediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: customName || file.name,
        url: publicUrl,
        type: mimeType,
        size: file.size,
        category: category as any,
        altText,
        uploadedAt: new Date().toISOString(),
        usedIn: [],
      };
    } else {
      // JSON body (registering existing external HTTPS asset)
      const body = await req.json();
      const { name, url, category, altText, type, size } = body;

      if (!url || !name) {
        return NextResponse.json(
          { success: false, error: 'Image Name and URL are required' },
          { status: 400 }
        );
      }

      // Validate URL format - must be secure HTTPS URL
      if (!url.startsWith('https://') && !url.startsWith('/')) {
        return NextResponse.json(
          { success: false, error: 'External image URLs must use secure HTTPS protocol.' },
          { status: 400 }
        );
      }

      mediaItem = {
        id: `media-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name,
        url,
        type: type || 'image/jpeg',
        size: size || 100000,
        category: category || 'general',
        altText: altText || '',
        uploadedAt: new Date().toISOString(),
        usedIn: [],
      };
    }

    if (!mediaItem) {
      return NextResponse.json({ success: false, error: 'Failed to process media item' }, { status: 400 });
    }

    // Save to Site Settings mediaLibrary
    const siteSettings = await getSiteSettings();
    const existingLibrary = siteSettings.mediaLibrary || [];
    const updatedLibrary = [mediaItem, ...existingLibrary];

    const updatedSettings = await updateSiteSettings({
      ...siteSettings,
      mediaLibrary: updatedLibrary,
    });

    await recordAuditLog({
      action: 'MEDIA_UPLOAD',
      resource: mediaItem.name,
      details: { url: mediaItem.url, category: mediaItem.category },
    });

    return NextResponse.json({
      success: true,
      mediaItem,
      mediaLibrary: updatedSettings.mediaLibrary,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!isRequestAdminAuthenticated(req)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      );
    }

    if (!verifyAdminCsrfAndOrigin(req)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: CSRF / Origin mismatch' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const forceParam = searchParams.get('force') === 'true';

    let mediaId = id;
    let force = forceParam;

    if (!mediaId) {
      try {
        const body = await req.json();
        mediaId = body.id;
        if (body.force !== undefined) force = body.force;
      } catch {
        // no body
      }
    }

    if (!mediaId) {
      return NextResponse.json({ success: false, error: 'Media ID is required' }, { status: 400 });
    }

    const siteSettings = await getSiteSettings();
    const library = siteSettings.mediaLibrary || [];
    const targetItem = library.find((m) => m.id === mediaId);

    if (!targetItem) {
      return NextResponse.json({ success: false, error: 'Media item not found' }, { status: 404 });
    }

    // Safety scan for usage
    const usedInLocations = await scanMediaUsage(targetItem.url, targetItem.id);

    if (usedInLocations.length > 0 && !force) {
      return NextResponse.json(
        {
          success: false,
          error: `This image is currently being used in: ${usedInLocations.join(
            ', '
          )}. Please remove it from those locations before deleting.`,
          usedIn: usedInLocations,
          requiresConfirmation: true,
        },
        { status: 400 }
      );
    }

    // Try deleting from Supabase Storage if it's a Supabase storage URL
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin && targetItem.url.includes('musky-dose-media')) {
      try {
        const parts = targetItem.url.split('musky-dose-media/');
        if (parts.length > 1) {
          const filePath = parts[1];
          await supabaseAdmin.storage.from('musky-dose-media').remove([filePath]);
        }
      } catch (err) {
        console.warn('Error deleting file from Supabase storage:', err);
      }
    }

    // Remove from mediaLibrary array
    const updatedLibrary = library.filter((m) => m.id !== mediaId);
    await updateSiteSettings({
      ...siteSettings,
      mediaLibrary: updatedLibrary,
    });

    await recordAuditLog({
      action: 'MEDIA_DELETE',
      resource: targetItem.name,
      details: { mediaId, url: targetItem.url },
    });

    return NextResponse.json({
      success: true,
      deletedId: mediaId,
      message: 'Media item deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
