/**
 * Billboard Payments
 *
 * Handles payment creation and processing for billboard ads
 * Integrates with Wave API for mobile money payments
 */

import { prisma } from '../prisma';
import { getWaveClient } from '../wave';
import { BillboardPaymentStatus, PaymentMethod } from '@prisma/client';
import { addToQueue } from './queue-manager';
import { enqueueTranscoding } from '../queues/billboard-queue';
import { RESOLUTIONS } from './transcoding';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';

export interface CreatePaymentParams {
  // Support both single contentId (legacy) and multiple contentIds (batch)
  contentId?: string;
  contentIds?: string[];
  billboardIds: string[];
  amountCfa: number;
  userId?: string;
  whatsappPhone?: string;
  scheduledFor?: Date;
}

export interface PaymentResult {
  id: string;
  checkoutUrl: string;
  status: BillboardPaymentStatus;
}

/**
 * Create a billboard payment
 * Supports both single content (legacy) and batch processing (multiple contents)
 */
export async function createBillboardPayment(
  params: CreatePaymentParams
): Promise<PaymentResult> {
  const { contentId, contentIds: inputContentIds, billboardIds, amountCfa, userId, whatsappPhone, scheduledFor } = params;

  // Support both legacy single contentId and new batch contentIds
  const contentIds = inputContentIds?.length ? inputContentIds : (contentId ? [contentId] : []);

  if (contentIds.length === 0) {
    throw new Error('No content IDs provided');
  }

  // Verify all contents exist
  const contents = await prisma.billboardContent.findMany({
    where: { id: { in: contentIds } },
  });

  if (contents.length !== contentIds.length) {
    throw new Error('One or more contents not found');
  }

  // Create payment record first
  // Use first contentId for backwards compatibility (legacy relation)
  const payment = await prisma.billboardPayment.create({
    data: {
      contentId: contentIds[0], // Legacy field for backwards compatibility
      contentIds, // New array field for batch
      userId,
      whatsappPhone,
      billboardIds,
      amountCfa,
      paymentMethod: 'wave', // Default, will be updated by payment provider
      status: 'pending',
      scheduledFor: scheduledFor || null,
    },
  });

  try {
    // Create Wave checkout session
    const wave = getWaveClient();

    if (!wave.isConfigured()) {
      throw new Error('Wave API not configured');
    }

    const successUrl = `${BASE_URL}/api/v1/webhooks/billboard-payment?status=success&payment_id=${payment.id}`;
    const errorUrl = `${BASE_URL}/api/v1/webhooks/billboard-payment?status=error&payment_id=${payment.id}`;

    const session = await wave.createCheckoutSession({
      amountCfa,
      clientReference: payment.id,
      successUrl,
      errorUrl,
    });

    // Update payment with checkout URL and external ref
    await prisma.billboardPayment.update({
      where: { id: payment.id },
      data: {
        checkoutUrl: session.wave_launch_url,
        externalRef: session.id,
      },
    });

    return {
      id: payment.id,
      checkoutUrl: session.wave_launch_url,
      status: 'pending',
    };
  } catch (error) {
    // Mark payment as failed
    await prisma.billboardPayment.update({
      where: { id: payment.id },
      data: { status: 'failed' },
    });

    console.error('[BILLBOARD_PAYMENT] Creation failed:', error);
    throw new Error('Failed to create payment');
  }
}

/**
 * Process successful payment
 * Handles both single content and batch processing
 */
