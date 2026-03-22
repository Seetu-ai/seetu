/**
 * Billboard Queue Manager
 *
 * Manages content queues for each billboard:
 * - Add content to queue
 * - Get next content to play
 * - Track playback status
 * - Handle position calculations
 */

import { prisma } from '../prisma';
import { QueueStatus, ContentStatus } from '@prisma/client';

export interface QueueEntry {
  id: string;
  contentId: string;
  billboardId: string;
  position: number;
  status: QueueStatus;
  scheduledFor: Date | null;
  content: {
    id: string;
    mediaType: string;
    processedUrls: Record<string, string>;
    durationSeconds: number | null;
  };
}

export interface QueuePosition {
  billboardId: string;
  billboardName: string;
  position: number;
  estimatedPlayTime: Date | null;
  status: QueueStatus;
}

/**
 * Add content to billboard queue(s)
 */
export async function addToQueue(
  contentId: string,
  billboardIds: string[],
  scheduledFor?: Date
): Promise<QueuePosition[]> {
  const positions: QueuePosition[] = [];

  for (const billboardId of billboardIds) {
    // Get billboard info
    const billboard = await prisma.billboard.findUnique({
      where: { id: billboardId },
      select: {
        name: true,
        slotDurationSecs: true,
      },
    });

    if (!billboard) continue;

    // Use serializable transaction to prevent duplicate positions
    const result = await prisma.$transaction(async (tx) => {
      const maxPosition = await tx.billboardQueue.aggregate({
        where: { billboardId },
        _max: { position: true },
      });

      const nextPosition = (maxPosition._max.position || 0) + 1;

      const queueItem = await tx.billboardQueue.create({
        data: {
          contentId,
          billboardId,
          position: nextPosition,
          status: 'queued',
          scheduledFor: scheduledFor || null,
        },
      });

      return { queueItem, nextPosition };
    }, { isolationLevel: 'Serializable' });

    // Calculate estimated play time
    const estimatedPlayTime = calculateEstimatedPlayTime(
      result.nextPosition,
      billboard.slotDurationSecs
    );

    positions.push({
      billboardId,
      billboardName: billboard.name,
      position: result.nextPosition,
      estimatedPlayTime,
      status: 'queued',
    });
  }

  return positions;
}

/**
 * Get queue positions for a piece of content
 */
export async function getContentQueuePositions(
  contentId: string
): Promise<QueuePosition[]> {
  const queueItems = await prisma.billboardQueue.findMany({
    where: { contentId },
    include: {
      billboard: {
        select: {
          name: true,
          slotDurationSecs: true,
        },
      },
    },
  });

  return queueItems.map(item => ({
    billboardId: item.billboardId,
    billboardName: item.billboard.name,
    position: item.position,
    estimatedPlayTime: calculateEstimatedPlayTime(
      item.position,
      item.billboard.slotDurationSecs
    ),
    status: item.status,
  }));
}

/**
 * Get next content to play for a billboard
 */
