import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getDefaultBrand } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { z } from 'zod';
import { generateKey, getUploadUrl, uploadFromUrl } from '@/lib/r2';
import type { Prisma } from '@prisma/client';

const createProductSchema = z.object({
  name: z.string().optional(),
  brandId: z.string().optional(), // If not provided, uses default brand
  imageUrl: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

/**
 * GET /api/v1/products - List products for a brand
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const search = searchParams.get('search') || '';

    // If no brandId, get default brand
    let targetBrandId = brandId;
    if (!targetBrandId) {
      const defaultBrand = await getDefaultBrand(user.id);
      if (!defaultBrand) {
        return NextResponse.json({ products: [], pagination: { page, pageSize, total: 0, totalPages: 0 } });
      }
      targetBrandId = defaultBrand.id;
    }

    // Verify brand belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: targetBrandId, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    const where = {
      brandId: brand.id,
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
      brandId: brand.id,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/v1/products - Create a new product
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, brandId, imageUrl, metadata } = validation.data;

    // Get brand (provided or default)
    let targetBrandId = brandId;
    if (!targetBrandId) {
      const defaultBrand = await getDefaultBrand(user.id);
      if (!defaultBrand) {
        return NextResponse.json(
          { error: 'No brand found. Please create a brand first.' },
          { status: 400 }
        );
      }
      targetBrandId = defaultBrand.id;
    }

    // Verify brand belongs to user
    const brand = await prisma.brand.findFirst({
      where: { id: targetBrandId, userId: user.id },
    });

    if (!brand) {
      return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    }

    // Handle image URL
    let originalUrl = imageUrl || '';
    let thumbnailUrl = imageUrl || '';

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

    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        name,
        originalUrl,
        thumbnailUrl,
        metadata: (metadata || {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/v1/products - Get presigned upload URL
 */
export async function PUT(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
