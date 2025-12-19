import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/shoots - List shoots for current user
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shoots = await prisma.shoot.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        templatePack: {
          select: { name: true },
        },
        jobs: {
          select: {
            id: true,
            outputUrl: true,
            status: true,
          },
          take: 4,
          orderBy: { queuedAt: 'desc' },
        },
        _count: {
          select: { jobs: true },
        },
      },
    });

    return NextResponse.json({ shoots });
  } catch (error) {
    console.error('Error fetching shoots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch shoots' },
      { status: 500 }
    );
  }
}
