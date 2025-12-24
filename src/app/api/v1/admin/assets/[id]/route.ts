import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCreatorPrivateSignedUrl, getAssetImageSignedUrls } from '@/lib/storage';
import prisma from '@/lib/prisma';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !SUPERADMIN_EMAILS.includes(user.email || '')) {
    return null;
  }

  return user;
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/admin/assets/[id] - Get full asset details for review
 * Includes signed URLs for consent documents and asset images
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const asset = await prisma.creatorAsset.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            userId: true,
            type: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Generate signed URLs for private files (short expiry for security)
    const signedUrls: Record<string, string | string[]> = {};

    if (asset.consentFormPath) {
      signedUrls.consentForm = await getCreatorPrivateSignedUrl(asset.consentFormPath, 300);
    }
    if (asset.idDocPath) {
      signedUrls.idDoc = await getCreatorPrivateSignedUrl(asset.idDocPath, 300);
    }
    if (asset.selfieVerifyPath) {
      signedUrls.selfieVerify = await getCreatorPrivateSignedUrl(asset.selfieVerifyPath, 300);
    }
    if (asset.imageUrls && asset.imageUrls.length > 0) {
      signedUrls.images = await getAssetImageSignedUrls(asset.imageUrls, 300);
    }

    return NextResponse.json({
      asset: {
        id: asset.id,
        type: asset.type,
        status: asset.status,
        title: asset.title,
        description: asset.description,
        thumbnailUrl: asset.thumbnailUrl,
        priceUnits: asset.priceUnits,
        tags: asset.tags,
        // Model-specific
        modelGender: asset.modelGender,
        modelAgeRange: asset.modelAgeRange,
        modelStyles: asset.modelStyles,
        consentVerified: asset.consentVerified,
        // Location-specific
        locationName: asset.locationName,
        locationCity: asset.locationCity,
        locationType: asset.locationType,
        // Stats
        usageCount: asset.usageCount,
        viewCount: asset.viewCount,
        // Review info
        reviewedAt: asset.reviewedAt,
        reviewedBy: asset.reviewedBy,
        rejectionReason: asset.rejectionReason,
        // Timestamps
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        // Creator info
        creator: asset.creator,
      },
      signedUrls,
    });
  } catch (error) {
    console.error('Error fetching asset for review:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}
