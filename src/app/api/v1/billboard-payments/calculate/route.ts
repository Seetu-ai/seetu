/**
 * POST /api/v1/billboard-payments/calculate
 *
 * Calculate price for billboard slots without creating a payment
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice, cfaToCredits } from '@/lib/billboard/pricing';

export async function POST(request: NextRequest) {
  try {
    // Parse body
    const body = await request.json();
    const { billboardIds, slots } = body;

    if (!Array.isArray(billboardIds) || billboardIds.length === 0) {
      return NextResponse.json(
        { error: 'billboardIds array is required' },
        { status: 400 }
      );
    }

    // Verify billboards exist
    const billboards = await prisma.billboard.findMany({
      where: {
        id: { in: billboardIds },
        isActive: true,
      },
      select: { id: true, name: true },
    });

    if (billboards.length !== billboardIds.length) {
      return NextResponse.json(
        { error: 'One or more billboards not found or inactive' },
        { status: 400 }
      );
    }

    // Build slots map (default 1 slot per billboard)
    const billboardSlots: Record<string, number> = {};

    if (typeof slots === 'object' && slots !== null) {
      // Custom slots per billboard
      for (const id of billboardIds) {
        billboardSlots[id] = slots[id] || 1;
      }
    } else {
      // Default 1 slot each
      billboardIds.forEach((id: string) => {
        billboardSlots[id] = 1;
      });
    }

    // Calculate price
    const pricing = await calculatePrice(billboardSlots);

    return NextResponse.json({
      billboards: pricing.billboards,
      totalSlots: pricing.totalSlots,
      subtotal: pricing.subtotal,
      discount: pricing.discount,
      discountReason: pricing.discountReason,
      total: pricing.totalCfa,
      credits: pricing.totalCredits,
      formatted: {
        subtotal: `${pricing.subtotal.toLocaleString()} FCFA`,
        discount: pricing.discount > 0 ? `-${pricing.discount.toLocaleString()} FCFA` : null,
        total: `${pricing.totalCfa.toLocaleString()} FCFA`,
      },
    });
  } catch (error) {
    console.error('[API] POST /billboard-payments/calculate error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate price' },
      { status: 500 }
    );
  }
}
