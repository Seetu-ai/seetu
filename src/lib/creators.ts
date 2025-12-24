/**
 * Creator Ecosystem Utility Functions
 * Handles creator profiles, assets, and marketplace logic
 */

import { prisma } from './prisma';
import { CreatorType, AssetType, AssetStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CreateCreatorInput {
  userId: string;
  type: CreatorType;
  displayName: string;
  bio?: string;
  instagramHandle?: string;
  payoutMethod?: string;
  payoutPhone?: string;
}

export interface UpdateCreatorInput {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  instagramHandle?: string;
  payoutMethod?: string;
  payoutPhone?: string;
}

export interface CreateAssetInput {
  creatorId: string;
  type: AssetType;
  title: string;
  description?: string;
  // Model-specific
  modelGender?: string;
  modelAgeRange?: string;
  modelStyles?: string[];
  // Location-specific
  locationName?: string;
  locationCity?: string;
  locationType?: string;
  // Style-specific
  stylePreset?: Record<string, unknown>;
  // Categorization
  tags?: string[];
}

export interface PublicCreatorProfile {
  id: string;
  displayName: string;
  type: CreatorType;
  bio: string | null;
  avatarUrl: string | null;
  instagramHandle: string | null;
  isVerified: boolean;
  totalAssets: number;
  totalUsages: number;
  rating: number | null;
  reviewCount: number;
  createdAt: Date;
}

export interface PublicAsset {
  id: string;
  type: AssetType;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  priceUnits: number;
  tags: string[];
  usageCount: number;
  // Model-specific
  modelGender: string | null;
  modelAgeRange: string | null;
  modelStyles: string[];
  // Location-specific
  locationName: string | null;
  locationCity: string | null;
  locationType: string | null;
  // Creator info
  creator: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    isVerified: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════
// ASSET PRICING (Platform-controlled)
// ═══════════════════════════════════════════════════════════════

export const ASSET_PRICING = {
  MODEL_PROFILE: {
    basic: 50,    // 0.5 credits
    premium: 100, // 1 credit
  },
  PHOTO_STYLE: 25,  // 0.25 credits
  LOCATION: 25,     // 0.25 credits
};

import { Prisma } from '@prisma/client';

// Revenue split: 50% to creator
export const CREATOR_REVENUE_SHARE = 0.5;

// Minimum payout threshold in FCFA
export const MIN_PAYOUT_FCFA = 5000;

// Units to FCFA conversion (500 units = 500 FCFA)
export const UNITS_TO_FCFA = 1;

// ═══════════════════════════════════════════════════════════════
// CREATOR PROFILE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if user already has a creator profile
 */
export async function hasCreatorProfile(userId: string): Promise<boolean> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  return !!profile;
}

/**
 * Get creator profile by user ID
 */
export async function getCreatorProfileByUserId(userId: string) {
  return prisma.creatorProfile.findUnique({
    where: { userId },
    include: {
      assets: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

/**
 * Get creator profile by ID (public view - excludes sensitive fields)
 */
export async function getPublicCreatorProfile(creatorId: string): Promise<PublicCreatorProfile | null> {
  const profile = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      displayName: true,
      type: true,
      bio: true,
      avatarUrl: true,
      instagramHandle: true,
      isVerified: true,
      totalAssets: true,
      totalUsages: true,
      rating: true,
      reviewCount: true,
      createdAt: true,
    },
  });
  return profile;
}

/**
 * Create a new creator profile
 */
export async function createCreatorProfile(input: CreateCreatorInput) {
  return prisma.creatorProfile.create({
    data: {
      userId: input.userId,
      type: input.type,
      displayName: input.displayName,
      bio: input.bio,
      instagramHandle: input.instagramHandle,
      payoutMethod: input.payoutMethod,
      payoutPhone: input.payoutPhone,
    },
  });
}

/**
 * Update creator profile
 */
export async function updateCreatorProfile(creatorId: string, input: UpdateCreatorInput) {
  return prisma.creatorProfile.update({
    where: { id: creatorId },
    data: input,
  });
}

// ═══════════════════════════════════════════════════════════════
// ASSET FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a new asset (draft status)
 */
export async function createAsset(input: CreateAssetInput) {
  // Determine price based on asset type
  let priceUnits = ASSET_PRICING.PHOTO_STYLE;
  if (input.type === 'MODEL_PROFILE') {
    priceUnits = ASSET_PRICING.MODEL_PROFILE.basic;
  } else if (input.type === 'LOCATION') {
    priceUnits = ASSET_PRICING.LOCATION;
  }

  return prisma.creatorAsset.create({
    data: {
      creatorId: input.creatorId,
      type: input.type,
      title: input.title,
      description: input.description,
      modelGender: input.modelGender,
      modelAgeRange: input.modelAgeRange,
      modelStyles: input.modelStyles || [],
      locationName: input.locationName,
      locationCity: input.locationCity,
      locationType: input.locationType,
      stylePreset: input.stylePreset as Prisma.InputJsonValue | undefined,
      tags: input.tags || [],
      priceUnits,
      status: 'DRAFT',
    },
  });
}

/**
 * Update asset (only allowed for DRAFT or REJECTED status)
 */
export async function updateAsset(
  assetId: string,
  creatorId: string,
  data: Partial<CreateAssetInput> & {
    thumbnailUrl?: string;
    imageUrls?: string[];
    consentFormPath?: string;
    idDocPath?: string;
    selfieVerifyPath?: string;
  }
) {
  // Verify ownership and status
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      creatorId,
      deletedAt: null,
      status: { in: ['DRAFT', 'REJECTED'] },
    },
  });

  if (!asset) {
    throw new Error('Asset not found or cannot be edited');
  }

  return prisma.creatorAsset.update({
    where: { id: assetId },
    data: {
      title: data.title,
      description: data.description,
      thumbnailUrl: data.thumbnailUrl,
      imageUrls: data.imageUrls,
      modelGender: data.modelGender,
      modelAgeRange: data.modelAgeRange,
      modelStyles: data.modelStyles,
      locationName: data.locationName,
      locationCity: data.locationCity,
      locationType: data.locationType,
      stylePreset: data.stylePreset as Prisma.InputJsonValue | undefined,
      tags: data.tags,
      consentFormPath: data.consentFormPath,
      idDocPath: data.idDocPath,
      selfieVerifyPath: data.selfieVerifyPath,
    },
  });
}

