import { GoogleGenerativeAI } from '@google/generative-ai';
import type { WizardBrief, ProductAnalysis, PresentationType, SceneType } from './stores/wizard-store';
import type { BrandDNA } from '@/types';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// ═══════════════════════════════════════════════════════════════
// PROMPT BUILDING
// ═══════════════════════════════════════════════════════════════

interface BackgroundMetadata {
  name: string;
  lighting: string;
  mood: string;
  promptHints?: string | null;
  lightingData?: {
    direction?: string;
    temperature?: string;
    intensity?: string;
    shadows?: string;
  } | null;
}

// Lighting style to prompt mapping
const LIGHTING_PROMPTS: Record<string, string> = {
  studio_soft: 'soft diffused studio lighting, gentle shadows',
  studio_hard: 'hard studio flash, defined shadows, high contrast',
  natural_sunlight: 'natural direct sunlight, bright and clear',
  golden_hour: 'warm golden hour lighting, soft warm tones',
  neon_night: 'neon night lighting, vibrant colors, urban glow',
  overcast_diffused: 'overcast diffused light, soft even illumination',
};

// Framing style to prompt mapping
const FRAMING_PROMPTS: Record<string, string> = {
  minimalist_centered: 'centered composition, clean minimal background',
  flat_lay: 'top-down flat lay arrangement, organized layout',
  low_angle_lifestyle: 'low angle shot, lifestyle perspective, dynamic',
  close_up_detail: 'close-up detail shot, macro focus',
  chaotic_lifestyle: 'dynamic lifestyle composition, energetic arrangement',
  editorial_fashion: 'editorial fashion photography style, high-end look',
};

// Texture bias to prompt mapping
const TEXTURE_PROMPTS: Record<string, string> = {
  clean_matte: 'matte finish, clean surfaces, no glossy reflections',
  glossy_polished: 'glossy polished surfaces, reflective, premium',
  gritty_film: 'film grain texture, analog feel, slightly raw',
  organic_natural: 'organic natural textures, earthy materials',
  high_contrast: 'high contrast, deep blacks, bright highlights',
};

/**
 * Build brand-specific style instructions from BrandDNA
 * This injects the visual tokens directly into the prompt
 */
function buildBrandStylePrompt(brandDNA?: BrandDNA): string | null {
  if (!brandDNA) return null;

  const parts: string[] = [];

  // 1. Inject visual tokens directly (these are the "soul" of the brand)
  if (brandDNA.visual_tokens && brandDNA.visual_tokens.length > 0) {
    parts.push(`in the style of [${brandDNA.visual_tokens.join(', ')}]`);
  }

  // 2. Add lighting from photography settings
  if (brandDNA.photography_settings?.lighting) {
    const lightingPrompt = LIGHTING_PROMPTS[brandDNA.photography_settings.lighting];
    if (lightingPrompt) {
      parts.push(`with [${lightingPrompt}]`);
    }
  }

  // 3. Add framing style
  if (brandDNA.photography_settings?.framing) {
    const framingPrompt = FRAMING_PROMPTS[brandDNA.photography_settings.framing];
    if (framingPrompt) {
      parts.push(`[${framingPrompt}]`);
    }
  }

  // 4. Add texture bias
  if (brandDNA.photography_settings?.texture_bias) {
    const texturePrompt = TEXTURE_PROMPTS[brandDNA.photography_settings.texture_bias];
    if (texturePrompt) {
      parts.push(`[${texturePrompt}]`);
    }
  }

  // 5. Add color grading hint from palette
  if (brandDNA.palette) {
    const colors: string[] = [];
    if (brandDNA.palette.primaryName) colors.push(brandDNA.palette.primaryName.toLowerCase());
    if (brandDNA.palette.secondaryName) colors.push(brandDNA.palette.secondaryName.toLowerCase());
    if (colors.length > 0) {
      parts.push(`[${colors.join(' and ')} color grading]`);
    }
  }

  if (parts.length === 0) return null;

  return `BRAND DNA INJECTION: ${parts.join(', ')}.`;
}

/**
 * Constructs a coherent prompt from the wizard state
 * This is where the "Chat Magic" happens - synthesizing structured choices into text
 */
