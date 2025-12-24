import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { approveAsset } from '@/lib/creators';
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
 * POST /api/v1/admin/assets/[id]/approve - Approve an asset
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const asset = await approveAsset(id, user.dbId);

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        status: asset.status,
        title: asset.title,
        reviewedAt: asset.reviewedAt,
      },
      message: 'Asset approved successfully',
    });
  } catch (error) {
    console.error('Error approving asset:', error);
    const message = error instanceof Error ? error.message : 'Failed to approve asset';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 500 }
    );
  }
}