/**
 * Submit asset for review
 */
export async function submitAssetForReview(assetId: string, creatorId: string) {
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      creatorId,
      deletedAt: null,
      status: { in: ['DRAFT', 'REJECTED'] },
    },
  });

  if (!asset) {
    throw new Error('Asset not found or cannot be submitted');
  }

  // Validate required fields for MODEL_PROFILE
  if (asset.type === 'MODEL_PROFILE') {
    if (!asset.consentFormPath || !asset.idDocPath || !asset.selfieVerifyPath) {
      throw new Error('Model assets require consent form, ID document, and selfie verification');
    }
    if (!asset.imageUrls || asset.imageUrls.length === 0) {
      throw new Error('Model assets require at least one image');
    }
  }

  return prisma.creatorAsset.update({
    where: { id: assetId },
    data: {
      status: 'PENDING_REVIEW',
      rejectionReason: null, // Clear any previous rejection
    },
  });
}

/**
 * Get asset by ID (for owner)
 */
export async function getAssetForOwner(assetId: string, creatorId: string) {
  return prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      creatorId,
      deletedAt: null,
    },
  });
}

/**
 * Get public asset (only APPROVED assets)
 */
export async function getPublicAsset(assetId: string): Promise<PublicAsset | null> {
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      status: 'APPROVED',
      deletedAt: null,
    },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
  });

  if (!asset) return null;

  return {
    id: asset.id,
    type: asset.type,
    title: asset.title,
    description: asset.description,
    thumbnailUrl: asset.thumbnailUrl,
    priceUnits: asset.priceUnits,
    tags: asset.tags,
    usageCount: asset.usageCount,
    modelGender: asset.modelGender,
    modelAgeRange: asset.modelAgeRange,
    modelStyles: asset.modelStyles,
    locationName: asset.locationName,
    locationCity: asset.locationCity,
    locationType: asset.locationType,
    creator: asset.creator,
  };
}

/**
 * List assets for a creator (owner view)
 */
