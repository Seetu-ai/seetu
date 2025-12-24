import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rejectAsset } from '@/lib/creators';
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

  // Get the user's DB ID
  const dbUser = await prisma.user.findUnique({
    where: { authId: user.id },
    select: { id: true },
  });

  return dbUser ? { ...user, dbId: dbUser.id } : null;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/admin/assets/[id]/reject - Reject an asset
 * Body: { reason: string }
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { reason } = body;

  if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
    return NextResponse.json(
      { error: 'Rejection reason is required' },
      { status: 400 }
    );
  }

  try {
    const asset = await rejectAsset(id, user.dbId, reason.trim());

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        status: asset.status,
        title: asset.title,
        rejectionReason: asset.rejectionReason,
        reviewedAt: asset.reviewedAt,
      },
      message: 'Asset rejected',
    });
  } catch (error) {
    console.error('Error rejecting asset:', error);
    const message = error instanceof Error ? error.message : 'Failed to reject asset';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 500 }
    );
  }
}
