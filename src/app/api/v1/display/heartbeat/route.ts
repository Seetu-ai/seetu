/**
 * POST /api/v1/display/heartbeat
 *
 * Billboard player health check / status update
 * Updates lastHeartbeat and can change status
 *
 * Authentication: X-Billboard-Key header
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { BillboardStatus } from '@prisma/client';

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
        status: true,
      },
    });

    if (!billboard) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 401 }
      );
    }

    // Parse optional body
    let newStatus: BillboardStatus | undefined;
    try {
      const body = await request.json();
      if (body.status && ['online', 'offline', 'maintenance'].includes(body.status)) {
        newStatus = body.status as BillboardStatus;
      }
    } catch {
      // No body or invalid JSON is fine
    }

    // Update heartbeat
    const updated = await prisma.billboard.update({
      where: { id: billboard.id },
      data: {
        lastHeartbeat: new Date(),
        ...(newStatus ? { status: newStatus } : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        lastHeartbeat: true,
      },
    });

    // Get queue stats
    const queueStats = await prisma.billboardQueue.groupBy({
      by: ['status'],
      where: { billboardId: billboard.id },
      _count: true,
    });

    const stats = {
      queued: 0,
      playing: 0,
      completed: 0,
    };

    for (const stat of queueStats) {
      if (stat.status === 'queued') stats.queued = stat._count;
      if (stat.status === 'playing') stats.playing = stat._count;
      if (stat.status === 'completed') stats.completed = stat._count;
    }

    return NextResponse.json({
      billboardId: updated.id,
      billboardName: updated.name,
      status: updated.status,
      lastHeartbeat: updated.lastHeartbeat,
      queue: stats,
      serverTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] POST /display/heartbeat error:', error);
    return NextResponse.json(
      { error: 'Failed to update heartbeat' },
      { status: 500 }
    );
  }
}
