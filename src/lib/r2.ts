import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Client
const r2 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY!,
    secretAccessKey: process.env.R2_SECRET_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export type UploadFolder = 'products' | 'generations' | 'exports' | 'logos' | 'thumbnails';

/**
 * Generate a unique key for an upload
 */
export function generateKey(folder: UploadFolder, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = filename.split('.').pop() || 'jpg';
  return `${folder}/${timestamp}-${random}.${ext}`;
}

/**
 * Get a presigned URL for uploading a file
 */
export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

/**
 * Get a presigned URL for downloading a file
 */
export async function getDownloadUrl(
  key: string,
  expiresIn = 86400 // 24 hours
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(r2, command, { expiresIn });
}

/**
 * Upload a file directly from a buffer
 */
export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2.send(command);

  return `${PUBLIC_URL}/${key}`;
}

/**
 * Upload a file from a URL
 */
export async function uploadFromUrl(
  key: string,
  sourceUrl: string
): Promise<string> {
  const response = await fetch(sourceUrl);
  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return uploadFile(key, buffer, contentType);
}

/**
 * Delete a file
 */
export async function deleteFile(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await r2.send(command);
}

/**
 * Get the public URL for a file
 */
export function getPublicUrl(key: string): string {
  return `${PUBLIC_URL}/${key}`;
}

/**
 * Extract key from a full URL
 */
export function extractKeyFromUrl(url: string): string | null {
  if (url.startsWith(PUBLIC_URL)) {
    return url.replace(`${PUBLIC_URL}/`, '');
  }
  return null;
}

export { r2, BUCKET_NAME, PUBLIC_URL };
