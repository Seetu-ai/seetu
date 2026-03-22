/**
 * POST /api/v1/admin/billboards/content/[id]/approve
 *
 * Admin: Approve content for billboard display
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { onModerationComplete } from '@/lib/billboard/whatsapp/message-handler';

const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return false;
  return SUPERADMIN_EMAILS.includes(user.email);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { id } = await params;

    // Get content
    const content = await prisma.billboardContent.findUnique({
      where: { id },
      select: {
        status: true,
        whatsappPhone: true,
        moderationResult: true,
      },
    });

    if (!content) {
      return NextResponse.json(
        { error: 'Content not found' },
        { status: 404 }
      );
    }

    // Only approve content in moderation state
    if (content.status !== 'pending_moderation') {
      return NextResponse.json(
        { error: `Content is not pending moderation (status: ${content.status})` },
        { status: 400 }
      );
    }

    // Update status to pending payment
    await prisma.billboardContent.update({
      where: { id },
      data: {
        status: 'pending_payment',
        moderationResult: {
          ...((content.moderationResult as Record<string, unknown>) || {}),
          manuallyApproved: true,
          approvedAt: new Date().toISOString(),
        },
      },
    });

    // Notify WhatsApp user if applicable
    if (content.whatsappPhone) {
      try {
        await onModerationComplete(id, true, false);
      } catch (error) {
        console.error('[ADMIN] Failed to notify WhatsApp:', error);
      }
    }

    return NextResponse.json({
      success: true,
      newStatus: 'pending_payment',
    });
  } catch (error) {
    console.error('[ADMIN] POST /content/[id]/approve error:', error);
    return NextResponse.json(
      { error: 'Failed to approve content' },
      { status: 500 }
    );
  }
}
