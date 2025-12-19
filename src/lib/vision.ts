import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini 2.5 Flash-Lite for vision analysis
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

export interface ProductAnalysis {
  category: string;
  subcategory: string;
  name: string;
  colors: string[];
  materials: string[];
  style: string;
  suggestedContexts: string[];
  suggestedPlacements?: ('table' | 'model' | 'floor' | 'shelf' | 'hanging')[];
  description: string;
  keywords?: string[];
}

export interface ConversationContext {
  productAnalysis: ProductAnalysis | null;
  selectedPlacement: string | null;
  selectedBackground: string | null;
  selectedStyle: string | null;
  customInstructions: string | null;
}

/**
 * Analyze a product image using Gemini 2.5 Flash-Lite
 * Returns structured metadata about the product
 */
export async function analyzeProduct(imageBase64: string, mimeType: string): Promise<ProductAnalysis> {
  if (!genAI) {
    throw new Error('Gemini API not configured');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
  });

  const prompt = `Tu es un assistant photographe professionnel pour une plateforme e-commerce africaine.

Analyse cette image de produit et retourne un objet JSON avec la structure suivante.
IMPORTANT: Toutes les valeurs doivent être en FRANÇAIS.

{
  "category": "catégorie principale (Mode, Alimentation, Beauté, Électronique, Maison, Autre)",
  "subcategory": "type spécifique en français (ex: Sac à main, Chaussures, Robe, Jus, Parfum)",
  "name": "nom descriptif du produit en français",
  "colors": ["tableau des couleurs dominantes en français"],
  "materials": ["tableau des matériaux visibles en français (cuir, tissu, plastique, verre, etc.)"],
  "style": "description du style en français (élégant, décontracté, traditionnel, moderne, luxueux)",
  "suggestedContexts": ["tableau de 3-5 contextes photo suggérés en français"],
  "suggestedPlacements": ["options de placement: table, model, floor, shelf, hanging"],
  "description": "une phrase de description de ce que tu vois, en français",
  "keywords": ["tableau de 5-10 mots-clés en français pour ce produit"]
}

Concentre-toi sur ce qui mettrait ce produit en valeur dans un contexte sénégalais/africain.
Retourne UNIQUEMENT du JSON valide, pas de markdown ni d'explication.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const response = result.response;
    const text = response.text();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const analysis = JSON.parse(jsonMatch[0]) as ProductAnalysis;
    return analysis;
  } catch (error) {
    console.error('Product analysis error:', error);
    // Return default analysis on error (in French)
    return {
      category: 'Autre',
      subcategory: 'Produit',
      name: 'Produit',
      colors: ['inconnu'],
      materials: ['inconnu'],
      style: 'moderne',
      suggestedContexts: ['Studio blanc', 'Table en bois', 'Extérieur'],
      suggestedPlacements: ['table'],
      description: 'Une image de produit',
      keywords: ['produit'],
    };
  }
}

/**
 * Generate conversational response based on product analysis
 */
export async function generateConversation(
  context: ConversationContext,
  userMessage?: string
): Promise<{ message: string; options?: { id: string; label: string; icon?: string }[]; step: string }> {
  if (!genAI) {
    throw new Error('Gemini API not configured');
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
  });

  // Determine conversation step
  if (!context.productAnalysis) {
    return {
      message: "Bienvenue dans votre studio photo! Uploadez une photo de votre produit pour commencer.",
      step: 'upload',
    };
  }

  if (!context.selectedPlacement) {
    const placements = context.productAnalysis.suggestedPlacements || ['table', 'model'];
    const placementOptions = {
      table: { label: 'Sur une table', icon: '🪑' },
      model: { label: 'Porté par un mannequin', icon: '👤' },
      floor: { label: 'Au sol', icon: '⬇️' },
      shelf: { label: 'Sur une étagère', icon: '📚' },
      hanging: { label: 'Suspendu', icon: '🪝' },
    };

    return {
      message: `Je vois ${context.productAnalysis.description}. C'est ${context.productAnalysis.style}! Comment voulez-vous le présenter?`,
      options: placements.map(p => ({
        id: p,
        label: placementOptions[p]?.label || p,
        icon: placementOptions[p]?.icon,
      })),
      step: 'placement',
    };
  }

  if (!context.selectedBackground) {
    return {
      message: `Parfait! Où voulez-vous photographier votre ${context.productAnalysis.subcategory.toLowerCase()}?`,
      options: [
        { id: 'studio', label: 'Studio professionnel', icon: '📸' },
        { id: 'real-place', label: 'Lieu réel au Sénégal', icon: '🇸🇳' },
        { id: 'lifestyle', label: 'Ambiance lifestyle', icon: '✨' },
      ],
      step: 'background-type',
    };
  }

  if (!context.selectedStyle) {
    return {
      message: "Quel style de photo préférez-vous?",
      options: [
        { id: 'clean', label: 'Clean & Minimal', icon: '⚪' },
        { id: 'warm', label: 'Chaleureux & Naturel', icon: '🌅' },
        { id: 'vibrant', label: 'Vibrant & Coloré', icon: '🎨' },
        { id: 'luxe', label: 'Luxe & Élégant', icon: '💎' },
      ],
      step: 'style',
    };
  }

  return {
    message: "Parfait! Je prépare votre photo...",
    step: 'ready',
  };
}

/**
 * Build the final generation prompt from conversation context
 */
export function buildHarmonizationPrompt(
  context: ConversationContext,
  backgroundMetadata?: { name: string; lighting: string; mood: string; promptHints?: string | null }
): string {
  const { productAnalysis, selectedPlacement, selectedStyle } = context;

  if (!productAnalysis) {
    return 'Professional product photography';
  }

  const styleMap: Record<string, string> = {
    clean: 'clean minimal white background, soft diffused lighting, no shadows, professional product photography',
    warm: 'warm natural lighting, golden hour feel, organic textures, inviting atmosphere',
    vibrant: 'vibrant colors, dynamic composition, energetic mood, bold contrasts',
    luxe: 'luxury aesthetic, dramatic lighting, rich textures, elegant composition, high-end feel',
  };

  const placementMap: Record<string, string> = {
    table: 'placed elegantly on a surface',
    model: 'worn/held by a person',
    floor: 'placed on the ground with artistic composition',
    shelf: 'displayed on a shelf or display case',
    hanging: 'suspended or hanging with dramatic effect',
  };

  let prompt = `Professional product photography of a ${productAnalysis.subcategory.toLowerCase()}.`;
  prompt += ` ${productAnalysis.colors.join(' and ')} ${productAnalysis.materials.join(' and ')} product.`;
  prompt += ` ${placementMap[selectedPlacement || 'table']}.`;
  prompt += ` ${styleMap[selectedStyle || 'clean']}.`;

  if (backgroundMetadata) {
    prompt += ` Shot at ${backgroundMetadata.name} with ${backgroundMetadata.lighting} lighting, ${backgroundMetadata.mood} mood.`;
    if (backgroundMetadata.promptHints) {
      prompt += ` ${backgroundMetadata.promptHints}`;
    }
  }

  prompt += ' Senegalese/African context. High quality, 4K, detailed.';

  return prompt;
}
