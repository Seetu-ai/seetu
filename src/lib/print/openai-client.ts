/**
 * AI Integration for Print Chat & Order Extraction
 * Uses Google Gemini (same as Seetu's other AI features)
 * Ported prompts from Blooprint's Python backend
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const GEMINI_API_KEY = process.env.GOOGLE_AI_API_KEY;
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Use Gemini Flash for fast responses (same model as rest of Seetu)
const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * System prompt for Bloo - the Blooprint AI assistant
 */
export const SYSTEM_PROMPT = `Tu es Bloo, l'assistant intelligent de Blooprint - la plateforme d'impression #1 au Sénégal.

🧠 INTELLIGENCE & MÉMOIRE:
Tu as une mémoire parfaite. Tout ce que le client dit est enregistré et ne doit JAMAIS être redemandé.
- "50 t-shirts et casquettes" = 50 t-shirts + 50 casquettes (implicite: même quantité)
- "J'ai un logo" puis fichier envoyé = CE fichier est LE logo pour TOUS les produits mentionnés
- Contexte cumulatif: chaque message AJOUTE aux infos, ne remplace pas

⚠️ CATALOGUE - RÈGLE ABSOLUE:
Tu ne dois proposer QUE les produits listés dans le "CATALOGUE PRODUITS" qui te sera fourni ci-dessous.
- Si un produit n'est PAS dans ce catalogue, dis: "Ce produit n'est pas disponible dans notre catalogue actuel. Voici ce que je peux te proposer: [liste des produits similaires du catalogue]"
- NE JAMAIS inventer des produits ou proposer des choses hors catalogue
- Quand le client demande "qu'est-ce que vous avez?" ou "quels produits?", liste UNIQUEMENT les catégories et produits du catalogue fourni

💬 STYLE DE RÉPONSE:
- 1-2 phrases MAX. Jamais de listes à puces. Naturel et pro.
- Confirme ce que tu as compris, puis pose UNE question sur ce qui manque
- Quand tout est clair: "Parfait! Ta commande: [résumé]. On peut lancer?"

📎 FICHIERS & DESIGNS:

⚠️ CRITIQUE - DISTINGUE CES 2 CAS:

CAS 1 - Le client DIT avoir un fichier ("j'ai un logo", "j'ai un fichier pdf", "j'ai le design"):
→ Il ne l'a PAS encore envoyé! Tu ne VOIS rien.
→ Réponse: "Super! Envoie-le moi via l'icône 📎 ou glisse-le dans le chat."
→ NE JAMAIS décrire un fichier que tu n'as pas reçu!

CAS 2 - Le client ENVOIE vraiment un fichier (tu vois une image dans le message):
→ Là tu peux le décrire: "Super design! Je vois [description du logo/visuel]..."
→ C'est LE design pour TOUS les produits en cours
→ Déduis les couleurs produits du design

COMMENT SAVOIR? Si tu vois une image/fichier joint au message = envoyé. Sinon = juste mentionné.

🎯 FLUX OPTIMAL:
Message 1: Produit(s) + quantité → "Noté! Tu as un design ou tu veux qu'on t'aide?"
Message 2a: "J'ai un fichier" (sans pièce jointe) → "Parfait! Envoie-le via 📎"
Message 2b: Fichier vraiment envoyé (image visible) → "Super design! [description]. Tailles?"
Message 3: Tailles → "Parfait! [récap complet]. Je lance le devis?"

⚠️ RÈGLES STRICTES:
- NE JAMAIS demander ce qu'on sait déjà
- UN fichier = pour TOUS les produits (sauf indication contraire explicite)
- "X de chaque" ou "X [produit1] et [produit2]" = quantité X pour chaque produit
- Si le client dit quelque chose d'incohérent, clarifie gentiment sans perdre les infos précédentes
- Devise: FCFA. Livraison: Dakar par défaut.`;

/**
 * Prompt for extracting order details from conversation
 */
