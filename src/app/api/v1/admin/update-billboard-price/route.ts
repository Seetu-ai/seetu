/**
 * Temporary endpoint to update billboard prices for testing
 * DELETE THIS AFTER TESTING
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const { price } = await request.json();

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    const result = await prisma.billboard.updateMany({
      data: { pricePerSlot: price },
    });

    return NextResponse.json({
      success: true,
      updated: result.count,
      newPrice: price,
    });
  } catch (error) {
    console.error('[ADMIN] Update price error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}
