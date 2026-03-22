/**
 * GET /api/v1/admin/billboards/content
 *
 * Admin: List billboard content for moderation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';

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
    const status = searchParams.get('status');
    const needsReview = searchParams.get('needs_review') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Build filter
    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }

    if (needsReview) {
      // Content that needs manual review
      where.OR = [
        { status: 'pending_moderation' },
        {
          moderationResult: {
            path: '$.reviewRequired',
            equals: true,
          },
        },
      ];
    }

    const [contents, total] = await Promise.all([
      prisma.billboardContent.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              amountCfa: true,
            },
          },
          queueItems: {
            select: {
              billboard: {
                select: {
                  id: true,
                  name: true,
                },
              },
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.billboardContent.count({ where }),
    ]);

    return NextResponse.json({
      contents: contents.map((c) => ({
        id: c.id,
        mediaType: c.mediaType,
        originalUrl: c.originalUrl,
        processedUrls: c.processedUrls,
        durationSeconds: c.durationSeconds,
        status: c.status,
        rejectionReason: c.rejectionReason,
        moderationResult: c.moderationResult,
        whatsappPhone: c.whatsappPhone,
        whatsappName: c.whatsappName,
        createdAt: c.createdAt,
        user: c.user,
        payment: c.payment,
        billboards: c.queueItems.map((q) => ({
          id: q.billboard.id,
          name: q.billboard.name,
          queueStatus: q.status,
        })),
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + contents.length < total,
      },
    });
  } catch (error) {
    console.error('[ADMIN] GET /billboards/content error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content' },
      { status: 500 }
    );
  }
}
