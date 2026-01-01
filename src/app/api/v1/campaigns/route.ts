import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { createDefaultStyleLock, validateStyleLock, generateStyleSeed } from '@/lib/style-lock';
import type { StyleLock } from '@/lib/style-lock';

// ═══════════════════════════════════════════════════════════════
// GET - List campaigns for user
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const where: Record<string, unknown> = { userId: dbUser.id };
    if (status) {
      where.status = status;
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          brand: {
            select: { id: true, name: true },
          },
          template: {
            select: { id: true, name: true, nameFr: true },
          },
          images: {
            take: 4,
            orderBy: { sortOrder: 'asc' },
            select: { id: true, outputUrl: true },
          },
        },
      }),
      prisma.campaign.count({ where }),
    ]);

    return NextResponse.json({
      campaigns,
      total,
      hasMore: offset + campaigns.length < total,
    });
  } catch (error) {
    console.error('[CAMPAIGNS] Error fetching campaigns:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// POST - Create a new campaign
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { authId: user.id },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      brandId,
      templateId,
      targetCount = 10,
      styleLock: providedStyleLock,
    } = body;

    // Validation
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Campaign name is required' },
        { status: 400 }
      );
    }

    if (targetCount < 5 || targetCount > 20) {
      return NextResponse.json(
        { error: 'Target count must be between 5 and 20' },
        { status: 400 }
      );
    }

    // Get style lock from template or use provided/default
    let styleLock: StyleLock;

    if (templateId) {
      const template = await prisma.campaignTemplate.findUnique({
        where: { id: templateId },
      });

      if (!template) {
        return NextResponse.json(
          { error: 'Template not found' },
          { status: 404 }
        );
      }

      styleLock = template.styleLock as unknown as StyleLock;

      // Increment template usage
      await prisma.campaignTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });
    } else if (providedStyleLock && validateStyleLock(providedStyleLock)) {
      styleLock = providedStyleLock;
    } else {
      styleLock = createDefaultStyleLock();
    }

    // Verify brand ownership if provided
    if (brandId) {
      const brand = await prisma.brand.findFirst({
        where: { id: brandId, userId: dbUser.id },
      });

      if (!brand) {
        return NextResponse.json(
          { error: 'Brand not found or unauthorized' },
          { status: 404 }
        );
      }
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        userId: dbUser.id,
        name,
        brandId,
        templateId,
        targetCount,
        styleLock: styleLock as unknown as Record<string, unknown>,
        styleSeed: generateStyleSeed(),
        status: 'draft',
      },
      include: {
        brand: {
          select: { id: true, name: true },
        },
        template: {
          select: { id: true, name: true, nameFr: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
    });
  } catch (error) {
    console.error('[CAMPAIGNS] Error creating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    );
  }
}
