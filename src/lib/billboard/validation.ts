/**
 * Billboard Content Validation
 *
 * Uses FFprobe to validate uploaded media files for billboard display.
 * Checks file type, duration, resolution, and file size.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

// Validation limits
const MAX_DURATION_SECONDS = 60;
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;

// Supported formats
const SUPPORTED_VIDEO_FORMATS = ['mp4', 'mov', 'webm', 'avi'];
const SUPPORTED_IMAGE_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];
const SUPPORTED_VIDEO_CODECS = ['h264', 'hevc', 'vp8', 'vp9'];

export interface MediaMetadata {
  format: string;
  codec: string;
  width: number;
  height: number;
  duration: number | null; // null for images
  frameRate: number | null;
  bitrate: number | null;
  fileSize: number;
  hasAudio: boolean;
  audioCodec: string | null;
}

export interface ValidationResult {
  valid: boolean;
  mediaType: 'image' | 'video' | null;
  metadata: MediaMetadata | null;
  errors: string[];
  warnings: string[];
}

interface FFprobeStream {
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  duration?: string;
  r_frame_rate?: string;
  bit_rate?: string;
}

interface FFprobeFormat {
  format_name: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
}

interface FFprobeOutput {
  streams: FFprobeStream[];
  format: FFprobeFormat;
}

/**
 * Check if FFprobe is available on the system
 */
export async function isFFprobeAvailable(): Promise<boolean> {
  try {
    await execAsync('ffprobe -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Get media metadata using FFprobe
 */
async function getMediaMetadata(filePath: string): Promise<FFprobeOutput> {
  const command = `ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`;

  const { stdout, stderr } = await execAsync(command);

  if (stderr && !stdout) {
    throw new Error(`FFprobe error: ${stderr}`);
  }

  return JSON.parse(stdout);
}

/**
 * Download a file from URL to temporary location
 */
async function downloadToTemp(url: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `billboard-validate-${Date.now()}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(tempFile, buffer);

  return tempFile;
}

/**
 * Clean up temporary file
 */
async function cleanupTemp(filePath: string): Promise<void> {
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Parse frame rate string (e.g., "30/1" or "29.97")
 */
function parseFrameRate(frameRateStr: string | undefined): number | null {
  if (!frameRateStr) return null;

  if (frameRateStr.includes('/')) {
    const [num, den] = frameRateStr.split('/').map(Number);
    return den > 0 ? num / den : null;
  }

  return parseFloat(frameRateStr) || null;
}

/**
 * Validate media file for billboard display
 *
 * @param source - File path or URL to validate
 * @returns Validation result with metadata and any errors
 */
export async function validateMedia(source: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  let tempFile: string | null = null;

  try {
    // Check if FFprobe is available
    const ffprobeAvailable = await isFFprobeAvailable();
    if (!ffprobeAvailable) {
      return {
        valid: false,
        mediaType: null,
        metadata: null,
        errors: ['FFprobe is not installed on this system'],
        warnings: [],
      };
    }

    // If source is a URL, download to temp file
    let filePath = source;
    if (source.startsWith('http://') || source.startsWith('https://')) {
      tempFile = await downloadToTemp(source);
      filePath = tempFile;
    }

    // Get file size
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;

    // Check file size
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      errors.push(`File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds maximum allowed (${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`);
    }

    // Get metadata using FFprobe
    const probeData = await getMediaMetadata(filePath);

    // Find video and audio streams
    const videoStream = probeData.streams.find(s => s.codec_type === 'video');
    const audioStream = probeData.streams.find(s => s.codec_type === 'audio');

    if (!videoStream && !probeData.format.format_name.includes('image')) {
      return {
        valid: false,
        mediaType: null,
        metadata: null,
        errors: ['No video stream found in file'],
        warnings: [],
      };
    }

    // Determine media type
    const formatName = probeData.format.format_name.toLowerCase();
    const isImage = formatName.includes('image') ||
                    formatName.includes('png') ||
                    formatName.includes('jpeg') ||
                    formatName.includes('webp');
    const mediaType: 'image' | 'video' = isImage ? 'image' : 'video';

    // Get dimensions
    const width = videoStream?.width || 0;
    const height = videoStream?.height || 0;

    // Check resolution
    if (width < MIN_WIDTH || height < MIN_HEIGHT) {
      errors.push(`Resolution (${width}x${height}) is below minimum required (${MIN_WIDTH}x${MIN_HEIGHT})`);
    }

    // Get duration (null for images)
    const duration = probeData.format.duration ? parseFloat(probeData.format.duration) : null;

    // Check duration for videos
    if (mediaType === 'video' && duration !== null) {
      if (duration > MAX_DURATION_SECONDS) {
        errors.push(`Video duration (${Math.round(duration)}s) exceeds maximum allowed (${MAX_DURATION_SECONDS}s)`);
      }
      if (duration < 1) {
        warnings.push('Video is very short (less than 1 second)');
      }
    }

    // Check codec for videos
    const codec = videoStream?.codec_name?.toLowerCase() || '';
    if (mediaType === 'video' && !SUPPORTED_VIDEO_CODECS.includes(codec)) {
      warnings.push(`Video codec (${codec}) may need transcoding for optimal playback`);
    }

    // Build metadata object
    const metadata: MediaMetadata = {
      format: formatName,
      codec: codec,
      width,
      height,
      duration,
      frameRate: parseFrameRate(videoStream?.r_frame_rate),
      bitrate: probeData.format.bit_rate ? parseInt(probeData.format.bit_rate) : null,
      fileSize,
      hasAudio: !!audioStream,
      audioCodec: audioStream?.codec_name || null,
    };

    // Check format
    const extension = source.split('.').pop()?.toLowerCase() || '';
    const supportedFormats = [...SUPPORTED_VIDEO_FORMATS, ...SUPPORTED_IMAGE_FORMATS];
    if (!supportedFormats.includes(extension)) {
      warnings.push(`File extension (${extension}) may not be optimal for billboard display`);
    }

    return {
      valid: errors.length === 0,
      mediaType,
      metadata,
      errors,
      warnings,
    };

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown validation error';
    return {
      valid: false,
      mediaType: null,
      metadata: null,
      errors: [`Validation failed: ${message}`],
      warnings: [],
    };
  } finally {
    // Clean up temp file if created
    if (tempFile) {
      await cleanupTemp(tempFile);
    }
  }
}

/**
 * Quick validation without FFprobe (for initial checks)
 * Only checks file extension and size from URL headers
 */
export async function quickValidate(url: string): Promise<{
  valid: boolean;
  mediaType: 'image' | 'video' | null;
  error?: string;
}> {
  try {
    // Check extension
    const extension = url.split('?')[0].split('.').pop()?.toLowerCase() || '';

    let mediaType: 'image' | 'video' | null = null;
    if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
      mediaType = 'video';
    } else if (SUPPORTED_IMAGE_FORMATS.includes(extension)) {
      mediaType = 'image';
    }

    if (!mediaType) {
      return {
        valid: false,
        mediaType: null,
        error: `Unsupported file format: ${extension}`,
      };
    }

    // Check file size via HEAD request
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) {
      return {
        valid: false,
        mediaType: null,
        error: `Cannot access file: ${response.status}`,
      };
    }

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength);
      if (size > MAX_FILE_SIZE_BYTES) {
        return {
          valid: false,
          mediaType,
          error: `File too large: ${Math.round(size / 1024 / 1024)}MB (max ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`,
        };
      }
    }

    return { valid: true, mediaType };
  } catch (error) {
    return {
      valid: false,
      mediaType: null,
      error: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}
