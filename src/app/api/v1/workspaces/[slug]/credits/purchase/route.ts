import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';
import { getCreditPack, CREDIT_PACKS } from '@/lib/credits';
import { createCreditPurchase } from '@/lib/naboopay';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  // Return available credit packs
  return NextResponse.json({ packs: CREDIT_PACKS });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'admin');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  try {
    const body = await req.json();
    const { packId } = body;

    if (!packId) {
      return NextResponse.json(
        { error: 'packId is required' },
        { status: 400 }
      );
    }

    const pack = getCreditPack(packId);
    if (!pack) {
      return NextResponse.json(
        { error: 'Invalid pack ID' },
        { status: 400 }
      );
    }

    // Generate unique order ID
    const orderId = uuidv4();

    // Create transaction record
    const transaction = await prisma.transaction.create({
      data: {
        workspaceId: workspace.id,
        amountFcfa: pack.priceFcfa,
        creditsPurchased: pack.credits,
        unitsToAdd: pack.units,
        paymentMethod: 'wave', // Will be determined by NabooPay
        status: 'pending',
        externalRef: orderId,
        metadata: {
          packId,
          packName: pack.name,
        },
      },
    });

    // Create payment with NabooPay
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const paymentResponse = await createCreditPurchase({
      packName: `${pack.name} - ${pack.credits} crédits`,
      priceFcfa: pack.priceFcfa,
      orderId,
      successUrl: `${baseUrl}/${slug}/credits?success=true&order=${orderId}`,
      errorUrl: `${baseUrl}/${slug}/credits?error=true&order=${orderId}`,
      callbackUrl: `${baseUrl}/api/v1/webhooks/naboopay`,
    });

    // Update transaction with checkout URL
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { checkoutUrl: paymentResponse.checkout_url },
    });

    return NextResponse.json({
      transactionId: transaction.id,
      checkoutUrl: paymentResponse.checkout_url,
      orderId,
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
