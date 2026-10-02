// Centralized Canonical Media Upload & Deletion Utility for Admin Panel
// Directs all uploads and deletions to the canonical Media Asset pipeline.

import { getSupabase } from '@/lib/supabase';

export interface UploadMediaResult {
  success: boolean;
  url: string;
  asset?: any;
  error?: string;
  media?: { url: string }; // Backwards compatibility for legacy callers
}

export interface DeleteMediaClientOptions {
  assetId?: string;
  url?: string;
  productId?: string;
  force?: boolean;
}

export interface DeleteMediaClientResult {
  success: boolean;
  deleted?: boolean;
  unlinked?: boolean;
  storageDeleted?: boolean;
  error?: string;
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

/**
 * Safely inspects Content-Type, strips HTML tags from error responses,
 * and guarantees readable error text without ever exposing JSON parse syntax errors.
 */
export async function safeParseResponse(
  res: Response,
  fallbackMessage: string
): Promise<{ data: any; error?: string }> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      const data = await res.json();
      return { data };
    } catch {
      return { data: null, error: `Invalid JSON received from server (HTTP ${res.status}).` };
    }
  } else {
    const rawText = await res.text().catch(() => '');
    const cleanText = rawText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160);
    return {
      data: null,
      error:
        rawText.includes('<html') || rawText.includes('<body')
          ? `Server returned HTML error (HTTP ${res.status}): ${cleanText || res.statusText || fallbackMessage}`
          : `Server responded with HTTP ${res.status}: ${cleanText || fallbackMessage || res.statusText}`,
    };
  }
}

/**
 * Universal media uploader:
 * 1. Validates MIME type, size, and SVG safety.
 * 2. Primary Canonical Path: Pre-authorized direct browser-to-Supabase Storage upload,
 *    bypassing the Vercel 4.5MB serverless request-body limit entirely.
 * 3. NO SILENT FALLBACK: If direct signed upload fails for any high-resolution file (>3.5MB),
 *    the exact upstream failure is surfaced immediately without routing through Vercel.
 * 4. Safe JSON registration persists the canonical asset into media_assets.
 * 5. Returns one uniform response contract: { success: true, url, asset, media: { url } }.
 */
export interface UploadMediaOptions {
  file: File;
  category?: string;
  entityType?: 'PRODUCT' | 'CATEGORY' | 'BRAND' | 'SYSTEM' | string;
  entityId?: string;
  productId?: string;
  altText?: string;
  role?: string;
}

