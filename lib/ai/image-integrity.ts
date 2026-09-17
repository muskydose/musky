import crypto from 'crypto';

export interface ImageBinaryValidationResult {
  isValid: boolean;
  format?: 'jpeg' | 'png' | 'webp' | 'avif' | 'gif';
  mimeType?: string;
  byteLength: number;
  hash: string;
  error?: string;
}

/**
 * Validates raw image bytes by checking size thresholds and binary magic bytes.
 * Prevents corrupted files, truncated headers (e.g. 124b), or text placeholders (e.g. 33b)
 * from entering storage or database.
 */
export function validateImageBinary(buffer: Buffer): ImageBinaryValidationResult {
  const byteLength = buffer ? buffer.length : 0;

  if (!buffer || byteLength < 1024) {
    return {
      isValid: false,
      byteLength,
      hash: buffer ? crypto.createHash('sha256').update(buffer).digest('hex') : '',
      error: `Image payload is too small (${byteLength} bytes). Minimum valid image size is 1024 bytes (1 KB).`,
    };
  }

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');

  // Check Magic Bytes
  // 1. JPEG: 0xFF 0xD8 0xFF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return {
      isValid: true,
      format: 'jpeg',
      mimeType: 'image/jpeg',
      byteLength,
      hash,
    };
  }

  // 2. PNG: 0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return {
      isValid: true,
      format: 'png',
      mimeType: 'image/png',
      byteLength,
      hash,
    };
  }

  // 3. WebP: 'RIFF' (0x52, 0x49, 0x46, 0x46) ... 'WEBP' (0x57, 0x45, 0x42, 0x50)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return {
      isValid: true,
      format: 'webp',
      mimeType: 'image/webp',
      byteLength,
      hash,
    };
  }

  // 4. AVIF: 'ftyp' at byte 4..7 and 'avif' / 'avis' at 8..11
  if (
    buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
    (buffer.subarray(8, 12).toString('ascii') === 'avif' ||
      buffer.subarray(8, 12).toString('ascii') === 'avis')
  ) {
    return {
      isValid: true,
      format: 'avif',
      mimeType: 'image/avif',
      byteLength,
      hash,
    };
  }

  // 5. GIF: 'GIF87a' or 'GIF89a'
  const gifHeader = buffer.subarray(0, 6).toString('ascii');
  if (gifHeader === 'GIF87a' || gifHeader === 'GIF89a') {
    return {
      isValid: true,
      format: 'gif',
      mimeType: 'image/gif',
      byteLength,
      hash,
    };
  }

  return {
    isValid: false,
    byteLength,
    hash,
    error: 'Unrecognized image binary header. Must be a valid JPEG, PNG, WebP, AVIF, or GIF.',
  };
}

