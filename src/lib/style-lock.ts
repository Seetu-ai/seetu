/**
 * Style Lock System for Campaign Mode
 * Ensures consistent visual identity across all images in a campaign
 */

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export type LightingStyle =
  | 'golden_hour'
  | 'studio_soft'
  | 'studio_hard'
  | 'natural'
  | 'dramatic'
  | 'neon_night'
  | 'overcast_diffused';

export interface StyleLock {
  lighting: LightingStyle;
  colorGrading: {
    warmth: number;  // 0-100, 50 = neutral
    saturation: number;  // 0-100
  };
  mood: string;
  visualTokens?: string[];
  promptPrefix?: string;
  negativePromptAdditions?: string[];
}

// ═══════════════════════════════════════════════════════════════
// LIGHTING STYLE PROMPTS
// ═══════════════════════════════════════════════════════════════

const LIGHTING_STYLE_PROMPTS: Record<LightingStyle, string> = {
  golden_hour: 'warm golden hour lighting, soft orange glow, long shadows, magic hour atmosphere',
  studio_soft: 'soft diffused studio lighting, gentle shadows, even illumination, professional setup',
  studio_hard: 'hard studio flash, defined shadows, high contrast, dramatic highlights',
  natural: 'natural daylight, soft ambient lighting, realistic illumination',
  dramatic: 'dramatic chiaroscuro lighting, deep shadows, highlighted subject, cinematic',
  neon_night: 'neon night lighting, vibrant colorful glow, urban night atmosphere',
  overcast_diffused: 'soft overcast lighting, even diffused light, no harsh shadows',
};

// ═══════════════════════════════════════════════════════════════
// COLOR GRADING HELPERS
// ═══════════════════════════════════════════════════════════════

function getColorGradingPrompt(colorGrading: StyleLock['colorGrading']): string {
  const parts: string[] = [];

  // Warmth
  if (colorGrading.warmth > 70) {
    parts.push('warm color tones', 'orange and yellow color cast');
  } else if (colorGrading.warmth > 55) {
    parts.push('slightly warm tones');
  } else if (colorGrading.warmth < 30) {
    parts.push('cool color tones', 'blue and cyan color cast');
  } else if (colorGrading.warmth < 45) {
    parts.push('slightly cool tones');
  }

  // Saturation
  if (colorGrading.saturation > 75) {
    parts.push('highly saturated colors', 'vivid vibrant colors');
  } else if (colorGrading.saturation > 60) {
    parts.push('rich saturated colors');
  } else if (colorGrading.saturation < 30) {
    parts.push('desaturated muted colors', 'subtle color palette');
  } else if (colorGrading.saturation < 45) {
    parts.push('slightly muted colors');
  }

  return parts.join(', ');
}

// ═══════════════════════════════════════════════════════════════
// MOOD PROMPTS
// ═══════════════════════════════════════════════════════════════

const MOOD_PROMPTS: Record<string, string> = {
  festive: 'celebratory joyful atmosphere, festive vibes, celebration',
  serene: 'peaceful calm atmosphere, serene tranquil mood',
  spiritual: 'spiritual contemplative atmosphere, sacred feeling',
  luxury: 'luxurious premium atmosphere, high-end exclusive feel',
  urban: 'urban contemporary atmosphere, city vibes, street culture',
  minimal: 'minimalist clean aesthetic, simple elegant composition',
  sunny: 'bright sunny cheerful atmosphere, positive uplifting mood',
  glamorous: 'glamorous sophisticated atmosphere, elegant chic feel',
  professional: 'professional clean business atmosphere',
  trendy: 'trendy modern aesthetic, contemporary stylish',
  fresh: 'fresh clean modern look, crisp new feeling',
  warm: 'warm cozy inviting atmosphere',
  vibrant: 'vibrant energetic colorful atmosphere',
};

// ═══════════════════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Apply a style lock to an existing prompt
 * This modifies the prompt to ensure consistent visual identity
 */