export async function getNextContent(
  billboardId: string
): Promise<QueueEntry | null> {
  const now = new Date();

  // First, check for scheduled content that's due
  const scheduledItem = await prisma.billboardQueue.findFirst({
    where: {
      billboardId,
      status: 'queued',
      scheduledFor: {
        lte: now,
      },
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
    orderBy: {
      scheduledFor: 'asc',
    },
  });

  if (scheduledItem) {
    return {
      id: scheduledItem.id,
      contentId: scheduledItem.contentId,
      billboardId: scheduledItem.billboardId,
      position: scheduledItem.position,
      status: scheduledItem.status,
      scheduledFor: scheduledItem.scheduledFor,
      content: {
        id: scheduledItem.content.id,
        mediaType: scheduledItem.content.mediaType,
        processedUrls: scheduledItem.content.processedUrls as Record<string, string>,
        durationSeconds: scheduledItem.content.durationSeconds,
      },
    };
  }

  // Otherwise, get next in queue by position
  const nextItem = await prisma.billboardQueue.findFirst({
    where: {
      billboardId,
      status: 'queued',
      scheduledFor: null, // Not scheduled
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
    orderBy: {
      position: 'asc',
    },
  });

  if (!nextItem) return null;

  return {
    id: nextItem.id,
    contentId: nextItem.contentId,
    billboardId: nextItem.billboardId,
    position: nextItem.position,
    status: nextItem.status,
    scheduledFor: nextItem.scheduledFor,
    content: {
      id: nextItem.content.id,
      mediaType: nextItem.content.mediaType,
      processedUrls: nextItem.content.processedUrls as Record<string, string>,
      durationSeconds: nextItem.content.durationSeconds,
    },
  };
}

/**
 * Get currently playing content for a billboard
 */
export async function getCurrentlyPlaying(
  billboardId: string
): Promise<QueueEntry | null> {
  const currentItem = await prisma.billboardQueue.findFirst({
    where: {
      billboardId,
      status: 'playing',
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
  });

  if (!currentItem) return null;

  return {
    id: currentItem.id,
    contentId: currentItem.contentId,
    billboardId: currentItem.billboardId,
    position: currentItem.position,
    status: currentItem.status,
    scheduledFor: currentItem.scheduledFor,
    content: {
      id: currentItem.content.id,
      mediaType: currentItem.content.mediaType,
      processedUrls: currentItem.content.processedUrls as Record<string, string>,
      durationSeconds: currentItem.content.durationSeconds,
    },
  };
}

/**
 * Mark content as playing
 */
export async function markAsPlaying(queueId: string): Promise<void> {
  await prisma.billboardQueue.update({
    where: { id: queueId },
    data: {
      status: 'playing',
      startedAt: new Date(),
    },
  });
}

/**
 * Mark content as completed
 */
export async function markAsCompleted(
  queueId: string,
  proofUrl?: string
): Promise<void> {
  await prisma.billboardQueue.update({
    where: { id: queueId },
    data: {
      status: 'completed',
      endedAt: new Date(),
      proofUrl,
    },
  });
}

/**
 * Skip content in queue
 */
export async function skipContent(queueId: string): Promise<void> {
  await prisma.billboardQueue.update({
    where: { id: queueId },
    data: {
      status: 'skipped',
      endedAt: new Date(),
    },
  });
}

/**
 * Remove content from all queues
 */
export async function removeFromAllQueues(contentId: string): Promise<number> {
  const result = await prisma.billboardQueue.deleteMany({
    where: {
      contentId,
      status: 'queued', // Only remove if not yet played
    },
  });

  return result.count;
}

/**
 * Get queue length for a billboard
 */
export async function getQueueLength(billboardId: string): Promise<number> {
  return prisma.billboardQueue.count({
    where: {
      billboardId,
      status: 'queued',
    },
  });
}

/**
 * Get full queue for a billboard
 */
export async function getBillboardQueue(
  billboardId: string,
  limit: number = 50
): Promise<QueueEntry[]> {
  const items = await prisma.billboardQueue.findMany({
    where: {
      billboardId,
      status: { in: ['queued', 'playing'] },
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
    orderBy: [
      { status: 'desc' }, // 'playing' first
      { position: 'asc' },
    ],
    take: limit,
  });

  return items.map(item => ({
    id: item.id,
    contentId: item.contentId,
    billboardId: item.billboardId,
    position: item.position,
    status: item.status,
    scheduledFor: item.scheduledFor,
    content: {
      id: item.content.id,
      mediaType: item.content.mediaType,
      processedUrls: item.content.processedUrls as Record<string, string>,
      durationSeconds: item.content.durationSeconds,
    },
  }));
}

/**
 * Reorder queue (admin function)
 */
export async function reorderQueue(
  billboardId: string,
  queueIds: string[]
): Promise<void> {
  // Update positions in transaction
  await prisma.$transaction(
    queueIds.map((queueId, index) =>
      prisma.billboardQueue.update({
        where: { id: queueId },
        data: { position: index + 1 },
      })
    )
  );
}

/**
 * Get estimated wait time for a new item added to a billboard's queue
 */
export async function getEstimatedWaitTime(
  billboardId: string
): Promise<{ queueLength: number; estimatedPlayTime: Date }> {
  const billboard = await prisma.billboard.findUnique({
    where: { id: billboardId },
    select: { slotDurationSecs: true },
  });
  const queueLength = await prisma.billboardQueue.count({
    where: { billboardId, status: { in: ['queued', 'playing'] } },
  });
  const nextPosition = queueLength + 1;
  const estimatedPlayTime = calculateEstimatedPlayTime(
    nextPosition,
    billboard?.slotDurationSecs || 300
  );
  return { queueLength, estimatedPlayTime };
}

/**
 * Calculate estimated play time based on position
 */
function calculateEstimatedPlayTime(
  position: number,
  slotDurationSecs: number
): Date {
  const now = new Date();
  const waitSeconds = (position - 1) * slotDurationSecs;
  return new Date(now.getTime() + waitSeconds * 1000);
}

/**
 * Clean up completed items older than specified days
 */
export async function cleanupOldQueueItems(daysOld: number = 7): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - daysOld);

  const result = await prisma.billboardQueue.deleteMany({
    where: {
      status: { in: ['completed', 'skipped'] },
      endedAt: {
        lt: cutoff,
      },
    },
  });

  return result.count;
}

/**
 * Get playback statistics for a billboard
 */
export async function getBillboardStats(billboardId: string): Promise<{
  totalPlayed: number;
  totalQueued: number;
  averageWaitMinutes: number;
}> {
  const [played, queued] = await Promise.all([
    prisma.billboardQueue.count({
      where: {
        billboardId,
        status: 'completed',
      },
    }),
    prisma.billboardQueue.count({
      where: {
        billboardId,
        status: 'queued',
      },
    }),
  ]);

  // Calculate average wait time from recent completions
  const recentCompletions = await prisma.billboardQueue.findMany({
    where: {
      billboardId,
      status: 'completed',
      startedAt: { not: null },
    },
    select: {
      createdAt: true,
      startedAt: true,
    },
    orderBy: { endedAt: 'desc' },
    take: 100,
  });

  let averageWaitMinutes = 0;
  if (recentCompletions.length > 0) {
    const totalWaitMs = recentCompletions.reduce((sum, item) => {
      if (item.startedAt) {
        return sum + (item.startedAt.getTime() - item.createdAt.getTime());
      }
      return sum;
    }, 0);
    averageWaitMinutes = Math.round(
      totalWaitMs / recentCompletions.length / 1000 / 60
    );
  }

  return {
    totalPlayed: played,
    totalQueued: queued,
    averageWaitMinutes,
  };
}
