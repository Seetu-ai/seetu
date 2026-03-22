/**
 * GET /api/v1/admin/billboards/queues
 * Admin: Queue information for all billboards
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

    const billboards = await prisma.billboard.findMany({
      where: { isActive: true },
      include: {
        queueItems: {
          where: { status: { in: ['queued', 'playing'] } },
          include: {
            content: {
              select: { id: true, mediaType: true, processedUrls: true, durationSeconds: true, whatsappName: true, user: { select: { email: true } } },
            },
          },
          orderBy: { position: 'asc' },
          take: 10,
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedBillboards = billboards.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      status: b.status,
      address: b.address,
      currentlyPlaying: b.queueItems.find((q) => q.status === 'playing') ? {
        id: b.queueItems[0].id,
        content: {
          id: b.queueItems[0].content.id,
          title: `Content #${b.queueItems[0].content.id.slice(0, 8)}`,
          advertiser: b.queueItems[0].content.whatsappName || b.queueItems[0].content.user?.email || 'Unknown',
          durationSeconds: b.queueItems[0].content.durationSeconds,
        },
        startedAt: b.queueItems[0].startedAt,
      } : null,
      queue: b.queueItems.filter((q) => q.status === 'queued').map((q, i) => ({
        id: q.id,
        position: i + 1,
        content: {
          title: `Content #${q.content.id.slice(0, 8)}`,
          advertiser: q.content.whatsappName || q.content.user?.email || 'Unknown',
          durationSeconds: q.content.durationSeconds,
        },
        scheduledFor: q.scheduledFor?.toISOString(),
      })),
    }));

    return NextResponse.json({ billboards: formattedBillboards });
  } catch (error) {
    console.error('[ADMIN] GET /billboards/queues error:', error);
    return NextResponse.json({ error: 'Failed to fetch queues' }, { status: 500 });
  }
}
