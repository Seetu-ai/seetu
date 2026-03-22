import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  chat,
  buildBrandContext,
  buildProductCatalog,
  ChatMessage,
} from '@/lib/print/openai-client';

/**
 * POST /api/v1/print/chat/sessions/[id]/messages - Send a message and get AI response
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

    // Parse request
    const body = await req.json();
    const { content, image_urls } = body;

    if (!content) {
      return NextResponse.json(
        { error: 'Message content required' },
        { status: 400 }
      );
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

    // Save user message
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'user',
        content,
      });

    if (userMsgError) {
      console.error('[CHAT] Failed to save user message:', userMsgError);
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

    // Build dynamic product catalog
    const { data: products } = await supabase
      .from('print_products')
      .select(`
        name,
        base_price,
        min_quantity,
        available_print_techniques,
        specifications,
        print_product_categories (
          name,
          parent_id
        )
      `)
      .eq('is_active', true);

    // Transform products for catalog builder
    const catalogProducts = (products || []).map((p) => {
      // print_product_categories can be an object or array depending on relation type
      const cat = p.print_product_categories;
      const categoryData = Array.isArray(cat) ? cat[0] : cat;
      return {
        name: p.name,
        base_price: p.base_price,
        min_quantity: p.min_quantity,
        available_print_techniques: p.available_print_techniques,
        specifications: p.specifications,
        category: categoryData ? {
          name: (categoryData as { name: string }).name,
        } : undefined,
      };
    });

    const productCatalog = buildProductCatalog(catalogProducts);

    // Get brand context if available
    let brandContext = '';
    const brandId = session.context?.brand_id;
    if (brandId) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brand) {
        brandContext = buildBrandContext(brand);
      }
    }

    // Get AI response
    const aiResponse = await chat(messages, {
      imageUrls: image_urls,
      brandContext,
      productCatalog,
    });

    // Save AI response
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: 'assistant',
        content: aiResponse,
        model: 'gpt-4o-mini',
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error('[CHAT] Failed to save AI message:', aiMsgError);
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      );
    }

    return NextResponse.json(aiMessage);
  } catch (error) {
    console.error('[CHAT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message', detail: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
