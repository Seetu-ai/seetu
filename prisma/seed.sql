-- CABINE.AI Template Seed Data
-- Run this in Supabase SQL Editor after running migration.sql

-- Fashion Pack
INSERT INTO "template_packs" (id, slug, name, vertical, description, version, is_active, is_default, created_at)
VALUES (
  gen_random_uuid(),
  'fashion-dakar',
  'Fashion Dakar',
  'fashion'::"BusinessType",
  'Templates pour la mode africaine, modest fashion et prêt-à-porter',
  '1.0.0',
  true,
  true,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Food Pack
INSERT INTO "template_packs" (id, slug, name, vertical, description, version, is_active, is_default, created_at)
VALUES (
  gen_random_uuid(),
  'food-teranga',
  'Food Teranga',
  'food'::"BusinessType",
  'Templates pour la cuisine africaine et les produits alimentaires',
  '1.0.0',
  true,
  false,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Beauty Pack
INSERT INTO "template_packs" (id, slug, name, vertical, description, version, is_active, is_default, created_at)
VALUES (
  gen_random_uuid(),
  'beauty-senegal',
  'Beauty Sénégal',
  'beauty'::"BusinessType",
  'Templates pour les cosmétiques et produits de beauté',
  '1.0.0',
  true,
  false,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Real Estate Pack
INSERT INTO "template_packs" (id, slug, name, vertical, description, version, is_active, is_default, created_at)
VALUES (
  gen_random_uuid(),
  'immobilier-africa',
  'Immobilier Africa',
  'realestate'::"BusinessType",
  'Templates pour l''immobilier et la décoration',
  '1.0.0',
  true,
  false,
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Fashion Templates
INSERT INTO "templates" (id, pack_id, slug, name, type, prompt, negative_prompt, sort_order, created_at)
VALUES
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'fashion-dakar'), 'studio-blanc', 'Studio Blanc', 'product_photo'::"JobType", 'Professional product photography of {product} on pure white background, studio lighting, clean and minimal, e-commerce style, high resolution, sharp focus', 'blurry, low quality, distorted, watermark, text, shadow on background', 1, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'fashion-dakar'), 'lifestyle-dakar', 'Lifestyle Dakar', 'product_photo'::"JobType", 'Fashion lifestyle photography of {product} in modern Dakar setting, African-inspired decor, warm natural lighting, elegant presentation, editorial style', 'low quality, blurry, cluttered background, western decor, cold lighting', 2, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'fashion-dakar'), 'marche-local', 'Marché Local', 'product_photo'::"JobType", 'Authentic market scene photography featuring {product}, vibrant African textiles in background, natural daylight, colorful and warm atmosphere, cultural context', 'fake, artificial, sterile, cold colors, generic background', 3, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'fashion-dakar'), 'editorial-mode', 'Editorial Mode', 'product_photo'::"JobType", 'High fashion editorial photography of {product}, dramatic lighting, luxury presentation, magazine quality, sophisticated styling, African elegance', 'amateur, casual, low budget, poor lighting, unflattering angles', 4, NOW())
ON CONFLICT DO NOTHING;

-- Food Templates
INSERT INTO "templates" (id, pack_id, slug, name, type, prompt, negative_prompt, sort_order, created_at)
VALUES
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'food-teranga'), 'table-setting', 'Table Setting', 'product_photo'::"JobType", 'Appetizing food photography of {product} on beautifully set table, African ceramic plates, warm ambient lighting, fresh ingredients visible, restaurant quality', 'unappetizing, cold food, plastic utensils, messy presentation', 1, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'food-teranga'), 'street-food', 'Street Food', 'product_photo'::"JobType", 'Authentic street food photography of {product}, bustling African market atmosphere, steam rising, fresh preparation, vibrant colors, documentary style', 'unsanitary, unappealing, dark and dirty, fake atmosphere', 2, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'food-teranga'), 'restaurant-style', 'Restaurant Style', 'product_photo'::"JobType", 'Fine dining presentation of {product}, elegant plating, soft restaurant lighting, premium ingredients showcase, gourmet appearance, Michelin quality', 'fast food style, cheap presentation, harsh lighting, messy plate', 3, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'food-teranga'), 'minimal-food', 'Minimal Clean', 'product_photo'::"JobType", 'Minimalist food photography of {product} on neutral background, simple elegant presentation, natural daylight, clean composition, modern aesthetic', 'cluttered, busy background, artificial colors, overprocessed', 4, NOW())
ON CONFLICT DO NOTHING;

