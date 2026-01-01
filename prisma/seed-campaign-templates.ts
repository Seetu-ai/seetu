import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Campaign Templates with StyleLock for consistent visual identity
const campaignTemplates = [
  // ═══════════════════════════════════════════════════════════════
  // SEASONAL / OCCASION TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'tabaski-gold',
    name: 'Tabaski Gold',
    nameFr: 'Tabaski Doré',
    occasion: 'Tabaski',
    styleLock: {
      lighting: 'golden_hour',
      colorGrading: { warmth: 85, saturation: 70 },
      mood: 'festive',
      visualTokens: ['luxury', 'celebration', 'gold accents', 'warm tones'],
      promptPrefix: 'Festive Tabaski celebration atmosphere, rich golden lighting, celebratory mood',
      negativePromptAdditions: ['cold tones', 'minimal', 'bland'],
    },
    isPremium: false,
  },
  {
    slug: 'ramadan-elegance',
    name: 'Ramadan Elegance',
    nameFr: 'Ramadan Élégance',
    occasion: 'Ramadan',
    styleLock: {
      lighting: 'studio_soft',
      colorGrading: { warmth: 60, saturation: 50 },
      mood: 'serene',
      visualTokens: ['spiritual', 'elegant', 'peaceful', 'moonlit'],
      promptPrefix: 'Serene Ramadan atmosphere, soft ambient lighting, peaceful elegance',
      negativePromptAdditions: ['harsh', 'loud', 'cluttered'],
    },
    isPremium: false,
  },
  {
    slug: 'magal-touba',
    name: 'Magal Edition',
    nameFr: 'Edition Magal',
    occasion: 'Magal Touba',
    styleLock: {
      lighting: 'natural',
      colorGrading: { warmth: 70, saturation: 65 },
      mood: 'spiritual',
      visualTokens: ['devotion', 'community', 'traditional', 'Mouride'],
      promptPrefix: 'Spiritual Magal atmosphere, traditional Senegalese setting, community celebration',
      negativePromptAdditions: ['western', 'modern', 'cold'],
    },
    isPremium: false,
  },

  // ═══════════════════════════════════════════════════════════════
  // STYLE TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'new-arrivals',
    name: 'New Arrivals',
    nameFr: 'Nouveautés',
    occasion: null,
    styleLock: {
      lighting: 'studio_soft',
      colorGrading: { warmth: 50, saturation: 60 },
      mood: 'fresh',
      visualTokens: ['modern', 'clean', 'fresh', 'crisp'],
      promptPrefix: 'Fresh modern product photography, clean aesthetic, new arrival vibes',
      negativePromptAdditions: ['vintage', 'worn', 'old'],
    },
    isPremium: false,
  },
  {
    slug: 'premium-luxe',
    name: 'Premium Luxe',
    nameFr: 'Collection Luxe',
    occasion: null,
    styleLock: {
      lighting: 'dramatic',
      colorGrading: { warmth: 45, saturation: 40 },
      mood: 'luxury',
      visualTokens: ['high-end', 'sophisticated', 'exclusive', 'premium'],
      promptPrefix: 'High-end luxury product photography, dramatic lighting, exclusive feel',
      negativePromptAdditions: ['cheap', 'basic', 'casual'],
    },
    isPremium: true,
  },
  {
    slug: 'street-style',
    name: 'Street Style',
    nameFr: 'Style Urbain',
    occasion: null,
    styleLock: {
      lighting: 'natural',
      colorGrading: { warmth: 55, saturation: 70 },
      mood: 'urban',
      visualTokens: ['streetwear', 'urban', 'authentic', 'Dakar vibes'],
      promptPrefix: 'Urban street style photography, authentic Dakar atmosphere, contemporary',
      negativePromptAdditions: ['formal', 'studio', 'sterile'],
    },
    isPremium: false,
  },
  {
    slug: 'afro-minimalist',
    name: 'Afro Minimalist',
    nameFr: 'Afro Minimaliste',
    occasion: null,
    styleLock: {
      lighting: 'studio_soft',
      colorGrading: { warmth: 55, saturation: 45 },
      mood: 'minimal',
      visualTokens: ['clean', 'simple', 'elegant', 'african minimal'],
      promptPrefix: 'Minimalist African aesthetic, clean lines, simple elegance, neutral tones',
      negativePromptAdditions: ['busy', 'cluttered', 'colorful', 'complex'],
    },
    isPremium: false,
  },

  // ═══════════════════════════════════════════════════════════════
  // SEASONAL TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'summer-vibes',
    name: 'Summer Vibes',
    nameFr: 'Ambiance Été',
    occasion: null,
    styleLock: {
      lighting: 'golden_hour',
      colorGrading: { warmth: 75, saturation: 75 },
      mood: 'sunny',
      visualTokens: ['beach', 'tropical', 'bright', 'summer'],
      promptPrefix: 'Bright summer atmosphere, beach vibes, tropical Senegal coast aesthetic',
      negativePromptAdditions: ['cold', 'winter', 'dark', 'gloomy'],
    },
    isPremium: false,
  },
  {
    slug: 'evening-glam',
    name: 'Evening Glam',
    nameFr: 'Soirée Glamour',
    occasion: null,
    styleLock: {
      lighting: 'dramatic',
      colorGrading: { warmth: 40, saturation: 55 },
      mood: 'glamorous',
      visualTokens: ['night', 'sophisticated', 'glamour', 'elegant'],
      promptPrefix: 'Evening glamour photography, sophisticated lighting, night out aesthetic',
      negativePromptAdditions: ['casual', 'daytime', 'informal'],
    },
    isPremium: true,
  },

  // ═══════════════════════════════════════════════════════════════
  // E-COMMERCE OPTIMIZED TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  {
    slug: 'marketplace-clean',
    name: 'Marketplace Clean',
    nameFr: 'E-commerce Épuré',
    occasion: null,
    styleLock: {
      lighting: 'studio_soft',
      colorGrading: { warmth: 50, saturation: 50 },
      mood: 'professional',
      visualTokens: ['e-commerce', 'clean', 'professional', 'marketplace'],
      promptPrefix: 'Professional e-commerce photography, pure white background, marketplace ready',
      negativePromptAdditions: ['artistic', 'lifestyle', 'complex background'],
    },
    isPremium: false,
  },
  {
    slug: 'instagram-ready',
    name: 'Instagram Ready',
    nameFr: 'Prêt pour Instagram',
    occasion: null,
    styleLock: {
      lighting: 'natural',
      colorGrading: { warmth: 60, saturation: 65 },
      mood: 'trendy',
      visualTokens: ['instagram', 'social', 'trendy', 'shareable'],
      promptPrefix: 'Instagram-optimized product photography, trendy aesthetic, highly shareable',
      negativePromptAdditions: ['boring', 'plain', 'dated'],
    },
    isPremium: false,
  },
];

async function seedCampaignTemplates() {
  console.log('🎨 Seeding campaign templates...');

  for (const template of campaignTemplates) {
    await prisma.campaignTemplate.upsert({
      where: { slug: template.slug },
      update: template,
      create: template,
    });
    console.log(`  ✓ ${template.nameFr}`);
  }

  console.log(`\n✅ Seeded ${campaignTemplates.length} campaign templates`);
}

seedCampaignTemplates()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
