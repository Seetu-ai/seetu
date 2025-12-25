import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface UnifiedGeneration {
  id: string;
  type: 'studio' | 'shoot';
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string | null;
  productName?: string | null;
  brandName?: string | null;
  presentation?: string | null;
  sceneType?: string | null;
  creditsCost: number;
  createdAt: Date;
  sourceId: string;
  sourceType: 'studio_session' | 'generation_job';
}

/**
 * Composite cursor format: "ISO_DATE|SOURCE_TYPE|SOURCE_ID"
 * This ensures deterministic pagination even with identical timestamps.
 */
interface CursorInfo {
  createdAt: Date;
  sourceType: 'studio_session' | 'generation_job';
  sourceId: string;
}

function parseCursor(cursor: string | null): CursorInfo | null {
  if (!cursor) return null;
  const parts = cursor.split('|');
  if (parts.length !== 3) return null;
  const [dateStr, sourceType, sourceId] = parts;
  return {
    createdAt: new Date(dateStr),
    sourceType: sourceType as 'studio_session' | 'generation_job',
    sourceId: sourceId,
  };
}

function createCursor(gen: UnifiedGeneration): string {
  return `${gen.createdAt.toISOString()}|${gen.sourceType}|${gen.sourceId}`;
}

/**
 * Compare two generations for sort order (descending by createdAt, then by type, then by id)
 * Returns negative if a comes before b (a is "newer"), positive if b comes before a
 */
function compareGenerations(a: UnifiedGeneration, b: UnifiedGeneration): number {
  const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
  if (timeDiff !== 0) return timeDiff;

  // Same timestamp: use sourceType as tiebreaker (studio < shoot alphabetically)
  const typeDiff = a.sourceType.localeCompare(b.sourceType);
  if (typeDiff !== 0) return typeDiff;

  // Same type: use sourceId as final tiebreaker
  return a.sourceId.localeCompare(b.sourceId);
}

/**
 * Check if a generation should be included (comes after the cursor in our descending sort order)
 * In descending order, "after" means older timestamp or same timestamp with later tiebreaker
 */
function isAfterCursor(gen: UnifiedGeneration, cursor: CursorInfo): boolean {
  const timeDiff = cursor.createdAt.getTime() - gen.createdAt.getTime();
  if (timeDiff > 0) return true; // gen is older than cursor - include
  if (timeDiff < 0) return false; // gen is newer than cursor - exclude

  // Same timestamp: check sourceType (alphabetically later = after in sort)
  const typeDiff = gen.sourceType.localeCompare(cursor.sourceType);
  if (typeDiff > 0) return true; // gen's type comes after cursor's type
  if (typeDiff < 0) return false;

  // Same type: check sourceId (alphabetically later = after in sort)
  return gen.sourceId.localeCompare(cursor.sourceId) > 0;
}

