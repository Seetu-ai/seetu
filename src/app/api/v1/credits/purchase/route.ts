import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getCreditPack, CREDIT_PACKS } from '@/lib/credits';
import { createCreditPurchase } from '@/lib/naboopay';
import prisma from '@/lib/prisma';

/**
 * POST /api/v1/credits/purchase - Initiate credit purchase
 *
 * Body: { packId: string, successUrl?: string, errorUrl?: string }
 * Returns: { checkoutUrl: string, orderId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { packId, successUrl, errorUrl } = body;

    if (!packId) {
      return NextResponse.json(
        { error: 'Pack ID is required' },
        { status: 400 }
      );
    }

    const pack = getCreditPack(packId);
    if (!pack) {
      return NextResponse.json(
        { error: 'Invalid pack ID', validPacks: CREDIT_PACKS.map((p) => p.id) },
        { status: 400 }
      );
    }

    // Create pending transaction in database
    const transaction = await prisma.transaction.create({
      data: {
        userId: user.id,
        amountFcfa: pack.priceFcfa,
        creditsPurchased: pack.credits,
        unitsToAdd: pack.units,
        paymentMethod: 'wave', // Will be determined by NabooPay
        status: 'pending',
        metadata: {
          packId: pack.id,
          packName: pack.name,
        },
      },
    });

    // Get base URL for callbacks
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.ai';

    // Create NabooPay checkout session
    // Default redirects use query params on /credits to match web UI expectations
    const nabooPayResponse = await createCreditPurchase({
      packName: `Seetu ${pack.name} - ${pack.credits} crédits`,
      priceFcfa: pack.priceFcfa,
      orderId: transaction.id,
      successUrl: successUrl || `${baseUrl}/credits?success=true&order=${transaction.id}`,
      errorUrl: errorUrl || `${baseUrl}/credits?error=true&order=${transaction.id}`,
      callbackUrl: `${baseUrl}/api/v1/credits/webhook`,
    });

    // Update transaction with external reference
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        externalRef: nabooPayResponse.order_id,
        checkoutUrl: nabooPayResponse.checkout_url,
      },
    });

    return NextResponse.json({
      checkoutUrl: nabooPayResponse.checkout_url,
      orderId: transaction.id,
      externalRef: nabooPayResponse.order_id,
      pack: {
        id: pack.id,
        name: pack.name,
        credits: pack.credits,
        priceFcfa: pack.priceFcfa,
      },
    });
  } catch (error) {
    console.error('Error creating purchase:', error);

    // Handle NabooPay-specific errors
    if (error instanceof Error && error.name === 'NabooPayError') {
      return NextResponse.json(
        { error: 'Payment provider error', details: error.message },
        { status: 502 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/credits/purchase - Check purchase status
 * Query: ?orderId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: orderId,
        userId: user.id,
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      orderId: transaction.id,
      status: transaction.status,
      pack: {
        credits: transaction.creditsPurchased,
        priceFcfa: transaction.amountFcfa,
      },
      createdAt: transaction.createdAt,
      completedAt: transaction.status === 'completed' ? transaction.updatedAt : null,
    });
  } catch (error) {
    console.error('Error checking purchase status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
