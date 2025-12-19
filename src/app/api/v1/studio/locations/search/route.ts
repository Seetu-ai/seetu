import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_AI_API_KEY;

interface GeocodeResult {
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  types: string[];
}

/**
 * GET /api/v1/studio/locations/search?q=Monument de la Renaissance
 * Search for a location and return coordinates + Street View metadata
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'Google Maps API not configured' },
      { status: 500 }
    );
  }

  try {
    // Add "Senegal" to bias results towards Senegalese locations
    const searchQuery = query.toLowerCase().includes('senegal')
      ? query
      : `${query}, Senegal`;

    // 1. Geocode the location
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}`;
    const geocodeRes = await fetch(geocodeUrl);
    const geocodeData = await geocodeRes.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results?.length) {
      return NextResponse.json(
        { error: 'Location not found', status: geocodeData.status },
        { status: 404 }
      );
    }

    const result: GeocodeResult = geocodeData.results[0];
    const { lat, lng } = result.geometry.location;

    // 2. Check Street View availability
    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const metadataRes = await fetch(metadataUrl);
    const metadata = await metadataRes.json();

    const hasStreetView = metadata.status === 'OK';

    // 3. Generate preview URLs for 10 different angles (36° apart)
    const angles = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];
    const previews = hasStreetView
      ? angles.map(heading => ({
          heading,
          url: `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${lat},${lng}&heading=${heading}&pitch=10&key=${GOOGLE_API_KEY}`,
        }))
      : [];

    return NextResponse.json({
      success: true,
      location: {
        name: result.formatted_address,
        placeId: result.place_id,
        lat,
        lng,
        types: result.types,
      },
      streetView: {
        available: hasStreetView,
        panoId: metadata.pano_id,
        previews,
      },
    });
  } catch (error) {
    console.error('Location search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