export async function constructPrompt(
  brief: WizardBrief,
  backgroundMetadata?: BackgroundMetadata,
  brandDNA?: BrandDNA
): Promise<string> {
  const sentences: string[] = [];

  // 1. Opening - Product Description
  if (brief.product?.analysis) {
    const analysis = brief.product.analysis;
    let productDesc = `Professional product photography of a ${analysis.subcategory?.toLowerCase() || analysis.category?.toLowerCase() || 'product'}.`;

    // Add colors and materials
    const attributes: string[] = [];
    if (analysis.colors?.length) {
      attributes.push(analysis.colors.slice(0, 2).join(' and '));
    }
    if (analysis.materials?.length) {
      attributes.push(analysis.materials.slice(0, 2).join(' and '));
    }
    if (attributes.length) {
      productDesc += ` ${attributes.join(' ')} product.`;
    }

    sentences.push(productDesc);
  } else {
    sentences.push('Professional product photography.');
  }

  // 2. Product modifications OR preservation instruction
  if (brief.product?.note) {
    sentences.push(`Product modification: ${brief.product.note}.`);
  } else {
    // CRITICAL: When no modifications requested, preserve exact product appearance
    sentences.push('IMPORTANT: Keep the product EXACTLY as shown in the reference image - same label, same design, same colors, same text, same brand. Do not modify, redesign, or alter the product in any way. The product must be identical to the original.');
  }

  // 3. Presentation/Placement
  const presentationMap: Record<PresentationType, string> = {
    product_only: 'PRODUCT ONLY - NO HANDS, NO PEOPLE, NO HUMAN ELEMENTS. Product displayed alone elegantly, clean packshot style, centered composition. The product must be standing/placed on its own without any hands holding it.',
    on_model: 'Worn or held by an attractive Senegalese model, natural pose, lifestyle feel.',
    ghost: 'Ghost mannequin effect, invisible model, product appears to float naturally.',
  };
  sentences.push(presentationMap[brief.presentation.type] || presentationMap.product_only);

  if (brief.presentation.note) {
    sentences.push(`Model/presentation: ${brief.presentation.note}.`);
  }

  // 4. Scene/Background
  if (brief.scene.type === 'real_place' && backgroundMetadata) {
    let sceneDesc = `Shot at ${backgroundMetadata.name}`;
    if (backgroundMetadata.lighting) {
      sceneDesc += ` with ${backgroundMetadata.lighting} lighting`;
    }
    if (backgroundMetadata.mood) {
      sceneDesc += `, ${backgroundMetadata.mood} mood`;
    }
    sceneDesc += '.';
    sentences.push(sceneDesc);

    if (backgroundMetadata.promptHints) {
      sentences.push(backgroundMetadata.promptHints);
    }

    sentences.push('Seamlessly harmonized into the environment with realistic shadows and reflections.');
  } else if (brief.scene.type === 'studio' || brief.scene.type === 'solid_color') {
    // Handle solid color backgrounds (including white studio)
    const solidColor = (brief.scene as any).solidColor;
    if (solidColor && solidColor !== '#FFFFFF') {
      // Non-white solid color
      const colorNames: Record<string, string> = {
        '#000000': 'pure black',
        '#F5F5DC': 'warm beige',
        '#808080': 'neutral gray',
        '#C67B5C': 'terracotta',
        '#4A90D9': 'soft blue',
      };
      const colorName = colorNames[solidColor] || 'solid color';
      sentences.push(`${colorName.toUpperCase()} SOLID BACKGROUND. Completely flat ${colorName} seamless backdrop, NO texture, NO gradient, NO pattern. The product appears on a pure ${colorName} infinite backdrop. Professional e-commerce packshot style with soft diffused studio lighting and subtle shadow beneath the product.`);
    } else {
      // White background
      sentences.push('PURE WHITE STUDIO BACKGROUND ONLY. Completely white seamless backdrop, NO table, NO surface, NO texture, NO wood, NO props, NO environment. The product appears on an infinite white void. Professional e-commerce packshot style with soft diffused studio lighting and subtle shadow beneath the product. Clean, minimal, pure white everywhere except the product itself.');
    }
  } else {
    sentences.push('Creative artistic background, dynamic composition.');
  }

  if (brief.scene.note) {
    sentences.push(`Scene modification: ${brief.scene.note}.`);
  }

  // 5. Style/Moodboard
  if (brief.moodboard.note) {
    sentences.push(`Style direction: ${brief.moodboard.note}.`);
  }

  // 6. Brand Identity Style (if available)
  const brandStylePrompt = buildBrandStylePrompt(brandDNA);
  if (brandStylePrompt) {
    sentences.push(brandStylePrompt);
  }

  // 7. Quality and context
  sentences.push('Senegalese/African context, authentic local atmosphere.');
  sentences.push('High quality, 4K, sharp focus, professional commercial photography, perfect lighting and composition.');

  return sentences.join(' ');
}

/**
 * Build product description with user note override
 * If user says "Make it blue", Gemini rewrites "Red Bag" -> "Blue Bag"
 */
