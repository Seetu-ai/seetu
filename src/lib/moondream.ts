/**
 * Moondream API client for product detection
 * Used to detect multiple products in a single image
 * Docs: https://docs.moondream.ai/api/
 */

const MOONDREAM_API_KEY = process.env.MOONDREAM_API_KEY;
const MOONDREAM_API_URL = 'https://api.moondream.ai/v1';

export interface BoundingBox {
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface DetectedObject {
  label: string;
  bbox: BoundingBox;
}

export interface DetectionResult {
  objects: DetectedObject[];
  rawObjects: BoundingBox[];
}

export interface SegmentationResult {
  path: string; // SVG path string (e.g., "M 0 0.76 L 0 0.32...")
  segBbox: BoundingBox; // Bounding box for positioning the SVG path
}

/**
 * Segment an object in an image using Moondream
 * Returns an SVG path and bounding box for the segmented object
 * @param prompt - Descriptive prompt like "the red dress" or "the person on the left"
 * @param spatialRef - Optional point [x, y] or bbox [x1, y1, x2, y2] to guide segmentation
 */
export async function segmentObject(
  imageBase64: string,
  prompt: string,
  mimeType: string = 'image/jpeg',
  spatialRef?: number[]
): Promise<SegmentationResult | null> {
  if (!MOONDREAM_API_KEY) {
    throw new Error('Moondream API key not configured');
  }

  try {
    console.log('[MOONDREAM] Segmenting:', prompt);
    const body: any = {
      image_url: `data:${mimeType};base64,${imageBase64}`,
      object: prompt,
    };

    // Add spatial reference if provided (helps guide segmentation to specific area)
    if (spatialRef) {
      body.spatial_refs = [spatialRef];
    }

    const response = await fetch(`${MOONDREAM_API_URL}/segment`, {
      method: 'POST',
      headers: {
        'X-Moondream-Auth': MOONDREAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MOONDREAM] Segment API error:', response.status, error);
      return null;
    }

    const data = await response.json();
    console.log('[MOONDREAM] Segment response keys:', Object.keys(data));

    // Moondream returns { path: "M 0 0.76 L...", bbox: { x_min, y_min, x_max, y_max } }
    if (data.path && data.bbox) {
      console.log('[MOONDREAM] Got SVG path, length:', data.path.length);
      return {
        path: data.path,
        segBbox: {
          x_min: data.bbox.x_min,
          y_min: data.bbox.y_min,
          x_max: data.bbox.x_max,
          y_max: data.bbox.y_max,
        },
      };
    }

    console.log('[MOONDREAM] No path in response, data:', JSON.stringify(data).slice(0, 200));
    return null;
  } catch (error) {
    console.error('[MOONDREAM] Segmentation error:', error);
    return null;
  }
}

/**
 * Detect specific objects in an image using Moondream
 * @param imageBase64 - Base64 encoded image
 * @param objectType - Type of object to detect (e.g., "product", "clothing", "bag")
 * @param mimeType - Image MIME type
 */
export async function detectObjects(
  imageBase64: string,
  objectType: string = 'product',
  mimeType: string = 'image/jpeg'
): Promise<DetectionResult> {
  if (!MOONDREAM_API_KEY) {
    throw new Error('Moondream API key not configured');
  }

  try {
    const response = await fetch(`${MOONDREAM_API_URL}/detect`, {
      method: 'POST',
      headers: {
        'X-Moondream-Auth': MOONDREAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:${mimeType};base64,${imageBase64}`,
        object: objectType,
        settings: {
          max_objects: 10,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MOONDREAM] Detect API error:', response.status, error);
      throw new Error(`Moondream API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[MOONDREAM] Detect response:', JSON.stringify(data));

    // Parse response - Moondream returns objects with x_min, y_min, x_max, y_max
    const rawObjects: BoundingBox[] = data.objects || [];
    const objects: DetectedObject[] = rawObjects.map((obj: any, idx: number) => ({
      label: `${objectType} ${idx + 1}`,
      bbox: {
        x_min: obj.x_min ?? 0,
        y_min: obj.y_min ?? 0,
        x_max: obj.x_max ?? 1,
        y_max: obj.y_max ?? 1,
      },
    }));

    return { objects, rawObjects };
  } catch (error) {
    console.error('[MOONDREAM] Detection error:', error);
    throw error;
  }
}

/**
 * Ask Moondream a question about an image
 */
export async function queryImage(
  imageBase64: string,
  question: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  if (!MOONDREAM_API_KEY) {
    throw new Error('Moondream API key not configured');
  }

  try {
    const response = await fetch(`${MOONDREAM_API_URL}/query`, {
      method: 'POST',
      headers: {
        'X-Moondream-Auth': MOONDREAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:${mimeType};base64,${imageBase64}`,
        question,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MOONDREAM] Query API error:', response.status, error);
      throw new Error(`Moondream API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[MOONDREAM] Query response:', data);
    return data.answer || '';
  } catch (error) {
    console.error('[MOONDREAM] Query error:', error);
    throw error;
  }
}

/**
 * Detect products using Gemini for identification and Moondream for segmentation
 * Gemini is better at understanding context and avoiding duplicates
 * Moondream is specialized for precise segmentation
 */
export async function detectProducts(
  imageBase64: string,
  mimeType: string = 'image/jpeg'
): Promise<{
  products: Array<{
    id: string;
    description: string;
    bbox: BoundingBox;
    svgPath?: string;
    segBbox?: BoundingBox;
  }>;
  totalCount: number;
}> {
  if (!MOONDREAM_API_KEY) {
    throw new Error('Moondream API key not configured');
  }

  const allProducts: Array<{
    id: string;
    description: string;
    bbox: BoundingBox;
    svgPath?: string;
    segBbox?: BoundingBox;
  }> = [];

  try {
    // Use Gemini (fast) to identify products with locations, Moondream for segmentation only
    const identifiedProducts = await identifyProductsWithGemini(imageBase64, mimeType);
    console.log('[DETECT] Gemini identified products:', identifiedProducts.map(p => `${p.name} (${p.location})`));

    if (identifiedProducts.length === 0) {
      // Fallback: return single product
      return {
        products: [{
          id: 'product-1',
          description: 'Produit',
          bbox: { x_min: 0, y_min: 0, x_max: 1, y_max: 1 },
        }],
        totalCount: 1,
      };
    }

    // Use Moondream SEGMENT to get SVG outlines for each product
    console.log(`[DETECT] Getting segmentation for ${identifiedProducts.length} products...`);

    // Process sequentially to avoid rate limits
    for (let i = 0; i < identifiedProducts.length; i++) {
      const { name: productName, location } = identifiedProducts[i];
      try {
        console.log(`[DETECT] Segmenting: "${productName}" at "${location}"`);

        // Convert location to spatial reference point
        const spatialRef = locationToSpatialRef(location);
        if (spatialRef) {
          console.log(`[DETECT] Using spatial reference: [${spatialRef[0]}, ${spatialRef[1]}]`);
        }

        // Call segment endpoint with product name and spatial reference
        const segResult = await segmentObject(imageBase64, productName, mimeType, spatialRef || undefined);

        if (segResult && segResult.path && segResult.segBbox) {
          allProducts.push({
            id: `product-${i + 1}`,
            description: productName,
            bbox: segResult.segBbox,
            svgPath: segResult.path,
            segBbox: segResult.segBbox,
          });
          console.log(`[DETECT] Got SVG path for "${productName}", bbox: [${segResult.segBbox.x_min.toFixed(2)}, ${segResult.segBbox.y_min.toFixed(2)}, ${segResult.segBbox.x_max.toFixed(2)}, ${segResult.segBbox.y_max.toFixed(2)}]`);
        } else {
          // Fallback: try detect for bbox only
          console.log(`[DETECT] Segment failed for "${productName}", trying detect...`);
          const detection = await detectObjects(imageBase64, productName, mimeType);
          const bbox = detection.objects[0]?.bbox || { x_min: 0.1, y_min: 0.1, x_max: 0.9, y_max: 0.9 };
          allProducts.push({
            id: `product-${i + 1}`,
            description: productName,
            bbox: bbox,
          });
        }

        // Small delay between requests
        if (i < identifiedProducts.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (err) {
        console.error(`[DETECT] Error for "${productName}":`, err);
        allProducts.push({
          id: `product-${i + 1}`,
          description: productName,
          bbox: { x_min: 0.1, y_min: 0.1, x_max: 0.9, y_max: 0.9 },
        });
      }
    }

    return {
      products: allProducts,
      totalCount: allProducts.length,
    };
  } catch (error) {
    console.error('[DETECT] detectProducts error:', error);
    return {
      products: [{
        id: 'product-1',
        description: 'Produit détecté',
        bbox: { x_min: 0, y_min: 0, x_max: 1, y_max: 1 },
      }],
      totalCount: 1,
    };
  }
}

/**
 * Convert location hint to spatial reference point for Moondream
 * Returns [x, y] normalized coordinates (0-1)
 */
function locationToSpatialRef(location: string): [number, number] | null {
  const locationMap: Record<string, [number, number]> = {
    'haut-gauche': [0.2, 0.2],
    'haut-centre': [0.5, 0.2],
    'haut-droite': [0.8, 0.2],
    'milieu-gauche': [0.2, 0.5],
    'centre': [0.5, 0.5],
    'milieu-droite': [0.8, 0.5],
    'bas-gauche': [0.2, 0.8],
    'bas-centre': [0.5, 0.8],
    'bas-droite': [0.8, 0.8],
    // English fallbacks
    'top-left': [0.2, 0.2],
    'top-center': [0.5, 0.2],
    'top-right': [0.8, 0.2],
    'middle-left': [0.2, 0.5],
    'middle-right': [0.8, 0.5],
    'bottom-left': [0.2, 0.8],
    'bottom-center': [0.5, 0.8],
    'bottom-right': [0.8, 0.8],
  };

  const normalized = location.toLowerCase().trim();
  return locationMap[normalized] || null;
}

/**
 * Use Gemini Flash to identify products (fast)
 * Returns array of {name, location} objects
 */
async function identifyProductsWithGemini(
  imageBase64: string,
  mimeType: string
): Promise<Array<{ name: string; location: string }>> {
  const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY;
  if (!GOOGLE_AI_API_KEY) {
    console.log('[GEMINI] No API key');
    return [];
  }

  try {
    // CTO Solution A: JSON Mode with Location Hints
    // Forces Gemini to "scan" the image by asking for positions
    // IMPORTANT: Names must be in French for the Senegalese market
    const prompt = `Analyse cette image pour un inventaire mode.

1. D'abord, COMPTE le nombre total d'articles de mode distincts visibles.
2. Ensuite, LISTE chaque article avec sa position.

IMPORTANT: Inclure les articles partiellement visibles ou aux bords de l'image.
IMPORTANT: Les noms doivent être EN FRANÇAIS.

Retourne du JSON brut (pas de markdown, pas de blocs de code):
{
  "detected_count": <number>,
  "items": [
    { "short_name": "<couleur> <type d'article en français>", "location": "<position dans l'image>" }
  ]
}

Exemple de réponse:
{"detected_count": 4, "items": [{"short_name": "sac à main orange", "location": "haut-gauche"}, {"short_name": "sac à main rose", "location": "centre"}, {"short_name": "sac à main rouge", "location": "haut-droite"}, {"short_name": "sac à main vert", "location": "bas-centre"}]}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: prompt },
            ],
          }],
          generationConfig: {
            temperature: 0.2, // Lower for counting tasks
            responseMimeType: 'application/json', // Force JSON output
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('[GEMINI] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('[GEMINI] Raw response:', text);

    // Parse JSON response
    try {
      const parsed = JSON.parse(text);
      console.log('[GEMINI] Detected count:', parsed.detected_count, 'Items:', parsed.items?.length);

      const items = parsed.items || [];
      return items
        .filter((item: { short_name: string; location: string }) =>
          item.short_name?.trim() &&
          item.short_name.length > 2 &&
          item.short_name.length < 60
        )
        .map((item: { short_name: string; location: string }) => ({
          name: item.short_name.trim(),
          location: item.location || '',
        }))
        .slice(0, 8); // Allow up to 8 items
    } catch (parseError) {
      console.error('[GEMINI] JSON parse error, falling back to text parsing:', parseError);
      // Fallback: try to extract from text (no location info)
      return text
        .split('\n')
        .map((line: string) => line.replace(/^[-*•\d.)\s]+/, '').trim())
        .filter((line: string) => line.length > 2 && line.length < 50)
        .map((name: string) => ({ name, location: '' }))
        .slice(0, 6);
    }
  } catch (error) {
    console.error('[GEMINI] Error:', error);
    return [];
  }
}

/**
 * Use Moondream caption to get image description, then parse products (slower fallback)
 */
async function identifyProductsWithCaption(
  imageBase64: string,
  mimeType: string
): Promise<string[]> {
  try {
    // Get caption from Moondream
    const caption = await getCaptionFromMoondream(imageBase64, mimeType);
    console.log('[MOONDREAM] Caption:', caption);

    if (!caption) {
      return [];
    }

    // Use query to extract specific products from the caption
    const productsAnswer = await queryImage(
      imageBase64,
      `Based on this image, list ONLY the distinct fashion products or items that could be sold.
Rules:
- One product per line
- Be specific (include color, e.g., "black duster coat")
- Maximum 3 items
- Do NOT list: people, backgrounds, body parts
- Do NOT repeat the same item with different names`,
      mimeType
    );

    console.log('[MOONDREAM] Products from query:', productsAnswer);

    const products = productsAnswer
      .split('\n')
      .map((s: string) => s.replace(/^[-*•\d.)\s]+/, '').trim())
      .filter((s: string) => s.length > 2 && s.length < 50)
      .slice(0, 3);

    return products;
  } catch (error) {
    console.error('[MOONDREAM] Caption/identify error:', error);
    return [];
  }
}

/**
 * Get image caption from Moondream
 */
async function getCaptionFromMoondream(
  imageBase64: string,
  mimeType: string
): Promise<string | null> {
  if (!MOONDREAM_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(`${MOONDREAM_API_URL}/caption`, {
      method: 'POST',
      headers: {
        'X-Moondream-Auth': MOONDREAM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: `data:${mimeType};base64,${imageBase64}`,
        length: 'normal',
      }),
    });

    if (!response.ok) {
      console.error('[MOONDREAM] Caption API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.caption || null;
  } catch (error) {
    console.error('[MOONDREAM] Caption error:', error);
    return null;
  }
}
