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

// GET - List all template packs with templates
export async function GET(req: NextRequest) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const packs = await prisma.templatePack.findMany({
    include: {
      templates: {
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ packs });
}

// POST - Create a new template
export async function POST(req: NextRequest) {
  const user = await checkSuperAdmin();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      packId,
      slug,
      name,
      type,
      prompt,
      negativePrompt,
      defaultParams,
      isActive,
      sortOrder,
    } = body;

    const template = await prisma.template.create({
      data: {
        packId,
        slug,
        name,
        type,
        prompt,
        negativePrompt,
        defaultParams: defaultParams || {},
        isActive: isActive ?? true,
        sortOrder: sortOrder || 0,
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// PUT - Update a template
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
      type,
      prompt,
      negativePrompt,
      defaultParams,
      isActive,
      sortOrder,
    } = body;

    const template = await prisma.template.update({
      where: { id },
      data: {
        slug,
        name,
        type,
        prompt,
        negativePrompt,
        defaultParams: defaultParams || {},
        isActive,
        sortOrder,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
