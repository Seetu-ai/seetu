/**
 * Billboard Content Transcoding
 *
 * Uses FFmpeg to process media for billboard display:
 * - Resize to billboard resolution
 * - Add Seetu frame overlay
 * - Encode H.264/AAC for MP4
 * - Generate thumbnails
 */

import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { uploadBuffer, BUCKETS } from '../storage';

const execAsync = promisify(exec);

// Default billboard resolutions
export const RESOLUTIONS = {
  LANDSCAPE_HD: { width: 1920, height: 1080 },
  LANDSCAPE_4K: { width: 3840, height: 2160 },
  PORTRAIT_HD: { width: 1080, height: 1920 },
  PORTRAIT_4K: { width: 2160, height: 3840 },
} as const;

export interface TranscodeOptions {
  targetWidth: number;
  targetHeight: number;
  overlayPath?: string; // Path to Seetu frame overlay PNG
  outputFormat?: 'mp4' | 'webm';
  videoBitrate?: string; // e.g., "5M" for 5 Mbps
  audioBitrate?: string; // e.g., "128k"
  generateThumbnail?: boolean;
  thumbnailTime?: number; // Seconds into video for thumbnail
}

export interface TranscodeResult {
  success: boolean;
  videoUrl?: string;
  thumbnailUrl?: string;
  videoPath?: string;
  thumbnailPath?: string;
  duration?: number;
  error?: string;
}

/**
 * Check if FFmpeg is available on the system
 */
