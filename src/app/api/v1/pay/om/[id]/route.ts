/**
 * GET /api/v1/pay/om/[id]
 *
 * Redirect endpoint for Orange Money payments from WhatsApp template buttons.
 * TODO: Implement Orange Money checkout when ready
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  console.log('[PAY_REDIRECT] Orange Money payment lookup:', id);

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
        amountCfa: true,
        status: true,
      },
    });

    if (!payment) {
      console.error('[PAY_REDIRECT] Payment not found:', id);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
      return NextResponse.redirect(`${baseUrl}/billboards?error=payment_not_found`);
    }

    if (payment.status !== 'pending') {
      console.log('[PAY_REDIRECT] Payment not pending:', id, payment.status);
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
      return NextResponse.redirect(
        `${baseUrl}/billboards/my-content?payment=${payment.status}`
      );
    }

    // TODO: Create Orange Money checkout session and redirect
    // For now, redirect to a page explaining OM is coming soon
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
    console.log('[PAY_REDIRECT] Orange Money not yet implemented, payment:', id);

    // Redirect to Wave for now with a message that OM is coming
    // Or implement OM checkout here when ready
    return NextResponse.redirect(
      `${baseUrl}/billboards/payment/${id}?method=om&amount=${payment.amountCfa}`
    );
  } catch (error) {
    console.error('[PAY_REDIRECT] Error:', error);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://seetu.sn';
    return NextResponse.redirect(`${baseUrl}/billboards?error=redirect_failed`);
  }
}
