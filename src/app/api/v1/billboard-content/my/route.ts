/**
 * GET /api/v1/billboard-content/my
 *
 * Get current user's billboard content with status and queue positions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get content
    const contents = await prisma.billboardContent.findMany({
      where: {
        userId: user.id,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        queueItems: {
          select: {
            id: true,
            position: true,
            status: true,
            scheduledFor: true,
            startedAt: true,
            endedAt: true,
            proofUrl: true,
            billboard: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        payment: {
          select: {
            id: true,
            amountCfa: true,
            status: true,
            paidAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    // Get total count
    const totalCount = await prisma.billboardContent.count({
      where: {
        userId: user.id,
        ...(status ? { status: status as any } : {}),
      },
    });

    const response = contents.map((c) => ({
      id: c.id,
      mediaType: c.mediaType,
      originalUrl: c.originalUrl,
      processedUrls: c.processedUrls,
      durationSeconds: c.durationSeconds,
      status: c.status,
      rejectionReason: c.rejectionReason,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      payment: c.payment
        ? {
            id: c.payment.id,
            amountCfa: c.payment.amountCfa,
            status: c.payment.status,
            paidAt: c.payment.paidAt,
          }
        : null,
      queueItems: c.queueItems.map((q) => ({
        id: q.id,
        billboardId: q.billboard.id,
        billboardName: q.billboard.name,
        position: q.position,
        status: q.status,
        scheduledFor: q.scheduledFor,
        startedAt: q.startedAt,
        endedAt: q.endedAt,
        proofUrl: q.proofUrl,
      })),
    }));

    return NextResponse.json({
      contents: response,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + contents.length < totalCount,
      },
    });
  } catch (error) {
    console.error('[API] GET /billboard-content/my error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
