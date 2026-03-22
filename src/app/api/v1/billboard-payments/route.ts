/**
 * POST /api/v1/billboard-payments
 *
 * Create a payment for billboard content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { createBillboardPayment, createCreditPayment } from '@/lib/billboard/payments';
import { calculatePrice, cfaToCredits } from '@/lib/billboard/pricing';

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { id: true, creditUnits: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Parse body
    const body = await request.json();
    const { contentId, billboardIds, useCredits } = body;

    if (!contentId || !Array.isArray(billboardIds) || billboardIds.length === 0) {
      return NextResponse.json(
        { error: 'contentId and billboardIds are required' },
        { status: 400 }
      );
    }

    // Verify content belongs to user and is ready for payment
    const content = await prisma.billboardContent.findUnique({
      where: { id: contentId },
      select: { userId: true, status: true },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    if (content.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    if (content.status !== 'pending_payment') {
      return NextResponse.json(
        { error: `Content is not ready for payment (status: ${content.status})` },
        { status: 400 }
      );
    }

    // Verify billboards exist
    const billboards = await prisma.billboard.findMany({
      where: {
        id: { in: billboardIds },
        isActive: true,
      },
      select: { id: true },
    });

    if (billboards.length !== billboardIds.length) {
      return NextResponse.json(
        { error: 'One or more billboards not found or inactive' },
        { status: 400 }
      );
    }

    // Calculate price
    const billboardSlots: Record<string, number> = {};
    billboardIds.forEach((id: string) => {
      billboardSlots[id] = 1;
    });

    const pricing = await calculatePrice(billboardSlots);

    // Create payment
    let result;

    if (useCredits) {
      // Check if user has enough credits
      const creditsCost = cfaToCredits(pricing.totalCfa);
      const creditUnitsNeeded = creditsCost * 100;

      if (user.creditUnits < creditUnitsNeeded) {
        return NextResponse.json(
          {
            error: 'Insufficient credits',
            required: creditsCost,
            available: Math.floor(user.creditUnits / 100),
          },
          { status: 400 }
        );
      }

      result = await createCreditPayment({
        contentId,
        billboardIds,
        amountCfa: pricing.totalCfa,
        userId: user.id,
        creditsCost,
      });
    } else {
      result = await createBillboardPayment({
        contentId,
        billboardIds,
        amountCfa: pricing.totalCfa,
        userId: user.id,
      });
    }

    return NextResponse.json({
      paymentId: result.id,
      checkoutUrl: result.checkoutUrl,
      status: result.status,
      pricing: {
        billboards: pricing.billboards,
        subtotal: pricing.subtotal,
        discount: pricing.discount,
        discountReason: pricing.discountReason,
        total: pricing.totalCfa,
        credits: pricing.totalCredits,
      },
    });
  } catch (error) {
    console.error('[API] POST /billboard-payments error:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
