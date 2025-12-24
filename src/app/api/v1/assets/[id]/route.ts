import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCreatorProfileByUserId,
  getAssetForOwner,
  getPublicAsset,
  updateAsset,
  deleteAsset,
} from '@/lib/creators';
import {
  uploadAssetThumbnail,
  uploadCreatorAssetImage,
  uploadConsentForm,
  uploadIdDocument,
  uploadSelfieVerification,
  deleteCreatorAssetFiles,
} from '@/lib/storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/assets/[id] - Get asset details
 * Returns full details for owner, public view for others
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    // Try to get as owner first
    if (user) {
      const profile = await getCreatorProfileByUserId(user.id);
      if (profile) {
        const ownerAsset = await getAssetForOwner(id, profile.id);
        if (ownerAsset) {
          return NextResponse.json({
            asset: {
              ...ownerAsset,
              isOwner: true,
              // Include consent doc status but not paths
              hasConsentForm: !!ownerAsset.consentFormPath,
              hasIdDoc: !!ownerAsset.idDocPath,
              hasSelfieVerify: !!ownerAsset.selfieVerifyPath,
            },
          });
        }
      }
    }

    // Return public view
    const publicAsset = await getPublicAsset(id);

    if (!publicAsset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      asset: {
        ...publicAsset,
        isOwner: false,
      },
    });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/assets/[id] - Update asset (draft/rejected only)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
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

    const body = await req.json();
    const {
      title,
      description,
      modelGender,
      modelAgeRange,
      modelStyles,
      locationName,
      locationCity,
      locationType,
      stylePreset,
      tags,
    } = body;

    const updated = await updateAsset(id, profile.id, {
      title,
      description,
      modelGender,
      modelAgeRange,
      modelStyles,
      locationName,
      locationCity,
      locationType,
      stylePreset,
      tags,
    });

    return NextResponse.json({
      success: true,
      asset: updated,
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 500 }
    );
  }
}

/**
 * DELETE /api/v1/assets/[id] - Soft delete asset
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
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

    await deleteAsset(id, profile.id);

    // Also delete associated files
    await deleteCreatorAssetFiles(profile.id, id);

    return NextResponse.json({
      success: true,
      message: 'Asset deleted',
    });
  } catch (error) {
    console.error('Error deleting asset:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: message.includes('not found') ? 404 : 500 }
    );
  }
}