async function buildProductDescription(
  analysis?: ProductAnalysis,
  userNote?: string
): Promise<string> {
  if (!analysis) {
    return userNote || 'product';
  }

  let description = analysis.description || analysis.name || 'product';

  // If user has a modification note, use Gemini to rewrite
  if (userNote && genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
      const prompt = `Given this product description: "${description}"
And this user modification request: "${userNote}"
Rewrite the product description incorporating the modification. Keep it concise (under 20 words). Only output the new description, nothing else.`;

      const result = await model.generateContent(prompt);
      const newDescription = result.response.text().trim();
      if (newDescription && newDescription.length < 200) {
        description = newDescription;
      }
    } catch (error) {
      console.error('Error rewriting product description:', error);
      // Fallback: append the note
      description = `${description}, ${userNote}`;
    }
  } else if (userNote) {
    // No Gemini, just append
    description = `${description}, ${userNote}`;
  }

  // Add material/color hints from analysis
  const hints: string[] = [];
  if (analysis.materials?.length) {
    hints.push(analysis.materials.slice(0, 2).join(' '));
  }
  if (analysis.colors?.length) {
    hints.push(analysis.colors.slice(0, 2).join(' and ') + ' colored');
  }

  if (hints.length) {
    description = `${hints.join(', ')} ${description}`;
  }

  return description;
}

/**
 * Build presentation prompt based on type
 */
function buildPresentationPrompt(
  type: PresentationType,
  note?: string
): string {
  const prompts: Record<PresentationType, string> = {
    product_only: 'product shot, flat lay style, clean composition',
    on_model: 'worn by a Senegalese fashion model, professional pose, lifestyle shot',
    ghost: 'ghost mannequin effect, invisible model, floating product',
  };

  let prompt = prompts[type] || prompts.product_only;

  if (note) {
    prompt += `, ${note}`;
  }

  return prompt;
}

/**
 * Build scene prompt based on type and background
 */
function buildScenePrompt(
  type: SceneType,
  note?: string,
  backgroundMetadata?: BackgroundMetadata
): string {
  const parts: string[] = [];

  if (type === 'real_place' && backgroundMetadata) {
    // For real places, focus on harmonization/lighting matching
    parts.push('seamlessly integrated into background');
    parts.push('realistic shadows and reflections');

    if (backgroundMetadata.lighting) {
      parts.push(`${backgroundMetadata.lighting} lighting`);
    }
    if (backgroundMetadata.mood) {
      parts.push(`${backgroundMetadata.mood} atmosphere`);
    }
    if (backgroundMetadata.promptHints) {
      parts.push(backgroundMetadata.promptHints);
    }
    if (backgroundMetadata.lightingData) {
      const ld = backgroundMetadata.lightingData;
      if (ld.direction) parts.push(`light from ${ld.direction}`);
      if (ld.temperature) parts.push(`${ld.temperature} color temperature`);
    }
  } else if (type === 'studio') {
    parts.push('professional studio background');
    parts.push('clean backdrop');
    parts.push('studio lighting setup');
  } else if (type === 'ai_generated') {
    parts.push('creative background');
    parts.push('artistic composition');
  }

  if (note) {
    parts.push(note);
  }

  return parts.join(', ');
}

/**
 * Build negative prompt
 */
export function buildNegativePrompt(brief: WizardBrief): string {
  const negatives = [
    'blurry',
    'low quality',
    'distorted',
    'watermark',
    'text',
    'logo',
    'bad proportions',
    'unrealistic',
  ];

  // Add presentation-specific negatives
  if (brief.presentation.type === 'ghost') {
    negatives.push('visible mannequin', 'visible model');
  }

  // CRITICAL: For product_only, explicitly exclude ALL human elements
  if (brief.presentation.type === 'product_only') {
    negatives.push(
      'hands',
      'fingers',
      'human hands',
      'person',
      'people',
      'model',
      'mannequin',
      'human',
      'arm',
      'skin',
      'holding',
      'hand holding',
      'person holding'
    );
  }

  // CRITICAL: For studio/solid color background, exclude ALL environmental elements
  if (brief.scene.type === 'studio' || brief.scene.type === 'solid_color') {
    negatives.push(
      'table',
      'wooden table',
      'wood surface',
      'wooden surface',
      'desk',
      'floor',
      'background environment',
      'plants',
      'greenery',
      'props',
      'decoration',
      'texture',
      'pattern',
      'colored background',
      'gradient background',
      'room',
      'interior',
      'exterior',
      'outdoor',
      'indoor scene'
    );
  }

  return negatives.join(', ');
}

// ═══════════════════════════════════════════════════════════════
// GENERATION PIPELINE SELECTION
// ═══════════════════════════════════════════════════════════════

export type GenerationPipeline = 'harmonization' | 'generation';

/**
 * Determine which generation pipeline to use based on wizard state
 */
export function selectPipeline(brief: WizardBrief): GenerationPipeline {
  // If using a real place background, use harmonization (inpainting)
  if (brief.scene.type === 'real_place' && brief.scene.backgroundId) {
    return 'harmonization';
  }

  // Otherwise, use pure generation
  return 'generation';
}
