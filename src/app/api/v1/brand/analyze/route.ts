import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { BrandDNA, SocialSource, LightingStyle, FramingStyle, TextureBias, HumanPresence, VoiceTone, LanguageStyle, VerbalDNA, CaptionStructure, AddressStyle, PrimaryLanguage } from '@/types';

const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    return {
      data: base64,
      mimeType: contentType,
    };
  } catch (error) {
    console.error('Error fetching image:', url, error);
    return null;
  }
}

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
        { error: 'Service d\'analyse non configuré' },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { imageUrls, captions, source, socialHandle } = body as {
      imageUrls: string[];
      captions?: string[];
      source: SocialSource;
      socialHandle?: string;
    };

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une image est requise' },
        { status: 400 }
      );
    }

    if (imageUrls.length < 3) {
      return NextResponse.json(
        { error: 'Au moins 3 images sont nécessaires pour une analyse précise' },
        { status: 400 }
      );
    }

    // Fetch up to 12 images and convert to base64
    const imagesToAnalyze = imageUrls.slice(0, 12);
    const imagePromises = imagesToAnalyze.map(url => fetchImageAsBase64(url));
    const images = (await Promise.all(imagePromises)).filter(Boolean);

    if (images.length < 3) {
      return NextResponse.json(
        { error: 'Impossible de charger suffisamment d\'images' },
        { status: 400 }
      );
    }

    // Use Gemini 3 Flash for analysis
    const model = genAI.getGenerativeModel({
      model: 'gemini-3-flash-preview',
    });

    // Brand DNA extraction prompt - Technical prompt for AI generation pipeline
    const prompt = `Tu es un expert en branding et direction artistique pour une plateforme de génération d'images IA (Stable Diffusion).

Analyse ces ${images.length} images du feed social d'une marque africaine/sénégalaise.
Tu dois extraire le "Brand DNA" - les tokens et paramètres techniques qui permettront de répliquer le style visuel de cette marque.

IMPORTANT: Tu extrais des PARAMETRES TECHNIQUES pour un pipeline de génération d'images, pas juste une description.

Retourne un objet JSON avec cette structure EXACTE:

{
  "palette": {
    "primary": "#HEXCODE",
    "secondary": "#HEXCODE",
    "accent": "#HEXCODE",
    "primaryName": "nom de la couleur en français",
    "secondaryName": "nom de la couleur en français",
    "accentName": "nom de la couleur en français"
  },
  "visual_tokens": ["token1", "token2", "token3", "token4", "token5"],
  "photography_settings": {
    "lighting": "VALEUR",
    "framing": "VALEUR",
    "texture_bias": "VALEUR",
    "human_presence": "VALEUR",
    "demographic": "description démographique si humains présents"
  },
  "voice_profile": {
    "tone": "VALEUR",
    "language_style": "VALEUR"
  },
  "vibe_summary": "description courte du style global en français"
}

VALEURS POSSIBLES:

lighting (éclairage dominant):
- "studio_soft" = éclairage studio diffus, ombres douces
- "studio_hard" = flash direct, ombres marquées
- "natural_sunlight" = lumière naturelle directe
- "golden_hour" = lumière dorée chaleureuse
- "neon_night" = ambiance néon/nocturne
- "overcast_diffused" = lumière nuageuse douce

framing (composition dominante):
- "minimalist_centered" = produit centré, fond épuré
- "flat_lay" = vue du dessus, arrangement plat
- "low_angle_lifestyle" = angle bas, mode lifestyle
- "close_up_detail" = gros plans sur détails
- "chaotic_lifestyle" = composition dynamique, lifestyle
- "editorial_fashion" = style éditorial mode

texture_bias (rendu des textures):
- "clean_matte" = surfaces mattes propres
- "glossy_polished" = brillant, surfaces polies
- "gritty_film" = grain film, texture brute
- "organic_natural" = textures naturelles, organiques
- "high_contrast" = contrastes forts noir/blanc

human_presence (présence humaine):
- "product_only" = que le produit
- "hands_only" = mains seulement
- "partial_body" = corps partiel
- "full_body" = corps entier
- "face_included" = visages inclus

tone (ton de communication):
- "professional" = professionnel, corporate
- "playful" = joueur, fun
- "inspiring" = inspirant, aspirationnel
- "luxurious" = luxueux, premium
- "friendly" = amical, accessible

language_style (style de langage):
- "fr_sn_urban" = français sénégalais urbain moderne
- "fr_sn_wolof_mix" = mélange français/wolof
- "fr_classic" = français classique
- "en_casual" = anglais décontracté
- "en_professional" = anglais professionnel

INSTRUCTIONS SPECIFIQUES:

1. PALETTE: Identifie les 3 couleurs les plus récurrentes et impactantes. Primary = couleur dominante, Secondary = couleur d'accompagnement, Accent = couleur de contraste/pop.

2. VISUAL_TOKENS: Extrais 5-8 mots-clés qui peuvent être injectés directement dans un prompt Stable Diffusion. Exemples: "minimalist", "luxury", "warm tones", "african heritage", "gold accents", "high fashion", "street style", "vintage film".

3. PHOTOGRAPHY_SETTINGS: Analyse techniquement les photos pour identifier les paramètres dominants. Ces valeurs seront utilisées pour configurer les LoRAs et ControlNets.

4. VIBE_SUMMARY: Une phrase qui résume l'identité visuelle (ex: "Luxe Minimaliste avec Héritage Africain").

NE PAS extraire:
- Logos spécifiques (gérés en post-processing)
- Polices de caractères (l'IA ne peut pas les reproduire)
- Visages spécifiques (sauf si tu décris le type démographique)

Retourne UNIQUEMENT du JSON valide, pas de markdown ni d'explication.`;

    // Build the content array with images
    const contentParts: Array<{ inlineData: { mimeType: string; data: string } } | string> = [];

    for (const img of images) {
      if (img) {
        contentParts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data,
          },
        });
      }
    }

    contentParts.push(prompt);

    const result = await model.generateContent(contentParts);
    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in brand analysis response:', text);
      return NextResponse.json(
        { error: 'Analyse échouée - réponse invalide' },
        { status: 500 }
      );
    }

    const analysisResult = JSON.parse(jsonMatch[0]);

    // Validate and construct the brand DNA (visual part)
    const brandDNA: BrandDNA = {
      source: source || 'photos',
      socialHandle: socialHandle,
      sourceImageUrls: imagesToAnalyze,
      analyzedAt: new Date().toISOString(),
      palette: {
        primary: analysisResult.palette?.primary || '#000000',
        secondary: analysisResult.palette?.secondary || '#FFFFFF',
        accent: analysisResult.palette?.accent || '#FF0000',
        primaryName: analysisResult.palette?.primaryName,
        secondaryName: analysisResult.palette?.secondaryName,
        accentName: analysisResult.palette?.accentName,
      },
      visual_tokens: analysisResult.visual_tokens || [],
      photography_settings: {
        lighting: (analysisResult.photography_settings?.lighting || 'natural_sunlight') as LightingStyle,
        framing: (analysisResult.photography_settings?.framing || 'minimalist_centered') as FramingStyle,
        texture_bias: (analysisResult.photography_settings?.texture_bias || 'clean_matte') as TextureBias,
        human_presence: (analysisResult.photography_settings?.human_presence || 'product_only') as HumanPresence,
        demographic: analysisResult.photography_settings?.demographic,
      },
      voice_profile: {
        tone: (analysisResult.voice_profile?.tone || 'professional') as VoiceTone,
        language_style: (analysisResult.voice_profile?.language_style || 'fr_classic') as LanguageStyle,
      },
      vibe_summary: analysisResult.vibe_summary || 'Style moderne africain',
    };

    // Analyze Verbal DNA if captions are provided
    if (captions && captions.length >= 3) {
      try {
        const verbalDNA = await analyzeVerbalDNA(captions, model);
        if (verbalDNA) {
          brandDNA.verbal_dna = verbalDNA;
        }
      } catch (error) {
        console.error('Verbal DNA analysis error:', error);
        // Continue without verbal DNA
      }
    }

    // Generate French summary
    try {
      const summary = await generateFrenchSummary(brandDNA, model);
      if (summary) {
        brandDNA.analysis_summary_fr = summary;
      }
    } catch (error) {
      console.error('Summary generation error:', error);
      // Continue without summary
    }

    return NextResponse.json({
      success: true,
      brandDNA,
    });

  } catch (error) {
    console.error('Brand analysis error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'analyse de la marque' },
      { status: 500 }
    );
  }
}

