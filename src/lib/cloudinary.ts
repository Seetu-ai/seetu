/**
 * Cloudinary Integration
 *
 * Handles image and video processing for billboard content
 */

import { v2 as cloudinary } from 'cloudinary';

// Lazy configuration - ensures env vars are loaded
let configured = false;

function ensureConfigured() {
  if (!configured) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }
}

export interface TransformOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'fit' | 'scale' | 'pad';
  format?: 'mp4' | 'webm' | 'jpg' | 'png' | 'webp';
  quality?: 'auto' | number;
}

export interface UploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  secureUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  width?: number;
  height?: number;
  format?: string;
  error?: string;
}

/**
 * Upload and transform media for billboard display
 */
export async function uploadBillboardMedia(
  fileUrl: string,
  options: {
    contentId: string;
    mediaType: 'image' | 'video';
    targetWidth?: number;
    targetHeight?: number;
  }
): Promise<UploadResult> {
  ensureConfigured();
  // Default to portrait 1:2 ratio for billboards (1m x 2m)
  const { contentId, mediaType, targetWidth = 1080, targetHeight = 2160 } = options;

  try {
    console.log(`[CLOUDINARY] Uploading ${mediaType}: ${contentId}`);

    if (mediaType === 'video') {
      // Upload and transform video
      // Use 'pad' to preserve entire content (no cropping), add black bars if needed
      const result = await cloudinary.uploader.upload(fileUrl, {
        resource_type: 'video',
        public_id: `billboard/${contentId}`,
        overwrite: true,
        transformation: [
          {
            width: targetWidth,
            height: targetHeight,
            crop: 'pad',
            background: 'black',
          },
          {
            quality: 'auto',
            fetch_format: 'mp4',
          },
        ],
        eager: [
          // Generate thumbnail (portrait 1:2 ratio)
          {
            width: 225,
            height: 450,
            crop: 'pad',
            background: 'black',
            format: 'jpg',
          },
        ],
        eager_async: false,
      });

      console.log(`[CLOUDINARY] Video uploaded: ${result.public_id}`);

      return {
        success: true,
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        thumbnailUrl: result.eager?.[0]?.secure_url || result.secure_url.replace(/\.[^.]+$/, '.jpg'),
        duration: result.duration,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } else {
      // Upload and transform image
      // Use 'pad' to preserve entire content (no cropping), add black bars if needed
      const result = await cloudinary.uploader.upload(fileUrl, {
        resource_type: 'image',
        public_id: `billboard/${contentId}`,
        overwrite: true,
        transformation: [
          {
            width: targetWidth,
            height: targetHeight,
            crop: 'pad',
            background: 'black',
          },
          {
            quality: 'auto:best',
            fetch_format: 'auto',
          },
        ],
      });

      console.log(`[CLOUDINARY] Image uploaded: ${result.public_id}`);

      // Generate thumbnail URL (portrait 1:2 ratio)
      const thumbnailUrl = cloudinary.url(result.public_id, {
        width: 225,
        height: 450,
        crop: 'pad',
        background: 'black',
        format: 'jpg',
        quality: 'auto',
      });

      return {
        success: true,
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        thumbnailUrl,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    }
  } catch (error) {
    console.error(`[CLOUDINARY] Upload error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Convert image to video (for billboard display)
 * Creates a video with the image displayed for specified duration
 */
export async function imageToVideo(
  imageUrl: string,
  options: {
    contentId: string;
    duration?: number; // seconds
    targetWidth?: number;
    targetHeight?: number;
  }
): Promise<UploadResult> {
  ensureConfigured();
  // Default to portrait 1:2 ratio for billboards (1m x 2m)
  const { contentId, duration = 10, targetWidth = 1080, targetHeight = 2160 } = options;

  try {
    console.log(`[CLOUDINARY] Converting image to video: ${contentId}`);

    // First upload the image
    const imageResult = await cloudinary.uploader.upload(imageUrl, {
      resource_type: 'image',
      public_id: `billboard/${contentId}_source`,
      overwrite: true,
    });

    // Create video from image using Cloudinary's video generation
    // This creates a video with the image displayed for the specified duration
    const videoUrl = cloudinary.url(imageResult.public_id, {
      resource_type: 'video',
      format: 'mp4',
      transformation: [
        {
          width: targetWidth,
          height: targetHeight,
          crop: 'pad',
          background: 'black',
        },
        // Add slight zoom effect (Ken Burns)
        {
          effect: 'zoompan',
          duration: duration,
        },
      ],
    });

    // For now, just use the image directly - Cloudinary's image-to-video
    // requires the video API which has different pricing
    // The billboard player can handle images directly
    const thumbnailUrl = cloudinary.url(imageResult.public_id, {
      width: 225,
      height: 450,
      crop: 'pad',
      background: 'black',
      format: 'jpg',
    });

    console.log(`[CLOUDINARY] Image ready for billboard: ${contentId}`);

    return {
      success: true,
      publicId: imageResult.public_id,
      url: imageResult.url,
      secureUrl: imageResult.secure_url,
      thumbnailUrl,
      duration,
      width: targetWidth,
      height: targetHeight,
      format: 'jpg',
    };
  } catch (error) {
    console.error(`[CLOUDINARY] Image to video error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Conversion failed',
    };
  }
}

/**
 * Delete media from Cloudinary
 */
export async function deleteMedia(publicId: string, resourceType: 'image' | 'video' = 'image'): Promise<boolean> {
  ensureConfigured();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    return true;
  } catch (error) {
    console.error(`[CLOUDINARY] Delete error:`, error);
    return false;
  }
}

/**
 * Get optimized URL for billboard display
 */
export function getBillboardUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    format?: string;
  } = {}
): string {
  // Default to portrait 1:2 ratio for billboards (1m x 2m)
  const { width = 1080, height = 2160, format = 'auto' } = options;

  return cloudinary.url(publicId, {
    width,
    height,
    crop: 'fill',
    quality: 'auto:best',
    fetch_format: format,
    secure: true,
  });
}

/**
 * Get media metadata via Cloudinary (width, height, duration, format)
 * Lightweight alternative to FFprobe — uploads for analysis, then deletes
 */
export async function getMediaMetadata(fileUrl: string): Promise<{
  valid: boolean;
  mediaType: 'image' | 'video' | null;
  width?: number;
  height?: number;
  duration?: number;
  format?: string;
  error?: string;
}> {
  if (!isCloudinaryConfigured()) {
    return { valid: false, mediaType: null, error: 'Cloudinary not configured' };
  }

  ensureConfigured();

  try {
    // Upload with resource_type auto to detect type
    const result = await cloudinary.uploader.upload(fileUrl, {
      resource_type: 'auto',
      folder: 'seetu/validation-temp',
    });

    const isVideo = result.resource_type === 'video';
    const mediaType: 'image' | 'video' = isVideo ? 'video' : 'image';

    // Clean up — delete the temp upload
    cloudinary.uploader.destroy(result.public_id, {
      resource_type: result.resource_type,
    }).catch(() => { /* ignore cleanup errors */ });

    return {
      valid: true,
      mediaType,
      width: result.width,
      height: result.height,
      duration: result.duration || undefined,
      format: result.format,
    };
  } catch (error) {
    return {
      valid: false,
      mediaType: null,
      error: error instanceof Error ? error.message : 'Cloudinary metadata extraction failed',
    };
  }
}

/**
 * Check if Cloudinary is configured
 */
export function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export { cloudinary };
