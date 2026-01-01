import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export type WorkspaceRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface WorkspaceContext {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  role: WorkspaceRole;
}

type ErrorResponse = NextResponse<{ error: string }>;

const ROLE_HIERARCHY: Record<WorkspaceRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};

export function isErrorResponse(
  response: WorkspaceContext | ErrorResponse
): response is ErrorResponse {
  return response instanceof NextResponse;
}

export async function getWorkspaceContext(
  req: NextRequest,
  slug: string,
  requiredRole: WorkspaceRole = 'viewer'
): Promise<WorkspaceContext | ErrorResponse> {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // For now, treat the user's default brand as their "workspace"
  const brand = await prisma.brand.findFirst({
    where: {
      userId: user.id,
      id: slug,
    },
  });

  if (!brand) {
    return NextResponse.json(
      { error: 'Workspace not found' },
      { status: 404 }
    );
  }

  // User owns their brands, so they're always owners
  const userRole: WorkspaceRole = 'owner';

  if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole]) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    workspace: {
      id: brand.id,
      name: brand.name,
      slug: brand.id,
    },
    role: userRole,
  };
}
