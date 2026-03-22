/**
 * POST /api/v1/admin/billboards/content/[id]/reject
 *
 * Admin: Reject content from billboard display
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

    // Parse body for rejection reason
    const body = await request.json();
    const { reason } = body;

    if (!reason) {
      return NextResponse.json(
        { error: 'Rejection reason is required' },
        { status: 400 }
      );
    }

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

    // Can reject content in validation or moderation state
    const allowedStatuses = ['pending_validation', 'pending_moderation'];
    if (!allowedStatuses.includes(content.status)) {
      return NextResponse.json(
        { error: `Content cannot be rejected (status: ${content.status})` },
        { status: 400 }
      );
    }

    // Update status to rejected
    await prisma.billboardContent.update({
      where: { id },
      data: {
        status: 'rejected',
        rejectionReason: reason,
        moderationResult: {
          ...((content.moderationResult as Record<string, unknown>) || {}),
          manuallyRejected: true,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
        },
      },
    });

    // Notify WhatsApp user if applicable
    if (content.whatsappPhone) {
      try {
        await onModerationComplete(id, false, false, reason);
      } catch (error) {
        console.error('[ADMIN] Failed to notify WhatsApp:', error);
      }
    }

    return NextResponse.json({
      success: true,
      newStatus: 'rejected',
      reason,
    });
  } catch (error) {
    console.error('[ADMIN] POST /content/[id]/reject error:', error);
    return NextResponse.json(
      { error: 'Failed to reject content' },
      { status: 500 }
    );
  }
}
