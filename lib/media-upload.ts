// Centralized Media Upload Utility for Admin Panel
// Uploads file via /api/admin/media to Supabase Storage and returns clean HTTPS URL.

export async function uploadMediaFile(
  file: File,
  category: string = 'products',
  altText?: string,
  productId?: string
): Promise<{ success: boolean; url: string; error?: string }> {
  if (!file) {
    return { success: false, url: '', error: 'No file provided' };
  }

  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');

  if (!isImage && !isVideo) {
    return { success: false, url: '', error: 'File must be an image (JPEG, PNG, WEBP, SVG) or video (MP4, WebM).' };
  }

  // File size validation (25MB max for video, 5MB max for image)
  const maxSize = isVideo ? 25 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return { success: false, url: '', error: `File size exceeds ${isVideo ? '25MB' : '5MB'} limit.` };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (altText) {
      formData.append('altText', altText);
    }
    if (productId) {
      formData.append('productId', productId);
    }

    const res = await fetch('/api/admin/media', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();
    if (res.ok && data.success && data.media?.url) {
      return { success: true, url: data.media.url };
    }

    return {
      success: false,
      url: '',
      error: data.error || 'Failed to upload image to cloud storage.',
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
 * Validates whether an image string is a clean URL and NOT a bloated Base64 data string.
 */
export function isBase64ImageData(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  return str.startsWith('data:image/');
}
