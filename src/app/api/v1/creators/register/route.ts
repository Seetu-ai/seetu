import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  hasCreatorProfile,
  createCreatorProfile,
  CreateCreatorInput,
} from '@/lib/creators';
import { CreatorType } from '@prisma/client';

/**
 * POST /api/v1/creators/register - Register as a creator
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a creator profile
    const exists = await hasCreatorProfile(user.id);
    if (exists) {
      return NextResponse.json(
        { error: 'User already has a creator profile' },
        { status: 409 }
      );
    }

    const body = await req.json();
    const { type, displayName, bio, instagramHandle, payoutMethod, payoutPhone } = body;

    // Validate required fields
    if (!type || !displayName) {
      return NextResponse.json(
        { error: 'Missing required fields: type, displayName' },
        { status: 400 }
      );
    }

    // Validate creator type
    if (!['MODEL', 'PHOTOGRAPHER', 'LOCATION_OWNER'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid creator type' },
        { status: 400 }
      );
    }

    // Validate payout info if provided
    if (payoutMethod && !['wave', 'orange_money'].includes(payoutMethod)) {
      return NextResponse.json(
        { error: 'Invalid payout method. Must be "wave" or "orange_money"' },
        { status: 400 }
      );
    }

    const input: CreateCreatorInput = {
      userId: user.id,
      type: type as CreatorType,
      displayName,
      bio,
      instagramHandle,
      payoutMethod,
      payoutPhone,
    };

    const profile = await createCreatorProfile(input);

    return NextResponse.json({
      success: true,
      profile: {
        id: profile.id,
        type: profile.type,
        displayName: profile.displayName,
        bio: profile.bio,
        instagramHandle: profile.instagramHandle,
        createdAt: profile.createdAt,
      },
    });
  } catch (error) {
    console.error('Error registering creator:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