export const ORDER_EXTRACTION_PROMPT = `Tu dois extraire les détails de commande de cette conversation en JSON.

RÈGLES CRITIQUES:
1. file_uploaded = true UNIQUEMENT si un fichier a été RÉELLEMENT ENVOYÉ (image visible dans conversation)
   - "j'ai un fichier" ou "j'ai un logo" SANS pièce jointe = file_uploaded: false (il a juste MENTIONNÉ avoir un fichier)
   - Fichier réellement joint/visible dans le message = file_uploaded: true
2. "X de chaque" ou "X produit1 et produit2" = quantité X pour CHAQUE produit (PAS de multiplication)
3. Extrait TOUT ce qui a été dit, même si dispersé dans plusieurs messages
4. Ne devine pas - extrait uniquement ce qui est explicitement dit ou clairement implicite

CORRESPONDANCE PRODUITS (normalise les noms, CORRIGE LES FAUTES):
- "tshirt", "t shirt", "tee-shirt", "t-shirt", "teeshirt" → "T-shirt"
- "casquette", "casquettes", "casquete", "casquijette", "casquijettes", "cap", "chapeau" → "Casquette"
- "polo", "polos" → "Polo"
- "carte de visite", "cartes visite", "cartes de visites", "business card", "cdv" → "Cartes de visite"
- "flyer", "flyers", "tract", "tracts", "prospectus" → "Flyers"
- "affiche", "affiches", "poster", "posters" → "Affiche"
- "bache", "bâche", "baches", "bannière", "banderole" → "Bâche"
- "rollup", "roll-up", "roll up", "roller", "enrouleur" → "Roll-up"
- "boite", "boîte", "boites", "packaging", "emballage" → "Boîte personnalisée"
- "depliant", "dépliant", "depliants", "brochure" → "Dépliant"

IMPORTANT: Même avec des fautes de frappe, déduis le produit correct. Ex: "casquijettes" = "Casquette"

FORMAT JSON REQUIS:
{
    "items": [
        {
            "product_name": "Nom normalisé du produit",
            "product_type": "textile|papier|grand_format|packaging",
            "quantity": 50,
            "specifications": {
                "sizes": {"S": 10, "M": 20, "L": 15, "XL": 5},
                "color": "couleur si mentionnée",
                "finish": "mat|brillant|soft-touch",
                "dimensions": "A4, A5, etc.",
                "print_type": "broderie|serigraphie|impression",
                "sides": "recto|recto-verso"
            },
            "file_uploaded": true,
            "file_description": "description du fichier uploadé",
            "design_brief": "UNIQUEMENT les éléments CONCRETS du design: texte exact, couleurs, symboles, images, style. Ex: 'drapeau Sénégal, texte ALBAD, couleurs vert jaune rouge'. DOIT ÊTRE VIDE si le client dit juste 'je veux de l'aide' ou 'faites-le pour moi' SANS préciser quoi mettre sur le produit. Ne PAS mettre des phrases comme 'le client veut de l'aide' - seulement les éléments visuels concrets."
        }
    ],
    "design_applies_to_all": true,
    "delivery_address": "adresse si mentionnée",
    "delivery_city": "Dakar",
    "delivery_notes": "instructions spéciales",
    "confidence": 0.8,
    "order_complete": true,
    "missing_info": ["tailles pour t-shirts"],
    "conversation_summary": "50 t-shirts et 10 casquettes avec logo"
}

Analyse TOUTE la conversation et retourne UNIQUEMENT le JSON valide, rien d'autre.`;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ExtractedItem {
  product_name: string;
  product_type?: string;
  quantity: number;
  specifications?: Record<string, unknown>;
  file_uploaded?: boolean;
  file_description?: string;
  design_brief?: string;
  matched_product_id?: string;
  confidence?: number;
}

export interface ExtractedOrder {
  items: ExtractedItem[];
  design_applies_to_all?: boolean;
  delivery_address?: string;
  delivery_city?: string;
  delivery_notes?: string;
  confidence: number;
  order_complete: boolean;
  missing_info?: string[];
  conversation_summary?: string;
}

/**
 * Build brand context for system prompt
 */
