import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { listPendingPayouts } from '@/lib/creators';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

/**
 * GET /api/v1/admin/payouts - List all payouts (admin only)
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser || !SUPERADMIN_EMAILS.includes(authUser.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let payouts;
    if (status === 'pending') {
      payouts = await listPendingPayouts(limit);
    } else {
      payouts = await prisma.creatorPayout.findMany({
        where: { status: status as 'pending' | 'completed' | 'failed' },
        include: {
          creator: {
            select: {
              id: true,
              displayName: true,
              payoutMethod: true,
              payoutPhone: true,
              user: {
                select: {
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    }

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}
