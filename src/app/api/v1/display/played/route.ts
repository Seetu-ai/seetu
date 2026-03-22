/**
 * POST /api/v1/display/played
 *
 * Mark content as played and optionally upload proof
 * Called by billboard player after content finishes displaying
 *
 * Authentication: X-Billboard-Key header
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { markAsPlaying, markAsCompleted, getNextContent } from '@/lib/billboard/queue-manager';
import { onPlaybackComplete } from '@/lib/billboard/whatsapp/message-handler';

export async function POST(request: NextRequest) {
  try {
    // Authenticate billboard
    const apiKey = request.headers.get('X-Billboard-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing X-Billboard-Key header' },
        { status: 401 }
      );
    }

    // Find billboard by API key
    const billboard = await prisma.billboard.findUnique({
      where: { apiKey },
      select: {
        id: true,
        name: true,
      },
    });

    if (!billboard) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse body
    const body = await request.json();
    const { queueId, action, proofUrl } = body;

    if (!queueId) {
      return NextResponse.json(
        { error: 'queueId is required' },
        { status: 400 }
      );
    }

    // Verify queue item exists and belongs to this billboard
    const queueItem = await prisma.billboardQueue.findUnique({
      where: { id: queueId },
      include: {
        content: {
          select: {
            id: true,
            whatsappPhone: true,
          },
        },
      },
    });

    if (!queueItem) {
      return NextResponse.json(
        { error: 'Queue item not found' },
        { status: 404 }
      );
    }

    if (queueItem.billboardId !== billboard.id) {
      return NextResponse.json(
        { error: 'Queue item does not belong to this billboard' },
        { status: 403 }
      );
    }

    // Handle action
    if (action === 'start') {
      // Mark as playing
      await markAsPlaying(queueId);

      return NextResponse.json({
        queueId,
        status: 'playing',
        message: 'Content marked as playing',
      });
    } else if (action === 'complete' || !action) {
      // Mark as completed
      await markAsCompleted(queueId, proofUrl);

      // Notify WhatsApp user if applicable
      if (queueItem.content.whatsappPhone && proofUrl) {
        try {
          await onPlaybackComplete(
            queueItem.content.id,
            billboard.name,
            proofUrl,
            new Date()
          );
        } catch (error) {
          console.error('[DISPLAY] Failed to notify WhatsApp:', error);
          // Don't fail the request for notification errors
        }
      }

      // Get next content to return
      const next = await getNextContent(billboard.id);

      return NextResponse.json({
        queueId,
        status: 'completed',
        proofUrl: proofUrl || null,
        message: 'Content marked as completed',
        next: next
          ? {
              queueId: next.id,
              contentId: next.contentId,
              mediaUrl: (next.content.processedUrls as Record<string, string>)?.mp4,
            }
          : null,
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "start" or "complete"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] POST /display/played error:', error);
    return NextResponse.json(
      { error: 'Failed to update playback status' },
      { status: 500 }
    );
  }
}
