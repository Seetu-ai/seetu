import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_AI_API_KEY;

interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types: string[];
}

/**
 * GET /api/v1/studio/locations/autocomplete?q=Monument
 * Get place suggestions as user types
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q');

  if (!query || query.length < 2) {
    return NextResponse.json({ predictions: [] });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: 'Google Maps API not configured' },
      { status: 500 }
    );
  }

  try {
    // Use Places Autocomplete API with bias towards Senegal
    const autocompleteUrl = new URL('https://maps.googleapis.com/maps/api/place/autocomplete/json');
    autocompleteUrl.searchParams.set('input', query);
    autocompleteUrl.searchParams.set('key', GOOGLE_API_KEY);
    // Bias results to Senegal (lat/lng of Dakar)
    autocompleteUrl.searchParams.set('location', '14.6928,-17.4467');
    autocompleteUrl.searchParams.set('radius', '500000'); // 500km radius covers most of Senegal
    autocompleteUrl.searchParams.set('components', 'country:sn'); // Restrict to Senegal
    autocompleteUrl.searchParams.set('language', 'fr');
    // Don't set types to allow all results (monuments, landmarks, etc.)

    const response = await fetch(autocompleteUrl.toString());
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Autocomplete API error:', data.status, data.error_message);
      return NextResponse.json({ predictions: [] });
    }

    const predictions = (data.predictions || []).map((p: PlacePrediction) => ({
      placeId: p.place_id,
      name: p.structured_formatting.main_text,
      description: p.structured_formatting.secondary_text,
      fullText: p.description,
      types: p.types,
    }));

    return NextResponse.json({ predictions });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({ predictions: [] });
  }
}
