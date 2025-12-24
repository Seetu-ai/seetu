import { NextRequest, NextResponse } from 'next/server';
import { getWorkspaceContext, isErrorResponse } from '@/lib/workspace/middleware';
import { getCreditHistory } from '@/lib/credits';

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
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  try {
    const history = await getCreditHistory(workspace.id, { limit, offset });
    return NextResponse.json(history);
  } catch (error) {
    console.error('Error fetching credit history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