export async function uploadMediaFile(
  fileOrOptions: File | UploadMediaOptions,
  categoryArg: string = 'products',
  altTextArg?: string,
  productIdArg?: string,
  roleArg: string = 'GALLERY'
): Promise<UploadMediaResult> {
  let file: File;
  let category = categoryArg;
  let altText = altTextArg;
  let productId = productIdArg;
  let role = roleArg;
  let explicitEntityType: string | undefined;

  if (
    fileOrOptions &&
    typeof fileOrOptions === 'object' &&
    'file' in fileOrOptions &&
    !(fileOrOptions instanceof File)
  ) {
    const opts = fileOrOptions as UploadMediaOptions;
    file = opts.file;
    category =
      opts.category ||
      (opts.entityType === 'CATEGORY'
        ? 'categories'
        : opts.entityType === 'BRAND'
        ? 'brand'
        : 'products');
    altText = opts.altText;
    productId = opts.productId || opts.entityId;
    role = opts.role || 'GALLERY';
    explicitEntityType = opts.entityType;
  } else {
    file = fileOrOptions as File;
  }

  if (!file) {
    return { success: false, url: '', error: 'No file provided in upload request.' };
  }

  const mimeType = (file.type || '').toLowerCase();
  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');

  if (!isImage && !isVideo) {
    return {
      success: false,
      url: '',
      error: 'File must be an image (JPEG, PNG, WEBP, AVIF, SVG) or video (MP4, WebM).',
    };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      success: false,
      url: '',
      error: `Unsupported file format (${mimeType || 'unknown'}). Allowed: JPG, PNG, WEBP, AVIF, SVG, MP4, WEBM.`,
    };
  }

  // File size validation (25MB max for video, 16MB max for image)
  const maxSize = isVideo ? 25 * 1024 * 1024 : 16 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      success: false,
      url: '',
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum limit of ${isVideo ? '25MB' : '16MB'}.`,
    };
  }

  // SVG security validation
  if (mimeType === 'image/svg+xml') {
    try {
      const text = await file.text();
      const lower = text.toLowerCase();
      if (
        lower.includes('<script') ||
        lower.includes('javascript:') ||
        lower.includes('onload=') ||
        lower.includes('onerror=') ||
        lower.includes('onclick=') ||
        lower.includes('<foreignobject')
      ) {
        return {
          success: false,
          url: '',
          error: 'Security alert: SVG file contains unsafe script or foreignObject content.',
        };
      }
    } catch {
      // ignore text read failure
    }
  }

  const entityType = explicitEntityType || (category === 'categories' ? 'CATEGORY' : category === 'brand' ? 'BRAND' : 'PRODUCT');
  const entityId = productId || (entityType === 'PRODUCT' ? 'new-product' : undefined);
  const isLargeFile = file.size > 3.5 * 1024 * 1024; // >3.5MB is near or over the Vercel 4.5MB function limit

  // =========================================================================
  // CANONICAL PATHWAY: Direct Browser-to-Supabase Storage Upload
  // =========================================================================
  let signedInitData: any = null;
  let signedInitError = '';

  try {
    const signedRes = await fetch('/api/admin/media-assets?action=signed-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entityType,
        entityId,
        fileName: file.name,
        mimeType,
        fileSizeBytes: file.size,
      }),
    });

    const parsedInit = await safeParseResponse(signedRes, 'Failed to initialize direct storage upload.');
    if (signedRes.ok && parsedInit.data?.success && (parsedInit.data.signedUrl || parsedInit.data.token)) {
      signedInitData = parsedInit.data;
    } else {
      signedInitError = parsedInit.error || parsedInit.data?.error || `Upload initialization failed (HTTP ${signedRes.status})`;
    }
  } catch (initErr: any) {
    signedInitError = `Network error initializing upload: ${initErr?.message || String(initErr)}`;
  }

  // When signed URL initialization succeeded, perform direct browser upload
  if (signedInitData) {
    let directUploadSuccess = false;
    let directUploadError = '';

    // Step A: Use official Supabase client with uploadToSignedUrl
    const supabase = getSupabase();
    if (supabase && signedInitData.path && signedInitData.token) {
      try {
        const { error: storageErr } = await supabase.storage
          .from(signedInitData.bucket || 'product-images')
          .uploadToSignedUrl(signedInitData.path, signedInitData.token, file, {
            contentType: mimeType,
            upsert: true,
          });

        if (storageErr) {
          directUploadError = storageErr.message;
        } else {
          directUploadSuccess = true;
        }
      } catch (sdkErr: any) {
        directUploadError = sdkErr?.message || String(sdkErr);
      }
    }

    // Step B: Direct HTTP PUT fallback if client SDK was unavailable or threw
    if (!directUploadSuccess && signedInitData.signedUrl && !directUploadError) {
      try {
        const putRes = await fetch(signedInitData.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
          },
          body: file,
        });

        if (putRes.ok) {
          directUploadSuccess = true;
        } else {
          const rawErr = await putRes.text().catch(() => '');
          directUploadError = `Storage upload returned HTTP ${putRes.status}: ${rawErr.slice(0, 100) || putRes.statusText}`;
        }
      } catch (fetchErr: any) {
        directUploadError = `Network error during direct storage upload: ${fetchErr?.message || String(fetchErr)}`;
      }
    }

    if (directUploadSuccess) {
      // Step C: Small JSON canonical registration request to persist asset in media_assets
      try {
        const registerRes = await fetch('/api/admin/media-assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            entityType,
            entityId,
            url: signedInitData.publicUrl,
            role,
            title: file.name,
            altText: altText || file.name,
            storagePath: signedInitData.storagePath,
            fileName: file.name,
            fileSizeBytes: file.size,
            mimeType,
          }),
        });

        const parsedReg = await safeParseResponse(registerRes, 'Failed to register media asset.');
        if (registerRes.ok && parsedReg.data?.success) {
          const finalUrl = parsedReg.data.asset?.url || parsedReg.data.url || signedInitData.publicUrl;
          return {
            success: true,
            url: finalUrl,
            asset: parsedReg.data.asset,
            media: { url: finalUrl },
          };
        } else {
          return {
            success: false,
            url: '',
            error: parsedReg.error || parsedReg.data?.error || `Asset registration failed with status ${registerRes.status}`,
          };
        }
      } catch (regErr: any) {
        return {
          success: false,
          url: '',
          error: `Failed to register media asset: ${regErr?.message || String(regErr)}`,
        };
      }
    } else {
      // Direct storage upload failed!
      // CRITICAL RULE: NEVER fall back to multipart for large files!
      if (isLargeFile) {
        return {
          success: false,
          url: '',
          error: directUploadError || 'Direct cloud storage upload failed for high-resolution image.',
        };
      }
    }
  } else if (isLargeFile) {
    // Initialization failed for a large file:
    // CRITICAL RULE: NEVER fall back to multipart for files that could exceed Vercel limit!
    return {
      success: false,
      url: '',
      error: signedInitError || 'Failed to initialize direct storage upload for high-resolution file (>3.5MB).',
    };
  }

  // =========================================================================
  // SAFE SMALL-FILE FALLBACK (Strictly <= 3.5MB only)
  // Only reached when file is small AND direct storage initialization failed
  // =========================================================================
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('entityType', entityType);
    if (entityId) formData.append('entityId', entityId);
    formData.append('role', role);
    formData.append('title', file.name);
    if (altText) formData.append('altText', altText);

    const res = await fetch('/api/admin/media-assets', {
      method: 'POST',
      body: formData,
    });

    const parsed = await safeParseResponse(res, 'Failed to process media upload.');
    if (res.ok && parsed.data?.success) {
      const publicUrl = parsed.data.asset?.url || parsed.data.url || '';
      return {
        success: true,
        url: publicUrl,
        asset: parsed.data.asset,
        media: { url: publicUrl },
      };
    }

    return {
      success: false,
      url: '',
      error: parsed.error || parsed.data?.error || 'Failed to upload media asset.',
    };
  } catch (err: any) {
    return {
      success: false,
      url: '',
      error: `Upload request failed: ${err.message || String(err)}`,
    };
  }
}

/**
 * Universal media asset deletion helper for Admin UI.
 */
export async function deleteMediaAssetClient(
  options: DeleteMediaClientOptions
): Promise<DeleteMediaClientResult> {
  try {
    const params = new URLSearchParams();
    if (options.assetId) params.set('id', options.assetId);
    if (options.url) params.set('url', options.url);
    if (options.productId) params.set('productId', options.productId);
    if (options.force) params.set('force', 'true');

    const res = await fetch(`/api/admin/media-assets?${params.toString()}`, {
      method: 'DELETE',
    });

    const parsed = await safeParseResponse(res, 'Failed to delete media asset.');
    if (res.ok && parsed.data?.success) {
      return {
        success: true,
        deleted: parsed.data.deleted,
        unlinked: parsed.data.unlinked,
        storageDeleted: parsed.data.storageDeleted,
      };
    }

    return {
      success: false,
      error: parsed.error || parsed.data?.error || 'Failed to delete media asset.',
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Delete request failed: ${err.message || String(err)}`,
    };
  }
}

/**
 * Validates whether an image string is a clean URL and NOT a bloated Base64 data string.
 */
export function isBase64ImageData(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/');
}
