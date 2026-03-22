/**
 * GET /api/v1/billboard-content/[id]
 * DELETE /api/v1/billboard-content/[id]
 *
 * Get or delete billboard content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { removeFromAllQueues } from '@/lib/billboard/queue-manager';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get content
    const content = await prisma.billboardContent.findUnique({
      where: { id },
      include: {
        queueItems: {
          include: {
            billboard: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payment: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (content.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: content.id,
      mediaType: content.mediaType,
      originalUrl: content.originalUrl,
      processedUrls: content.processedUrls,
      durationSeconds: content.durationSeconds,
      status: content.status,
      rejectionReason: content.rejectionReason,
      moderationResult: content.moderationResult,
      createdAt: content.createdAt,
      updatedAt: content.updatedAt,
      payment: content.payment
        ? {
            id: content.payment.id,
            amountCfa: content.payment.amountCfa,
            status: content.payment.status,
            checkoutUrl: content.payment.checkoutUrl,
            paidAt: content.payment.paidAt,
          }
        : null,
      queueItems: content.queueItems.map((q) => ({
        id: q.id,
        billboard: {
          id: q.billboard.id,
          name: q.billboard.name,
          address: q.billboard.address,
        },
        position: q.position,
        status: q.status,
        scheduledFor: q.scheduledFor,
        startedAt: q.startedAt,
        endedAt: q.endedAt,
        proofUrl: q.proofUrl,
      })),
    });
  } catch (error) {
    console.error('[API] GET /billboard-content/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    // Get content
    const content = await prisma.billboardContent.findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (content.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Cannot delete if already paid and processing/ready
    if (['processing', 'ready'].includes(content.status)) {
      return NextResponse.json(
        { error: 'Cannot delete content that is being processed or ready for display' },
        { status: 400 }
      );
    }

    // Remove from queues if any
    await removeFromAllQueues(id);

    // Delete content (cascade will delete queue items and payment)
    await prisma.billboardContent.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] DELETE /billboard-content/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to delete content' },
      { status: 500 }
    );
  }
}