/**
 * GET /api/v1/generations - Unified gallery of all user generations
 *
 * Query params:
 * - limit: number (default 20, max 100)
 * - cursor: composite cursor "ISO_DATE|SOURCE_TYPE|SOURCE_ID" (optional)
 * - type: 'studio' | 'shoot' | 'all' (default 'all')
 * - brandId: filter by brand
 *
 * Uses composite cursor pagination to avoid skipping items with identical timestamps.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const cursorParam = searchParams.get('cursor');
    const typeFilter = searchParams.get('type') || 'all';
    const brandId = searchParams.get('brandId');

    // Parse composite cursor
    const cursorInfo = parseCursor(cursorParam);

    let generations: UnifiedGeneration[] = [];

    // Build brand filter condition
    const brandFilter = brandId
      ? { product: { brandId } }
      : {};

    // When merging sources, fetch extra to ensure we have enough after filtering
    // We fetch 2x limit per source to handle worst-case interleaving
    const fetchLimit = typeFilter === 'all' ? limit * 2 : limit + 1;

    // Fetch from studio_sessions with database-level pagination
    if (typeFilter === 'all' || typeFilter === 'studio') {
      // For cursor filtering: fetch items at or before cursor timestamp
      // We'll do precise filtering in memory for same-timestamp items
      const studioSessions = await prisma.studioSession.findMany({
        where: {
          userId: user.id,
          generatedUrls: { isEmpty: false },
          ...brandFilter,
          ...(cursorInfo && { createdAt: { lte: cursorInfo.createdAt } }),
        },
        include: {
          product: {
            include: {
              brand: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        take: fetchLimit,
      });

      for (const session of studioSessions) {
        const url = session.generatedUrls[0];
        if (url) {
          const gen: UnifiedGeneration = {
            id: `studio-${session.id}`,
            type: 'studio',
            imageUrl: url,
            thumbnailUrl: url,
            caption: null,
            productName: session.product?.name || null,
            brandName: session.product?.brand?.name || null,
            presentation: session.presentation || null,
            sceneType: session.sceneType || null,
            creditsCost: session.creditsCost,
            createdAt: session.createdAt,
            sourceId: session.id,
            sourceType: 'studio_session',
          };
          // Apply precise cursor filtering for same-timestamp items
          if (!cursorInfo || isAfterCursor(gen, cursorInfo)) {
            generations.push(gen);
          }
        }
      }
    }

    // Fetch from shoots/generation_jobs with database-level pagination
    if (typeFilter === 'all' || typeFilter === 'shoot') {
      const generationJobs = await prisma.generationJob.findMany({
        where: {
          shoot: {
            userId: user.id,
          },
          status: 'completed',
          outputUrl: { not: null },
          ...brandFilter,
          ...(cursorInfo && { completedAt: { lte: cursorInfo.createdAt } }),
        },
        include: {
          shoot: true,
          product: {
            include: {
              brand: true,
            },
          },
          template: true,
        },
        orderBy: [{ completedAt: 'desc' }, { id: 'asc' }],
        take: fetchLimit,
      });

      for (const job of generationJobs) {
        const gen: UnifiedGeneration = {
          id: `shoot-${job.id}`,
          type: 'shoot',
          imageUrl: job.outputUrl!,
          thumbnailUrl: job.outputUrl!,
          caption: job.outputText || null,
          productName: job.product?.name || null,
          brandName: job.product?.brand?.name || null,
          presentation: null,
          sceneType: job.template?.name || null,
          creditsCost: job.creditsCost,
          createdAt: job.completedAt || job.queuedAt,
          sourceId: job.id,
          sourceType: 'generation_job',
        };
        // Apply precise cursor filtering for same-timestamp items
        if (!cursorInfo || isAfterCursor(gen, cursorInfo)) {
          generations.push(gen);
        }
      }
    }

    // Sort merged results using deterministic comparison
    generations.sort(compareGenerations);

    // Apply limit and determine hasMore
    const hasMore = generations.length > limit;
    generations = generations.slice(0, limit);

    // Next cursor is composite cursor of the last item
    const nextCursor = generations.length > 0
      ? createCursor(generations[generations.length - 1])
      : null;

    // Get total counts for display (cached query, fast with indexes)
    const [studioCount, shootCount] = await Promise.all([
      typeFilter === 'shoot' ? Promise.resolve(0) : prisma.studioSession.count({
        where: {
          userId: user.id,
          generatedUrls: { isEmpty: false },
          ...brandFilter,
        },
      }),
      typeFilter === 'studio' ? Promise.resolve(0) : prisma.generationJob.count({
        where: {
          shoot: { userId: user.id },
          status: 'completed',
          outputUrl: { not: null },
          ...brandFilter,
        },
      }),
    ]);

    return NextResponse.json({
      generations,
      pagination: {
        limit,
        hasMore,
        nextCursor,
        total: studioCount + shootCount,
      },
    });
  } catch (error) {
    console.error('Error fetching generations:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
