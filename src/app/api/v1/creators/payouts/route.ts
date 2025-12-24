import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { requestPayout, listCreatorPayouts, getCreatorProfileByUserId } from '@/lib/creators';

/**
 * GET /api/v1/creators/payouts - List my payouts
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator profile
    const creator = await getCreatorProfileByUserId(user.id);

    if (!creator) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const payouts = await listCreatorPayouts(creator.id, limit, offset);

    return NextResponse.json({ payouts });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/creators/payouts - Request a payout
 */
export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get creator profile
    const creator = await getCreatorProfileByUserId(user.id);

    if (!creator) {
      return NextResponse.json({ error: 'Creator profile not found' }, { status: 404 });
    }

    const payout = await requestPayout(creator.id);

    return NextResponse.json({ payout });
  } catch (error) {
    console.error('Error requesting payout:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to request payout' },
      { status: 400 }
    );
  }
}
