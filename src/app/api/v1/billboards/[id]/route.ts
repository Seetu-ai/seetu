/**
 * GET /api/v1/billboards/[id]
 *
 * Get billboard details with queue information
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getQueueEstimate } from '@/lib/billboard/pricing';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const billboard = await prisma.billboard.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
        latitude: true,
        longitude: true,
        resolutionWidth: true,
        resolutionHeight: true,
        supportedFormats: true,
        pricePerSlot: true,
        slotDurationSecs: true,
        status: true,
        lastHeartbeat: true,
        previewImageUrl: true,
        defaultContentUrl: true,
        isActive: true,
        createdAt: true,
        queueItems: {
          where: { status: { in: ['queued', 'playing'] } },
          select: {
            id: true,
            position: true,
            status: true,
            scheduledFor: true,
            content: {
              select: {
                id: true,
                mediaType: true,
                durationSeconds: true,
              },
            },
          },
          orderBy: [
            { status: 'desc' }, // playing first
            { position: 'asc' },
          ],
          take: 20,
        },
      },
    });

    if (!billboard) {
      return NextResponse.json(
        { error: 'Billboard not found' },
        { status: 404 }
      );
    }

    // Get queue estimate
    const queueEstimate = await getQueueEstimate(id);

    const response = {
      id: billboard.id,
      name: billboard.name,
      slug: billboard.slug,
      address: billboard.address,
      location: {
        lat: billboard.latitude,
        lng: billboard.longitude,
      },
      resolution: {
        width: billboard.resolutionWidth,
        height: billboard.resolutionHeight,
      },
      supportedFormats: billboard.supportedFormats,
      pricing: {
        pricePerSlot: billboard.pricePerSlot,
        slotDurationSecs: billboard.slotDurationSecs,
        slotDurationMins: Math.round(billboard.slotDurationSecs / 60),
      },
      status: billboard.status,
      lastHeartbeat: billboard.lastHeartbeat,
      previewImageUrl: billboard.previewImageUrl,
      defaultContentUrl: billboard.defaultContentUrl,
      isActive: billboard.isActive,
      createdAt: billboard.createdAt,
      queue: {
        length: queueEstimate?.queueLength || 0,
        estimatedWaitMinutes: queueEstimate?.estimatedWaitMinutes || 0,
        items: billboard.queueItems.map((item) => ({
          id: item.id,
          position: item.position,
          status: item.status,
          scheduledFor: item.scheduledFor,
          contentId: item.content.id,
          mediaType: item.content.mediaType,
          durationSeconds: item.content.durationSeconds,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] GET /billboards/[id] error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billboard' },
      { status: 500 }
    );
  }
}
