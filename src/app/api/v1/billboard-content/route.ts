/**
 * POST /api/v1/billboard-content
 *
 * Upload content for billboard display
 * Accepts image or video file, validates and queues for moderation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { uploadBuffer, BUCKETS } from '@/lib/storage';
import { enqueueValidation } from '@/lib/queues/billboard-queue';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
];

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Determine media type
    const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

    // Upload to storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const extension = file.name.split('.').pop() || (mediaType === 'video' ? 'mp4' : 'jpg');
    const filename = `billboard/${user.id}/${Date.now()}.${extension}`;

    const upload = await uploadBuffer(
      BUCKETS.UPLOADS,
      buffer,
      filename,
      file.type
    );

    // Create content record
    const content = await prisma.billboardContent.create({
      data: {
        userId: user.id,
        mediaType,
        originalUrl: upload.url,
        status: 'pending_validation',
      },
    });

    // Enqueue validation job
    await enqueueValidation({
      contentId: content.id,
      originalUrl: upload.url,
      userId: user.id,
    });

    return NextResponse.json({
      id: content.id,
      status: content.status,
      mediaType: content.mediaType,
      originalUrl: content.originalUrl,
      message: 'Content uploaded and queued for validation',
    });
  } catch (error) {
    console.error('[API] POST /billboard-content error:', error);
    return NextResponse.json(
      { error: 'Failed to upload content' },
      { status: 500 }
    );
  }
}
