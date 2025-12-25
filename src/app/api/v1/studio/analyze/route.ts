import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { analyzeProduct } from '@/lib/vision';
import { safeFetchImage, isValidImageUrl } from '@/lib/safe-fetch';

/**
 * POST /api/v1/studio/analyze
 * Analyze a product image using Gemini 2.5 Flash-Lite
 *
 * Accepts:
 * - multipart/form-data with 'file' or 'imageUrl' field
 * - application/json with { imageUrl: string }
 *
 * Note: Remote URLs are validated for SSRF protection.
 */
export async function POST(req: NextRequest) {
  // Verify auth (supports both cookie and Bearer token)
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let imageBase64: string;
    let mimeType: string;
    let imageUrl: string | null = null;
    let file: File | null = null;

    const contentType = req.headers.get('content-type') || '';

    // Handle JSON body (for mobile/API clients)
    if (contentType.includes('application/json')) {
      const body = await req.json();
      imageUrl = body.imageUrl || null;
    }
    // Handle form-data (for web clients)
    else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file') as File | null;
      imageUrl = formData.get('imageUrl') as string | null;
    } else {
      return NextResponse.json(
        { error: 'Invalid content type. Use application/json or multipart/form-data' },
        { status: 400 }
      );
    }

    if (file) {
      // Handle file upload
      const buffer = await file.arrayBuffer();
      imageBase64 = Buffer.from(buffer).toString('base64');
      mimeType = file.type || 'image/jpeg';
    } else if (imageUrl) {
      // Handle image URL
      if (imageUrl.startsWith('/')) {
        // Local file - this path is only for local development
        const fs = await import('fs/promises');
        const path = await import('path');
        const filePath = path.join(process.cwd(), 'public', imageUrl);
        const buffer = await fs.readFile(filePath);
        imageBase64 = buffer.toString('base64');
        const ext = path.extname(imageUrl).toLowerCase();
        mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      } else {
        // Remote URL - use SSRF-protected fetch
        if (!isValidImageUrl(imageUrl)) {
          return NextResponse.json(
            { error: 'URL not allowed. Use Supabase Storage or approved image CDNs.' },
            { status: 400 }
          );
        }

        try {
          const { buffer, mimeType: fetchedMimeType } = await safeFetchImage(imageUrl);
          imageBase64 = buffer.toString('base64');
          mimeType = fetchedMimeType;
        } catch (fetchError) {
          console.error('Safe fetch error:', fetchError);
          return NextResponse.json(
            { error: 'Failed to fetch image from URL' },
            { status: 400 }
          );
        }
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
