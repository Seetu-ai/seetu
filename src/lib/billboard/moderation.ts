/**
 * Billboard Content Moderation
 *
 * Uses Google's Gemini Vision API to analyze content for:
 * - Nudity/adult content
 * - Violence/gore
 * - Hate speech/symbols
 * - Political content
 * - Inappropriate text
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Moderation categories and their severity levels
export type ModerationCategory =
  | 'nudity'
  | 'violence'
  | 'hate_speech'
  | 'political'
  | 'explicit_text'
  | 'drugs_alcohol'
  | 'gambling'
  | 'copyright';

export interface CategoryResult {
  category: ModerationCategory;
  detected: boolean;
  confidence: number; // 0-1
  description?: string;
}

export interface ModerationResult {
  approved: boolean;
  categories: CategoryResult[];
  overallRisk: 'low' | 'medium' | 'high';
  rejectionReason?: string;
  reviewRequired: boolean;
  rawAnalysis?: string;
}

// Threshold for auto-rejection
const AUTO_REJECT_THRESHOLD = 0.8;
// Threshold for manual review
const REVIEW_THRESHOLD = 0.5;

/**
 * Initialize Gemini client
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured (GEMINI_API_KEY or GOOGLE_AI_API_KEY)');
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Download image and convert to base64
 */
async function imageUrlToBase64(url: string): Promise<{ data: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  const contentType = response.headers.get('content-type') || 'image/jpeg';

  return {
    data: base64,
    mimeType: contentType,
  };
}

/**
 * Parse Gemini's response into structured moderation result
 */
function parseAnalysis(analysisText: string): {
  categories: CategoryResult[];
  overallRisk: 'low' | 'medium' | 'high';
} {
  const categories: CategoryResult[] = [];
  let overallRisk: 'low' | 'medium' | 'high' = 'low';

  const categoryChecks: ModerationCategory[] = [
    'nudity',
    'violence',
    'hate_speech',
    'political',
    'explicit_text',
    'drugs_alcohol',
    'gambling',
    'copyright',
  ];

  for (const category of categoryChecks) {
    // Match the full line: CATEGORY: score | detected: yes/no | notes: ...
    // Gemini returns "confidence in assessment" NOT "confidence of detection".
    // e.g., "VIOLENCE: 1.0 | detected: no" means "100% confident no violence"
    // We MUST parse the "detected: yes/no" field to know the actual result.
    const catPattern = category.replace('_', '[_\\s]?');
    const lineRegex = new RegExp(
      `${catPattern}[:\\s]*(\\d+\\.?\\d*)\\s*\\|\\s*detected:\\s*(yes|no)`,
      'i'
    );
    const lineMatch = analysisText.match(lineRegex);

    let confidence = 0;
    let detected = false;
    let description: string | undefined;

    if (lineMatch) {
      // Structured format: "CATEGORY: score | detected: yes/no"
      const score = parseFloat(lineMatch[1]);
      const detectedField = lineMatch[2].toLowerCase();

      if (detectedField === 'yes') {
        // Score is confidence of detection — use it directly
        confidence = Math.min(score, 1.0); // Clamp to 0-1
        detected = confidence > 0;
      } else {
        // detected: no — regardless of score, this category is clean
        confidence = 0;
        detected = false;
      }

      // Extract notes if present
      const notesMatch = analysisText.match(
        new RegExp(`${catPattern}[^\\n]*notes:\\s*([^\\n]+)`, 'i')
      );
      if (notesMatch) {
        description = notesMatch[1].trim();
      }
    } else {
      // Fallback: try simpler format "CATEGORY: value"
      const simpleRegex = new RegExp(
        `${catPattern}[:\\s]*(\\d+\\.?\\d*|high|medium|low|yes|no|not detected|detected)`,
        'i'
      );
      const simpleMatch = analysisText.match(simpleRegex);

      if (simpleMatch) {
        const value = simpleMatch[1].toLowerCase();
        if (value === 'high' || value === 'yes' || value === 'detected') {
          confidence = 0.9;
          detected = true;
        } else if (value === 'medium') {
          confidence = 0.6;
          detected = true;
        } else if (value === 'low') {
          confidence = 0.3;
        } else if (value === 'no' || value === 'not detected') {
          confidence = 0;
        } else {
          confidence = Math.min(parseFloat(value), 1.0);
          detected = confidence > REVIEW_THRESHOLD;
        }
      }
      // No keyword fallback — rely on Gemini's structured response
    }

    categories.push({
      category,
      detected,
      confidence,
      description,
    });

    // Update overall risk
    if (confidence >= AUTO_REJECT_THRESHOLD) {
      overallRisk = 'high';
    } else if (confidence >= REVIEW_THRESHOLD && overallRisk !== 'high') {
      overallRisk = 'medium';
    }
  }

  return { categories, overallRisk };
}

/**
 * Moderate image content using Gemini Vision
 */