export function applyStyleLock(basePrompt: string, styleLock: StyleLock): string {
  const styleParts: string[] = [];

  // 1. Add prompt prefix (if any)
  if (styleLock.promptPrefix) {
    styleParts.push(styleLock.promptPrefix);
  }

  // 2. Add the base prompt
  styleParts.push(basePrompt);

  // 3. Add lighting style
  const lightingPrompt = LIGHTING_STYLE_PROMPTS[styleLock.lighting];
  if (lightingPrompt) {
    styleParts.push(`LIGHTING: ${lightingPrompt}`);
  }

  // 4. Add color grading
  const colorPrompt = getColorGradingPrompt(styleLock.colorGrading);
  if (colorPrompt) {
    styleParts.push(`COLOR GRADING: ${colorPrompt}`);
  }

  // 5. Add mood
  const moodPrompt = MOOD_PROMPTS[styleLock.mood] || styleLock.mood;
  if (moodPrompt) {
    styleParts.push(`MOOD: ${moodPrompt}`);
  }

  // 6. Add visual tokens
  if (styleLock.visualTokens && styleLock.visualTokens.length > 0) {
    styleParts.push(`STYLE: ${styleLock.visualTokens.join(', ')}`);
  }

  return styleParts.join('. ');
}

/**
 * Apply style lock additions to a negative prompt
 */
export function applyStyleLockNegative(baseNegativePrompt: string, styleLock: StyleLock): string {
  const parts = [baseNegativePrompt];

  if (styleLock.negativePromptAdditions && styleLock.negativePromptAdditions.length > 0) {
    parts.push(...styleLock.negativePromptAdditions);
  }

  return parts.filter(Boolean).join(', ');
}

/**
 * Generate a random style seed for consistency across a campaign
 */
export function generateStyleSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

/**
 * Validate a style lock object
 */
export function validateStyleLock(styleLock: unknown): styleLock is StyleLock {
  if (!styleLock || typeof styleLock !== 'object') {
    return false;
  }

  const sl = styleLock as Record<string, unknown>;

  // Check required fields
  if (typeof sl.lighting !== 'string') return false;
  if (!sl.colorGrading || typeof sl.colorGrading !== 'object') return false;
  if (typeof sl.mood !== 'string') return false;

  const cg = sl.colorGrading as Record<string, unknown>;
  if (typeof cg.warmth !== 'number' || typeof cg.saturation !== 'number') {
    return false;
  }

  return true;
}

/**
 * Create a default style lock
 */
export function createDefaultStyleLock(): StyleLock {
  return {
    lighting: 'studio_soft',
    colorGrading: {
      warmth: 50,
      saturation: 60,
    },
    mood: 'professional',
    visualTokens: ['clean', 'modern'],
  };
}

/**
 * Merge a partial style lock with defaults
 */
export function mergeStyleLock(partial: Partial<StyleLock>): StyleLock {
  const defaults = createDefaultStyleLock();

  return {
    lighting: partial.lighting || defaults.lighting,
    colorGrading: {
      warmth: partial.colorGrading?.warmth ?? defaults.colorGrading.warmth,
      saturation: partial.colorGrading?.saturation ?? defaults.colorGrading.saturation,
    },
    mood: partial.mood || defaults.mood,
    visualTokens: partial.visualTokens || defaults.visualTokens,
    promptPrefix: partial.promptPrefix,
    negativePromptAdditions: partial.negativePromptAdditions,
  };
}

// ═══════════════════════════════════════════════════════════════
// PRESET STYLE LOCKS
// ═══════════════════════════════════════════════════════════════

export const PRESET_STYLE_LOCKS: Record<string, StyleLock> = {
  clean_ecommerce: {
    lighting: 'studio_soft',
    colorGrading: { warmth: 50, saturation: 50 },
    mood: 'professional',
    visualTokens: ['e-commerce', 'clean', 'marketplace'],
    promptPrefix: 'Professional e-commerce photography',
    negativePromptAdditions: ['artistic', 'lifestyle', 'complex'],
  },
  luxury_brand: {
    lighting: 'dramatic',
    colorGrading: { warmth: 45, saturation: 40 },
    mood: 'luxury',
    visualTokens: ['high-end', 'exclusive', 'premium'],
    promptPrefix: 'Luxury brand photography',
    negativePromptAdditions: ['cheap', 'casual', 'basic'],
  },
  african_heritage: {
    lighting: 'golden_hour',
    colorGrading: { warmth: 70, saturation: 65 },
    mood: 'warm',
    visualTokens: ['African', 'heritage', 'traditional', 'authentic'],
    promptPrefix: 'African heritage inspired photography',
    negativePromptAdditions: ['western', 'cold', 'generic'],
  },
  modern_minimal: {
    lighting: 'natural',
    colorGrading: { warmth: 50, saturation: 45 },
    mood: 'minimal',
    visualTokens: ['minimalist', 'clean', 'simple'],
    promptPrefix: 'Modern minimalist aesthetic',
    negativePromptAdditions: ['busy', 'cluttered', 'complex'],
  },
};