-- Beauty Templates
INSERT INTO "templates" (id, pack_id, slug, name, type, prompt, negative_prompt, sort_order, created_at)
VALUES
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'beauty-senegal'), 'clean-beauty', 'Clean Beauty', 'product_photo'::"JobType", 'Luxury beauty product photography of {product} on marble surface, soft gradient background, natural ingredients scattered, spa-like atmosphere, premium cosmetics', 'cheap looking, plastic background, harsh shadows, unflattering angles', 1, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'beauty-senegal'), 'natural-light', 'Lumière Naturelle', 'product_photo'::"JobType", 'Natural light beauty photography of {product}, soft window light, organic textures, botanical elements, fresh and clean aesthetic, skincare editorial', 'artificial lighting, dark shadows, clinical look, sterile environment', 2, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'beauty-senegal'), 'artistic-beauty', 'Artistique', 'product_photo'::"JobType", 'Artistic beauty product photography of {product}, creative composition, African-inspired color palette, dramatic shadows, editorial magazine style', 'boring, standard, generic, uninspired composition', 3, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'beauty-senegal'), 'professional-beauty', 'Professional', 'product_photo'::"JobType", 'Professional beauty product shot of {product}, gradient background, perfect reflections, commercial quality, catalog style, crisp and sharp', 'amateur, low resolution, poor reflections, dust or scratches', 4, NOW())
ON CONFLICT DO NOTHING;

-- Real Estate Templates
INSERT INTO "templates" (id, pack_id, slug, name, type, prompt, negative_prompt, sort_order, created_at)
VALUES
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'immobilier-africa'), 'interior-modern', 'Intérieur Moderne', 'product_photo'::"JobType", 'Modern African interior design photography featuring {product}, contemporary furniture, warm earth tones, natural materials, spacious and bright, architectural photography', 'dark, cramped, outdated, western-only design, cold atmosphere', 1, NOW()),
  (gen_random_uuid(), (SELECT id FROM template_packs WHERE slug = 'immobilier-africa'), 'exterior-villa', 'Extérieur Villa', 'product_photo'::"JobType", 'Luxury African villa exterior photography showing {product}, tropical garden, blue sky, premium real estate, drone perspective available, golden hour lighting', 'poor weather, construction visible, unkempt garden, harsh midday sun', 2, NOW())
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- BACKGROUNDS (Studio Décors)
-- ═══════════════════════════════════════════════════════════════