export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  try {
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Get image as base64
    const imageData = await imageUrlToBase64(imageUrl);

    // Moderation prompt
    const prompt = `You are a content moderation system for digital billboards in Dakar, Senegal.
Analyze this image for the following content categories and provide a confidence score (0.0-1.0) for each:

1. NUDITY: Explicit nudity, sexual acts, pornographic content. Do NOT flag normal photos of people (selfies, portraits, people in regular clothing, swimwear in appropriate context). Only flag genuinely sexual or pornographic content.
2. VIOLENCE: Gore, blood, weapons, graphic violent imagery
3. HATE_SPEECH: Racist symbols, hate speech text, discriminatory content
4. POLITICAL: Political party logos, election campaign content, political propaganda
5. EXPLICIT_TEXT: Profanity, vulgar language clearly visible in the image
6. DRUGS_ALCOHOL: Drug paraphernalia, illegal substance promotion
7. GAMBLING: Casino, betting, lottery promotion
8. COPYRIGHT: Visible trademarked logos, copyrighted content (excluding the advertised product itself)

For each category, respond in this exact format:
CATEGORY: confidence_score (0.0-1.0) | detected: yes/no | notes: brief description

Then provide:
OVERALL_RISK: low/medium/high
RECOMMENDATION: approved/rejected/review_required
REJECTION_REASON: (only if rejected or review required)

IMPORTANT: Most advertising content is normal and should be APPROVED. Only reject content that is clearly inappropriate for public display. Regular photos of people, selfies, product shots, screenshots, and brand promotions are all acceptable.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: imageData.mimeType,
          data: imageData.data,
        },
      },
      prompt,
    ]);

    const analysisText = result.response.text();
    const { categories, overallRisk } = parseAnalysis(analysisText);

    // Determine if auto-rejected
    const highRiskCategories = categories.filter(c => c.confidence >= AUTO_REJECT_THRESHOLD);
    const mediumRiskCategories = categories.filter(c => c.confidence >= REVIEW_THRESHOLD && c.confidence < AUTO_REJECT_THRESHOLD);

    let approved = true;
    let reviewRequired = false;
    let rejectionReason: string | undefined;

    // French labels for rejection reasons
    const categoryLabels: Record<string, string> = {
      nudity: 'Nudité/contenu sexuel',
      violence: 'Violence',
      hate_speech: 'Discours haineux',
      political: 'Contenu politique',
      explicit_text: 'Langage explicite',
      drugs_alcohol: 'Drogues/alcool',
      gambling: 'Jeux d\'argent',
      copyright: 'Droits d\'auteur',
    };

    if (highRiskCategories.length > 0) {
      approved = false;
      const flaggedLabels = highRiskCategories.map(c => categoryLabels[c.category] || c.category).join(', ');
      rejectionReason = `Contenu interdit: ${flaggedLabels}`;
    } else if (mediumRiskCategories.length > 0) {
      approved = true; // Tentatively approved, but needs review
      reviewRequired = true;
    }

    return {
      approved,
      categories,
      overallRisk,
      rejectionReason,
      reviewRequired,
      rawAnalysis: analysisText,
    };

  } catch (error) {
    console.error('[MODERATION] Error (failing open):', error);

    // If moderation system fails, approve content and log warning.
    // A system error is not a content issue — don't block users.
    return {
      approved: true,
      categories: [],
      overallRisk: 'low',
      reviewRequired: false,
      rawAnalysis: `SYSTEM_ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Moderate video content by extracting key frames
 * For now, uses first frame only - can be extended to sample multiple frames
 */
export async function moderateVideo(videoUrl: string, thumbnailUrl?: string): Promise<ModerationResult> {
  // If we have a thumbnail, moderate that
  if (thumbnailUrl) {
    return moderateImage(thumbnailUrl);
  }

  // No thumbnail available — approve and log (fail-open).
  // Video frame extraction would require FFmpeg.
  console.warn('[MODERATION] No thumbnail for video moderation, approving by default');
  return {
    approved: true,
    categories: [],
    overallRisk: 'low',
    reviewRequired: false,
    rawAnalysis: 'No thumbnail available for moderation — approved by default',
  };
}

/**
 * Quick text-based content check for captions/messages
 */
export async function moderateText(text: string): Promise<{
  approved: boolean;
  issues: string[];
}> {
  // Basic profanity and inappropriate content check
  const forbiddenPatterns = [
    /\b(fuck|shit|ass|bitch|damn|hell)\b/i,
    /\b(kill|murder|death|die)\b/i,
    /\b(hate|racist)\b/i,
    /\b(vote|election|campaign|parti\s*politique)\b/i,
  ];

  const issues: string[] = [];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(text)) {
      issues.push(`Potentially inappropriate content detected matching pattern: ${pattern.source}`);
    }
  }

  return {
    approved: issues.length === 0,
    issues,
  };
}

/**
 * Check if moderation service is available
 */
export function isModerationAvailable(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
}
