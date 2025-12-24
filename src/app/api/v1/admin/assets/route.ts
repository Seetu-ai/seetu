import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listPendingAssets } from '@/lib/creators';
import { getCreatorPrivateSignedUrl } from '@/lib/storage';
import prisma from '@/lib/prisma';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !SUPERADMIN_EMAILS.includes(user.email || '')) {
    return null;
  }

  return user;
}

/**
 * GET /api/v1/admin/assets - List assets for review
 * Query params:
 * - status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' (default: PENDING_REVIEW)
 * - limit: number (default: 50)
 */
export async function GET(req: NextRequest) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'PENDING_REVIEW';
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    if (status === 'PENDING_REVIEW') {
      const assets = await listPendingAssets(limit);
      return NextResponse.json({ assets });
    }

    // For other statuses, query directly
    const assets = await prisma.creatorAsset.findMany({
      where: {
        status: status as 'APPROVED' | 'REJECTED' | 'SUSPENDED',
        deletedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userId: true,
            type: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error listing assets for review:', error);
    return NextResponse.json({ error: 'Failed to list assets' }, { status: 500 });
  }
}