export async function isFFmpegAvailable(): Promise<boolean> {
  try {
    await execAsync('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a file from URL to temporary location
 */
async function downloadToTemp(url: string, extension: string): Promise<string> {
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `billboard-transcode-${Date.now()}.${extension}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.promises.writeFile(tempFile, buffer);

  return tempFile;
}

/**
 * Clean up temporary files
 */
async function cleanupTemp(...filePaths: (string | undefined)[]): Promise<void> {
  for (const filePath of filePaths) {
    if (filePath) {
      try {
        await fs.promises.unlink(filePath);
      } catch {
        // Ignore cleanup errors
      }
    }
  }
}

/**
 * Get temp file path for output
 */
function getTempOutput(extension: string): string {
  const tempDir = os.tmpdir();
  return path.join(tempDir, `billboard-output-${Date.now()}.${extension}`);
}

/**
 * Build FFmpeg command for video transcoding
 */
function buildVideoCommand(
  inputPath: string,
  outputPath: string,
  options: TranscodeOptions
): string {
  const {
    targetWidth,
    targetHeight,
    overlayPath,
    videoBitrate = '5M',
    audioBitrate = '128k',
  } = options;

  // Base filter chain
  let filterComplex = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`;

  // Add overlay if provided
  if (overlayPath) {
    filterComplex += `[scaled];[scaled][1:v]overlay=0:0`;
  }

  let command = `ffmpeg -y -i "${inputPath}"`;

  // Add overlay input if provided
  if (overlayPath) {
    command += ` -i "${overlayPath}"`;
  }

  command += ` -filter_complex "${filterComplex}"`;
  command += ` -c:v libx264 -preset medium -b:v ${videoBitrate}`;
  command += ` -c:a aac -b:a ${audioBitrate}`;
  command += ` -movflags +faststart`; // Enable streaming
  command += ` "${outputPath}"`;

  return command;
}

/**
 * Build FFmpeg command for image to video conversion
 */
function buildImageToVideoCommand(
  inputPath: string,
  outputPath: string,
  options: TranscodeOptions,
  duration: number = 10 // Default 10 second display
): string {
  const {
    targetWidth,
    targetHeight,
    overlayPath,
    videoBitrate = '5M',
  } = options;

  // Base filter chain with zoom effect
  let filterComplex = `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease,pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black,zoompan=z='min(zoom+0.001,1.1)':d=${duration * 25}:s=${targetWidth}x${targetHeight}`;

  // Add overlay if provided
  if (overlayPath) {
    filterComplex += `[scaled];[scaled][1:v]overlay=0:0`;
  }

  let command = `ffmpeg -y -loop 1 -i "${inputPath}"`;

  // Add overlay input if provided
  if (overlayPath) {
    command += ` -i "${overlayPath}"`;
  }

  command += ` -filter_complex "${filterComplex}"`;
  command += ` -c:v libx264 -preset medium -b:v ${videoBitrate}`;
  command += ` -t ${duration}`;
  command += ` -pix_fmt yuv420p`;
  command += ` -movflags +faststart`;
  command += ` "${outputPath}"`;

  return command;
}

/**
 * Generate thumbnail from video
 */
async function generateThumbnail(
  inputPath: string,
  outputPath: string,
  time: number = 0
): Promise<void> {
  const command = `ffmpeg -y -i "${inputPath}" -ss ${time} -vframes 1 -q:v 2 "${outputPath}"`;
  await execAsync(command);
}

/**
 * Transcode video for billboard display
 */
export async function transcodeVideo(
  sourceUrl: string,
  options: TranscodeOptions
): Promise<TranscodeResult> {
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let thumbnailPath: string | undefined;

  try {
    // Check FFmpeg availability
    const ffmpegAvailable = await isFFmpegAvailable();
    if (!ffmpegAvailable) {
      return {
        success: false,
        error: 'FFmpeg is not installed on this system',
      };
    }

    // Download source file
    const extension = sourceUrl.split('?')[0].split('.').pop() || 'mp4';
    inputPath = await downloadToTemp(sourceUrl, extension);

    // Set up output paths
    const outputFormat = options.outputFormat || 'mp4';
    outputPath = getTempOutput(outputFormat);

    // Build and execute transcode command
    const command = buildVideoCommand(inputPath, outputPath, options);
    console.log('[TRANSCODE] Running:', command);

    await execAsync(command, { maxBuffer: 100 * 1024 * 1024 }); // 100MB buffer

    // Generate thumbnail if requested
    if (options.generateThumbnail) {
      thumbnailPath = getTempOutput('jpg');
      await generateThumbnail(
        outputPath,
        thumbnailPath,
        options.thumbnailTime || 0
      );
    }

    // Read output files
    const videoBuffer = await fs.promises.readFile(outputPath);

    // Upload to storage
    const videoUpload = await uploadBuffer(
      BUCKETS.GENERATED,
      videoBuffer,
      `billboard-${Date.now()}.${outputFormat}`,
      `video/${outputFormat}`
    );

    let thumbnailUrl: string | undefined;
    if (thumbnailPath) {
      const thumbBuffer = await fs.promises.readFile(thumbnailPath);
      const thumbUpload = await uploadBuffer(
        BUCKETS.GENERATED,
        thumbBuffer,
        `billboard-thumb-${Date.now()}.jpg`,
        'image/jpeg'
      );
      thumbnailUrl = thumbUpload.url;
    }

    // Get duration
    const { stdout } = await execAsync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${outputPath}"`
    );
    const duration = parseFloat(stdout.trim()) || undefined;

    return {
      success: true,
      videoUrl: videoUpload.url,
      videoPath: videoUpload.path,
      thumbnailUrl,
      thumbnailPath: thumbnailPath ? thumbnailPath : undefined,
      duration,
    };

  } catch (error) {
    console.error('[TRANSCODE] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transcoding failed',
    };
  } finally {
    // Clean up temp files
    await cleanupTemp(inputPath, outputPath, thumbnailPath);
  }
}

/**
 * Convert image to video for billboard display
 */
export async function imageToVideo(
  sourceUrl: string,
  options: TranscodeOptions,
  displayDuration: number = 10
): Promise<TranscodeResult> {
  let inputPath: string | undefined;
  let outputPath: string | undefined;
  let thumbnailPath: string | undefined;

  try {
    // Check FFmpeg availability
    const ffmpegAvailable = await isFFmpegAvailable();
    if (!ffmpegAvailable) {
      return {
        success: false,
        error: 'FFmpeg is not installed on this system',
      };
    }

    // Download source file
    const extension = sourceUrl.split('?')[0].split('.').pop() || 'jpg';
    inputPath = await downloadToTemp(sourceUrl, extension);

    // Set up output paths
    const outputFormat = options.outputFormat || 'mp4';
    outputPath = getTempOutput(outputFormat);

    // Build and execute command
    const command = buildImageToVideoCommand(
      inputPath,
      outputPath,
      options,
      displayDuration
    );
    console.log('[TRANSCODE] Running:', command);

    await execAsync(command, { maxBuffer: 100 * 1024 * 1024 });

    // Generate thumbnail (just use the source image)
    if (options.generateThumbnail) {
      thumbnailPath = inputPath; // Reuse input as thumbnail source
    }

    // Read output file
    const videoBuffer = await fs.promises.readFile(outputPath);

    // Upload to storage
    const videoUpload = await uploadBuffer(
      BUCKETS.GENERATED,
      videoBuffer,
      `billboard-${Date.now()}.${outputFormat}`,
      `video/${outputFormat}`
    );

    let thumbnailUrl: string | undefined;
    if (options.generateThumbnail) {
      // Resize and upload original image as thumbnail
      const resizeCommand = `ffmpeg -y -i "${inputPath}" -vf "scale=320:-1" -q:v 4 "${getTempOutput('jpg')}"`;
      const thumbOutput = getTempOutput('jpg');
      await execAsync(resizeCommand);

      const thumbBuffer = await fs.promises.readFile(thumbOutput);
      const thumbUpload = await uploadBuffer(
        BUCKETS.GENERATED,
        thumbBuffer,
        `billboard-thumb-${Date.now()}.jpg`,
        'image/jpeg'
      );
      thumbnailUrl = thumbUpload.url;
      await cleanupTemp(thumbOutput);
    }

    return {
      success: true,
      videoUrl: videoUpload.url,
      videoPath: videoUpload.path,
      thumbnailUrl,
      duration: displayDuration,
    };

  } catch (error) {
    console.error('[TRANSCODE] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image to video conversion failed',
    };
  } finally {
    // Clean up temp files
    await cleanupTemp(inputPath, outputPath);
  }
}

/**
 * Add Seetu frame overlay to existing video
 */
export async function addFrameOverlay(
  videoUrl: string,
  frameOverlayPath: string,
  targetWidth: number,
  targetHeight: number
): Promise<TranscodeResult> {
  return transcodeVideo(videoUrl, {
    targetWidth,
    targetHeight,
    overlayPath: frameOverlayPath,
    generateThumbnail: true,
  });
}

/**
 * Quick thumbnail generation from video URL
 */
export async function generateVideoThumbnail(
  videoUrl: string,
  timeSeconds: number = 0
): Promise<{ success: boolean; thumbnailUrl?: string; error?: string }> {
  let inputPath: string | undefined;
  let outputPath: string | undefined;

  try {
    // Download video
    const extension = videoUrl.split('?')[0].split('.').pop() || 'mp4';
    inputPath = await downloadToTemp(videoUrl, extension);

    // Generate thumbnail
    outputPath = getTempOutput('jpg');
    await generateThumbnail(inputPath, outputPath, timeSeconds);

    // Upload
    const buffer = await fs.promises.readFile(outputPath);
    const upload = await uploadBuffer(
      BUCKETS.GENERATED,
      buffer,
      `billboard-thumb-${Date.now()}.jpg`,
      'image/jpeg'
    );

    return {
      success: true,
      thumbnailUrl: upload.url,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Thumbnail generation failed',
    };
  } finally {
    await cleanupTemp(inputPath, outputPath);
  }
}
