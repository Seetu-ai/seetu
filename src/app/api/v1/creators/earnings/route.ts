import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorProfileByUserId, getCreatorEarnings } from '@/lib/creators';

/**
 * GET /api/v1/creators/earnings - Get creator earnings summary
 */
export async function GET() {
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

    const earnings = await getCreatorEarnings(profile.id);

    return NextResponse.json({ earnings });
  } catch (error) {
    console.error('Error fetching creator earnings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
