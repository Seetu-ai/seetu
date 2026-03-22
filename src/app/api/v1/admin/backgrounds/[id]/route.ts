import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { uploadBuffer, BUCKETS } from '@/lib/storage';
import { BackgroundType } from '@prisma/client';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

async function checkSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !SUPERADMIN_EMAILS.includes(user.email || '')) {
    return null;
  }
  return user;
}

/**
 * GET /api/v1/admin/backgrounds/[id]
 * Get a single background
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    const background = await prisma.background.findUnique({
      where: { id },
    });

    if (!background) {
      return NextResponse.json(
        { error: 'Background not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ background });
  } catch (error) {
    console.error('[ADMIN_BACKGROUNDS] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch background' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/backgrounds/[id]
 * Update a background
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if background exists
    const existing = await prisma.background.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Background not found' },
        { status: 404 }
      );
    }

    const formData = await req.formData();

    // Extract fields
    const name = formData.get('name') as string | null;
    const nameFr = formData.get('nameFr') as string | null;
    const type = formData.get('type') as BackgroundType | null;
    const category = formData.get('category') as string | null;
    const lighting = formData.get('lighting') as string | null;
    const mood = formData.get('mood') as string | null;
    const colorsStr = formData.get('colors') as string | null;
    const location = formData.get('location') as string | null;
    const landmark = formData.get('landmark') as string | null;
    const promptHints = formData.get('promptHints') as string | null;
    const negativeHints = formData.get('negativeHints') as string | null;
    const isPremiumStr = formData.get('isPremium') as string | null;
    const isActiveStr = formData.get('isActive') as string | null;
    const sortOrderStr = formData.get('sortOrder') as string | null;

    // Image files (optional for update)
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const imageFile = formData.get('image') as File | null;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (nameFr) updateData.nameFr = nameFr;
    if (type) updateData.type = type;
    if (category) updateData.category = category;
    if (lighting) updateData.lighting = lighting;
    if (mood) updateData.mood = mood;
    if (colorsStr) {
      updateData.colors = colorsStr.split(',').map((c) => c.trim());
    }
    if (location !== null) updateData.location = location || null;
    if (landmark !== null) updateData.landmark = landmark || null;
    if (promptHints !== null) updateData.promptHints = promptHints || null;
    if (negativeHints !== null) updateData.negativeHints = negativeHints || null;
    if (isPremiumStr !== null) updateData.isPremium = isPremiumStr === 'true';
    if (isActiveStr !== null) updateData.isActive = isActiveStr === 'true';
    if (sortOrderStr !== null) updateData.sortOrder = parseInt(sortOrderStr) || 0;

    // Upload new thumbnail if provided
    if (thumbnailFile && thumbnailFile.size > 0) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailResult = await uploadBuffer(
        BUCKETS.LOCATIONS,
        thumbnailBuffer,
        `bg-thumb-${existing.slug}-${Date.now()}.${thumbnailFile.name.split('.').pop() || 'jpg'}`,
        thumbnailFile.type || 'image/jpeg'
      );
      updateData.thumbnailUrl = thumbnailResult.url;
    }

    // Upload new full image if provided
    if (imageFile && imageFile.size > 0) {
      const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
      const imageResult = await uploadBuffer(
        BUCKETS.LOCATIONS,
        imageBuffer,
        `bg-full-${existing.slug}-${Date.now()}.${imageFile.name.split('.').pop() || 'jpg'}`,
        imageFile.type || 'image/jpeg'
      );
      updateData.imageUrl = imageResult.url;
    }

    // Update background
    const background = await prisma.background.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ background });
  } catch (error) {
    console.error('[ADMIN_BACKGROUNDS] Error updating:', error);
    return NextResponse.json(
      { error: 'Failed to update background' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/admin/backgrounds/[id]
 * Soft delete a background (set isActive to false)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Check if background exists
    const existing = await prisma.background.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Background not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting isActive to false
    await prisma.background.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_BACKGROUNDS] Error deleting:', error);
    return NextResponse.json(
      { error: 'Failed to delete background' },
      { status: 500 }
    );
  }
}
