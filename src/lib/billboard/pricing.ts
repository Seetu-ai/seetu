/**
 * Billboard Pricing Calculator
 *
 * Calculates prices for billboard ad placements based on:
 * - Billboard location and premium status
 * - Number of slots/displays
 * - Time of day
 * - Bulk discounts
 */

import { prisma } from '../prisma';

export interface BillboardPricing {
  billboardId: string;
  billboardName: string;
  pricePerSlot: number; // CFA per slot
  slotDurationSecs: number;
  isAvailable: boolean;
}

export interface PriceCalculation {
  billboards: {
    billboardId: string;
    billboardName: string;
    slots: number;
    pricePerSlot: number;
    subtotal: number;
  }[];
  totalSlots: number;
  subtotal: number;
  discount: number;
  discountReason?: string;
  totalCfa: number;
  totalCredits: number; // Platform credits equivalent
}

// Discount tiers for bulk purchases
const BULK_DISCOUNTS = [
  { minSlots: 20, discount: 0.15, reason: '15% de réduction (20+ créneaux)' },
  { minSlots: 10, discount: 0.10, reason: '10% de réduction (10+ créneaux)' },
  { minSlots: 5, discount: 0.05, reason: '5% de réduction (5+ créneaux)' },
];

// CFA to credits conversion rate (1 credit = 100 CFA)
const CFA_PER_CREDIT = 100;

/**
 * Get pricing info for active billboards
 */
export async function getBillboardPricing(): Promise<BillboardPricing[]> {
  const billboards = await prisma.billboard.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      pricePerSlot: true,
      slotDurationSecs: true,
      status: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  return billboards.map(b => ({
    billboardId: b.id,
    billboardName: b.name,
    pricePerSlot: b.pricePerSlot,
    slotDurationSecs: b.slotDurationSecs,
    isAvailable: b.status !== 'maintenance',
  }));
}

/**
 * Get pricing for specific billboards
 */
export async function getBillboardPricingByIds(
  billboardIds: string[]
): Promise<BillboardPricing[]> {
  const billboards = await prisma.billboard.findMany({
    where: {
      id: { in: billboardIds },
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      pricePerSlot: true,
      slotDurationSecs: true,
      status: true,
    },
  });

  return billboards.map(b => ({
    billboardId: b.id,
    billboardName: b.name,
    pricePerSlot: b.pricePerSlot,
    slotDurationSecs: b.slotDurationSecs,
    isAvailable: b.status !== 'maintenance',
  }));
}

/**
 * Calculate total price for billboard slots
 *
 * @param billboardSlots - Map of billboard ID to number of slots
 * @returns Price calculation with breakdown
 */
export async function calculatePrice(
  billboardSlots: Record<string, number>
): Promise<PriceCalculation> {
  const billboardIds = Object.keys(billboardSlots);

  if (billboardIds.length === 0) {
    return {
      billboards: [],
      totalSlots: 0,
      subtotal: 0,
      discount: 0,
      totalCfa: 0,
      totalCredits: 0,
    };
  }

  // Get billboard pricing
  const pricing = await getBillboardPricingByIds(billboardIds);

  // Build breakdown
  const billboards = pricing.map(p => {
    const slots = billboardSlots[p.billboardId] || 0;
    return {
      billboardId: p.billboardId,
      billboardName: p.billboardName,
      slots,
      pricePerSlot: p.pricePerSlot,
      subtotal: slots * p.pricePerSlot,
    };
  });

  // Calculate totals
  const totalSlots = billboards.reduce((sum, b) => sum + b.slots, 0);
  const subtotal = billboards.reduce((sum, b) => sum + b.subtotal, 0);

  // Apply bulk discount
  let discount = 0;
  let discountReason: string | undefined;

  for (const tier of BULK_DISCOUNTS) {
    if (totalSlots >= tier.minSlots) {
      discount = Math.round(subtotal * tier.discount);
      discountReason = tier.reason;
      break;
    }
  }

  const totalCfa = subtotal - discount;
  const totalCredits = Math.ceil(totalCfa / CFA_PER_CREDIT);

  return {
    billboards,
    totalSlots,
    subtotal,
    discount,
    discountReason,
    totalCfa,
    totalCredits,
  };
}

/**
 * Calculate price for single billboard, single slot
 */
export async function calculateSingleSlotPrice(
  billboardId: string
): Promise<{ priceCfa: number; priceCredits: number } | null> {
  const billboard = await prisma.billboard.findUnique({
    where: { id: billboardId },
    select: { pricePerSlot: true },
  });

  if (!billboard) return null;

  return {
    priceCfa: billboard.pricePerSlot,
    priceCredits: Math.ceil(billboard.pricePerSlot / CFA_PER_CREDIT),
  };
}

/**
 * Convert CFA to platform credits
 */
export function cfaToCredits(amountCfa: number): number {
  return Math.ceil(amountCfa / CFA_PER_CREDIT);
}

/**
 * Convert credits to CFA
 */
export function creditsToCfa(credits: number): number {
  return credits * CFA_PER_CREDIT;
}

/**
 * Format price for display (in CFA)
 */
export function formatPriceCFA(amountCfa: number): string {
  return new Intl.NumberFormat('fr-SN', {
    style: 'currency',
    currency: 'XOF',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountCfa);
}

/**
 * Get estimated queue position and wait time
 */
export async function getQueueEstimate(billboardId: string): Promise<{
  queueLength: number;
  estimatedWaitMinutes: number;
} | null> {
  const billboard = await prisma.billboard.findUnique({
    where: { id: billboardId },
    select: {
      slotDurationSecs: true,
      queueItems: {
        where: {
          status: { in: ['queued', 'playing'] },
        },
        select: { id: true },
      },
    },
  });

  if (!billboard) return null;

  const queueLength = billboard.queueItems.length;
  const estimatedWaitMinutes = Math.ceil(
    (queueLength * billboard.slotDurationSecs) / 60
  );

  return {
    queueLength,
    estimatedWaitMinutes,
  };
}

/**
 * Get pricing summary for WhatsApp display
 */
export async function getPricingSummaryForWhatsApp(): Promise<string> {
  const pricing = await getBillboardPricing();

  if (pricing.length === 0) {
    return 'Aucun panneau disponible pour le moment.';
  }

  const lines = pricing
    .filter(p => p.isAvailable)
    .map((p, i) => {
      const durationMins = Math.round(p.slotDurationSecs / 60);
      return `${i + 1}. ${p.billboardName}: ${formatPriceCFA(p.pricePerSlot)} / ${durationMins} min`;
    });

  return lines.join('\n');
}