/**
 * Analyze Verbal DNA from captions - Extract the "Style Palette" for text
 * This is critical for generating captions that sound like the actual brand
 */
async function analyzeVerbalDNA(captions: string[], model: any): Promise<VerbalDNA | null> {
  // Clean captions (remove empty strings, limit to 12)
  const cleanCaptions = captions
    .filter(c => c && c.trim().length > 0)
    .slice(0, 12);

  if (cleanCaptions.length < 3) {
    return null;
  }

  const captionsCorpus = cleanCaptions.join('\n\n---\n\n');

  // Use a specialized linguistic analysis prompt
  const prompt = `You are a Linguistic Analyst specializing in Social Media for the African market.
Analyze these ${cleanCaptions.length} Instagram captions from a brand.

YOUR TASK: Extract their "Verbal DNA" - the exact patterns that make their writing unique.
This will be used to generate captions that sound EXACTLY like them, not like generic AI.

CAPTIONS TO ANALYZE:
${captionsCorpus}

Return a JSON object with this EXACT structure:

{
  "primary_language": "VALUE",
  "tone": "Descriptive tone (e.g., 'Warm & Playful', 'Premium & Elegant', 'Hype & Energetic')",
  "tone_adjectives": ["adjective1", "adjective2", "adjective3"],
  "address_style": "VALUE",
  "language_mix": "Detailed description of language mixing patterns",
  "wolof_expressions": ["expression1", "expression2"],
  "emoji_palette": ["emoji1", "emoji2", "emoji3", "emoji4", "emoji5"],
  "emoji_frequency": "VALUE",
  "caption_structure": "VALUE",
  "typical_length": "VALUE",
  "formatting_quirks": "Description of formatting habits (e.g., 'Uses ALL CAPS for emphasis', 'Line breaks between sentences')",
  "uses_hashtags_in_caption": true/false,
  "signature_hashtags": ["hashtag1", "hashtag2"],
  "signature_phrases": ["phrase1", "phrase2"],
  "cta_style": "Description of how they sell (e.g., 'Soft - Link in bio', 'Aggressive - DM now before sold out!')",
  "exemplars": ["best_caption_1", "best_caption_2", "best_caption_3"]
}

CRITICAL VALUES TO DETECT:

primary_language (THE MAIN LANGUAGE THEY WRITE IN - MOST IMPORTANT):
- "english" = Captions are primarily in English
- "french" = Captions are primarily in French
- "french_wolof_mix" = Mix of French and Wolof
- "wolof_dominant" = Mostly Wolof with some French/English
- "arabic_mix" = Arabic mixed with French/English

address_style (for French speakers):
- "tutoiement" = Tu, Toi, Ton/Ta (casual, community-like)
- "vouvoiement" = Vous, Votre (formal, respectful)
- "mixed" = Both depending on context

emoji_frequency:
- "heavy" = 3+ emojis per caption, very expressive
- "moderate" = 1-2 emojis per caption
- "minimal" = Occasional emojis
- "none" = No emojis

caption_structure:
- "storytelling" = Narrative style, tells a story
- "bullet_points" = Lists features/benefits
- "short_punchline" = Short punchy phrases
- "question_hook" = Starts with a question
- "quote_based" = Uses quotes or testimonials

typical_length:
- "short" = Under 50 words (1-2 sentences)
- "medium" = 50-100 words (3-5 sentences)
- "long" = 100+ words (storytelling, paragraphs)

INSTRUCTIONS:

1. PRIMARY_LANGUAGE: CRITICAL! If captions are mostly in English, set to "english". If French, set to "french". Don't assume French just because the brand is African.

2. TONE_ADJECTIVES: 2-4 words that describe their voice (Friendly, Luxurious, Casual, etc.)

3. EMOJI_PALETTE: Extract the 5-8 most used emojis. Each brand has a "signature set" they use repeatedly.

4. FORMATTING_QUIRKS: Note any habits like:
   - ALL CAPS usage
   - Bullet points
   - Line breaks style
   - Punctuation habits (!!!, ...)

5. EXEMPLARS (MOST IMPORTANT): Select the 3 BEST captions that most represent their unique style. These will be used as few-shot examples to teach the AI their voice.

6. CTA_STYLE: How do they encourage action? Soft ("Link in bio") vs Aggressive ("DM NOW before it's gone!")

Return ONLY valid JSON, no markdown or explanation.`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text();

  // Parse JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('No JSON found in verbal DNA response:', responseText);
    return null;
  }

  const verbalResult = JSON.parse(jsonMatch[0]);

  // Construct VerbalDNA object with new schema
  const verbalDNA: VerbalDNA = {
    // Voice & Tone
    tone: verbalResult.tone || 'Professional',
    tone_adjectives: verbalResult.tone_adjectives || ['Professional'],
    address_style: (verbalResult.address_style || 'mixed') as AddressStyle,

    // Primary Language Detection (CRITICAL)
    primary_language: (verbalResult.primary_language || 'french') as PrimaryLanguage,
    language_mix: verbalResult.language_mix || 'Standard French',
    wolof_expressions: verbalResult.wolof_expressions || [],

    // Emoji Fingerprint
    emoji_palette: verbalResult.emoji_palette || [],
    emoji_frequency: verbalResult.emoji_frequency || 'moderate',

    // Structural Habits
    caption_structure: (verbalResult.caption_structure || 'short_punchline') as CaptionStructure,
    typical_length: verbalResult.typical_length || 'short',
    formatting_quirks: verbalResult.formatting_quirks || 'Standard formatting',
    uses_hashtags_in_caption: verbalResult.uses_hashtags_in_caption ?? true,

    // Recurring Elements
    signature_hashtags: verbalResult.signature_hashtags || [],
    signature_phrases: verbalResult.signature_phrases || [],
    cta_style: verbalResult.cta_style || 'Soft - Link in bio',

    // FEW-SHOT EXEMPLARS (The most important part!)
    exemplars: verbalResult.exemplars || cleanCaptions.slice(0, 3),

    // All captions for reference
    example_captions: cleanCaptions,
  };

  console.log(`[VERBAL_DNA] Detected language: ${verbalDNA.primary_language}, tone: ${verbalDNA.tone}`);
  console.log(`[VERBAL_DNA] Exemplars: ${verbalDNA.exemplars.length}`);

  return verbalDNA;
}

