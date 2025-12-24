/**
 * Supabase Storage Utility
 * Handles file uploads to Supabase Storage (S3-compatible)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy-initialized Supabase client (avoids build-time errors)
let _supabase: SupabaseClient | null = null;

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables not configured');
    }

    _supabase = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _supabase;
}

// Bucket names
export const BUCKETS = {
  UPLOADS: 'uploads',           // User uploaded images
  GENERATED: 'generated',       // AI generated images
  CLEAN_REFS: 'clean-refs',     // Processed product references
  BRANDS: 'brands',             // Brand logos, assets
  // Creator ecosystem buckets
  CREATOR_PUBLIC: 'creator-public',   // Public thumbnails, avatars
  CREATOR_PRIVATE: 'creator-private', // Consent docs, IDs, raw assets (NEVER public)
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

interface UploadResult {
  url: string;
  path: string;
}

/**
 * Ensure a bucket exists, create if not
 */
async function ensureBucketExists(bucket: BucketName): Promise<void> {
  const supabase = getSupabase();
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === bucket);

  if (!exists) {
    const isPrivate = bucket === BUCKETS.CREATOR_PRIVATE;
    const { error } = await supabase.storage.createBucket(bucket, {
      public: !isPrivate,
      fileSizeLimit: isPrivate ? 20 * 1024 * 1024 : 10 * 1024 * 1024,
    });

    if (error && !error.message.includes('already exists')) {
      console.error(`[STORAGE] Failed to create bucket ${bucket}:`, error);
      throw new Error(`Failed to create bucket: ${error.message}`);
    }
    console.log(`[STORAGE] Created bucket: ${bucket}`);
  }
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

  const supabase = getSupabase();

  // Ensure bucket exists before upload
  await ensureBucketExists(bucket);

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
  const { error } = await getSupabase().storage.from(bucket).remove([path]);

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
  const { data, error } = await getSupabase().storage
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
  const supabase = getSupabase();
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
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ═══════════════════════════════════════════════════════════════
// CREATOR ECOSYSTEM STORAGE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Upload creator avatar (public)
 */
export async function uploadCreatorAvatar(
  buffer: Buffer,
  creatorId: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = `avatars/${creatorId}/${Date.now()}.${ext}`;

  return uploadBuffer(BUCKETS.CREATOR_PUBLIC, buffer, filename, contentType);
}

/**
 * Upload creator asset thumbnail (public)
 */
export async function uploadAssetThumbnail(
  buffer: Buffer,
  creatorId: string,
  assetId: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = `thumbnails/${creatorId}/${assetId}-${Date.now()}.${ext}`;

  return uploadBuffer(BUCKETS.CREATOR_PUBLIC, buffer, filename, contentType);
}

/**
 * Upload creator asset image (private - for AI generation use only)
 */
export async function uploadCreatorAssetImage(
  buffer: Buffer,
  creatorId: string,
  assetId: string,
  index: number,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = `assets/${creatorId}/${assetId}/${index}-${Date.now()}.${ext}`;

  return uploadBufferPrivate(BUCKETS.CREATOR_PRIVATE, buffer, filename, contentType);
}

/**
 * Upload consent form (private - NEVER expose publicly)
 */
export async function uploadConsentForm(
  buffer: Buffer,
  creatorId: string,
  assetId: string,
  contentType: string = 'application/pdf'
): Promise<UploadResult> {
  const ext = contentType === 'application/pdf' ? 'pdf' : 'jpg';
  const filename = `consent/${creatorId}/${assetId}/consent-form-${Date.now()}.${ext}`;

  return uploadBufferPrivate(BUCKETS.CREATOR_PRIVATE, buffer, filename, contentType);
}

/**
 * Upload ID document (private - NEVER expose publicly)
 */
export async function uploadIdDocument(
  buffer: Buffer,
  creatorId: string,
  assetId: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = `consent/${creatorId}/${assetId}/id-doc-${Date.now()}.${ext}`;

  return uploadBufferPrivate(BUCKETS.CREATOR_PRIVATE, buffer, filename, contentType);
}

/**
 * Upload selfie verification (private - NEVER expose publicly)
 */
export async function uploadSelfieVerification(
  buffer: Buffer,
  creatorId: string,
  assetId: string,
  contentType: string = 'image/jpeg'
): Promise<UploadResult> {
  const ext = contentType.split('/')[1] || 'jpg';
  const filename = `consent/${creatorId}/${assetId}/selfie-verify-${Date.now()}.${ext}`;

  return uploadBufferPrivate(BUCKETS.CREATOR_PRIVATE, buffer, filename, contentType);
}

/**
 * Upload to private bucket (returns path only, not public URL)
 */
