/**
 * GET/PUT/DELETE /api/v1/admin/billboards/[id]
 *
 * Admin: Manage individual billboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return false;
  return SUPERADMIN_EMAILS.includes(user.email);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    const billboard = await prisma.billboard.findUnique({
      where: { id },
      include: {
        queueItems: {
          include: {
            content: {
              select: {
                id: true,
                mediaType: true,
                originalUrl: true,
                processedUrls: true,
                status: true,
                whatsappPhone: true,
                user: {
                  select: { email: true },
                },
              },
            },
          },
          orderBy: { position: 'asc' },
          take: 100,
        },
      },
    });

    if (!billboard) {
      return NextResponse.json(
        { error: 'Billboard not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ billboard });
  } catch (error) {
    console.error('[ADMIN] GET /billboards/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billboard' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check billboard exists
    const existing = await prisma.billboard.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Billboard not found' },
        { status: 404 }
      );
    }

    // Check slug uniqueness if changing
    if (body.slug && body.slug !== existing.slug) {
      const slugExists = await prisma.billboard.findUnique({
        where: { slug: body.slug },
      });

      if (slugExists) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    const fields = [
      'name', 'slug', 'address', 'previewImageUrl', 'defaultContentUrl',
    ];
    const numberFields = [
      'latitude', 'longitude', 'pricePerSlot', 'slotDurationSecs',
      'resolutionWidth', 'resolutionHeight',
    ];
    const booleanFields = ['isActive'];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    for (const field of numberFields) {
      if (body[field] !== undefined) {
        updateData[field] = parseFloat(body[field]);
      }
    }

    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        updateData[field] = Boolean(body[field]);
      }
    }

    if (body.supportedFormats !== undefined) {
      updateData.supportedFormats = body.supportedFormats;
    }

    if (body.status !== undefined && ['online', 'offline', 'maintenance'].includes(body.status)) {
      updateData.status = body.status;
    }

    // Regenerate API key if requested
    if (body.regenerateApiKey) {
      updateData.apiKey = `bb_${crypto.randomBytes(24).toString('hex')}`;
    }

    const billboard = await prisma.billboard.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      billboard,
      newApiKey: body.regenerateApiKey ? billboard.apiKey : undefined,
    });
  } catch (error) {
    console.error('[ADMIN] PUT /billboards/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to update billboard' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Check billboard exists
    const existing = await prisma.billboard.findUnique({
      where: { id },
      include: {
        _count: {
          select: { queueItems: true },
        },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Billboard not found' },
        { status: 404 }
      );
    }

    // Warn if there are queued items
    if (existing._count.queueItems > 0) {
      const force = request.nextUrl.searchParams.get('force') === 'true';

      if (!force) {
        return NextResponse.json(
          {
            error: 'Billboard has queued content',
            queueCount: existing._count.queueItems,
            hint: 'Add ?force=true to delete anyway',
          },
          { status: 400 }
        );
      }
    }

    await prisma.billboard.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ADMIN] DELETE /billboards/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete billboard' },
      { status: 500 }
    );
  }
}