/**
 * Generate a French summary that makes the user feel understood
 */
async function generateFrenchSummary(brandDNA: BrandDNA, model: any): Promise<string | null> {
  const prompt = `Tu es un directeur artistique qui vient d'analyser l'identité visuelle d'une marque sénégalaise.

Voici les résultats de ton analyse:
- Couleurs: ${brandDNA.palette.primaryName || 'dominante'}, ${brandDNA.palette.secondaryName || 'secondaire'}, ${brandDNA.palette.accentName || 'accent'}
- Style visuel: ${brandDNA.visual_tokens.join(', ')}
- Éclairage préféré: ${brandDNA.photography_settings.lighting}
- Composition: ${brandDNA.photography_settings.framing}
- Résumé du vibe: ${brandDNA.vibe_summary}
${brandDNA.verbal_dna ? `- Ton de communication: ${brandDNA.verbal_dna.tone}` : ''}
${brandDNA.verbal_dna ? `- Style linguistique: ${brandDNA.verbal_dna.language_mix}` : ''}

Écris un paragraphe chaleureux en français (3-4 phrases) qui résume cette identité de marque.
Le ton doit être:
- Professionnel mais accessible
- Valorisant pour le créateur/la marque
- Spécifique (pas générique)

Commence par "Votre marque..." ou "J'ai analysé votre univers..." et termine par quelque chose d'encourageant.

Retourne UNIQUEMENT le paragraphe, pas de guillemets ni de formatage.`;

  const result = await model.generateContent(prompt);
  const summary = result.response.text().trim();

  // Remove any quotes if present
  return summary.replace(/^["']|["']$/g, '');
}
