import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET /api/v1/products/[productId] - Get a single product
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;

    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        brand: { userId: user.id },
      },
      include: { brand: true },
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/products/[productId] - Update a product
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;
    const body = await req.json();
    const { name, category, metadata } = body;

    // Check product exists and belongs to user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        brand: { userId: user.id },
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;

    if (category !== undefined || metadata !== undefined) {
      const existingMetadata = (existingProduct.metadata as object) || {};
      updateData.metadata = {
        ...existingMetadata,
        ...(metadata || {}),
        ...(category !== undefined ? { category } : {}),
      };
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/products/[productId] - Delete a product
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { productId } = await params;

    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        brand: { userId: user.id },
      },
    });

    if (!existingProduct) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