-- Real Places (Senegal)
INSERT INTO "backgrounds" (id, slug, name, name_fr, type, category, image_url, thumbnail_url, lighting, mood, colors, location, landmark, prompt_hints, is_active, sort_order, created_at)
VALUES
  (gen_random_uuid(), 'corniche-dakar', 'Dakar Corniche', 'Corniche de Dakar', 'real_place'::"BackgroundType", 'beach', '/backgrounds/corniche-dakar.jpg', '/backgrounds/thumbs/corniche-dakar.jpg', 'natural_daylight', 'vibrant', ARRAY['blue', 'turquoise', 'white'], 'Dakar', 'Corniche Ouest', 'ocean view, rocky coastline, blue sky, Dakar atmosphere', true, 1, NOW()),
  (gen_random_uuid(), 'place-independance', 'Independence Square', 'Place de l''Indépendance', 'real_place'::"BackgroundType", 'urban', '/backgrounds/place-independance.jpg', '/backgrounds/thumbs/place-independance.jpg', 'natural_daylight', 'professional', ARRAY['gray', 'green', 'beige'], 'Dakar', 'Place de l''Indépendance', 'urban setting, historic architecture, central Dakar', true, 2, NOW()),
  (gen_random_uuid(), 'marche-sandaga', 'Sandaga Market', 'Marché Sandaga', 'real_place'::"BackgroundType", 'market', '/backgrounds/marche-sandaga.jpg', '/backgrounds/thumbs/marche-sandaga.jpg', 'natural_daylight', 'warm', ARRAY['orange', 'yellow', 'red', 'brown'], 'Dakar', 'Marché Sandaga', 'vibrant market, colorful fabrics, authentic African atmosphere', true, 3, NOW()),
  (gen_random_uuid(), 'ile-goree', 'Gorée Island', 'Île de Gorée', 'real_place'::"BackgroundType", 'historic', '/backgrounds/ile-goree.jpg', '/backgrounds/thumbs/ile-goree.jpg', 'golden_hour', 'warm', ARRAY['pink', 'orange', 'terracotta'], 'Gorée', 'Maison des Esclaves', 'historic colonial architecture, colorful facades, cultural heritage', true, 4, NOW()),
  (gen_random_uuid(), 'lac-rose', 'Pink Lake', 'Lac Rose', 'real_place'::"BackgroundType", 'nature', '/backgrounds/lac-rose.jpg', '/backgrounds/thumbs/lac-rose.jpg', 'golden_hour', 'warm', ARRAY['pink', 'orange', 'white'], 'Lac Rose', 'Lac Retba', 'pink salt lake, unique natural wonder, warm tones', true, 5, NOW()),
  (gen_random_uuid(), 'sea-plaza', 'Sea Plaza', 'Sea Plaza Mall', 'real_place'::"BackgroundType", 'urban', '/backgrounds/sea-plaza.jpg', '/backgrounds/thumbs/sea-plaza.jpg', 'studio_soft', 'luxe', ARRAY['white', 'gray', 'gold'], 'Dakar', 'Sea Plaza', 'modern shopping mall, luxury setting, contemporary Dakar', true, 6, NOW()),
  (gen_random_uuid(), 'plage-saly', 'Saly Beach', 'Plage de Saly', 'real_place'::"BackgroundType", 'beach', '/backgrounds/plage-saly.jpg', '/backgrounds/thumbs/plage-saly.jpg', 'golden_hour', 'warm', ARRAY['blue', 'gold', 'white'], 'Saly', 'Plage', 'tropical beach, palm trees, resort atmosphere', true, 7, NOW()),
  (gen_random_uuid(), 'saint-louis', 'Saint-Louis', 'Saint-Louis du Sénégal', 'real_place'::"BackgroundType", 'historic', '/backgrounds/saint-louis.jpg', '/backgrounds/thumbs/saint-louis.jpg', 'natural_daylight', 'professional', ARRAY['blue', 'white', 'terracotta'], 'Saint-Louis', 'Pont Faidherbe', 'colonial architecture, UNESCO heritage, river setting', true, 8, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Studio Backgrounds
INSERT INTO "backgrounds" (id, slug, name, name_fr, type, category, image_url, thumbnail_url, lighting, mood, colors, prompt_hints, is_active, sort_order, created_at)
VALUES
  (gen_random_uuid(), 'studio-blanc', 'Pure White', 'Blanc Pur', 'studio'::"BackgroundType", 'minimal', '/backgrounds/studio-blanc.jpg', '/backgrounds/thumbs/studio-blanc.jpg', 'studio_soft', 'professional', ARRAY['white'], 'pure white background, professional studio lighting, e-commerce style', true, 1, NOW()),
  (gen_random_uuid(), 'studio-gris', 'Soft Gray', 'Gris Doux', 'studio'::"BackgroundType", 'minimal', '/backgrounds/studio-gris.jpg', '/backgrounds/thumbs/studio-gris.jpg', 'studio_soft', 'professional', ARRAY['gray'], 'soft gray gradient background, professional studio, elegant', true, 2, NOW()),
  (gen_random_uuid(), 'studio-noir', 'Deep Black', 'Noir Profond', 'studio'::"BackgroundType", 'dramatic', '/backgrounds/studio-noir.jpg', '/backgrounds/thumbs/studio-noir.jpg', 'dramatic', 'luxe', ARRAY['black'], 'deep black background, dramatic lighting, luxury presentation', true, 3, NOW()),
  (gen_random_uuid(), 'studio-beige', 'Warm Beige', 'Beige Chaleureux', 'studio'::"BackgroundType", 'warm', '/backgrounds/studio-beige.jpg', '/backgrounds/thumbs/studio-beige.jpg', 'studio_soft', 'warm', ARRAY['beige', 'cream'], 'warm beige background, soft lighting, natural feel', true, 4, NOW()),
  (gen_random_uuid(), 'studio-terracotta', 'Terracotta', 'Terracotta', 'studio'::"BackgroundType", 'warm', '/backgrounds/studio-terracotta.jpg', '/backgrounds/thumbs/studio-terracotta.jpg', 'studio_soft', 'warm', ARRAY['terracotta', 'orange'], 'terracotta colored background, warm African tones, earthy', true, 5, NOW()),
  (gen_random_uuid(), 'studio-gradient', 'Soft Gradient', 'Dégradé Doux', 'studio'::"BackgroundType", 'creative', '/backgrounds/studio-gradient.jpg', '/backgrounds/thumbs/studio-gradient.jpg', 'studio_soft', 'professional', ARRAY['gray', 'white'], 'soft gradient background, professional product photography', true, 6, NOW())
ON CONFLICT (slug) DO NOTHING;

-- Lifestyle Backgrounds
INSERT INTO "backgrounds" (id, slug, name, name_fr, type, category, image_url, thumbnail_url, lighting, mood, colors, prompt_hints, is_active, sort_order, created_at)
VALUES
  (gen_random_uuid(), 'lifestyle-salon', 'Modern Living', 'Salon Moderne', 'lifestyle'::"BackgroundType", 'interior', '/backgrounds/lifestyle-salon.jpg', '/backgrounds/thumbs/lifestyle-salon.jpg', 'natural_daylight', 'warm', ARRAY['beige', 'white', 'brown'], 'modern African living room, natural light, contemporary interior', true, 1, NOW()),
  (gen_random_uuid(), 'lifestyle-terrasse', 'Sunny Terrace', 'Terrasse Ensoleillée', 'lifestyle'::"BackgroundType", 'outdoor', '/backgrounds/lifestyle-terrasse.jpg', '/backgrounds/thumbs/lifestyle-terrasse.jpg', 'golden_hour', 'warm', ARRAY['green', 'white', 'terracotta'], 'sunny outdoor terrace, plants, warm atmosphere', true, 2, NOW()),
  (gen_random_uuid(), 'lifestyle-cafe', 'Trendy Café', 'Café Tendance', 'lifestyle'::"BackgroundType", 'urban', '/backgrounds/lifestyle-cafe.jpg', '/backgrounds/thumbs/lifestyle-cafe.jpg', 'studio_soft', 'vibrant', ARRAY['brown', 'green', 'white'], 'trendy African café, warm lighting, social atmosphere', true, 3, NOW()),
  (gen_random_uuid(), 'lifestyle-bureau', 'Modern Office', 'Bureau Moderne', 'lifestyle'::"BackgroundType", 'interior', '/backgrounds/lifestyle-bureau.jpg', '/backgrounds/thumbs/lifestyle-bureau.jpg', 'natural_daylight', 'professional', ARRAY['white', 'gray', 'blue'], 'modern office space, professional setting, clean design', true, 4, NOW()),
  (gen_random_uuid(), 'lifestyle-jardin', 'Tropical Garden', 'Jardin Tropical', 'lifestyle'::"BackgroundType", 'outdoor', '/backgrounds/lifestyle-jardin.jpg', '/backgrounds/thumbs/lifestyle-jardin.jpg', 'natural_daylight', 'vibrant', ARRAY['green', 'pink', 'yellow'], 'lush tropical garden, African flora, natural beauty', true, 5, NOW()),
  (gen_random_uuid(), 'lifestyle-textile', 'African Textiles', 'Textiles Africains', 'lifestyle'::"BackgroundType", 'cultural', '/backgrounds/lifestyle-textile.jpg', '/backgrounds/thumbs/lifestyle-textile.jpg', 'studio_soft', 'vibrant', ARRAY['yellow', 'red', 'blue', 'green'], 'colorful African textiles, wax print fabrics, cultural backdrop', true, 6, NOW())
ON CONFLICT (slug) DO NOTHING;
