import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/v1/print/chat/sessions - Create a new chat session
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));

    // Create session data
    const sessionData: {
      client_id: string;
      status: string;
      context: Record<string, unknown>;
      extracted_order: Record<string, unknown>;
    } = {
      client_id: user.id,
      status: 'active',
      context: {},
      extracted_order: {},
    };

    // Add brand context if provided
    if (body.brand_id) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', body.brand_id)
        .single();

      if (brand) {
        sessionData.context = {
          brand_id: body.brand_id,
          brand_name: brand.name,
        };
      }
    }

    // Create session in database
    const { data: session, error: insertError } = await supabase
      .from('chat_sessions')
      .insert(sessionData)
      .select()
      .single();

    if (insertError) {
      console.error('[CHAT] Failed to create session:', insertError);
      return NextResponse.json(
        { error: 'Failed to create session', detail: insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/print/chat/sessions - List user's chat sessions
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's sessions
    const { data: sessions, error } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('client_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[CHAT] Failed to list sessions:', error);
      return NextResponse.json(
        { error: 'Failed to list sessions' },
        { status: 400 }
      );
    }

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
