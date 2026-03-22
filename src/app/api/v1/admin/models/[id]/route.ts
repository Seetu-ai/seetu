import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { uploadBuffer, BUCKETS, getSignedUrl } from '@/lib/storage';
import { AssetType, AssetStatus } from '@prisma/client';

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
 * GET /api/v1/admin/models/[id]
 * Get a single model with signed URLs for private images
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

    const model = await prisma.creatorAsset.findFirst({
      where: {
        id,
        type: AssetType.MODEL_PROFILE,
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
    });

    if (!model) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Generate signed URLs for private images
    const signedImageUrls: string[] = [];
    for (const path of model.imageUrls) {
      try {
        const signedUrl = await getSignedUrl(BUCKETS.CREATOR_PRIVATE, path, 3600);
        signedImageUrls.push(signedUrl);
      } catch (e) {
        console.warn('[ADMIN_MODELS] Failed to sign URL:', path);
      }
    }

    return NextResponse.json({
      model: {
        ...model,
        signedImageUrls,
      },
    });
  } catch (error) {
    console.error('[ADMIN_MODELS] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch model' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/models/[id]
 * Update a model
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

    // Check if model exists
    const existing = await prisma.creatorAsset.findFirst({
      where: {
        id,
        type: AssetType.MODEL_PROFILE,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const formData = await req.formData();

    // Extract fields
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const modelGender = formData.get('modelGender') as string | null;
    const modelAgeRange = formData.get('modelAgeRange') as string | null;
    const modelStylesStr = formData.get('modelStyles') as string | null;
    const priceUnitsStr = formData.get('priceUnits') as string | null;
    const tagsStr = formData.get('tags') as string | null;
    const statusStr = formData.get('status') as AssetStatus | null;

    // Image files (optional for update)
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const imageFiles = formData.getAll('images') as File[];

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (title) updateData.title = title;
    if (description !== null) updateData.description = description || null;
    if (modelGender) updateData.modelGender = modelGender;
    if (modelAgeRange) updateData.modelAgeRange = modelAgeRange;
    if (modelStylesStr) {
      updateData.modelStyles = modelStylesStr.split(',').map((s) => s.trim());
    }
    if (priceUnitsStr !== null) {
      updateData.priceUnits = parseInt(priceUnitsStr) || 50;
    }
    if (tagsStr !== null) {
      updateData.tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()) : [];
    }
    if (statusStr) {
      updateData.status = statusStr;
      if (statusStr === AssetStatus.APPROVED || statusStr === AssetStatus.REJECTED) {
        updateData.reviewedAt = new Date();
        updateData.reviewedBy = user.id;
      }
    }

    // Upload new thumbnail if provided
    if (thumbnailFile && thumbnailFile.size > 0) {
      const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
      const thumbnailResult = await uploadBuffer(
        BUCKETS.CREATOR_PUBLIC,
        thumbnailBuffer,
        `model-thumb-${Date.now()}.${thumbnailFile.name.split('.').pop() || 'jpg'}`,
        thumbnailFile.type || 'image/jpeg'
      );
      updateData.thumbnailUrl = thumbnailResult.url;
    }

    // Upload new images if provided (append to existing)
    const newImageUrls: string[] = [];
    for (const file of imageFiles) {
      if (file.size > 0) {
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        const imageResult = await uploadBuffer(
          BUCKETS.CREATOR_PRIVATE,
          imageBuffer,
          `model-img-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'jpg'}`,
          file.type || 'image/jpeg'
        );
        newImageUrls.push(imageResult.path);
      }
    }

    if (newImageUrls.length > 0) {
      updateData.imageUrls = [...existing.imageUrls, ...newImageUrls];
    }

    // Update model
    const model = await prisma.creatorAsset.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            isVerified: true,
          },
        },
      },
    });

    return NextResponse.json({ model });
  } catch (error) {
    console.error('[ADMIN_MODELS] Error updating:', error);
    return NextResponse.json(
      { error: 'Failed to update model' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/admin/models/[id]
 * Soft delete a model
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

    // Check if model exists
    const existing = await prisma.creatorAsset.findFirst({
      where: {
        id,
        type: AssetType.MODEL_PROFILE,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    // Soft delete
    await prisma.creatorAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN_MODELS] Error deleting:', error);
    return NextResponse.json(
      { error: 'Failed to delete model' },
      { status: 500 }
    );
  }
}
