import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { creditCredits } from '@/lib/credits';
import { verifyWebhookSignature, verifyTransactionDetails } from '@/lib/naboopay';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-naboopay-signature');

    // 1. Verify webhook signature (fail closed)
    if (!verifyWebhookSignature(body, signature)) {
      console.error('[WEBHOOK] Invalid signature - rejecting');
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    const data = JSON.parse(body);
    const { order_id, status, amount } = data;

    if (!order_id) {
      return NextResponse.json(
        { error: 'Missing order_id' },
        { status: 400 }
      );
    }

    // Find transaction by external ref
    const transaction = await prisma.transaction.findUnique({
      where: { externalRef: order_id },
    });

    if (!transaction) {
      console.error('Transaction not found:', order_id);
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      );
    }

    // IDEMPOTENCE: Check if already processed
    if (transaction.status !== 'pending') {
      console.log(`Webhook already processed for ${order_id}`);
      return NextResponse.json({
        success: true,
        message: 'Already processed',
      });
    }

    // Process based on status
    if (status === 'completed' || status === 'success') {
      // 2. Double-verify with NabooPay API (defense in depth)
      const verification = await verifyTransactionDetails(order_id, amount);
      if (!verification.valid) {
        console.error('[WEBHOOK] Transaction verification failed:', verification.error);
        // Don't reveal details to potential attacker
        return NextResponse.json(
          { error: 'Verification failed' },
          { status: 403 }
        );
      }

      // 3. Credit the user atomically
      await prisma.$transaction(async (tx) => {
        // Update transaction status
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'completed' },
        });

        // Add credits via ledger
        await creditCredits({
          userId: transaction.userId,
          units: transaction.unitsToAdd,
          reason: 'purchase',
          refType: 'transaction',
          refId: transaction.id,
          description: `Achat ${transaction.creditsPurchased} crédits`,
        });
      });

      console.log(`[WEBHOOK] Credits added for order ${order_id}`);
    } else if (status === 'failed' || status === 'cancelled') {
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' },
      });

      console.log(`Transaction ${order_id} marked as failed`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
