import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { approvePayout } from '@/lib/creators';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

/**
 * POST /api/v1/admin/payouts/[id]/approve - Approve a payout
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: payoutId } = await params;
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser || !SUPERADMIN_EMAILS.includes(authUser.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const transactionRef = body.transactionRef;

    const payout = await approvePayout(payoutId, authUser.id, transactionRef);

    return NextResponse.json({ payout });
  } catch (error) {
    console.error('Error approving payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve payout' },
      { status: 400 }
    );
  }
}
