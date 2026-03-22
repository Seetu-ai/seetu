/**
 * GET /api/v1/pay/[id]
 *
 * Redirect endpoint for Wave payments from WhatsApp template buttons.
 * WhatsApp URL-encodes query params in CTA buttons, so we use this
 * endpoint to redirect to the full Wave checkout URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log('[PAY_REDIRECT] Looking up payment:', id);

  try {
    // Look up payment by ID or external ref (Wave session ID)
    const payment = await prisma.billboardPayment.findFirst({
      where: {
        OR: [
          { id },
          { externalRef: id },
        ],
      },
      select: {
        id: true,
        checkoutUrl: true,
        status: true,
      },
    });

    if (!payment) {
      console.error('[PAY_REDIRECT] Payment not found:', id);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
      return NextResponse.redirect(`${baseUrl}/billboards?error=payment_not_found`);
    }

    if (!payment.checkoutUrl) {
      console.error('[PAY_REDIRECT] No checkout URL for payment:', id);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
      return NextResponse.redirect(`${baseUrl}/billboards?error=no_checkout_url`);
    }

    // Check if payment is still pending
    if (payment.status !== 'pending') {
      console.log('[PAY_REDIRECT] Payment not pending:', id, payment.status);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
      return NextResponse.redirect(
        `${baseUrl}/billboards/my-content?payment=${payment.status}`
      );
    }

    console.log('[PAY_REDIRECT] Redirecting to Wave:', payment.checkoutUrl);
    return NextResponse.redirect(payment.checkoutUrl);
  } catch (error) {
    console.error('[PAY_REDIRECT] Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
    return NextResponse.redirect(`${baseUrl}/billboards?error=redirect_failed`);
  }
}