export async function processPaymentSuccess(
  paymentId: string,
  externalRef?: string,
  paymentMethod?: string
): Promise<void> {
  // Get payment details
  const payment = await prisma.billboardPayment.findUnique({
    where: { id: paymentId },
    include: {
      content: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status === 'completed') {
    console.log('[BILLBOARD_PAYMENT] Payment already processed:', paymentId);
    return;
  }

  // Get all content IDs (batch support)
  const contentIds = payment.contentIds?.length ? payment.contentIds : (payment.contentId ? [payment.contentId] : []);

  if (contentIds.length === 0) {
    throw new Error('No content IDs found in payment');
  }

  // Update payment status
  await prisma.billboardPayment.update({
    where: { id: paymentId },
    data: {
      status: 'completed',
      paidAt: new Date(),
      externalRef: externalRef || payment.externalRef,
      paymentMethod: mapPaymentMethod(paymentMethod),
    },
  });

  // Get all contents
  const contents = await prisma.billboardContent.findMany({
    where: { id: { in: contentIds } },
  });

  // Update all contents status to processing
  await prisma.billboardContent.updateMany({
    where: { id: { in: contentIds } },
    data: { status: 'processing' },
  });

  // Get target resolution from first billboard
  const billboard = await prisma.billboard.findFirst({
    where: { id: { in: payment.billboardIds } },
    select: {
      resolutionWidth: true,
      resolutionHeight: true,
    },
  });

  const targetWidth = billboard?.resolutionWidth || RESOLUTIONS.LANDSCAPE_HD.width;
  const targetHeight = billboard?.resolutionHeight || RESOLUTIONS.LANDSCAPE_HD.height;

  // Enqueue transcoding jobs for all contents
  for (const content of contents) {
    await enqueueTranscoding({
      contentId: content.id,
      originalUrl: content.originalUrl,
      mediaType: content.mediaType as 'image' | 'video',
      targetWidth,
      targetHeight,
      addOverlay: true,
    });
  }

  console.log(`[BILLBOARD_PAYMENT] Payment processed successfully: ${paymentId} (${contentIds.length} contents)`);
}

/**
 * Add content to queues after transcoding completes
 * Supports finding payment by either contentId or within contentIds array
 */
export async function addContentToQueues(contentId: string): Promise<void> {
  // Get payment to find billboard IDs
  // Check both legacy contentId field and new contentIds array
  let payment = await prisma.billboardPayment.findFirst({
    where: { contentId },
    select: { billboardIds: true, scheduledFor: true },
  });

  // If not found by contentId, check contentIds array
  if (!payment) {
    payment = await prisma.billboardPayment.findFirst({
      where: {
        contentIds: { has: contentId },
      },
      select: { billboardIds: true, scheduledFor: true },
    });
  }

  if (!payment) {
    console.error('[BILLBOARD_PAYMENT] No payment found for content:', contentId);
    return;
  }

  // Add to queue for each billboard, passing scheduledFor if set
  await addToQueue(contentId, payment.billboardIds, payment.scheduledFor || undefined);

  console.log(
    `[BILLBOARD_PAYMENT] Content ${contentId} added to ${payment.billboardIds.length} queues`
  );
}

/**
 * Process payment failure
 * Handles both single content and batch processing
 */
export async function processPaymentFailure(paymentId: string): Promise<void> {
  await prisma.billboardPayment.update({
    where: { id: paymentId },
    data: { status: 'failed' },
  });

  // Update content status back to pending payment
  const payment = await prisma.billboardPayment.findUnique({
    where: { id: paymentId },
    select: { contentId: true, contentIds: true },
  });

  if (payment) {
    // Get all content IDs (batch support)
    const contentIds = payment.contentIds?.length ? payment.contentIds : (payment.contentId ? [payment.contentId] : []);

    if (contentIds.length > 0) {
      await prisma.billboardContent.updateMany({
        where: { id: { in: contentIds } },
        data: { status: 'pending_payment' },
      });
    }
  }
}

/**
 * Process refund
 * Handles both single content and batch processing
 */
export async function processRefund(paymentId: string): Promise<void> {
  const payment = await prisma.billboardPayment.findUnique({
    where: { id: paymentId },
    select: { contentId: true, contentIds: true },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Get all content IDs (batch support)
  const contentIds = payment.contentIds?.length ? payment.contentIds : (payment.contentId ? [payment.contentId] : []);

  // Update payment status
  await prisma.billboardPayment.update({
    where: { id: paymentId },
    data: { status: 'refunded' },
  });

  // Remove all contents from queues if not yet played
  if (contentIds.length > 0) {
    await prisma.billboardQueue.deleteMany({
      where: {
        contentId: { in: contentIds },
        status: 'queued',
      },
    });
  }
}

/**
 * Create payment using platform credits (for logged-in users)
 * Supports both single content and batch processing
 */
export async function createCreditPayment(
  params: CreatePaymentParams & { creditsCost: number }
): Promise<PaymentResult> {
  const { contentId, contentIds: inputContentIds, billboardIds, amountCfa, userId, creditsCost } = params;

  if (!userId) {
    throw new Error('User ID required for credit payment');
  }

  // Support both legacy single contentId and new batch contentIds
  const contentIds = inputContentIds?.length ? inputContentIds : (contentId ? [contentId] : []);

  if (contentIds.length === 0) {
    throw new Error('No content IDs provided');
  }

  // Check user credits
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { creditUnits: true },
  });

  if (!user || user.creditUnits < creditsCost * 100) {
    throw new Error('Insufficient credits');
  }

  // Create payment record
  const payment = await prisma.billboardPayment.create({
    data: {
      contentId: contentIds[0], // Legacy field for backwards compatibility
      contentIds, // New array field for batch
      userId,
      billboardIds,
      amountCfa,
      paymentMethod: 'bonus', // Using platform credits
      status: 'completed',
      paidAt: new Date(),
    },
  });

  // Debit credits
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { creditUnits: { decrement: creditsCost * 100 } },
    }),
    prisma.creditLedger.create({
      data: {
        userId,
        delta: -(creditsCost * 100),
        balanceAfter: user.creditUnits - creditsCost * 100,
        reason: 'billboard',
        refType: 'billboard_payment',
        refId: payment.id,
        description: `Billboard ad - ${contentIds.length} content(s) on ${billboardIds.length} screen(s)`,
      },
    }),
  ]);

  // Process immediately since already paid
  await processPaymentSuccess(payment.id);

  return {
    id: payment.id,
    checkoutUrl: '', // No checkout needed
    status: 'completed',
  };
}

/**
 * Get payment by ID
 */
export async function getPayment(paymentId: string) {
  return prisma.billboardPayment.findUnique({
    where: { id: paymentId },
    include: {
      content: {
        select: {
          id: true,
          status: true,
          processedUrls: true,
        },
      },
    },
  });
}

/**
 * Get payments for user
 */
export async function getUserPayments(userId: string) {
  return prisma.billboardPayment.findMany({
    where: { userId },
    include: {
      content: {
        select: {
          id: true,
          mediaType: true,
          originalUrl: true,
          processedUrls: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get payments for WhatsApp phone
 */
export async function getWhatsAppPayments(phone: string) {
  return prisma.billboardPayment.findMany({
    where: { whatsappPhone: phone },
    include: {
      content: {
        select: {
          id: true,
          mediaType: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Map payment method string to enum
 */
function mapPaymentMethod(method?: string): PaymentMethod {
  if (!method) return 'wave';

  const methodLower = method.toLowerCase();
  if (methodLower.includes('orange')) return 'orange_money';
  if (methodLower.includes('visa') || methodLower.includes('card')) return 'visa';
  return 'wave';
}
