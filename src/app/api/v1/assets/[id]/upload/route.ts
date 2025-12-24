import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreatorProfileByUserId, getAssetForOwner, updateAsset } from '@/lib/creators';
import {
  uploadAssetThumbnail,
  uploadCreatorAssetImage,
  uploadConsentForm,
  uploadIdDocument,
  uploadSelfieVerification,
} from '@/lib/storage';

interface RouteParams {
  params: Promise<{ id: string }>;
}

type UploadType = 'thumbnail' | 'image' | 'consent_form' | 'id_doc' | 'selfie_verify';

/**
 * POST /api/v1/assets/[id]/upload - Upload files for an asset
 *
 * FormData fields:
 * - type: 'thumbnail' | 'image' | 'consent_form' | 'id_doc' | 'selfie_verify'
 * - file: File
 * - index: number (for image type, to track order)
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: assetId } = await params;
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

    // Verify asset ownership and status
    const asset = await getAssetForOwner(assetId, profile.id);

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      );
    }

    if (!['DRAFT', 'REJECTED'].includes(asset.status)) {
      return NextResponse.json(
        { error: 'Cannot upload files to an asset that is not in DRAFT or REJECTED status' },
        { status: 400 }
      );
    }

    // Parse form data
    const formData = await req.formData();
    const uploadType = formData.get('type') as UploadType;
    const file = formData.get('file') as File | null;
    const indexStr = formData.get('index') as string | null;

    if (!uploadType || !file) {
      return NextResponse.json(
        { error: 'Missing required fields: type, file' },
        { status: 400 }
      );
    }

    // Validate upload type
    const validTypes: UploadType[] = ['thumbnail', 'image', 'consent_form', 'id_doc', 'selfie_verify'];
    if (!validTypes.includes(uploadType)) {
      return NextResponse.json(
        { error: 'Invalid upload type' },
        { status: 400 }
      );
    }

    // Validate file type
    const contentType = file.type;
    if (uploadType === 'consent_form') {
      if (!['application/pdf', 'image/jpeg', 'image/png'].includes(contentType)) {
        return NextResponse.json(
          { error: 'Consent form must be PDF, JPEG, or PNG' },
          { status: 400 }
        );
      }
    } else {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) {
        return NextResponse.json(
          { error: 'Image must be JPEG, PNG, or WebP' },
          { status: 400 }
        );
      }
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let result: { url: string; path: string };
    let updateData: Record<string, unknown> = {};

    switch (uploadType) {
      case 'thumbnail':
        result = await uploadAssetThumbnail(buffer, profile.id, assetId, contentType);
        updateData = { thumbnailUrl: result.url };
        break;

      case 'image':
        const index = parseInt(indexStr || '0', 10);
        result = await uploadCreatorAssetImage(buffer, profile.id, assetId, index, contentType);
        // Append to existing imageUrls
        const currentUrls = asset.imageUrls || [];
        updateData = { imageUrls: [...currentUrls, result.path] };
        break;

      case 'consent_form':
        if (asset.type !== 'MODEL_PROFILE') {
          return NextResponse.json(
            { error: 'Consent documents only required for MODEL_PROFILE assets' },
            { status: 400 }
          );
        }
        result = await uploadConsentForm(buffer, profile.id, assetId, contentType);
        updateData = { consentFormPath: result.path };
        break;

      case 'id_doc':
        if (asset.type !== 'MODEL_PROFILE') {
          return NextResponse.json(
            { error: 'ID document only required for MODEL_PROFILE assets' },
            { status: 400 }
          );
        }
        result = await uploadIdDocument(buffer, profile.id, assetId, contentType);
        updateData = { idDocPath: result.path };
        break;

      case 'selfie_verify':
        if (asset.type !== 'MODEL_PROFILE') {
          return NextResponse.json(
            { error: 'Selfie verification only required for MODEL_PROFILE assets' },
            { status: 400 }
          );
        }
        result = await uploadSelfieVerification(buffer, profile.id, assetId, contentType);
        updateData = { selfieVerifyPath: result.path };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid upload type' },
          { status: 400 }
        );
    }

    // Update asset with new file path
    await updateAsset(assetId, profile.id, updateData);

    return NextResponse.json({
      success: true,
      uploadType,
      // Only return URL for public files (thumbnail)
      url: uploadType === 'thumbnail' ? result.url : undefined,
      path: result.path,
    });
  } catch (error) {
    console.error('Error uploading asset file:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
