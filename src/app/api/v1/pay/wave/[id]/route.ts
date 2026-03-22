/**
 * GET /api/v1/pay/wave/[id]
 *
 * Redirect endpoint for Wave payments from WhatsApp template buttons.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log('[PAY_REDIRECT] Wave payment lookup:', id);

  try {
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
