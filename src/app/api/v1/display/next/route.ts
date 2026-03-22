/**
 * GET /api/v1/display/next
 *
 * Preview next content in queue (for preloading)
 *
 * Authentication: X-Billboard-Key header
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getNextContent, getCurrentlyPlaying } from '@/lib/billboard/queue-manager';

export async function GET(request: NextRequest) {
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
        slotDurationSecs: true,
      },
    });

    if (!billboard) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Check if something is currently playing
    const current = await getCurrentlyPlaying(billboard.id);

    // Get next content
    const next = await getNextContent(billboard.id);

    if (!next) {
      return NextResponse.json({
        billboardId: billboard.id,
        billboardName: billboard.name,
        next: null,
        message: 'No content queued',
      });
    }

    // If there's a current playing item, the next is different
    if (current && current.id === next.id) {
      // The "next" is actually the same as current, need to look further
      const queueItems = await prisma.billboardQueue.findMany({
        where: {
          billboardId: billboard.id,
          status: 'queued',
          id: { not: current.id },
        },
        include: {
          content: {
            select: {
              id: true,
              mediaType: true,
              processedUrls: true,
              durationSeconds: true,
            },
          },
        },
        orderBy: { position: 'asc' },
        take: 1,
      });

      if (queueItems.length === 0) {
        return NextResponse.json({
          billboardId: billboard.id,
          billboardName: billboard.name,
          next: null,
          message: 'No more content queued after current',
        });
      }

      const nextItem = queueItems[0];
      const processedUrls = nextItem.content.processedUrls as Record<string, string>;

      return NextResponse.json({
        billboardId: billboard.id,
        billboardName: billboard.name,
        next: {
          queueId: nextItem.id,
          contentId: nextItem.contentId,
          mediaUrl: processedUrls?.mp4 || processedUrls?.video || processedUrls?.url || processedUrls?.original,
          mediaType: nextItem.content.mediaType,
          durationSeconds: nextItem.content.durationSeconds || billboard.slotDurationSecs,
          position: nextItem.position,
        },
      });
    }

    const processedUrls = next.content.processedUrls as Record<string, string>;

    return NextResponse.json({
      billboardId: billboard.id,
      billboardName: billboard.name,
      next: {
        queueId: next.id,
        contentId: next.contentId,
        mediaUrl: processedUrls?.mp4 || processedUrls?.video || processedUrls?.url || processedUrls?.original,
        mediaType: next.content.mediaType,
        durationSeconds: next.content.durationSeconds || billboard.slotDurationSecs,
        position: next.position,
        scheduledFor: next.scheduledFor,
      },
    });
  } catch (error) {
    console.error('[API] GET /display/next error:', error);
    return NextResponse.json(
      { error: 'Failed to get next content' },
      { status: 500 }
    );
  }
}
