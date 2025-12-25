import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { uploadProductImage } from '@/lib/storage';

/**
 * POST /api/v1/upload
 * Upload an image file
 *
 * Accepts multipart/form-data with 'file' field
 * Supports both cookie and Bearer token auth (for mobile clients)
 */
export async function POST(req: NextRequest) {
  // Check authentication (supports both cookie and Bearer token)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images are allowed' }, { status: 400 });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Upload to Supabase Storage
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const { url: publicUrl, path } = await uploadProductImage(buffer, user.authId, file.name);

    return NextResponse.json({
      url: publicUrl,
      path,
      fileName: file.name,
      size: file.size,
      contentType: file.type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
