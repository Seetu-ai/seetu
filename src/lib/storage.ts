/**
 * Supabase Storage Utility
 * Handles file uploads to Supabase Storage (S3-compatible)
 */

import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Bucket names
export const BUCKETS = {
  UPLOADS: 'uploads',           // User uploaded images
  GENERATED: 'generated',       // AI generated images
  CLEAN_REFS: 'clean-refs',     // Processed product references
  BRANDS: 'brands',             // Brand logos, assets
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Upload a buffer to Supabase Storage
 */
export async function uploadBuffer(
  bucket: BucketName,
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/png'
): Promise<UploadResult> {
  const path = `${Date.now()}-${filename}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('[STORAGE] Upload error:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path);

  return {
    url: publicUrl,
    path: data.path,
  };
}

/**
 * Upload a File object (from form upload)
 */
export async function uploadFile(
  bucket: BucketName,
  file: File,
  customPath?: string
): Promise<UploadResult> {
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = customPath || `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  return uploadBuffer(bucket, buffer, filename, file.type);
}

/**
 * Upload generated image from AI
 */
export async function uploadGeneratedImage(
  buffer: Buffer,
  userId: string
): Promise<UploadResult> {
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

  return uploadBuffer(BUCKETS.GENERATED, buffer, filename, 'image/png');
}

/**
 * Upload clean reference image
 */
export async function uploadCleanReference(
  buffer: Buffer,
  productId: string
): Promise<UploadResult> {
  const filename = `${productId}-${Date.now()}.png`;

  return uploadBuffer(BUCKETS.CLEAN_REFS, buffer, filename, 'image/png');
}

/**
 * Upload user product image
 */
export async function uploadProductImage(
  buffer: Buffer,
  userId: string,
  originalName: string
): Promise<UploadResult> {
  const ext = originalName.split('.').pop() || 'jpg';
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  return uploadBuffer(BUCKETS.UPLOADS, buffer, filename, `image/${ext}`);
}

/**
 * Delete a file from storage
 */
export async function deleteFile(bucket: BucketName, path: string): Promise<void> {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error('[STORAGE] Delete error:', error);
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Get a signed URL for private files (with expiry)
 */
export async function getSignedUrl(
  bucket: BucketName,
  path: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    console.error('[STORAGE] Signed URL error:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Check if buckets exist, create if not
 * Run this on startup or via migration
 */
export async function ensureBucketsExist(): Promise<void> {
  for (const bucketName of Object.values(BUCKETS)) {
    const { data: buckets } = await supabase.storage.listBuckets();
    const exists = buckets?.some(b => b.name === bucketName);

    if (!exists) {
      const { error } = await supabase.storage.createBucket(bucketName, {
        public: true, // Make public for generated images
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
      });

      if (error && !error.message.includes('already exists')) {
        console.error(`[STORAGE] Failed to create bucket ${bucketName}:`, error);
      } else {
        console.log(`[STORAGE] Created bucket: ${bucketName}`);
      }
    }
  }
}

/**
 * Utility to check if storage is configured
 */
export function isStorageConfigured(): boolean {
  return !!(supabaseUrl && supabaseServiceKey);
}
