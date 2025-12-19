import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { VerbalDNA, ProductAnalysis } from '@/types';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export async function POST(req: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    if (!genAI) {
      return NextResponse.json(
        { error: 'Service de génération non configuré' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { productAnalysis, verbalDNA, context } = body as {
      productAnalysis?: ProductAnalysis;
      verbalDNA?: VerbalDNA;
      context?: string; // Additional context like "Tabaski", "new arrival", etc.
    };

    // Generate caption using few-shot technique
    const caption = await generateCaption(productAnalysis, verbalDNA, context);

    return NextResponse.json({
      success: true,
      caption,
    });

  } catch (error) {
    console.error('Caption generation error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la caption' },
      { status: 500 }
    );
  }
}

/**
 * Generate a caption matching the brand's verbal style using Few-Shot technique
 */
async function generateCaption(
  productAnalysis?: ProductAnalysis,
  verbalDNA?: VerbalDNA,
  context?: string
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini not configured');
  }

  const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

  // Build product description
  let productDesc = 'un nouveau produit';
  if (productAnalysis) {
    productDesc = productAnalysis.name || productAnalysis.description ||
                  `${productAnalysis.subcategory} ${productAnalysis.style}`;
  }

  // If no verbal DNA, use default style
  if (!verbalDNA) {
    const defaultPrompt = `Tu es un copywriter expert pour les marques e-commerce sénégalaises.

PRODUIT À PROMOUVOIR:
${productDesc}
${context ? `\nCONTEXTE/OCCASION: ${context}` : ''}

STYLE:
- Ton: Chaleureux et enthousiaste
- Style linguistique: Français avec touche locale
- Utilise le tutoiement pour un ton proche
- Longueur: 1-2 phrases courtes
- Inclus 1-2 emojis pertinents
- Fini avec un call-to-action simple

Écris UNE caption Instagram pour ce produit. Ne mets PAS de guillemets.`;

    const result = await model.generateContent(defaultPrompt);
    return result.response.text().trim().replace(/^["']|["']$/g, '');
  }

  // Determine the language to write in (CRITICAL)
  const languageMap: Record<string, string> = {
    'english': 'Write the caption in ENGLISH',
    'french': 'Write the caption in FRENCH',
    'french_wolof_mix': 'Write the caption in FRENCH with occasional Wolof expressions',
    'wolof_dominant': 'Write the caption in WOLOF with French words mixed in',
    'arabic_mix': 'Write the caption in FRENCH/ARABIC mix as appropriate',
  };

  const primaryLanguage = verbalDNA.primary_language || 'french';
  const languageInstruction = languageMap[primaryLanguage] || 'Write in the same language as the examples';

  // Build emoji instructions
  let emojiInstruction = '';
  if (verbalDNA.emoji_palette && verbalDNA.emoji_palette.length > 0) {
    const emojiCount = verbalDNA.emoji_frequency === 'heavy' ? '3-5' :
                       verbalDNA.emoji_frequency === 'moderate' ? '1-2' :
                       verbalDNA.emoji_frequency === 'minimal' ? '0-1' : '0';
    emojiInstruction = `Use ${emojiCount} emojis, ONLY from: ${verbalDNA.emoji_palette.join(' ')}`;
  }

  // Build length instruction
  const lengthMap: Record<string, string> = {
    'short': 'SHORT - 1-2 sentences, under 50 words',
    'medium': 'Medium - 3-5 sentences, 50-100 words',
    'long': 'Longer storytelling - 100+ words if authentic',
  };
  const lengthInstruction = lengthMap[verbalDNA.typical_length] || lengthMap['short'];

  // THE KEY: Few-shot examples from brand's actual captions
  let fewShotExamples = '';
  const exemplars = verbalDNA.exemplars && verbalDNA.exemplars.length > 0
    ? verbalDNA.exemplars
    : verbalDNA.example_captions?.slice(0, 3) || [];

  if (exemplars.length > 0) {
    fewShotExamples = `
LEARN FROM THEIR ACTUAL CAPTIONS (Mimic this exact style):

${exemplars.map((caption, i) => `Example ${i + 1}:
"${caption}"
`).join('\n')}

Your caption MUST sound like it was written by the same person who wrote these examples.`;
  }

  const prompt = `You are a copywriter who has mastered mimicking a specific brand's voice.
Write an Instagram caption for this product that sounds EXACTLY like the brand's content.

PRODUCT TO PROMOTE:
${productDesc}
${context ? `\nCONTEXT/OCCASION: ${context}` : ''}

CRITICAL STYLE INSTRUCTIONS:
- ${languageInstruction}
- Tone: ${verbalDNA.tone}
${emojiInstruction ? `- ${emojiInstruction}` : ''}
- Length: ${lengthInstruction}
${verbalDNA.formatting_quirks ? `- Formatting: ${verbalDNA.formatting_quirks}` : ''}
${verbalDNA.cta_style ? `- CTA style: ${verbalDNA.cta_style}` : ''}
${verbalDNA.signature_hashtags?.length ? `- Hashtags: #${verbalDNA.signature_hashtags.slice(0, 4).join(' #')}` : ''}
${fewShotExamples}

RULES:
1. No quotation marks around the caption
2. Just output the caption, no explanations
3. Sound HUMAN, not AI - use patterns from the examples
4. Match the brand's personality exactly

Generate the caption now:`;

  console.log(`[CAPTION] Generating in ${primaryLanguage} with ${exemplars.length} exemplars`);

  const result = await model.generateContent(prompt);
  const caption = result.response.text().trim();

  return caption.replace(/^["']|["']$/g, '').replace(/^Caption:\s*/i, '');
}
