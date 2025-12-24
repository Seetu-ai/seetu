import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const context = await getWorkspaceContext(req, slug, 'viewer');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  const shoot = await prisma.shoot.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
    },
    include: {
      jobs: {
        include: {
          template: {
            select: {
              name: true,
              type: true,
            },
          },
          product: {
            select: {
              name: true,
              thumbnailUrl: true,
            },
          },
        },
        orderBy: { queuedAt: 'desc' },
      },
    },
  });

  if (!shoot) {
    return NextResponse.json(
      { error: 'Shoot not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ shoot });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params;
  const context = await getWorkspaceContext(req, slug, 'admin');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  const shoot = await prisma.shoot.findFirst({
    where: {
      id,
      workspaceId: workspace.id,
    },
  });

  if (!shoot) {
    return NextResponse.json(
      { error: 'Shoot not found' },
      { status: 404 }
    );
  }

  await prisma.shoot.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}
