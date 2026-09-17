import sharp from 'sharp';
import { validateImageBinary, ImageBinaryValidationResult } from '@/lib/ai/image-integrity';
import { STANDARD_MEDIA_SPECS, SlotSpecification, checkAspectRatioMatch, StandardAspectRatio } from '@/lib/growth/media-specs';

export type ValidationVerdict = 'PASS' | 'WARNING' | 'ERROR';

export interface DetailedUploadValidationResult {
  verdict: ValidationVerdict;
  isValid: boolean;
  canProceed: boolean;
  errors: string[];
  warnings: string[];
  passes: string[];
  metadata: {
    byteLength: number;
    fileSizeBytes: number;
    mimeType: string;
    format: string;
    hash: string;
    width: number;
    height: number;
    aspectRatio: string;
    actualRatioNumeric: number;
    isLandscape: boolean;
    isSquare: boolean;
    isPortrait: boolean;
  };
}

/**
 * Rigorously validates an uploaded image binary buffer against media requirements.
 * Performs magic-byte inspection, SHA-256 computation, sharp decoding,
 * dimension verification, and slot tolerance matching.
 * 
 * NEVER modifies, crops, or stretches the input buffer.
 */
export async function validateUploadBuffer(
  buffer: Buffer,
  slotKey?: string,
  providedMime?: string
): Promise<DetailedUploadValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const passes: string[] = [];

  // 1. Basic Binary and Magic Byte Verification
  const binResult: ImageBinaryValidationResult = validateImageBinary(buffer);
  if (!binResult.isValid) {
    errors.push(binResult.error || 'Binary validation failed. Not a valid image file.');
    return {
      verdict: 'ERROR',
      isValid: false,
      canProceed: false,
      errors,
      warnings,
      passes,
      metadata: {
        byteLength: binResult.byteLength,
        fileSizeBytes: binResult.byteLength,
        mimeType: providedMime || 'application/octet-stream',
        format: 'unknown',
        hash: binResult.hash,
        width: 0,
        height: 0,
        aspectRatio: 'unknown',
        actualRatioNumeric: 0,
        isLandscape: false,
        isSquare: false,
        isPortrait: false,
      },
    };
  }

  passes.push(`Magic bytes confirmed: valid ${binResult.format?.toUpperCase()} binary signature.`);
  passes.push(`SHA-256 computed: ${binResult.hash.slice(0, 16)}...`);

  // 2. Decode using Sharp
  let width = 0;
  let height = 0;
  let format = binResult.format || 'unknown';

  try {
    const sharpInstance = sharp(buffer);
    const meta = await sharpInstance.metadata();
    width = meta.width || 0;
    height = meta.height || 0;
    format = meta.format || binResult.format || 'unknown';

    if (width <= 0 || height <= 0) {
      errors.push(`Decoded image has invalid dimensions: ${width}×${height}px.`);
    } else {
      passes.push(`Image successfully decoded: ${width}×${height}px (${format}).`);
    }
  } catch (err: any) {
    errors.push(`Image decoding error: ${err.message || 'Corrupted or unreadable image data.'}`);
  }

  if (errors.length > 0) {
    return {
      verdict: 'ERROR',
      isValid: false,
      canProceed: false,
      errors,
      warnings,
      passes,
      metadata: {
        byteLength: binResult.byteLength,
        fileSizeBytes: binResult.byteLength,
        mimeType: binResult.mimeType || 'application/octet-stream',
        format,
        hash: binResult.hash,
        width,
        height,
        aspectRatio: 'unknown',
        actualRatioNumeric: 0,
        isLandscape: false,
        isSquare: false,
        isPortrait: false,
      },
    };
  }

  // 3. Compute Aspect Ratio
  const actualRatioNumeric = Math.round((width / height) * 1000) / 1000;
  let computedRatioLabel = `${width}:${height}`;
  if (Math.abs(width - height) / width < 0.02) {
    computedRatioLabel = '1:1';
  } else if (Math.abs(actualRatioNumeric - 16 / 9) < 0.035) {
    computedRatioLabel = '16:9';
  } else if (Math.abs(actualRatioNumeric - 4 / 5) < 0.035) {
    computedRatioLabel = '4:5';
  } else if (Math.abs(actualRatioNumeric - 9 / 16) < 0.035) {
    computedRatioLabel = '9:16';
  } else if (Math.abs(actualRatioNumeric - 1.905) < 0.035) {
    computedRatioLabel = '1.91:1';
  } else if (Math.abs(actualRatioNumeric - 1.5) < 0.035) {
    computedRatioLabel = '3:2';
  }

  const isSquare = Math.abs(width - height) / width < 0.02;
  const isLandscape = width > height && !isSquare;
  const isPortrait = height > width && !isSquare;

  // 4. Validate Against Specific Slot Requirements (if slotKey specified)
  const spec: SlotSpecification | undefined = slotKey ? STANDARD_MEDIA_SPECS[slotKey] : undefined;

  if (spec) {
    // Check max file size
    if (binResult.byteLength > spec.maxFileSizeBytes) {
      const maxMb = Math.round(spec.maxFileSizeBytes / (1024 * 1024));
      const actualMb = (binResult.byteLength / (1024 * 1024)).toFixed(2);
      errors.push(`File size (${actualMb} MB) exceeds maximum limit of ${maxMb} MB for ${spec.displayName}.`);
    } else {
      passes.push(`File size (${Math.round(binResult.byteLength / 1024)} KB) within ${spec.maxFileSizeBytes / 1024 / 1024} MB limit.`);
    }

    // Check minimum dimensions
    if (width < spec.minWidth || height < spec.minHeight) {
      errors.push(`Dimensions ${width}×${height}px are below required minimum ${spec.minWidth}×${spec.minHeight}px for ${spec.displayName}.`);
    } else {
      passes.push(`Dimensions meet minimum requirement (≥ ${spec.minWidth}×${spec.minHeight}px).`);
    }

    // Check recommended dimensions (warning only if above min but below recommended)
    if (width >= spec.minWidth && height >= spec.minHeight) {
      if (width < spec.recommendedWidth || height < spec.recommendedHeight) {
        warnings.push(`Dimensions ${width}×${height}px are acceptable but below recommended ${spec.recommendedWidth}×${spec.recommendedHeight}px for best visual clarity.`);
      } else {
        passes.push(`Dimensions meet or exceed recommended resolution (${spec.recommendedWidth}×${spec.recommendedHeight}px).`);
      }
    }

    // Check aspect ratio match
    const ratioCheck = checkAspectRatioMatch(width, height, spec.aspectRatio);
    if (!ratioCheck.isMatch) {
      errors.push(`Aspect ratio mismatch: uploaded image is ${computedRatioLabel} (${actualRatioNumeric}), but slot requires ${spec.aspectRatio} (target ${spec.aspectRatioNumeric}). Difference: ${ratioCheck.diffPercent}%.`);
    } else {
      passes.push(`Aspect ratio ${spec.aspectRatio} verified within tolerance.`);
    }
  }

  // 5. Final Verdict Calculation
  let verdict: ValidationVerdict = 'PASS';
  if (errors.length > 0) {
    verdict = 'ERROR';
  } else if (warnings.length > 0) {
    verdict = 'WARNING';
  }

  return {
    verdict,
    isValid: errors.length === 0,
    canProceed: errors.length === 0,
    errors,
    warnings,
    passes,
    metadata: {
      byteLength: binResult.byteLength,
      fileSizeBytes: binResult.byteLength,
      mimeType: binResult.mimeType || 'image/jpeg',
      format,
      hash: binResult.hash,
      width,
      height,
      aspectRatio: computedRatioLabel,
      actualRatioNumeric,
      isLandscape,
      isSquare,
      isPortrait,
    },
  };
}

