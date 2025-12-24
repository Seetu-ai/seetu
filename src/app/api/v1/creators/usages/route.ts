import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorProfileByUserId, getCreatorUsageHistory } from '@/lib/creators';

/**
 * GET /api/v1/creators/usages - Get creator usage history
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const profile = await getCreatorProfileByUserId(user.id);

    if (!profile) {
      return NextResponse.json(
        { error: 'No creator profile found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const usages = await getCreatorUsageHistory(profile.id, limit, offset);

    return NextResponse.json({
      usages: usages.map(usage => ({
        id: usage.id,
        asset: usage.asset,
        unitsCharged: usage.unitsCharged,
        settledAt: usage.settledAt,
        createdAt: usage.createdAt,
      })),
      pagination: {
        limit,
        offset,
        hasMore: usages.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching creator usages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
