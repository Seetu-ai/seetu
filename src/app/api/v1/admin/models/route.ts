import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { uploadBuffer, BUCKETS } from '@/lib/storage';
import { AssetType, AssetStatus } from '@prisma/client';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map((e) => e.trim())
  .filter(Boolean);

// Platform creator email for admin-created models
const PLATFORM_CREATOR_EMAIL = 'platform@seetu.ai';

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
 * Ensure platform creator exists for admin-created models
 */
async function ensurePlatformCreator(): Promise<string> {
  // Find or create platform user
  let platformUser = await prisma.user.findUnique({
    where: { email: PLATFORM_CREATOR_EMAIL },
  });

  if (!platformUser) {
    platformUser = await prisma.user.create({
      data: {
        authId: 'platform-seetu-ai', // Special auth ID for platform
        email: PLATFORM_CREATOR_EMAIL,
        name: 'SEETU Platform',
      },
    });
  }

  // Find or create platform creator profile
  let creatorProfile = await prisma.creatorProfile.findUnique({
    where: { userId: platformUser.id },
  });

  if (!creatorProfile) {
    creatorProfile = await prisma.creatorProfile.create({
      data: {
        userId: platformUser.id,
        type: 'MODEL',
        displayName: 'SEETU Platform',
        bio: 'Official SEETU platform models',
        isVerified: true,
      },
    });
  }

  return creatorProfile.id;
}

/**
 * GET /api/v1/admin/models
 * List all MODEL_PROFILE assets with optional filtering
 */
export async function GET(req: NextRequest) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as AssetStatus | null;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const where: Record<string, unknown> = {
      type: AssetType.MODEL_PROFILE,
    };

    if (status) {
      where.status = status;
    }

    if (!includeDeleted) {
      where.deletedAt = null;
    }

    const models = await prisma.creatorAsset.findMany({
      where,
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
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ models });
  } catch (error) {
    console.error('[ADMIN_MODELS] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/models
 * Create a new platform model (admin-curated, no consent required)
 */
export async function POST(req: NextRequest) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    // Extract fields
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const modelGender = formData.get('modelGender') as string;
    const modelAgeRange = formData.get('modelAgeRange') as string;
    const modelStylesStr = formData.get('modelStyles') as string;
    const priceUnits = parseInt(formData.get('priceUnits') as string) || 50;
    const tagsStr = formData.get('tags') as string;

    // Image files
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const imageFiles = formData.getAll('images') as File[];

    // Validate required fields
    if (!title || !modelGender || !modelAgeRange) {
      return NextResponse.json(
        { error: 'Missing required fields: title, modelGender, modelAgeRange' },
        { status: 400 }
      );
    }

    if (!thumbnailFile) {
      return NextResponse.json(
        { error: 'Thumbnail image is required' },
        { status: 400 }
      );
    }

    // Ensure platform creator exists
    const creatorId = await ensurePlatformCreator();

    // Upload thumbnail to public bucket
    const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
    const thumbnailResult = await uploadBuffer(
      BUCKETS.CREATOR_PUBLIC,
      thumbnailBuffer,
      `model-thumb-${Date.now()}.${thumbnailFile.name.split('.').pop() || 'jpg'}`,
      thumbnailFile.type || 'image/jpeg'
    );

    // Upload additional images to private bucket
    const imageUrls: string[] = [];
    for (const file of imageFiles) {
      if (file.size > 0) {
        const imageBuffer = Buffer.from(await file.arrayBuffer());
        const imageResult = await uploadBuffer(
          BUCKETS.CREATOR_PRIVATE,
          imageBuffer,
          `model-img-${Date.now()}-${Math.random().toString(36).slice(2)}.${file.name.split('.').pop() || 'jpg'}`,
          file.type || 'image/jpeg'
        );
        imageUrls.push(imageResult.path);
      }
    }

    // Parse styles and tags
    const modelStyles = modelStylesStr
      ? modelStylesStr.split(',').map((s) => s.trim())
      : [];
    const tags = tagsStr ? tagsStr.split(',').map((t) => t.trim()) : [];

    // Create model asset
    const model = await prisma.creatorAsset.create({
      data: {
        creatorId,
        type: AssetType.MODEL_PROFILE,
        status: AssetStatus.APPROVED, // Platform models are auto-approved
        title,
        description: description || null,
        thumbnailUrl: thumbnailResult.url,
        imageUrls,
        modelGender,
        modelAgeRange,
        modelStyles,
        priceUnits,
        tags,
        consentVerified: true, // Platform models don't need consent
        reviewedAt: new Date(),
        reviewedBy: user.id,
      },
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

    return NextResponse.json({ model }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN_MODELS] Error creating:', error);
    return NextResponse.json(
      { error: 'Failed to create model' },
      { status: 500 }
    );
  }
}
