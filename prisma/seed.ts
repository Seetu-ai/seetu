import { PrismaClient, BusinessType, JobType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with V2 template packs...\n');

  // ═══════════════════════════════════════════════════════════════
  // FASHION TEMPLATES (Sénégal Modern)
  // ═══════════════════════════════════════════════════════════════
  const fashionPack = await prisma.templatePack.upsert({
    where: { slug: 'fashion-senegal-v2' },
    update: { isDefault: true },
    create: {
      slug: 'fashion-senegal-v2',
      name: 'Fashion Sénégal',
      vertical: BusinessType.fashion,
      description: 'Shoots adaptés aux collections Tabaski, Magal et Streetwear Dakar.',
      version: '2.0.0',
      isActive: true,
      isDefault: true,
    },
  });

  const fashionTemplates = [
    {
      slug: 'studio-clean-dakar',
      name: 'Studio Blanc (E-Commerce)',
      type: JobType.product_photo,
      prompt: 'Professional commercial photography of {{product}}, front view, pure white seamless background, studio softbox lighting, 8k resolution, sharp focus, minimal shadow, high-end catalog style.',
      negativePrompt: 'dark, grainy, low resolution, cropped, distraction, blurry, watermark, text',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.5, steps: 30, strength: 0.75 },
      sortOrder: 1,
    },
    {
      slug: 'lifestyle-saly',
      name: 'Villas de Saly (Lifestyle)',
      type: JobType.product_photo,
      prompt: '{{product}} displayed in a luxury villa in Saly Senegal, golden hour sunlight, palm shadows, blurred bougainvillea background, cinematic lighting, editorial fashion magazine style.',
      negativePrompt: 'cartoon, illustration, fake, oversaturated, messy, low quality, indoor',
      defaultParams: { width: 1024, height: 1536, guidance_scale: 8.0, steps: 40, strength: 0.70 },
      sortOrder: 2,
    },
    {
      slug: 'tabaski-gold',
      name: 'Tabaski Luxury (Gold)',
      type: JobType.promo,
      prompt: 'Elegant product display of {{product}} on a marble table with gold accents, festive Tabaski atmosphere, warm lantern lighting, bokeh background, premium luxury advertising.',
      negativePrompt: 'cheap, plastic, low quality, blurry, dark, cold colors',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.0, steps: 35, strength: 0.75 },
      sortOrder: 3,
    },
    {
      slug: 'marche-sandaga',
      name: 'Marché Sandaga (Street)',
      type: JobType.product_photo,
      prompt: '{{product}} in authentic African market setting, colorful Senegalese fabrics background, vibrant wax print textiles, natural daylight, street photography documentary style.',
      negativePrompt: 'studio, fake, artificial, cartoon, blurry, western style',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.5, steps: 30, strength: 0.70 },
      sortOrder: 4,
    },
    {
      slug: 'magal-touba',
      name: 'Magal de Touba',
      type: JobType.promo,
      prompt: '{{product}} in spiritual celebration context, traditional Senegalese religious gathering atmosphere, white and green colors, peaceful lighting, respectful presentation.',
      negativePrompt: 'disrespectful, inappropriate, loud colors, western style',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.0, steps: 30, strength: 0.70 },
      sortOrder: 5,
    },
  ];

  for (const template of fashionTemplates) {
    await prisma.template.upsert({
      where: { packId_slug: { packId: fashionPack.id, slug: template.slug } },
      update: {
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
        defaultParams: template.defaultParams,
      },
      create: {
        ...template,
        packId: fashionPack.id,
        isActive: true,
      },
    });
  }
  console.log('✓ Fashion Sénégal pack created/updated');

  // ═══════════════════════════════════════════════════════════════
  // FOOD TEMPLATES (Teranga Taste)
  // ═══════════════════════════════════════════════════════════════
  const foodPack = await prisma.templatePack.upsert({
    where: { slug: 'food-teranga-v1' },
    update: {},
    create: {
      slug: 'food-teranga-v1',
      name: 'Teranga Taste',
      vertical: BusinessType.food,
      description: 'Pour les restaurants, traiteurs et jus locaux.',
      version: '1.0.0',
      isActive: true,
    },
  });

  const foodTemplates = [
    {
      slug: 'rustic-wooden-table',
      name: 'Table Rustique',
      type: JobType.product_photo,
      prompt: 'Top-down food photography of {{product}}, served on a rustic dark wood table, surrounded by fresh mint leaves and spices, natural window lighting, appetizing, michelin star plating.',
      negativePrompt: 'artificial, plastic, unappetizing, blurry, dark, cold food',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.0, steps: 30, strength: 0.75 },
      sortOrder: 1,
    },
    {
      slug: 'sea-plaza-terrace',
      name: 'Terrasse Corniche',
      type: JobType.promo,
      prompt: '{{product}} placed on a cafe table, blurred ocean background (Corniche Dakar), bright sunny day, refreshing vibe, advertising photography, premium restaurant quality.',
      negativePrompt: 'indoor, dark, rainy, blurry, low quality, night time',
      defaultParams: { width: 1024, height: 1280, guidance_scale: 7.5, steps: 30, strength: 0.70 },
      sortOrder: 2,
    },
    {
      slug: 'thieboudienne-style',
      name: 'Style Thiéboudienne',
      type: JobType.product_photo,
      prompt: '{{product}} presented in traditional Senegalese style, colorful ceramic bowl, garnished with vegetables, warm inviting lighting, cultural authenticity, food magazine cover quality.',
      negativePrompt: 'western style, plastic, artificial, cold lighting, unappetizing',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.5, steps: 35, strength: 0.75 },
      sortOrder: 3,
    },
    {
      slug: 'jus-bissap',
      name: 'Jus Frais (Bissap/Bouye)',
      type: JobType.product_photo,
      prompt: '{{product}} refreshing beverage photography, ice cubes, condensation droplets on glass, tropical fruits garnish, bright summer vibes, thirst-quenching presentation.',
      negativePrompt: 'warm, flat, unappealing, dark, artificial colors',
      defaultParams: { width: 1024, height: 1280, guidance_scale: 7.0, steps: 30, strength: 0.75 },
      sortOrder: 4,
    },
  ];

  for (const template of foodTemplates) {
    await prisma.template.upsert({
      where: { packId_slug: { packId: foodPack.id, slug: template.slug } },
      update: {
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
        defaultParams: template.defaultParams,
      },
      create: {
        ...template,
        packId: foodPack.id,
        isActive: true,
      },
    });
  }
  console.log('✓ Teranga Taste pack created/updated');

  // ═══════════════════════════════════════════════════════════════
  // BEAUTY TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  const beautyPack = await prisma.templatePack.upsert({
    where: { slug: 'beauty-dakar-v1' },
    update: {},
    create: {
      slug: 'beauty-dakar-v1',
      name: 'Beauty Dakar',
      vertical: BusinessType.beauty,
      description: 'Cosmétiques, soins naturels et produits de beauté.',
      version: '1.0.0',
      isActive: true,
    },
  });

  const beautyTemplates = [
    {
      slug: 'clean-beauty-marble',
      name: 'Clean Beauty',
      type: JobType.product_photo,
      prompt: '{{product}} on white marble surface, soft natural lighting, minimalist beauty photography, droplets of water, fresh and clean aesthetic, luxury cosmetics advertisement.',
      negativePrompt: 'cluttered, dark, artificial, cheap looking, harsh shadows',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.5, steps: 30, strength: 0.75 },
      sortOrder: 1,
    },
    {
      slug: 'natural-ingredients',
      name: 'Ingrédients Naturels',
      type: JobType.product_photo,
      prompt: '{{product}} surrounded by natural African ingredients, shea butter, baobab leaves, coconut, warm earth tones, organic beauty photography, sustainable luxury.',
      negativePrompt: 'synthetic, artificial, plastic, harsh lighting, clinical',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.0, steps: 35, strength: 0.70 },
      sortOrder: 2,
    },
    {
      slug: 'salon-luxury',
      name: 'Salon Luxe',
      type: JobType.promo,
      prompt: '{{product}} in elegant beauty salon setting, gold and marble accents, professional lighting, high-end spa atmosphere, premium brand advertising.',
      negativePrompt: 'cheap, cluttered, poor lighting, amateur, clinical',
      defaultParams: { width: 1024, height: 1280, guidance_scale: 7.5, steps: 30, strength: 0.75 },
      sortOrder: 3,
    },
    {
      slug: 'african-queen',
      name: 'African Queen',
      type: JobType.product_photo,
      prompt: '{{product}} beauty photography with African-inspired gold jewelry elements, rich dark skin tones celebration, royal aesthetic, melanin beauty, luxury cosmetics.',
      negativePrompt: 'pale, washed out, western-only beauty standard, artificial',
      defaultParams: { width: 1024, height: 1024, guidance_scale: 7.5, steps: 35, strength: 0.70 },
      sortOrder: 4,
    },
  ];

  for (const template of beautyTemplates) {
    await prisma.template.upsert({
      where: { packId_slug: { packId: beautyPack.id, slug: template.slug } },
      update: {
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
        defaultParams: template.defaultParams,
      },
      create: {
        ...template,
        packId: beautyPack.id,
        isActive: true,
      },
    });
  }
  console.log('✓ Beauty Dakar pack created/updated');

  // ═══════════════════════════════════════════════════════════════
  // REAL ESTATE TEMPLATES
  // ═══════════════════════════════════════════════════════════════
  const realEstatePack = await prisma.templatePack.upsert({
    where: { slug: 'immobilier-senegal-v1' },
    update: {},
    create: {
      slug: 'immobilier-senegal-v1',
      name: 'Immobilier Sénégal',
      vertical: BusinessType.realestate,
      description: 'Pour les agences immobilières et promoteurs.',
      version: '1.0.0',
      isActive: true,
    },
  });

  const realEstateTemplates = [
    {
      slug: 'villa-showcase',
      name: 'Villa Showcase',
      type: JobType.product_photo,
      prompt: '{{product}} property exterior, golden hour lighting, manicured garden, luxury real estate photography, architectural magazine quality, blue sky background.',
      negativePrompt: 'dark, cloudy, construction, messy, poor quality, night',
      defaultParams: { width: 1536, height: 1024, guidance_scale: 7.5, steps: 35, strength: 0.65 },
      sortOrder: 1,
    },
    {
      slug: 'interior-almadies',
      name: 'Intérieur Almadies',
      type: JobType.product_photo,
      prompt: '{{product}} modern African interior, contemporary furniture, warm earth tones with bold African art, natural light streaming through windows, architectural digest style.',
      negativePrompt: 'dark, cramped, outdated, cluttered, western-only design',
      defaultParams: { width: 1536, height: 1024, guidance_scale: 7.5, steps: 35, strength: 0.65 },
      sortOrder: 2,
    },
  ];

  for (const template of realEstateTemplates) {
    await prisma.template.upsert({
      where: { packId_slug: { packId: realEstatePack.id, slug: template.slug } },
      update: {
        prompt: template.prompt,
        negativePrompt: template.negativePrompt,
        defaultParams: template.defaultParams,
      },
      create: {
        ...template,
        packId: realEstatePack.id,
        isActive: true,
      },
    });
  }
  console.log('✓ Immobilier Sénégal pack created/updated');

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ Database seeded successfully with V2 template packs!');
  console.log('═══════════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
