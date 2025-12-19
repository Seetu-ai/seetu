import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// Development: Local file storage
// Production: Use R2 or Supabase Storage

async function saveLocally(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop() || 'jpg';
  const filename = `${timestamp}-${random}.${ext}`;

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');

  // Ensure directory exists
  await mkdir(uploadDir, { recursive: true });

  const filepath = path.join(uploadDir, filename);
  await writeFile(filepath, buffer);

  return `/uploads/${filename}`;
}

export async function POST(req: NextRequest) {
  // Check authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

    // Check if R2 is configured
    const isR2Configured =
      process.env.R2_ENDPOINT &&
      process.env.R2_ACCESS_KEY &&
      process.env.R2_SECRET_KEY &&
      !process.env.R2_ENDPOINT.includes('example');

    let publicUrl: string;

    if (isR2Configured) {
      // Use R2 for production
      const { uploadFile, generateKey } = await import('@/lib/r2');
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const key = generateKey('products', file.name);
      publicUrl = await uploadFile(key, buffer, file.type);
    } else {
      // Use local storage for development
      publicUrl = await saveLocally(file);
    }

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
