import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/print/chat/sessions/[id] - Get session with messages
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session with messages
    const { data: session, error } = await supabase
      .from('chat_sessions')
      .select('*, chat_messages(*)')
      .eq('id', id)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (session.client_id !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Sort messages by created_at
    const messages = (session.chat_messages || []).sort(
      (a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return NextResponse.json({
      ...session,
      messages,
      chat_messages: undefined,
    });
  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
