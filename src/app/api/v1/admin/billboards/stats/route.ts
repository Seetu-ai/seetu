/**
 * GET /api/v1/admin/billboards/stats
 * Admin: Dashboard statistics for billboard operations
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

    const [totalBillboards, onlineBillboards, pendingModeration, completedToday] = await Promise.all([
      prisma.billboard.count({ where: { isActive: true } }),
      prisma.billboard.count({ where: { isActive: true, status: 'online' } }),
      prisma.billboardContent.count({ where: { status: 'pending_moderation' } }),
      prisma.billboardQueue.count({
        where: { status: 'completed', endedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
      }),
    ]);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await prisma.billboardPayment.aggregate({
      _sum: { amountCfa: true },
      where: { status: 'completed', paidAt: { gte: startOfMonth } },
    });

    return NextResponse.json({
      billboards: { total: totalBillboards, online: onlineBillboards },
      content: { pendingModeration },
      queue: { completedToday },
      revenue: { thisMonth: monthlyRevenue._sum.amountCfa || 0 },
    });
  } catch (error) {
    console.error('[ADMIN] GET /billboards/stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
