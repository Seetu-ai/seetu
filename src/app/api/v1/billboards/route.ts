/**
 * GET /api/v1/billboards
 *
 * List all active billboards with their pricing and availability
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeOffline = searchParams.get('include_offline') === 'true';

    const billboards = await prisma.billboard.findMany({
      where: {
        isActive: true,
        ...(includeOffline ? {} : { status: { not: 'maintenance' } }),
      },
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
        previewImageUrl: true,
        _count: {
          select: {
            queueItems: {
              where: { status: 'queued' },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Transform response
    const response = billboards.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      address: b.address,
      location: {
        lat: b.latitude,
        lng: b.longitude,
      },
      resolution: {
        width: b.resolutionWidth,
        height: b.resolutionHeight,
      },
      supportedFormats: b.supportedFormats,
      pricing: {
        pricePerSlot: b.pricePerSlot,
        slotDurationSecs: b.slotDurationSecs,
        slotDurationMins: Math.round(b.slotDurationSecs / 60),
      },
      status: b.status,
      previewImageUrl: b.previewImageUrl,
      queueLength: b._count.queueItems,
      isAvailable: b.status === 'online',
    }));

    return NextResponse.json({
      billboards: response,
      count: response.length,
    });
  } catch (error) {
    console.error('[API] GET /billboards error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billboards' },
      { status: 500 }
    );
  }
}
