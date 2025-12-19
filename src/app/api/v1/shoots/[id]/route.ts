import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/shoots/[id] - Get shoot details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const shoot = await prisma.shoot.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        templatePack: {
          select: { name: true },
        },
        jobs: {
          include: {
            template: {
              select: { name: true, type: true },
            },
            product: {
              select: { name: true, thumbnailUrl: true },
            },
          },
          orderBy: { queuedAt: 'asc' },
        },
      },
    });

    if (!shoot) {
      return NextResponse.json({ error: 'Shoot not found' }, { status: 404 });
    }

    return NextResponse.json({ shoot });
  } catch (error) {
    console.error('Error fetching shoot:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shoot' },
      { status: 500 }
    );
  }
}
