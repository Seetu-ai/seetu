import { NextResponse } from 'next/server';
import { CREDIT_PACKS, CREDITS_PER_UNIT } from '@/lib/credits';

/**
 * GET /api/v1/credits/packs - Get available credit packs
 * Public endpoint - no auth required (for displaying pricing)
 */
export async function GET() {
  try {
    const packs = CREDIT_PACKS.map((pack) => ({
      id: pack.id,
      name: pack.name,
      credits: pack.credits,
      units: pack.units,
      priceFcfa: pack.priceFcfa,
      pricePerCredit: Math.round(pack.priceFcfa / pack.credits),
      // Highlight best value
      isBestValue: pack.id === 'business',
      // Calculate savings vs starter pack per-credit rate
      savingsPercent:
        pack.id === 'starter'
          ? 0
          : Math.round(
              ((CREDIT_PACKS[0].priceFcfa / CREDIT_PACKS[0].credits -
                pack.priceFcfa / pack.credits) /
                (CREDIT_PACKS[0].priceFcfa / CREDIT_PACKS[0].credits)) *
                100
            ),
    }));

    return NextResponse.json({
      packs,
      currency: 'FCFA',
      unitsPerCredit: CREDITS_PER_UNIT,
    });
  } catch (error) {
    console.error('Error fetching credit packs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
