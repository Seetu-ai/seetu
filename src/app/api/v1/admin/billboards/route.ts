/**
 * GET/POST /api/v1/admin/billboards
 *
 * Admin: List and create billboards
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Superadmin emails (same pattern as existing admin routes)
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return false;
  return SUPERADMIN_EMAILS.includes(user.email);
}

export async function GET(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('include_inactive') === 'true';

    const billboards = await prisma.billboard.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: {
          select: {
            queueItems: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      billboards: billboards.map((b) => ({
        ...b,
        queueCount: b._count.queueItems,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error('[ADMIN] GET /billboards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billboards' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      address,
      latitude,
      longitude,
      pricePerSlot,
      slotDurationSecs = 300,
      resolutionWidth = 1920,
      resolutionHeight = 1080,
      supportedFormats = ['mp4', 'jpg'],
      previewImageUrl,
      defaultContentUrl,
    } = body;

    // Validate required fields
    if (!name || !slug || !address || latitude === undefined || longitude === undefined || !pricePerSlot) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, address, latitude, longitude, pricePerSlot' },
        { status: 400 }
      );
    }

    // Check slug uniqueness
    const existingSlug = await prisma.billboard.findUnique({
      where: { slug },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: 'Slug already exists' },
        { status: 400 }
      );
    }

    // Generate API key for billboard player
    const apiKey = `bb_${crypto.randomBytes(24).toString('hex')}`;

    const billboard = await prisma.billboard.create({
      data: {
        name,
        slug,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        pricePerSlot: parseInt(pricePerSlot),
        slotDurationSecs: parseInt(slotDurationSecs),
        resolutionWidth: parseInt(resolutionWidth),
        resolutionHeight: parseInt(resolutionHeight),
        supportedFormats,
        previewImageUrl,
        defaultContentUrl,
        apiKey,
        status: 'offline',
        isActive: true,
      },
    });

    return NextResponse.json({
      billboard,
      apiKey, // Only returned on creation
    });
  } catch (error) {
    console.error('[ADMIN] POST /billboards error:', error);
    return NextResponse.json(
      { error: 'Failed to create billboard' },
      { status: 500 }
    );
  }
}
