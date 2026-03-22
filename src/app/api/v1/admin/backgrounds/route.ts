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
 * GET /api/v1/admin/backgrounds
 * List all backgrounds with optional filtering
 */
export async function GET(req: NextRequest) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') as BackgroundType | null;
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const where: Record<string, unknown> = {};
    if (type) {
      where.type = type;
    }
    if (!includeInactive) {
      where.isActive = true;
    }

    const backgrounds = await prisma.background.findMany({
      where,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({ backgrounds });
  } catch (error) {
    console.error('[ADMIN_BACKGROUNDS] Error fetching:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backgrounds' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/backgrounds
 * Create a new background
 */
export async function POST(req: NextRequest) {
  const user = await checkSuperAdmin();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();

    // Extract fields
    const name = formData.get('name') as string;
    const nameFr = formData.get('nameFr') as string;
    const type = formData.get('type') as BackgroundType;
    const category = formData.get('category') as string;
    const lighting = formData.get('lighting') as string;
    const mood = formData.get('mood') as string;
    const colorsStr = formData.get('colors') as string;
    const location = formData.get('location') as string | null;
    const landmark = formData.get('landmark') as string | null;
    const promptHints = formData.get('promptHints') as string | null;
    const negativeHints = formData.get('negativeHints') as string | null;
    const isPremium = formData.get('isPremium') === 'true';
    const sortOrder = parseInt(formData.get('sortOrder') as string) || 0;

    // Image files
    const thumbnailFile = formData.get('thumbnail') as File | null;
    const imageFile = formData.get('image') as File | null;

    // Validate required fields
    if (!name || !nameFr || !type || !category || !lighting || !mood) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!thumbnailFile || !imageFile) {
      return NextResponse.json(
        { error: 'Both thumbnail and full image are required' },
        { status: 400 }
      );
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check if slug exists
    const existingBg = await prisma.background.findUnique({
      where: { slug },
    });
    if (existingBg) {
      return NextResponse.json(
        { error: 'A background with this name already exists' },
        { status: 400 }
      );
    }

    // Upload thumbnail
    const thumbnailBuffer = Buffer.from(await thumbnailFile.arrayBuffer());
    const thumbnailResult = await uploadBuffer(
      BUCKETS.LOCATIONS,
      thumbnailBuffer,
      `bg-thumb-${slug}.${thumbnailFile.name.split('.').pop() || 'jpg'}`,
      thumbnailFile.type || 'image/jpeg'
    );

    // Upload full image
    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageResult = await uploadBuffer(
      BUCKETS.LOCATIONS,
      imageBuffer,
      `bg-full-${slug}.${imageFile.name.split('.').pop() || 'jpg'}`,
      imageFile.type || 'image/jpeg'
    );

    // Parse colors array
    const colors = colorsStr ? colorsStr.split(',').map((c) => c.trim()) : [];

    // Create background
    const background = await prisma.background.create({
      data: {
        slug,
        name,
        nameFr,
        type,
        category,
        thumbnailUrl: thumbnailResult.url,
        imageUrl: imageResult.url,
        lighting,
        mood,
        colors,
        location: location || null,
        landmark: landmark || null,
        promptHints: promptHints || null,
        negativeHints: negativeHints || null,
        isPremium,
        isActive: true,
        sortOrder,
      },
    });

    return NextResponse.json({ background }, { status: 201 });
  } catch (error) {
    console.error('[ADMIN_BACKGROUNDS] Error creating:', error);
    return NextResponse.json(
      { error: 'Failed to create background' },
      { status: 500 }
    );
  }
}
