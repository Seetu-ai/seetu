import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { analyzeProduct } from '@/lib/vision';

/**
 * POST /api/v1/studio/analyze
 * Analyze a product image using Gemini 2.5 Flash-Lite
 */
export async function POST(req: NextRequest) {
  // Verify auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;

    let imageBase64: string;
    let mimeType: string;

    if (file) {
      // Handle file upload
      const buffer = await file.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
      mimeType = file.type || 'image/jpeg';
    } else if (imageUrl) {
      // Handle image URL
      if (imageUrl.startsWith('/')) {
        // Local file
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        const buffer = await fs.readFile(filePath);
        imageBase64 = buffer.toString('base64');
        const ext = path.extname(imageUrl).toLowerCase();
        mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      } else {
        // Remote URL
        const response = await fetch(imageUrl);
        const buffer = await response.arrayBuffer();
        imageBase64 = Buffer.from(buffer).toString('base64');
        mimeType = response.headers.get('content-type') || 'image/jpeg';
      }
    } else {
      return NextResponse.json(
        { error: 'Either file or imageUrl is required' },
        { status: 400 }
      );
    }

    // Analyze with Gemini
    const analysis = await analyzeProduct(imageBase64, mimeType);

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error('Product analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze product' },
      { status: 500 }
    );
  }
}
