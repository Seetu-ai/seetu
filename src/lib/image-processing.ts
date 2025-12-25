/**
 * Image Processing Utilities
 * Handles mask application and clean reference image generation
 */

import sharp from 'sharp';
import { removeBackground } from './birefnet';
import { uploadCleanReference } from './storage';

interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

/**
 * Fetch image as buffer
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
  if (url.startsWith('/')) {
    // Local file
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', url);
    return fs.readFile(filePath);
  } else if (url.startsWith('data:')) {
    // Data URL
    const base64 = url.split(',')[1];
    return Buffer.from(base64, 'base64');
  } else {
    // Remote URL
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

/**
 * Crop image to bounding box
 */
async function cropToBbox(imageBuffer: Buffer, bbox: BoundingBox): Promise<Buffer> {
  const image = sharp(imageBuffer);
  const metadata = await image.metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('Could not get image dimensions');
  }

  const left = Math.floor(bbox.x_min * metadata.width);
  const top = Math.floor(bbox.y_min * metadata.height);
  const width = Math.floor((bbox.x_max - bbox.x_min) * metadata.width);
  const height = Math.floor((bbox.y_max - bbox.y_min) * metadata.height);

  return image
    .extract({ left, top, width, height })
    .toBuffer();
}

/**
 * Convert SVG path to PNG mask
 * Path coordinates are 0-1 relative to image dimensions
 */
async function svgPathToMask(
  svgPath: string,
  width: number,
  height: number
): Promise<Buffer> {
  // Create SVG with the path filled white on black background
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="black"/>
      <path d="${svgPath}" fill="white" transform="scale(${width}, ${height})"/>
    </svg>
  `;

  return sharp(Buffer.from(svg))
    .grayscale()
    .toBuffer();
}

/**
 * Apply mask to image (keep only masked area, rest becomes transparent)
 */
async function applyMask(imageBuffer: Buffer, maskBuffer: Buffer): Promise<Buffer> {
  // Ensure mask is same size as image
  const imageMetadata = await sharp(imageBuffer).metadata();

  const resizedMask = await sharp(maskBuffer)
    .resize(imageMetadata.width, imageMetadata.height)
    .toBuffer();

  // Composite using 'dest-in' to keep only overlapping pixels
  return sharp(imageBuffer)
    .ensureAlpha()
    .composite([{
      input: resizedMask,
      blend: 'dest-in' as any,
    }])
    .png()
    .toBuffer();
}

/**
 * Prepare a clean reference image for AI generation
 * This removes all background/other products, keeping only the selected product
 *
 * @param originalUrl - Original image URL (may contain multiple products)
 * @param bbox - Bounding box of the selected product (normalized 0-1)
 * @param svgPath - Optional SVG path for precise segmentation
 * @returns Clean PNG buffer with transparent background
 */
export async function prepareCleanReference(
  originalUrl: string,
  bbox: BoundingBox,
  svgPath?: string
): Promise<Buffer> {
  console.log('[IMAGE-PROCESSING] Preparing clean reference...');

  // 1. Fetch original image
  const originalBuffer = await fetchImageBuffer(originalUrl);
  const originalMetadata = await sharp(originalBuffer).metadata();

  if (!originalMetadata.width || !originalMetadata.height) {
    throw new Error('Could not get image dimensions');
  }

  console.log('[IMAGE-PROCESSING] Original image:', originalMetadata.width, 'x', originalMetadata.height);

  // 2. Apply segmentation mask FIRST (before cropping) - mask is in original image coordinates
  let processedBuffer = originalBuffer;

  if (svgPath) {
    // Use SVG path as mask on the ORIGINAL image
    console.log('[IMAGE-PROCESSING] Applying SVG mask on original image...');
    const maskBuffer = await svgPathToMask(
      svgPath,
      originalMetadata.width,
      originalMetadata.height
    );
    processedBuffer = await applyMask(originalBuffer, maskBuffer);
    console.log('[IMAGE-PROCESSING] Mask applied to original');
  }

  // 3. Now crop to bounding box
  const croppedBuffer = await cropToBbox(processedBuffer, bbox);
  const croppedMetadata = await sharp(croppedBuffer).metadata();

  console.log('[IMAGE-PROCESSING] Cropped to bbox:', croppedMetadata.width, 'x', croppedMetadata.height);

  // 4. If no SVG path was provided, try BiRefNet on the cropped image
  if (!svgPath) {
    console.log('[IMAGE-PROCESSING] Using BiRefNet fallback...');
    const base64 = croppedBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    const result = await removeBackground(dataUrl);

    if (result.success && result.maskUrl) {
      // maskUrl is a data URL, convert to buffer
      const maskBase64 = result.maskUrl.split(',')[1];
      return Buffer.from(maskBase64, 'base64');
    }

    // If BiRefNet fails, return cropped image as-is
    console.warn('[IMAGE-PROCESSING] BiRefNet failed, returning cropped image');
    return croppedBuffer;
  }

  // 5. Trim transparent edges and return
  return sharp(croppedBuffer)
    .trim()
    .png()
    .toBuffer();
}

/**
 * Save buffer to Supabase Storage and return URL
 */
export async function saveCleanReference(buffer: Buffer, productId: string): Promise<string> {
  const result = await uploadCleanReference(buffer, productId);
  return result.url;
}

/**
 * Main function: Prepare and save clean reference for a product
 */
export async function getCleanReferenceUrl(
  originalUrl: string,
  productId: string,
  bbox: BoundingBox,
  svgPath?: string
): Promise<string> {
  const cleanBuffer = await prepareCleanReference(originalUrl, bbox, svgPath);
  return saveCleanReference(cleanBuffer, productId);
}
