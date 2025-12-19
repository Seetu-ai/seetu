import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';

// Get superadmin emails from env
const SUPERADMIN_EMAILS = (process.env.SUPERADMIN_EMAILS || '')
  .split(',')
  .map(e => e.trim())
  .filter(Boolean);

async function checkSuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !SUPERADMIN_EMAILS.includes(user.email || '')) {
    return null;
  }

  return user;
}

// POST - Create a new template pack
export async function POST(req: NextRequest) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      slug,
      name,
      vertical,
      description,
      isActive,
      isDefault,
    } = body;

    // If this pack is set as default, unset other defaults for same vertical
    if (isDefault) {
      await prisma.templatePack.updateMany({
        where: { vertical, isDefault: true },
        data: { isDefault: false },
      });
    }

    const pack = await prisma.templatePack.create({
      data: {
        slug,
        name,
        vertical,
        description,
        isActive: isActive ?? true,
        isDefault: isDefault ?? false,
        version: '1.0.0',
      },
    });

    return NextResponse.json({ pack }, { status: 201 });
  } catch (error) {
    console.error('Error creating pack:', error);
    return NextResponse.json({ error: 'Failed to create pack' }, { status: 500 });
  }
}

// PUT - Update a template pack
export async function PUT(req: NextRequest) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      id,
      slug,
      name,
      vertical,
      description,
      isActive,
      isDefault,
    } = body;

    // If this pack is set as default, unset other defaults for same vertical
    if (isDefault) {
      await prisma.templatePack.updateMany({
        where: { vertical, isDefault: true, NOT: { id } },
        data: { isDefault: false },
      });
    }

    const pack = await prisma.templatePack.update({
      where: { id },
      data: {
        slug,
        name,
        vertical,
        description,
        isActive,
        isDefault,
      },
    });

    return NextResponse.json({ pack });
  } catch (error) {
    console.error('Error updating pack:', error);
    return NextResponse.json({ error: 'Failed to update pack' }, { status: 500 });
  }
}