async function uploadBufferPrivate(
  bucket: BucketName,
  buffer: Buffer,
  filename: string,
  contentType: string = 'image/png'
): Promise<UploadResult> {
  const path = `${Date.now()}-${filename}`;

  const supabase = getSupabase();

  // Ensure bucket exists before upload
  await ensureBucketExists(bucket);

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    console.error('[STORAGE] Private upload error:', error);
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  // For private buckets, we only return the path (not a public URL)
  // Use getSignedUrl() when needed for admin viewing
  return {
    url: '', // No public URL for private files
    path: data.path,
  };
}

/**
 * Get signed URL for private creator files (admin use only)
 * Use short expiry for sensitive documents
 */
export async function getCreatorPrivateSignedUrl(
  path: string,
  expiresInSeconds: number = 300 // 5 minutes default for sensitive docs
): Promise<string> {
  return getSignedUrl(BUCKETS.CREATOR_PRIVATE, path, expiresInSeconds);
}

/**
 * Get signed URLs for creator asset images (for AI generation)
 * Longer expiry since these are used in generation pipeline
 */
export async function getAssetImageSignedUrls(
  paths: string[],
  expiresInSeconds: number = 3600 // 1 hour for generation use
): Promise<string[]> {
  return Promise.all(
    paths.map(path => getSignedUrl(BUCKETS.CREATOR_PRIVATE, path, expiresInSeconds))
  );
}

/**
 * Ensure creator buckets exist with proper permissions
 * IMPORTANT: CREATOR_PRIVATE must NOT be public
 */
export async function ensureCreatorBucketsExist(): Promise<void> {
  const supabase = getSupabase();

  // Public bucket for thumbnails/avatars
  const { data: buckets } = await supabase.storage.listBuckets();

  const publicExists = buckets?.some(b => b.name === BUCKETS.CREATOR_PUBLIC);
  if (!publicExists) {
    const { error } = await supabase.storage.createBucket(BUCKETS.CREATOR_PUBLIC, {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB for thumbnails
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`[STORAGE] Failed to create bucket ${BUCKETS.CREATOR_PUBLIC}:`, error);
    } else {
      console.log(`[STORAGE] Created public bucket: ${BUCKETS.CREATOR_PUBLIC}`);
    }
  }

  // Private bucket for consent docs, IDs, raw assets
  const privateExists = buckets?.some(b => b.name === BUCKETS.CREATOR_PRIVATE);
  if (!privateExists) {
    const { error } = await supabase.storage.createBucket(BUCKETS.CREATOR_PRIVATE, {
      public: false, // CRITICAL: Must be private
      fileSizeLimit: 20 * 1024 * 1024, // 20MB for high-res photos + PDFs
    });
    if (error && !error.message.includes('already exists')) {
      console.error(`[STORAGE] Failed to create bucket ${BUCKETS.CREATOR_PRIVATE}:`, error);
    } else {
      console.log(`[STORAGE] Created private bucket: ${BUCKETS.CREATOR_PRIVATE}`);
    }
  }
}

/**
 * Delete all files for a creator asset (cleanup on delete)
 */
export async function deleteCreatorAssetFiles(
  creatorId: string,
  assetId: string
): Promise<void> {
  const supabase = getSupabase();

  // Delete from public bucket (thumbnails)
  const publicPrefix = `thumbnails/${creatorId}/${assetId}`;
  const { data: publicFiles } = await supabase.storage
    .from(BUCKETS.CREATOR_PUBLIC)
    .list(publicPrefix);

  if (publicFiles?.length) {
    await supabase.storage
      .from(BUCKETS.CREATOR_PUBLIC)
      .remove(publicFiles.map(f => `${publicPrefix}/${f.name}`));
  }

  // Delete from private bucket (asset images + consent docs)
  const privatePrefix = `assets/${creatorId}/${assetId}`;
  const { data: privateFiles } = await supabase.storage
    .from(BUCKETS.CREATOR_PRIVATE)
    .list(privatePrefix);

  if (privateFiles?.length) {
    await supabase.storage
      .from(BUCKETS.CREATOR_PRIVATE)
      .remove(privateFiles.map(f => `${privatePrefix}/${f.name}`));
  }

  // Delete consent folder
  const consentPrefix = `consent/${creatorId}/${assetId}`;
  const { data: consentFiles } = await supabase.storage
    .from(BUCKETS.CREATOR_PRIVATE)
    .list(consentPrefix);

  if (consentFiles?.length) {
    await supabase.storage
      .from(BUCKETS.CREATOR_PRIVATE)
      .remove(consentFiles.map(f => `${consentPrefix}/${f.name}`));
  }
}