export function buildBrandContext(brand: {
  name: string;
  industry?: string;
  color_palette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  typography?: {
    heading_font?: string;
    body_font?: string;
  };
  preferred_styles?: string[];
  avoid_elements?: string[];
  ai_style_prompt?: string;
  brand_voice?: string;
  ai_color_mode?: string;
}): string {
  if (!brand) return '';

  const parts: string[] = ['\n\n=== BRAND CONTEXT ==='];
  parts.push(`You are helping design for: ${brand.name}`);

  if (brand.industry) {
    parts.push(`Industry: ${brand.industry}`);
  }

  const colorPalette = brand.color_palette;
  if (colorPalette) {
    const colors: string[] = [];
    if (colorPalette.primary) colors.push(`Primary: ${colorPalette.primary}`);
    if (colorPalette.secondary) colors.push(`Secondary: ${colorPalette.secondary}`);
    if (colorPalette.accent) colors.push(`Accent: ${colorPalette.accent}`);
    if (colors.length > 0) {
      const aiMode = brand.ai_color_mode || 'exact';
      if (aiMode === 'exact') {
        parts.push(`Brand colors (USE EXACTLY): ${colors.join(', ')}`);
      } else {
        parts.push(`Brand colors (inspiration): ${colors.join(', ')}`);
      }
    }
  }

  const typography = brand.typography;
  if (typography?.heading_font || typography?.body_font) {
    const fonts: string[] = [];
    if (typography.heading_font) fonts.push(`Headings: ${typography.heading_font}`);
    if (typography.body_font) fonts.push(`Body: ${typography.body_font}`);
    parts.push(`Typography: ${fonts.join(', ')}`);
  }

  if (brand.preferred_styles?.length) {
    parts.push(`Style: ${brand.preferred_styles.join(', ')}`);
  }

  if (brand.avoid_elements?.length) {
    parts.push(`AVOID: ${brand.avoid_elements.join(', ')}`);
  }

  if (brand.ai_style_prompt) {
    parts.push(`Design guidelines: ${brand.ai_style_prompt}`);
  }

  if (brand.brand_voice) {
    parts.push(`Tone: ${brand.brand_voice}`);
  }

  parts.push('=== END BRAND CONTEXT ===\n');

  return parts.join('\n');
}

/**
 * Build product catalog context from database products
 */
export function buildProductCatalog(products: Array<{
  name: string;
  base_price?: number;
  min_quantity?: number;
  available_print_techniques?: string[];
  specifications?: Record<string, unknown>;
  category?: { name: string; parent?: { name: string } };
}>): string {
  if (!products?.length) {
    return '\n\n⚠️ CATALOGUE VIDE: Aucun produit n\'est actuellement disponible dans la base de données. Dis au client: "Notre catalogue est en cours de mise à jour. Contactez-nous directement pour vos besoins."';
  }

  const techniqueLabels: Record<string, string> = {
    screen_print: 'Sérigraphie',
    embroidery: 'Broderie',
    dtg: 'DTG',
    sublimation: 'Sublimation',
    vinyl: 'Flocage',
    offset: 'Offset',
    digital: 'Numérique',
    uv: 'UV',
    laser: 'Gravure Laser',
  };

  const byCategory: Record<string, typeof products> = {};
  for (const p of products) {
    let catName = p.category?.name || 'Autres';
    if (p.category?.parent?.name) {
      catName = `${p.category.parent.name} > ${catName}`;
    }
    if (!byCategory[catName]) byCategory[catName] = [];
    byCategory[catName].push(p);
  }

  const parts: string[] = ['\n\n📦 CATALOGUE PRODUITS (dynamique depuis la base):'];

  for (const [catName, catProducts] of Object.entries(byCategory).sort()) {
    parts.push(`\n${catName.toUpperCase()}:`);
    for (const p of catProducts) {
      let line = `- ${p.name}`;
      if (p.base_price && p.base_price > 0) {
        line += ` (à partir de ${p.base_price.toLocaleString('fr-FR')} FCFA)`;
      }
      if (p.min_quantity && p.min_quantity > 1) {
        line += `, min: ${p.min_quantity}`;
      }
      if (p.available_print_techniques?.length) {
        const techNames = p.available_print_techniques
          .slice(0, 3)
          .map(t => techniqueLabels[t] || t);
        line += ` | Techniques: ${techNames.join(', ')}`;
      }
      const specs = p.specifications || {};
      if (specs.dimensions) {
        line += ` | ${specs.dimensions}`;
      }
      if (specs.sizes) {
        line += ` | Tailles dispo`;
      }
      parts.push(line);
    }
  }

  parts.push('\n🚫 RÈGLE STRICTE - PRODUITS HORS CATALOGUE:');
  parts.push('Si le client demande un produit qui N\'EST PAS dans la liste ci-dessus:');
  parts.push('1. Ne propose JAMAIS ce produit');
  parts.push('2. Réponds: "Ce produit n\'est pas disponible dans notre catalogue. Je peux te proposer: [liste 2-3 alternatives du catalogue ci-dessus]"');
  parts.push('3. Si aucune alternative, dis: "Malheureusement ce produit n\'est pas dans notre catalogue actuel."');
  parts.push('\n✅ QUAND ON DEMANDE "quels produits avez-vous?" ou "qu\'est-ce que vous proposez?":');
  parts.push('Liste les CATÉGORIES ci-dessus avec quelques exemples de chaque. Ne cite QUE les produits listés!');

  return parts.join('\n');
}

