// Centralized Media Upload Utility for Admin Panel
// Uploads file via /api/admin/media to Supabase Storage and returns clean HTTPS URL.

export async function uploadMediaFile(
  file: File,
  category: string = 'products',
  altText?: string
): Promise<{ success: boolean; url: string; error?: string }> {
  if (!file) {
    return { success: false, url: '', error: 'No file provided' };
  }

  // File size validation (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, url: '', error: 'File size exceeds 5MB limit.' };
  }

  // File type validation
  if (!file.type.startsWith('image/')) {
    return { success: false, url: '', error: 'File must be an image (JPEG, PNG, WEBP, or SVG).' };
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    if (altText) {
      formData.append('altText', altText);
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
