import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCreatorProfileByUserId,
  updateCreatorProfile,
  UpdateCreatorInput,
} from '@/lib/creators';
import { uploadCreatorAvatar } from '@/lib/storage';

/**
 * GET /api/v1/creators/me - Get current user's creator profile
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
        { error: 'No creator profile found. Register first.' },
        { status: 404 }
      );
    }

    // Return profile with assets (excluding sensitive payout info in detailed view)
    return NextResponse.json({
      profile: {
        id: profile.id,
        type: profile.type,
        displayName: profile.displayName,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        instagramHandle: profile.instagramHandle,
        isVerified: profile.isVerified,
        totalAssets: profile.totalAssets,
        totalUsages: profile.totalUsages,
        rating: profile.rating,
        reviewCount: profile.reviewCount,
        createdAt: profile.createdAt,
        // Payout info (only for owner)
        payoutMethod: profile.payoutMethod,
        payoutPhone: profile.payoutPhone ? maskPhone(profile.payoutPhone) : null,
      },
      assets: profile.assets.map(asset => ({
        id: asset.id,
        type: asset.type,
        status: asset.status,
        title: asset.title,
        description: asset.description,
        thumbnailUrl: asset.thumbnailUrl,
        priceUnits: asset.priceUnits,
        usageCount: asset.usageCount,
        viewCount: asset.viewCount,
        rejectionReason: asset.rejectionReason,
        createdAt: asset.createdAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching creator profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/creators/me - Update creator profile
 */
export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const { displayName, bio, instagramHandle, payoutMethod, payoutPhone } = body;

    // Validate payout method if provided
    if (payoutMethod && !['wave', 'orange_money'].includes(payoutMethod)) {
      return NextResponse.json(
        { error: 'Invalid payout method' },
        { status: 400 }
      );
    }

    const updateData: UpdateCreatorInput = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (instagramHandle !== undefined) updateData.instagramHandle = instagramHandle;
    if (payoutMethod !== undefined) updateData.payoutMethod = payoutMethod;
    if (payoutPhone !== undefined) updateData.payoutPhone = payoutPhone;

    const updated = await updateCreatorProfile(profile.id, updateData);

    return NextResponse.json({
      success: true,
      profile: {
        id: updated.id,
        type: updated.type,
        displayName: updated.displayName,
        bio: updated.bio,
        avatarUrl: updated.avatarUrl,
        instagramHandle: updated.instagramHandle,
        payoutMethod: updated.payoutMethod,
        payoutPhone: updated.payoutPhone ? maskPhone(updated.payoutPhone) : null,
      },
    });
  } catch (error) {
    console.error('Error updating creator profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Mask phone number for privacy (show last 4 digits)
 */
function maskPhone(phone: string): string {
  if (phone.length <= 4) return phone;
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
}
