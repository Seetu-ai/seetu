import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorProfileByUserId, submitAssetForReview } from '@/lib/creators';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/v1/assets/[id]/submit - Submit asset for review
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
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

    const asset = await submitAssetForReview(id, profile.id);

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        status: asset.status,
        title: asset.title,
      },
      message: 'Asset submitted for review. You will be notified once reviewed.',
    });
  } catch (error) {
    console.error('Error submitting asset:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') || message.includes('require') ? 400 : 500 }
    );
  }
}
