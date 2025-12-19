/**
 * BiRefNet - Background Removal / Product Segmentation
 * Uses Replicate's BiRefNet model for high-quality product segmentation
 * Can work with bounding boxes from Moondream for precise cropping
 *
 * Docs: https://replicate.com/lucataco/remove-bg
 */

import Replicate from 'replicate';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export interface SegmentationResult {
  maskUrl: string;         // URL to the mask/cutout image
  svgPath?: string;        // Optional SVG path for outline
  success: boolean;
  error?: string;
}

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

/**
 * Remove background from an image using BiRefNet
 * Returns a transparent PNG of the product
 * @param imageUrl - URL of the image to process (can be data URL)
 */
export async function removeBackground(imageUrl: string): Promise<SegmentationResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return {
      maskUrl: '',
      success: false,
      error: 'Replicate API token not configured',
    };
  }

  try {
    console.log('[BIREFNET] Starting background removal...');

    // Use lucataco/remove-bg which is based on BiRefNet
    const output = await replicate.run(
      'lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1',
      {
        input: {
          image: imageUrl,
        },
      }
    );

    console.log('[BIREFNET] Output type:', typeof output, output);

    // Handle different output types from Replicate
    let maskUrl = '';

    if (typeof output === 'string') {
      maskUrl = output;
    } else if (output instanceof ReadableStream) {
      // Stream contains raw PNG binary data - convert to base64 data URL
      console.log('[BIREFNET] Got ReadableStream, reading PNG data...');
      const reader = output.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(value);
      }
      // Combine chunks into single buffer
      const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
      const combined = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      // Convert to base64 data URL
      const base64 = Buffer.from(combined).toString('base64');
      maskUrl = `data:image/png;base64,${base64}`;
      console.log('[BIREFNET] Converted to data URL, length:', maskUrl.length);
    } else if (output && typeof output === 'object') {
      // Could be an object with url property or an array
      if (Array.isArray(output) && output.length > 0) {
        maskUrl = typeof output[0] === 'string' ? output[0] : (output[0] as any)?.url || '';
      } else {
        maskUrl = (output as any)?.url || (output as any)?.output || '';
      }
    }

    if (!maskUrl) {
      return {
        maskUrl: '',
        success: false,
        error: 'No output from BiRefNet',
      };
    }

    return {
      maskUrl,
      success: true,
    };
  } catch (error) {
    console.error('[BIREFNET] Error:', error);
    return {
      maskUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Segment a specific area of an image using bounding box
 * Crops the image to the bbox area, then removes background
 * @param imageBase64 - Base64 encoded image
 * @param bbox - Bounding box from Moondream (normalized 0-1)
 * @param mimeType - Image MIME type
 */
export async function segmentWithBbox(
  imageBase64: string,
  bbox: BoundingBox,
  mimeType: string = 'image/jpeg'
): Promise<SegmentationResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return {
      maskUrl: '',
      success: false,
      error: 'Replicate API token not configured',
    };
  }

  try {
    console.log('[BIREFNET] Segmenting with bbox:', bbox);

    // First, we'll send the full image - BiRefNet will handle it well
    // The bbox info can be used client-side to position the result
    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    const output = await replicate.run(
      'lucataco/remove-bg:95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1',
      {
        input: {
          image: dataUrl,
        },
      }
    );

    console.log('[BIREFNET] Segmentation complete');

    const maskUrl = typeof output === 'string' ? output : (output as any)?.url || '';

    if (!maskUrl) {
      return {
        maskUrl: '',
        success: false,
        error: 'No output from BiRefNet',
      };
    }

    return {
      maskUrl,
      success: true,
    };
  } catch (error) {
    console.error('[BIREFNET] Segmentation error:', error);
    return {
      maskUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get product outline/mask using RMBG-2.0 via Replicate
 * Alternative to BiRefNet, sometimes better for fashion items
 */
export async function getProductMask(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<SegmentationResult> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return {
      maskUrl: '',
      success: false,
      error: 'Replicate API token not configured',
    };
  }

  try {
    console.log('[RMBG] Starting product mask extraction...');

    const dataUrl = `data:${mimeType};base64,${imageBase64}`;

    // Use RMBG 2.0 model
    const output = await replicate.run(
      'cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003',
      {
        input: {
          image: dataUrl,
        },
      }
    );

    console.log('[RMBG] Mask extraction complete');

    const maskUrl = typeof output === 'string' ? output : (output as any)?.url || '';

    if (!maskUrl) {
      return {
        maskUrl: '',
        success: false,
        error: 'No output from RMBG',
      };
    }

    return {
      maskUrl,
      success: true,
    };
  } catch (error) {
    console.error('[RMBG] Error:', error);
    return {
      maskUrl: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
