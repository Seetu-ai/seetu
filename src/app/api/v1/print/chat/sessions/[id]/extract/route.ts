import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  extractOrder,
  matchProduct,
  ChatMessage,
} from '@/lib/print/openai-client';

/**
 * POST /api/v1/print/chat/sessions/[id]/extract - Extract order from conversation
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get session
    const { data: session, error: sessionError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
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

    // Get conversation history
    const { data: history } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });

    const messages: ChatMessage[] = (history || []).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    if (messages.length === 0) {
      return NextResponse.json(
        { error: 'No conversation to extract from' },
        { status: 400 }
      );
    }

    // Extract order using AI
    const extracted = await extractOrder(messages);

    console.log('[EXTRACT] Raw extraction result:', JSON.stringify(extracted, null, 2));

    // Get product catalog for matching
    const { data: products } = await supabase
      .from('print_products')
      .select('id, name, slug')
      .eq('is_active', true);

    const catalog = products || [];

    // Match products from catalog
    for (const item of extracted.items || []) {
      try {
        const match = await matchProduct(item.product_name, catalog);
        if (match?.matched_product_id) {
          item.matched_product_id = match.matched_product_id;
          item.confidence = match.confidence;
        }
      } catch (matchError) {
        console.error('[EXTRACT] Product match failed:', matchError);
      }
    }

    // Update session with extracted order
    await supabase
      .from('chat_sessions')
      .update({ extracted_order: extracted })
      .eq('id', sessionId);

    // Determine if order can proceed
    const canProceed =
      extracted.items?.length > 0 &&
      extracted.confidence >= 0.7 &&
      !extracted.missing_info?.length;

    let message = 'Order extracted successfully!';
    if (!canProceed) {
      message = 'Please provide more details.';
      if (extracted.missing_info?.length) {
        message = `Missing information: ${extracted.missing_info.join(', ')}`;
      }
    }

    return NextResponse.json({
      session_id: sessionId,
      extracted_order: extracted,
      message,
      can_proceed: canProceed,
    });
  } catch (error) {
    console.error('[EXTRACT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to extract order', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