/**
 * Send a chat message and get AI response using Gemini
 */
export async function chat(
  messages: ChatMessage[],
  options?: {
    imageUrls?: string[];
    brandContext?: string;
    productCatalog?: string;
  }
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API not configured - missing GOOGLE_AI_API_KEY');
  }

  // Build full system prompt
  let systemContent = SYSTEM_PROMPT;
  if (options?.productCatalog) {
    systemContent += options.productCatalog;
  }
  if (options?.brandContext) {
    systemContent += options.brandContext;
  }

  // Create model with system instruction
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: systemContent,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024, // Increased to prevent cut-off responses
    },
  });

  // Convert messages to Gemini format (alternating user/model)
  // Exclude the last user message as we'll send it separately
  const allUserMessages = messages.filter(m => m.role === 'user');
  const lastUserMsg = allUserMessages.pop();

  if (!lastUserMsg) {
    throw new Error('No user message to respond to');
  }

  const history: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];

  for (const msg of messages.slice(0, -1)) {
    if (msg.role === 'user') {
      history.push({ role: 'user', parts: [{ text: msg.content }] });
    } else if (msg.role === 'assistant') {
      history.push({ role: 'model', parts: [{ text: msg.content }] });
    }
  }

  // Start chat with history
  const chatSession = model.startChat({ history });

  const result = await chatSession.sendMessage(lastUserMsg.content);
  return result.response.text();
}

/**
 * Extract order details from conversation using Gemini
 */
export async function extractOrder(messages: ChatMessage[]): Promise<ExtractedOrder> {
  if (!genAI) {
    throw new Error('Gemini API not configured - missing GOOGLE_AI_API_KEY');
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1500,
      responseMimeType: 'application/json',
    },
  });

  // Build conversation context
  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `${SYSTEM_PROMPT}

CONVERSATION:
${conversationText}

${ORDER_EXTRACTION_PROMPT}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      items: [],
      confidence: 0,
      order_complete: false,
      missing_info: ['Could not parse order'],
    };
  }

  return JSON.parse(jsonMatch[0]) as ExtractedOrder;
}

/**
 * Match a product description to catalog items using Gemini
 */
export async function matchProduct(
  description: string,
  catalog: Array<{ id: string; name: string; slug: string }>
): Promise<{
  matched_product_id: string | null;
  matched_product_name: string | null;
  confidence: number;
  specifications_inferred: Record<string, unknown>;
} | null> {
  if (!genAI) {
    throw new Error('Gemini API not configured');
  }

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
  });

  const catalogStr = JSON.stringify(catalog, null, 2);

  const prompt = `Given this product description: "${description}"

Match it to the best product from this catalog:
${catalogStr}

Return JSON:
{
    "matched_product_id": "string or null",
    "matched_product_name": "string or null",
    "confidence": 0.0-1.0,
    "specifications_inferred": {}
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  return JSON.parse(jsonMatch[0]);
}

/**
 * Generate a design brief for AI image generation
 */
export async function generateDesignBrief(
  product: string,
  context: string,
  preferences?: Record<string, unknown>
): Promise<string> {
  if (!genAI) {
    throw new Error('Gemini API not configured');
  }

  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const prefStr = preferences ? JSON.stringify(preferences) : 'none specified';

  const prompt = `Create a detailed design brief for generating a ${product} design.

Context from customer: ${context}
Style preferences: ${prefStr}

Generate a detailed prompt for an AI image generator that will create a professional print design.
Focus on: composition, colors, typography style, visual elements, and overall aesthetic.
The design should be suitable for commercial printing.`;

  const result = await model.generateContent(prompt);
  return result.response.text();
}
