/**
 * GET /api/v1/admin/billboards/live
 * Admin: Live status for all billboards
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
    const statusFilter = searchParams.get('status') as 'online' | 'offline' | 'maintenance' | null;

    const billboards = await prisma.billboard.findMany({
      where: { isActive: true, ...(statusFilter ? { status: statusFilter } : {}) },
      include: {
        queueItems: {
          where: { status: { in: ['playing', 'queued'] } },
          include: { content: { select: { id: true, whatsappName: true, user: { select: { email: true } } } } },
          orderBy: { position: 'asc' },
        },
        _count: { select: { queueItems: { where: { status: 'queued' } } } },
      },
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const playCounts = await prisma.billboardQueue.groupBy({
      by: ['billboardId'],
      where: { status: 'completed', endedAt: { gte: today } },
      _count: true,
    });
    const playMap = new Map(playCounts.map((p) => [p.billboardId, p._count]));

    const formatted = billboards.map((b) => {
      const playing = b.queueItems.find((q) => q.status === 'playing');
      return {
        id: b.id,
        name: b.name,
        address: b.address,
        status: b.status,
        currentContent: playing ? {
          title: `Content #${playing.content.id.slice(0, 8)}`,
          advertiser: playing.content.whatsappName || playing.content.user?.email || 'Unknown',
        } : null,
        queueCount: b._count.queueItems,
        playsToday: playMap.get(b.id) || 0,
      };
    });

    return NextResponse.json({
      billboards: formatted,
      stats: {
        total: billboards.length,
        online: billboards.filter((b) => b.status === 'online').length,
        offline: billboards.filter((b) => b.status === 'offline').length,
      },
    });
  } catch (error) {
    console.error('[ADMIN] GET /billboards/live error:', error);
    return NextResponse.json({ error: 'Failed to fetch live data' }, { status: 500 });
  }
}
