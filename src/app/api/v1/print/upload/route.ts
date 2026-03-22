import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * POST /api/v1/print/upload - Upload a design file
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Accepted: PNG, JPG, WEBP, PDF' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'png';
    const filename = `${user.id}/${uuidv4()}.${ext}`;

    // Convert file to buffer
    const buffer = await file.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('print-designs')
      .upload(filename, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('[UPLOAD] Storage error:', uploadError);

      // If bucket doesn't exist, create it
      if (uploadError.message?.includes('not found')) {
        // Try to create the bucket
        const { error: bucketError } = await supabase.storage.createBucket('print-designs', {
          public: true,
          fileSizeLimit: maxSize,
        });

        if (bucketError && !bucketError.message?.includes('already exists')) {
          console.error('[UPLOAD] Failed to create bucket:', bucketError);
          return NextResponse.json(
            { error: 'Storage not available' },
            { status: 500 }
          );
        }

        // Retry upload
        const { data: retryData, error: retryError } = await supabase.storage
          .from('print-designs')
          .upload(filename, buffer, {
            contentType: file.type,
            upsert: false,
          });

        if (retryError) {
          console.error('[UPLOAD] Retry failed:', retryError);
          return NextResponse.json(
            { error: 'Failed to upload file' },
            { status: 500 }
          );
        }

        // Get public URL after retry
        const { data: { publicUrl } } = supabase.storage
          .from('print-designs')
          .getPublicUrl(retryData.path);

        return NextResponse.json({
          url: publicUrl,
          path: retryData.path,
          filename: file.name,
          size: file.size,
          type: file.type,
        });
      }

      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('print-designs')
      .getPublicUrl(uploadData.path);

    return NextResponse.json({
      url: publicUrl,
      path: uploadData.path,
      filename: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
