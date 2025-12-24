import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logoUrl: z.string().url().nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  settings: z.record(z.string(), z.any()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'viewer');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace, membership } = context;

  return NextResponse.json({
    workspace: {
      ...workspace,
      credits: Math.floor(workspace.creditUnits / 100),
      role: membership.role,
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'admin');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  try {
    const body = await req.json();
    const validation = updateWorkspaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, logoUrl, primaryColor, secondaryColor, settings } = validation.data;

    const updateData: Prisma.WorkspaceUpdateInput = {};
    if (name) updateData.name = name;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
    if (primaryColor) updateData.primaryColor = primaryColor;
    if (secondaryColor) updateData.secondaryColor = secondaryColor;
    if (settings) updateData.settings = settings as Prisma.InputJsonValue;

    const updated = await prisma.workspace.update({
      where: { id: workspace.id },
      data: updateData,
    });

    return NextResponse.json({
      workspace: {
        ...updated,
        credits: Math.floor(updated.creditUnits / 100),
      },
    });
  } catch (error) {
    console.error('Error updating workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'owner');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  try {
    await prisma.workspace.delete({
      where: { id: workspace.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
