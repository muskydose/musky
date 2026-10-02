// Centralized Canonical Media Upload & Deletion Utility for Admin Panel
// Directs all uploads and deletions to the canonical Media Asset pipeline.

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
 * Universal media uploader:
 * 1. Validates MIME type, size, and SVG safety.
 * 2. Uses signed upload URLs for high-resolution assets to bypass serverless body limits.
 * 3. Falls back gracefully to direct multipart upload.
 * 4. Safely parses JSON and handles non-JSON / HTML server responses.
 */
export async function uploadMediaFile(
  file: File,
  category: string = 'products',
  altText?: string,
  productId?: string,
  role: string = 'GALLERY'
): Promise<UploadMediaResult> {
  if (!file) {
    return { success: false, url: '', error: 'No file provided' };
  }

  const mimeType = (file.type || '').toLowerCase();
  const isVideo = mimeType.startsWith('video/');
  const isImage = mimeType.startsWith('image/');

  if (!isImage && !isVideo) {
    return { success: false, url: '', error: 'File must be an image (JPEG, PNG, WEBP, AVIF, SVG) or video (MP4, WebM).' };
  }

  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return { success: false, url: '', error: `Unsupported file format (${mimeType}). Allowed: JPG, PNG, WEBP, AVIF, SVG, MP4, WEBM.` };
  }

  // File size validation (25MB max for video, 16MB max for image)
  const maxSize = isVideo ? 25 * 1024 * 1024 : 16 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, url: '', error: `File size exceeds ${isVideo ? '25MB' : '16MB'} maximum limit.` };
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
        return { success: false, url: '', error: 'Security alert: SVG file contains unsafe script or foreignObject content.' };
      }
    } catch {
      // ignore text read failure
    }
  }

  const entityType = category === 'categories' ? 'CATEGORY' : category === 'brand' ? 'BRAND' : 'PRODUCT';
  const entityId = productId || (entityType === 'PRODUCT' ? 'new-product' : undefined);

  // Strategy A: If file is large (> 3.5MB), use direct signed upload URL to prevent Vercel 4.5MB request-body limit
  if (file.size > 3.5 * 1024 * 1024) {
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

      let signedData: any;
      try {
        signedData = await signedRes.json();
      } catch {
        signedData = null;
      }

      if (signedRes.ok && signedData?.success && signedData.signedUrl) {
        // Upload directly to Supabase storage signed URL
        const uploadRes = await fetch(signedData.signedUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
          },
          body: file,
        });

        if (uploadRes.ok) {
          // Register asset record in canonical Media DAL
          const registerRes = await fetch('/api/admin/media-assets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType,
              entityId,
              url: signedData.publicUrl,
              role,
              title: file.name,
              altText: altText || file.name,
              storagePath: signedData.storagePath,
              fileName: file.name,
              fileSizeBytes: file.size,
              mimeType,
            }),
          });

          let regData: any;
          try {
            regData = await registerRes.json();
          } catch {
            const rawText = await registerRes.text().catch(() => '');
            return {
              success: false,
              url: '',
              error: `Asset registration failed with status ${registerRes.status}: ${rawText.slice(0, 100)}`,
            };
          }

          if (registerRes.ok && regData?.success) {
            const finalUrl = regData.asset?.url || signedData.publicUrl;
            return {
              success: true,
              url: finalUrl,
              asset: regData.asset,
              media: { url: finalUrl },
            };
          }
        }
      }
    } catch (signedErr) {
      console.warn('[uploadMediaFile] Direct signed upload notice, falling back to multipart:', signedErr);
    }
  }

  // Strategy B: Standard canonical multipart upload
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

    let data: any;
    try {
      data = await res.json();
    } catch {
      const rawText = await res.text().catch(() => '');
      return {
        success: false,
        url: '',
        error: `Server responded with HTTP ${res.status}: ${rawText.slice(0, 100) || res.statusText}`,
      };
    }

    if (res.ok && data?.success) {
      const publicUrl = data.asset?.url || data.url || '';
      return {
        success: true,
        url: publicUrl,
        asset: data.asset,
        media: { url: publicUrl },
      };
    }

    return {
      success: false,
      url: '',
      error: data?.error || 'Failed to upload media asset.',
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
export async function deleteMediaAssetClient(options: DeleteMediaClientOptions): Promise<DeleteMediaClientResult> {
  try {
    const params = new URLSearchParams();
    if (options.assetId) params.set('id', options.assetId);
    if (options.url) params.set('url', options.url);
    if (options.productId) params.set('productId', options.productId);
    if (options.force) params.set('force', 'true');

    const res = await fetch(`/api/admin/media-assets?${params.toString()}`, {
      method: 'DELETE',
    });

    let data: any;
    try {
      data = await res.json();
    } catch {
      const rawText = await res.text().catch(() => '');
      return {
        success: false,
        error: `Server responded with HTTP ${res.status}: ${rawText.slice(0, 100) || res.statusText}`,
      };
    }

    if (res.ok && data?.success) {
      return {
        success: true,
        deleted: data.deleted,
        unlinked: data.unlinked,
        storageDeleted: data.storageDeleted,
      };
    }

    return {
      success: false,
      error: data?.error || 'Failed to delete media asset.',
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
