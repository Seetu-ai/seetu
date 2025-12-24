import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';

// GET - List all shoots for workspace
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'viewer');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  const shoots = await prisma.shoot.findMany({
    where: { workspaceId: workspace.id },
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
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { jobs: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ shoots });
}

// POST - Create a new shoot
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'member');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace, user } = context;

  try {
    const body = await req.json();
    const { name, templatePackId, productIds, isQuickGenerate } = body;

    // Create shoot
    const shoot = await prisma.shoot.create({
      data: {
        workspaceId: workspace.id,
        createdById: user.id,
        templatePackId,
        name: name || 'Nouveau shoot',
        isQuickGenerate: isQuickGenerate ?? false,
        totalJobs: productIds?.length || 1,
        completedJobs: 0,
        status: 'draft',
      },
    });

    return NextResponse.json({ shoot }, { status: 201 });
  } catch (error) {
    console.error('Error creating shoot:', error);
    return NextResponse.json(
      { error: 'Failed to create shoot' },
      { status: 500 }
    );
  }
}
