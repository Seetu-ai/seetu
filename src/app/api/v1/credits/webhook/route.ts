import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature, verifyTransactionDetails } from '@/lib/naboopay';
import { CREDITS_PER_UNIT } from '@/lib/credits';
import prisma from '@/lib/prisma';

// Terminal statuses that should mark transaction as failed
const FAILED_STATUSES = ['failed', 'cancelled', 'expired', 'refunded'];

/**
 * POST /api/v1/credits/webhook - NabooPay payment webhook
 *
 * Called by NabooPay when a payment status changes.
 * Uses conditional updates to ensure idempotency under concurrent retries.
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-naboopay-signature');

    // Verify webhook signature
    const isValidSignature = verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValidSignature) {
      console.error('[WEBHOOK] Invalid signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    console.log('[WEBHOOK] Received payload:', payload);

    const { order_id, status, amount } = payload;

    if (!order_id) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    // First, find the transaction to get its details
    const transaction = await prisma.transaction.findFirst({
      where: { externalRef: order_id },
    });

    if (!transaction) {
      console.error('[WEBHOOK] Transaction not found:', order_id);
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Handle non-completed statuses (failed, cancelled, expired, etc.)
    if (FAILED_STATUSES.includes(status)) {
      console.log('[WEBHOOK] Payment failed/cancelled:', status);

      // Conditional update: only mark as failed if still pending
      const updateResult = await prisma.transaction.updateMany({
        where: {
          id: transaction.id,
          status: 'pending',
        },
        data: { status: 'failed' },
      });

      return NextResponse.json({
        success: true,
        status: 'marked_failed',
        updated: updateResult.count > 0,
      });
    }

    // Only process completed payments
    if (status !== 'completed') {
      console.log('[WEBHOOK] Ignoring non-terminal status:', status);
      return NextResponse.json({ success: true, status: 'ignored' });
    }

    // Already completed - idempotent success
    if (transaction.status === 'completed') {
      console.log('[WEBHOOK] Transaction already completed:', transaction.id);
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    // Already failed - can't complete
    if (transaction.status === 'failed') {
      console.error('[WEBHOOK] Attempted to complete failed transaction:', transaction.id);
      return NextResponse.json({ error: 'Transaction already failed' }, { status: 400 });
    }

    // Verify transaction details with NabooPay API before crediting
    // Use payload amount if provided, fallback to stored amount
    const verifyAmount = amount ?? transaction.amountFcfa;
    const verification = await verifyTransactionDetails(order_id, verifyAmount);
    if (!verification.valid) {
      console.error('[WEBHOOK] Transaction verification failed:', verification.error);
      return NextResponse.json(
        { error: 'Verification failed', details: verification.error },
        { status: 400 }
      );
    }

    // CRITICAL: Claim + credit must be atomic
    // If credit fails, the claim must roll back so webhook can be retried
    type TxResult = { alreadyProcessed: true } | { alreadyProcessed: false; newBalance: number };
    const result: TxResult = await prisma.$transaction(async (tx) => {
      // Try to claim the transaction atomically within this transaction
      const claimResult = await tx.transaction.updateMany({
        where: {
          id: transaction.id,
          status: 'pending', // Only update if still pending
        },
        data: { status: 'completed' },
      });

      // If no rows updated, another request already claimed it
      if (claimResult.count === 0) {
        return { alreadyProcessed: true };
      }

      // Credit user's account
      const updatedUser = await tx.user.update({
        where: { id: transaction.userId },
        data: {
          creditUnits: { increment: transaction.unitsToAdd },
        },
      });

      // Create ledger entry
      await tx.creditLedger.create({
        data: {
          userId: transaction.userId,
          delta: transaction.unitsToAdd,
          balanceAfter: updatedUser.creditUnits,
          reason: 'purchase',
          refType: 'transaction',
          refId: transaction.id,
          description: `Achat de ${transaction.creditsPurchased} crédits`,
        },
      });

      return { newBalance: updatedUser.creditUnits, alreadyProcessed: false };
    });

    if (result.alreadyProcessed) {
      console.log('[WEBHOOK] Transaction already claimed by another request:', transaction.id);
      return NextResponse.json({ success: true, alreadyProcessed: true });
    }

    // TypeScript: after the alreadyProcessed check, newBalance is guaranteed to exist
    const { newBalance } = result;

    console.log(
      '[WEBHOOK] Successfully credited',
      transaction.creditsPurchased,
      'credits to user',
      transaction.userId
    );

    return NextResponse.json({
      success: true,
      credited: transaction.creditsPurchased,
      newBalance,
      newBalanceCredits: Math.floor(newBalance / CREDITS_PER_UNIT),
    });
  } catch (error) {
    console.error('[WEBHOOK] Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