export async function listCreatorAssets(creatorId: string, status?: AssetStatus) {
  return prisma.creatorAsset.findMany({
    where: {
      creatorId,
      deletedAt: null,
      ...(status && { status }),
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Soft delete an asset
 */
export async function deleteAsset(assetId: string, creatorId: string) {
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      creatorId,
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  return prisma.creatorAsset.update({
    where: { id: assetId },
    data: { deletedAt: new Date() },
  });
}

// ═══════════════════════════════════════════════════════════════
// MARKETPLACE / DISCOVERY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export interface MarketplaceFilters {
  type?: AssetType;
  modelGender?: string;
  modelAgeRange?: string;
  modelStyles?: string[];
  locationCity?: string;
  tags?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * List approved assets for marketplace
 */
export async function listMarketplaceAssets(filters: MarketplaceFilters = {}): Promise<PublicAsset[]> {
  const {
    type,
    modelGender,
    modelAgeRange,
    modelStyles,
    locationCity,
    tags,
    search,
    limit = 20,
    offset = 0,
  } = filters;

  const assets = await prisma.creatorAsset.findMany({
    where: {
      status: 'APPROVED',
      deletedAt: null,
      ...(type && { type }),
      ...(modelGender && { modelGender }),
      ...(modelAgeRange && { modelAgeRange }),
      ...(modelStyles?.length && { modelStyles: { hasSome: modelStyles } }),
      ...(locationCity && { locationCity }),
      ...(tags?.length && { tags: { hasSome: tags } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
        },
      },
    },
    orderBy: [
      { usageCount: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    skip: offset,
  });

  return assets.map(asset => ({
    id: asset.id,
    type: asset.type,
    title: asset.title,
    description: asset.description,
    thumbnailUrl: asset.thumbnailUrl,
    priceUnits: asset.priceUnits,
    tags: asset.tags,
    usageCount: asset.usageCount,
    modelGender: asset.modelGender,
    modelAgeRange: asset.modelAgeRange,
    modelStyles: asset.modelStyles,
    locationName: asset.locationName,
    locationCity: asset.locationCity,
    locationType: asset.locationType,
    creator: asset.creator,
  }));
}

/**
 * List approved models specifically
 */
export async function listMarketplaceModels(filters: Omit<MarketplaceFilters, 'type'> = {}) {
  return listMarketplaceAssets({ ...filters, type: 'MODEL_PROFILE' });
}

// ═══════════════════════════════════════════════════════════════
// ADMIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * List assets pending review (admin only)
 */
export async function listPendingAssets(limit = 50) {
  return prisma.creatorAsset.findMany({
    where: {
      status: 'PENDING_REVIEW',
      deletedAt: null,
    },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          userId: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' }, // FIFO
    take: limit,
  });
}

/**
 * Approve an asset (admin only)
 */
export async function approveAsset(assetId: string, adminUserId: string) {
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      status: 'PENDING_REVIEW',
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new Error('Asset not found or not pending review');
  }

  // Update asset and increment creator's totalAssets
  const [updatedAsset] = await prisma.$transaction([
    prisma.creatorAsset.update({
      where: { id: assetId },
      data: {
        status: 'APPROVED',
        consentVerified: asset.type === 'MODEL_PROFILE' ? true : asset.consentVerified,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
      },
    }),
    prisma.creatorProfile.update({
      where: { id: asset.creatorId },
      data: {
        totalAssets: { increment: 1 },
      },
    }),
  ]);

  return updatedAsset;
}

/**
 * Reject an asset (admin only)
 */
export async function rejectAsset(assetId: string, adminUserId: string, reason: string) {
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      status: 'PENDING_REVIEW',
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new Error('Asset not found or not pending review');
  }

  return prisma.creatorAsset.update({
    where: { id: assetId },
    data: {
      status: 'REJECTED',
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedBy: adminUserId,
    },
  });
}

/**
 * Suspend an asset (admin only)
 */
export async function suspendAsset(assetId: string, adminUserId: string, reason: string) {
  return prisma.creatorAsset.update({
    where: { id: assetId },
    data: {
      status: 'SUSPENDED',
      rejectionReason: reason,
      reviewedAt: new Date(),
      reviewedBy: adminUserId,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// USAGE & EARNINGS FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Record asset usage (called during generation)
 */
export async function recordAssetUsage(
  assetId: string,
  userId: string,
  studioSessionId?: string
) {
  const asset = await prisma.creatorAsset.findFirst({
    where: {
      id: assetId,
      status: 'APPROVED',
      deletedAt: null,
    },
  });

  if (!asset) {
    throw new Error('Asset not found or not available');
  }

  // Create usage record and update counters
  const [usage] = await prisma.$transaction([
    prisma.assetUsage.create({
      data: {
        assetId,
        userId,
        studioSessionId,
        unitsCharged: asset.priceUnits,
      },
    }),
    prisma.creatorAsset.update({
      where: { id: assetId },
      data: { usageCount: { increment: 1 } },
    }),
    prisma.creatorProfile.update({
      where: { id: asset.creatorId },
      data: { totalUsages: { increment: 1 } },
    }),
  ]);

  return usage;
}

/**
 * Get creator earnings summary
 */
export async function getCreatorEarnings(creatorId: string) {
  // Get all usages for this creator's assets
  const usages = await prisma.assetUsage.findMany({
    where: {
      asset: { creatorId },
    },
    select: {
      unitsCharged: true,
      settledAt: true,
      createdAt: true,
    },
  });

  const totalUnits = usages.reduce((sum, u) => sum + u.unitsCharged, 0);
  const settledUnits = usages
    .filter(u => u.settledAt)
    .reduce((sum, u) => sum + u.unitsCharged, 0);
  const pendingUnits = totalUnits - settledUnits;

  // Calculate FCFA amounts (50% revenue share)
  const totalEarningsFcfa = Math.floor(totalUnits * UNITS_TO_FCFA * CREATOR_REVENUE_SHARE);
  const settledFcfa = Math.floor(settledUnits * UNITS_TO_FCFA * CREATOR_REVENUE_SHARE);
  const pendingFcfa = Math.floor(pendingUnits * UNITS_TO_FCFA * CREATOR_REVENUE_SHARE);

  return {
    totalUsages: usages.length,
    totalUnits,
    settledUnits,
    pendingUnits,
    totalEarningsFcfa,
    settledFcfa,
    pendingFcfa,
    canRequestPayout: pendingFcfa >= MIN_PAYOUT_FCFA,
    minPayoutFcfa: MIN_PAYOUT_FCFA,
  };
}

/**
 * Get detailed usage history for a creator
 */
export async function getCreatorUsageHistory(
  creatorId: string,
  limit = 50,
  offset = 0
) {
  return prisma.assetUsage.findMany({
    where: {
      asset: { creatorId },
    },
    include: {
      asset: {
        select: {
          id: true,
          title: true,
          type: true,
          thumbnailUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

// ═══════════════════════════════════════════════════════════════
// PAYOUT FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Request a payout
 */
export async function requestPayout(creatorId: string) {
  // Get creator profile
  const creator = await prisma.creatorProfile.findUnique({
    where: { id: creatorId },
  });

  if (!creator) {
    throw new Error('Creator not found');
  }

  if (!creator.payoutMethod || !creator.payoutPhone) {
    throw new Error('Payout method not configured. Please update your profile.');
  }

  // Calculate pending earnings
  const earnings = await getCreatorEarnings(creatorId);

  if (!earnings.canRequestPayout) {
    throw new Error(`Minimum payout is ${MIN_PAYOUT_FCFA} FCFA. You have ${earnings.pendingFcfa} FCFA pending.`);
  }

  // Check for existing pending payout
  const existingPayout = await prisma.creatorPayout.findFirst({
    where: {
      creatorId,
      status: 'pending',
    },
  });

  if (existingPayout) {
    throw new Error('You already have a pending payout request');
  }

  // Get unsettled usages count
  const unsettledUsages = await prisma.assetUsage.findMany({
    where: {
      asset: { creatorId },
      settledAt: null,
    },
    select: { id: true, createdAt: true },
  });

  const now = new Date();
  const periodStart = unsettledUsages.length > 0
    ? new Date(Math.min(...unsettledUsages.map(u => u.createdAt.getTime())))
    : now;

  // Create payout request
  const payout = await prisma.creatorPayout.create({
    data: {
      creatorId,
      amountFcfa: earnings.pendingFcfa,
      usageCount: unsettledUsages.length,
      periodStart,
      periodEnd: now,
      payoutMethod: creator.payoutMethod,
      payoutPhone: creator.payoutPhone,
      status: 'pending',
    },
  });

  return payout;
}

/**
 * List payouts for a creator
 */
export async function listCreatorPayouts(creatorId: string, limit = 20, offset = 0) {
  return prisma.creatorPayout.findMany({
    where: { creatorId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}

/**
 * List all pending payouts (admin)
 */
export async function listPendingPayouts(limit = 50) {
  return prisma.creatorPayout.findMany({
    where: { status: 'pending' },
    include: {
      creator: {
        select: {
          id: true,
          displayName: true,
          payoutMethod: true,
          payoutPhone: true,
          user: {
            select: {
              email: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' }, // FIFO
    take: limit,
  });
}

/**
 * Approve a payout (admin)
 */
export async function approvePayout(payoutId: string, adminUserId: string, transactionRef?: string) {
  const payout = await prisma.creatorPayout.findFirst({
    where: {
      id: payoutId,
      status: 'pending',
    },
  });

  if (!payout) {
    throw new Error('Payout not found or not pending');
  }

  // Update payout and mark usages as settled
  const [updatedPayout] = await prisma.$transaction([
    prisma.creatorPayout.update({
      where: { id: payoutId },
      data: {
        status: 'completed',
        processedAt: new Date(),
        externalRef: transactionRef,
      },
    }),
    // Mark all unsettled usages for this creator as settled
    prisma.assetUsage.updateMany({
      where: {
        asset: { creatorId: payout.creatorId },
        settledAt: null,
      },
      data: {
        settledAt: new Date(),
        payoutId: payoutId,
      },
    }),
  ]);

  return updatedPayout;
}

/**
 * Reject a payout (admin)
 */
export async function rejectPayout(payoutId: string, adminUserId: string, reason: string) {
  const payout = await prisma.creatorPayout.findFirst({
    where: {
      id: payoutId,
      status: 'pending',
    },
  });

  if (!payout) {
    throw new Error('Payout not found or not pending');
  }

  return prisma.creatorPayout.update({
    where: { id: payoutId },
    data: {
      status: 'failed',
      processedAt: new Date(),
      failureReason: reason,
    },
  });
}

// ═══════════════════════════════════════════════════════════════
// REVIEW FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Create a review for a creator
 */
export async function createReview(
  creatorId: string,
  userId: string,
  rating: number,
  comment?: string
) {
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Check if user has used this creator's assets
  const hasUsedAsset = await prisma.assetUsage.findFirst({
    where: {
      userId,
      asset: { creatorId },
    },
  });

  if (!hasUsedAsset) {
    throw new Error('You can only review creators whose assets you have used');
  }

  // Check for existing review
  const existingReview = await prisma.creatorReview.findFirst({
    where: {
      creatorId,
      userId,
    },
  });

  if (existingReview) {
    // Update existing review
    const review = await prisma.creatorReview.update({
      where: { id: existingReview.id },
      data: { rating, comment },
    });

    // Recalculate creator's average rating
    await updateCreatorRating(creatorId);

    return review;
  }

  // Create new review
  const review = await prisma.creatorReview.create({
    data: {
      creatorId,
      userId,
      rating,
      comment,
    },
  });

  // Update creator's rating and review count
  await updateCreatorRating(creatorId);

  return review;
}

/**
 * Update creator's average rating
 */
async function updateCreatorRating(creatorId: string) {
  const reviews = await prisma.creatorReview.findMany({
    where: { creatorId },
    select: { rating: true },
  });

  if (reviews.length === 0) {
    await prisma.creatorProfile.update({
      where: { id: creatorId },
      data: { rating: null, reviewCount: 0 },
    });
    return;
  }

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

  await prisma.creatorProfile.update({
    where: { id: creatorId },
    data: {
      rating: Math.round(avgRating * 10) / 10, // Round to 1 decimal
      reviewCount: reviews.length,
    },
  });
}

/**
 * Get reviews for a creator
 */
export async function getCreatorReviews(creatorId: string, limit = 20, offset = 0) {
  return prisma.creatorReview.findMany({
    where: { creatorId },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });
}
