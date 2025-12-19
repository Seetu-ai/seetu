import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_AI_API_KEY;

/**
 * POST /api/v1/studio/locations/streetview
 * Fetch and save a Street View image
 */
export async function POST(req: NextRequest) {
  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'Google Maps API not configured' },
      { status: 500 }
    );
  }

  try {
    const { lat, lng, heading = 0, pitch = 10, size = '1200x800', name } = await req.json();

    if (!lat || !lng) {
      return NextResponse.json(
        { error: 'lat and lng are required' },
        { status: 400 }
      );
    }

    // Fetch Street View image
    const streetViewUrl = `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(streetViewUrl);

    if (!response.ok) {
      throw new Error(`Street View fetch failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Check if we got a valid image (not the "no image available" placeholder)
    // The placeholder is typically a small gray image
    if (buffer.length < 10000) {
      return NextResponse.json(
        { error: 'No Street View imagery available at this location' },
        { status: 404 }
      );
    }

    // Save to uploads directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'locations');
    await fs.mkdir(uploadDir, { recursive: true });

    const filename = `streetview-${Date.now()}-h${heading}.jpg`;
    const filePath = path.join(uploadDir, filename);
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/locations/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      metadata: {
        name,
        lat,
        lng,
        heading,
        pitch,
        size,
      },
    });
  } catch (error) {
    console.error('Street View fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Street View', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
