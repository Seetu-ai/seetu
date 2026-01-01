import prisma from './prisma';

// Credit unit constants
export const CREDITS_PER_UNIT = 100;
export const CREDIT_UNIT_PREVIEW = 50;    // 0.5 credits
export const CREDIT_UNIT_FINAL = 100;     // 1 credit
export const CREDIT_UNIT_4K = 200;        // 2 credits
export const CREDIT_UNIT_CAPTION = 25;    // 0.25 credits
export const FREE_TRIAL_UNITS = 300;      // 3 credits

// Video generation costs (Kling AI)
export const CREDIT_UNIT_VIDEO_5S_STANDARD = 300;   // 3 credits
export const CREDIT_UNIT_VIDEO_5S_PRO = 600;        // 6 credits
export const CREDIT_UNIT_VIDEO_10S_STANDARD = 500;  // 5 credits
export const CREDIT_UNIT_VIDEO_10S_PRO = 1000;      // 10 credits

// Credit packs (FCFA)
export const CREDIT_PACKS = [
  { id: 'starter', name: 'Starter', credits: 5, units: 500, priceFcfa: 2500 },
  { id: 'pro', name: 'Pro', credits: 20, units: 2000, priceFcfa: 8000 },
  { id: 'business', name: 'Business', credits: 50, units: 5000, priceFcfa: 17500 },
  { id: 'enterprise', name: 'Enterprise', credits: 150, units: 15000, priceFcfa: 45000 },
] as const;

export type CreditPackId = typeof CREDIT_PACKS[number]['id'];

export function getCreditPack(packId: string) {
  return CREDIT_PACKS.find((pack) => pack.id === packId);
}

// Convert units to display credits
export function unitsToCredits(units: number): number {
  return Math.floor(units / CREDITS_PER_UNIT);
}

// Convert display credits to units
export function creditsToUnits(credits: number): number {
  return credits * CREDITS_PER_UNIT;
}

// Get cost in units for a job mode
export function getJobCost(mode: 'preview' | 'final' | 'final_4k' | 'caption'): number {
  switch (mode) {
    case 'preview':
      return CREDIT_UNIT_PREVIEW;
    case 'final':
      return CREDIT_UNIT_FINAL;
    case 'final_4k':
      return CREDIT_UNIT_4K;
    case 'caption':
      return CREDIT_UNIT_CAPTION;
    default:
      return CREDIT_UNIT_PREVIEW;
  }
}

// Video generation types
export type VideoDuration = 5 | 10;
export type VideoQuality = 'standard' | 'pro';

// Get cost in units for video generation
export function getVideoCost(duration: VideoDuration, quality: VideoQuality): number {
  if (duration === 5) {
    return quality === 'pro' ? CREDIT_UNIT_VIDEO_5S_PRO : CREDIT_UNIT_VIDEO_5S_STANDARD;
  } else {
    return quality === 'pro' ? CREDIT_UNIT_VIDEO_10S_PRO : CREDIT_UNIT_VIDEO_10S_STANDARD;
  }
}

// Get all video pricing options
export function getVideoPricing(): Array<{
  duration: VideoDuration;
  quality: VideoQuality;
  units: number;
  credits: number;
}> {
  return [
    { duration: 5, quality: 'standard', units: CREDIT_UNIT_VIDEO_5S_STANDARD, credits: 3 },
    { duration: 5, quality: 'pro', units: CREDIT_UNIT_VIDEO_5S_PRO, credits: 6 },
    { duration: 10, quality: 'standard', units: CREDIT_UNIT_VIDEO_10S_STANDARD, credits: 5 },
    { duration: 10, quality: 'pro', units: CREDIT_UNIT_VIDEO_10S_PRO, credits: 10 },
  ];
}

interface DebitCreditsParams {
  userId: string;
  units: number;
  reason: string;
  refType?: string;
  refId?: string;
  description?: string;
}

interface CreditResult {
  success: boolean;
  newBalance: number;
  error?: string;
}

/**
 * Atomically debit credits from a user
 * Uses Prisma transaction to ensure consistency
 */
export async function debitCredits(params: DebitCreditsParams): Promise<CreditResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Get current balance with row lock
      const user = await tx.user.findUnique({
        where: { id: params.userId },
        select: { creditUnits: true },
      });

      if (!user) {
        throw new Error('USER_NOT_FOUND');
      }

      if (user.creditUnits < params.units) {
        throw new Error('INSUFFICIENT_CREDITS');
      }

      // 2. Decrement balance
      const updated = await tx.user.update({
        where: { id: params.userId },
        data: {
          creditUnits: {
            decrement: params.units,
          },
        },
      });

      // 3. Create ledger entry
      await tx.creditLedger.create({
        data: {
          userId: params.userId,
          delta: -params.units,
          balanceAfter: updated.creditUnits,
          reason: params.reason,
          refType: params.refType,
          refId: params.refId,
          description: params.description,
        },
      });

      return { success: true, newBalance: updated.creditUnits };
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, newBalance: 0, error: message };
  }
}

interface CreditCreditsParams {
  userId: string;
  units: number;
  reason: string;
  refType?: string;
  refId?: string;
  description?: string;
}

/**
 * Atomically credit (add) credits to a user
 * Uses Prisma transaction to ensure consistency
 */
export async function creditCredits(params: CreditCreditsParams): Promise<CreditResult> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Increment balance
      const updated = await tx.user.update({
        where: { id: params.userId },
        data: {
          creditUnits: {
            increment: params.units,
          },
        },
      });

      // 2. Create ledger entry
      await tx.creditLedger.create({
        data: {
          userId: params.userId,
          delta: params.units,
          balanceAfter: updated.creditUnits,
          reason: params.reason,
          refType: params.refType,
          refId: params.refId,
          description: params.description,
        },
      });

      return { success: true, newBalance: updated.creditUnits };
    });

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, newBalance: 0, error: message };
  }
}

/**
 * Check if user has enough credits
 */
export async function hasEnoughCredits(
  userId: string,
  unitsNeeded: number
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditUnits: true },
  });

  return user ? user.creditUnits >= unitsNeeded : false;
}

/**
 * Get credit balance for a user
 */
export async function getCreditBalance(userId: string): Promise<{
  units: number;
  credits: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditUnits: true },
  });

  const units = user?.creditUnits ?? 0;
  return {
    units,
    credits: unitsToCredits(units),
  };
}

/**
 * Get credit history for a user
 */
export async function getCreditHistory(
  userId: string,
  options: { limit?: number; offset?: number } = {}
) {
  const { limit = 50, offset = 0 } = options;

  const [entries, total] = await Promise.all([
    prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.creditLedger.count({ where: { userId } }),
  ]);

  return {
    entries: entries.map((entry) => ({
      ...entry,
      deltaCredits: entry.delta / CREDITS_PER_UNIT,
      balanceAfterCredits: entry.balanceAfter / CREDITS_PER_UNIT,
    })),
    total,
    hasMore: offset + entries.length < total,
  };
}
