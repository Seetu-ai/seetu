import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  getCreatorProfileByUserId,
  createAsset,
  listCreatorAssets,
  CreateAssetInput,
} from '@/lib/creators';
import { AssetType, AssetStatus } from '@prisma/client';

/**
 * GET /api/v1/assets - List current creator's assets
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
        { error: 'No creator profile found. Register first.' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as AssetStatus | null;

    const assets = await listCreatorAssets(
      profile.id,
      status || undefined
    );

    return NextResponse.json({
      assets: assets.map(asset => ({
        id: asset.id,
        type: asset.type,
        status: asset.status,
        title: asset.title,
        description: asset.description,
        thumbnailUrl: asset.thumbnailUrl,
        priceUnits: asset.priceUnits,
        tags: asset.tags,
        usageCount: asset.usageCount,
        viewCount: asset.viewCount,
        rejectionReason: asset.rejectionReason,
        // Model-specific
        modelGender: asset.modelGender,
        modelAgeRange: asset.modelAgeRange,
        modelStyles: asset.modelStyles,
        // Consent status (not paths)
        hasConsentForm: !!asset.consentFormPath,
        hasIdDoc: !!asset.idDocPath,
        hasSelfieVerify: !!asset.selfieVerifyPath,
        consentVerified: asset.consentVerified,
        // Location-specific
        locationName: asset.locationName,
        locationCity: asset.locationCity,
        locationType: asset.locationType,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Error listing assets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/assets - Create a new asset (draft)
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

    const profile = await getCreatorProfileByUserId(user.id);

    if (!profile) {
      return NextResponse.json(
        { error: 'No creator profile found. Register first.' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      type,
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

    // Validate required fields
    if (!type || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title' },
        { status: 400 }
      );
    }

    // Validate asset type
    if (!['MODEL_PROFILE', 'PHOTO_STYLE', 'LOCATION'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      );
    }

    // Validate creator type matches asset type
    if (type === 'MODEL_PROFILE' && profile.type !== 'MODEL') {
      return NextResponse.json(
        { error: 'Only MODEL creators can create MODEL_PROFILE assets' },
        { status: 403 }
      );
    }
    if (type === 'PHOTO_STYLE' && profile.type !== 'PHOTOGRAPHER') {
      return NextResponse.json(
        { error: 'Only PHOTOGRAPHER creators can create PHOTO_STYLE assets' },
        { status: 403 }
      );
    }
    if (type === 'LOCATION' && profile.type !== 'LOCATION_OWNER') {
      return NextResponse.json(
        { error: 'Only LOCATION_OWNER creators can create LOCATION assets' },
        { status: 403 }
      );
    }

    const input: CreateAssetInput = {
      creatorId: profile.id,
      type: type as AssetType,
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
    };

    const asset = await createAsset(input);

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        type: asset.type,
        status: asset.status,
        title: asset.title,
        priceUnits: asset.priceUnits,
        createdAt: asset.createdAt,
      },
    });
  } catch (error) {
    console.error('Error creating asset:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
