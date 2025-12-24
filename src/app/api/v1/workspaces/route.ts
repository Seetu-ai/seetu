import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

// Validation schema
const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  businessType: z.enum(['fashion', 'food', 'beauty', 'realestate', 'other']),
});

// Generate a unique slug from name
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const random = Math.random().toString(36).substring(2, 6);
  return `${base}-${random}`;
}

export async function GET(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from our database
    const user = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all workspaces the user is a member of
    const memberships = await prisma.workspaceMember.findMany({
      where: {
        userId: user.id,
        status: 'active',
      },
      include: {
        workspace: true,
      },
    });

    const workspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
      credits: Math.floor(m.workspace.creditUnits / 100),
    }));

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user from our database
    let user = await prisma.user.findUnique({
      where: { authId: authUser.id },
    });

    // Create user if doesn't exist
    if (!user) {
      user = await prisma.user.create({
        data: {
          authId: authUser.id,
          email: authUser.email!,
          name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
          avatarUrl: authUser.user_metadata?.avatar_url,
        },
      });
    }

    // Parse and validate request body
    const body = await req.json();
    const validation = createWorkspaceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { name, businessType } = validation.data;

    // Generate unique slug
    let slug = generateSlug(name);
    let slugExists = await prisma.workspace.findUnique({ where: { slug } });
    while (slugExists) {
      slug = generateSlug(name);
      slugExists = await prisma.workspace.findUnique({ where: { slug } });
    }

    // Create workspace with owner membership in a transaction
    const workspace = await prisma.$transaction(async (tx) => {
      // Create workspace
      const newWorkspace = await tx.workspace.create({
        data: {
          name,
          slug,
          businessType,
          creditUnits: 300, // 3 free credits
        },
      });

      // Create owner membership
      await tx.workspaceMember.create({
        data: {
          workspaceId: newWorkspace.id,
          userId: user!.id,
          role: 'owner',
          status: 'active',
          acceptedAt: new Date(),
        },
      });

      // Create initial credit ledger entry
      await tx.creditLedger.create({
        data: {
          workspaceId: newWorkspace.id,
          delta: 300,
          balanceAfter: 300,
          reason: 'free_trial',
          description: 'Crédits de bienvenue',
        },
      });

      return newWorkspace;
    });

    return NextResponse.json({
      workspace: {
        ...workspace,
        credits: Math.floor(workspace.creditUnits / 100),
      },
    });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
