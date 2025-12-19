/**
 * Product Segmentation API
 * Uses BiRefNet via Replicate for high-quality background removal
 * POST /api/v1/studio/segment
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeBackground, segmentWithBbox, getProductMask } from '@/lib/birefnet';

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { imageUrl, imageBase64, mimeType = 'image/jpeg', bbox, model = 'birefnet' } = body;

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: 'imageUrl or imageBase64 required' },
        { status: 400 }
      );
    }

    console.log('[SEGMENT API] Starting segmentation, model:', model);

    let result;

    if (bbox && imageBase64) {
      // Segment with bounding box (crop + segment)
      result = await segmentWithBbox(imageBase64, bbox, mimeType);
    } else if (imageBase64) {
      // Full image segmentation
      if (model === 'rmbg') {
        result = await getProductMask(imageBase64, mimeType);
      } else {
        const dataUrl = `data:${mimeType};base64,${imageBase64}`;
        result = await removeBackground(dataUrl);
      }
    } else if (imageUrl) {
      // URL-based segmentation
      result = await removeBackground(imageUrl);
    }

    if (!result || !result.success) {
      return NextResponse.json(
        { error: result?.error || 'Segmentation failed' },
        { status: 500 }
      );
    }

    console.log('[SEGMENT API] Segmentation complete, maskUrl:', typeof result.maskUrl === 'string' ? result.maskUrl.slice(0, 100) : result.maskUrl);

    return NextResponse.json({
      maskUrl: result.maskUrl,
      success: true,
    });
  } catch (error) {
    console.error('[SEGMENT API] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Server error' },
      { status: 500 }
    );
  }
}
