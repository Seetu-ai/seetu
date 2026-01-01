import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

// ═══════════════════════════════════════════════════════════════
// GET - Get campaign details
// ═══════════════════════════════════════════════════════════════

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: dbUser.id,
      },
      include: {
        brand: {
          select: { id: true, name: true, visualDNA: true },
        },
        template: {
          select: { id: true, name: true, nameFr: true, styleLock: true },
        },
        images: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            productId: true,
            outputUrl: true,
            approved: true,
            sortOrder: true,
            caption: true,
            createdAt: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('[CAMPAIGNS] Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// PATCH - Update campaign
// ═══════════════════════════════════════════════════════════════

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify ownership
    const existing = await prisma.campaign.findFirst({
      where: { id, userId: dbUser.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, status, styleLock, targetCount } = body;

    const updateData: Record<string, unknown> = {};

    if (name) updateData.name = name;
    if (status && ['draft', 'active', 'completed', 'archived'].includes(status)) {
      updateData.status = status;
    }
    if (styleLock) updateData.styleLock = styleLock;
    if (targetCount && targetCount >= 5 && targetCount <= 20) {
      updateData.targetCount = targetCount;
    }

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updateData,
      include: {
        brand: { select: { id: true, name: true } },
        template: { select: { id: true, name: true, nameFr: true } },
      },
    });

    return NextResponse.json({ success: true, campaign });
  } catch (error) {
    console.error('[CAMPAIGNS] Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// DELETE - Delete campaign
// ═══════════════════════════════════════════════════════════════

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Verify ownership
    const existing = await prisma.campaign.findFirst({
      where: { id, userId: dbUser.id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Delete campaign (cascades to images)
    await prisma.campaign.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CAMPAIGNS] Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    );
  }
}
