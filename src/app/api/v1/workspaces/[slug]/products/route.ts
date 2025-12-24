import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { generateKey, getUploadUrl, uploadFromUrl } from '@/lib/r2';

import type { Prisma } from '@prisma/client';

const createProductSchema = z.object({
  name: z.string().optional(),
  imageUrl: z.string().optional(), // Can be URL or local path
  metadata: z.record(z.string(), z.any()).optional(),
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

  const { workspace } = context;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const search = searchParams.get('search') || '';

  const where = {
    workspaceId: workspace.id,
    ...(search && {
      name: {
        contains: search,
        mode: 'insensitive' as const,
      },
    }),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    products,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'member');

  if (isErrorResponse(context)) {
    return context;
  }

  const { workspace } = context;

  try {
    const body = await req.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, imageUrl, metadata } = validation.data;

    // Handle image URL - either local path or external URL
    let originalUrl = imageUrl || '';
    let thumbnailUrl = imageUrl || '';

    // If it's an external URL and R2 is configured, copy to storage
    if (imageUrl && imageUrl.startsWith('http')) {
      const isR2Configured =
        process.env.R2_ENDPOINT &&
        process.env.R2_ACCESS_KEY &&
        !process.env.R2_ENDPOINT.includes('example');

      if (isR2Configured) {
        const key = generateKey('products', 'product.jpg');
        originalUrl = await uploadFromUrl(key, imageUrl);
        thumbnailUrl = originalUrl;
      }
    }
    // Local paths (like /uploads/...) are used as-is

    const product = await prisma.product.create({
      data: {
        workspaceId: workspace.id,
        name,
        originalUrl,
        thumbnailUrl,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get presigned upload URL
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const context = await getWorkspaceContext(req, slug, 'member');

  if (isErrorResponse(context)) {
    return context;
  }

  try {
    const body = await req.json();
    const { filename, contentType } = body;

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: 'filename and contentType are required' },
        { status: 400 }
      );
    }

    const key = generateKey('products', filename);
    const uploadUrl = await getUploadUrl(key, contentType);

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl: `${process.env.R2_PUBLIC_URL}/${key}`,
    });
  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
