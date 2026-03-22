-- =============================================
-- BLOOPRINT FULL PRODUCT CATALOG
-- 105+ Products organized by categories
-- =============================================

-- =============================================
-- CATEGORIES (Hierarchical)
-- =============================================

-- Clear existing categories and products for clean migration
-- First, remove foreign key references from order items
UPDATE public.print_order_items SET product_id = NULL WHERE product_id IS NOT NULL;

-- Now safe to delete products
DELETE FROM public.print_product_mockups;
DELETE FROM public.print_products;
DELETE FROM public.print_product_categories;

-- Main Categories
INSERT INTO public.print_product_categories (name, slug, description, icon, sort_order, is_active) VALUES
    ('Textile & Vêtements', 'textile', 'T-shirts, polos, sweats, casquettes et vêtements personnalisés', '👕', 1, true),
    ('Impression Papier', 'papier', 'Cartes de visite, flyers, affiches, dépliants et brochures', '📄', 2, true),
    ('Grand Format', 'grand-format', 'Bâches, roll-ups, kakémonos et signalétique', '🎞️', 3, true),
    ('Objets Publicitaires', 'goodies', 'Mugs, stylos, sacs et objets promotionnels', '🎁', 4, true),
    ('Packaging', 'packaging', 'Boîtes, emballages et packaging personnalisé', '📦', 5, true),
    ('Bureautique', 'bureautique', 'Tampons, cachets, plaques et signalétique de bureau', '🏢', 6, true)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    sort_order = EXCLUDED.sort_order;

-- =============================================
-- TEXTILE & VÊTEMENTS (25 products)
-- =============================================

INSERT INTO public.print_products (name, name_fr, slug, category_id, catalog_type, base_price, min_quantity, max_quantity, production_days, requires_design, is_active, specifications, available_print_techniques, description) VALUES
    -- T-shirts
    ('T-shirt col rond', 'T-shirt col rond', 't-shirt-col-rond',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 3500, 10, 1000, 5, true, true,
        '{"sizes": ["XS", "S", "M", "L", "XL", "XXL", "3XL"], "colors": ["blanc", "noir", "gris chiné", "bleu marine", "rouge", "vert", "jaune", "orange"], "material": "100% coton 180g/m²", "fit": "regular"}',
        ARRAY['screen_print', 'dtg', 'vinyl', 'sublimation'],
        'T-shirt classique col rond, idéal pour événements et équipes'),

    ('T-shirt col V', 'T-shirt col V', 't-shirt-col-v',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 3800, 10, 1000, 5, true, true,
        '{"sizes": ["XS", "S", "M", "L", "XL", "XXL"], "colors": ["blanc", "noir", "gris", "bleu marine"], "material": "100% coton 180g/m²", "fit": "regular"}',
        ARRAY['screen_print', 'dtg', 'vinyl'],
        'T-shirt élégant col V'),

    ('T-shirt femme', 'T-shirt femme', 't-shirt-femme',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 3500, 10, 1000, 5, true, true,
        '{"sizes": ["XS", "S", "M", "L", "XL"], "colors": ["blanc", "noir", "rose", "bleu ciel", "rouge"], "material": "100% coton 160g/m²", "fit": "fitted"}',
        ARRAY['screen_print', 'dtg', 'vinyl', 'sublimation'],
        'T-shirt coupe femme cintrée'),

    ('T-shirt enfant', 'T-shirt enfant', 't-shirt-enfant',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 2800, 10, 500, 5, true, true,
        '{"sizes": ["2-3 ans", "4-5 ans", "6-7 ans", "8-9 ans", "10-12 ans", "14 ans"], "colors": ["blanc", "noir", "bleu", "rose", "jaune", "vert"], "material": "100% coton 160g/m²"}',
        ARRAY['screen_print', 'dtg', 'vinyl'],
        'T-shirt pour enfants'),

    ('T-shirt manches longues', 'T-shirt manches longues', 't-shirt-manches-longues',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 4500, 10, 500, 5, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["blanc", "noir", "gris", "bleu marine"], "material": "100% coton 190g/m²"}',
        ARRAY['screen_print', 'dtg', 'vinyl'],
        'T-shirt manches longues'),

    ('T-shirt premium', 'T-shirt premium', 't-shirt-premium',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 5500, 10, 500, 7, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["blanc", "noir", "gris anthracite"], "material": "100% coton peigné 200g/m²", "fit": "premium"}',
        ARRAY['screen_print', 'dtg', 'embroidery'],
        'T-shirt qualité premium'),

    -- Polos
    ('Polo classique', 'Polo classique', 'polo-classique',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 5500, 10, 500, 5, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL", "3XL"], "colors": ["blanc", "noir", "bleu marine", "rouge", "vert bouteille"], "material": "100% coton piqué 220g/m²"}',
        ARRAY['embroidery', 'screen_print'],
        'Polo classique piqué'),

    ('Polo femme', 'Polo femme', 'polo-femme',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 5500, 10, 500, 5, true, true,
        '{"sizes": ["XS", "S", "M", "L", "XL"], "colors": ["blanc", "noir", "bleu marine", "rose"], "material": "100% coton piqué 200g/m²", "fit": "fitted"}',
        ARRAY['embroidery', 'screen_print'],
        'Polo coupe femme'),

    ('Polo performance', 'Polo performance', 'polo-performance',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 7500, 10, 300, 7, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["blanc", "noir", "bleu roi"], "material": "polyester respirant", "features": ["anti-transpirant", "séchage rapide"]}',
        ARRAY['embroidery', 'sublimation'],
        'Polo technique sport'),

    -- Sweats & Hoodies
    ('Sweat-shirt col rond', 'Sweat-shirt col rond', 'sweat-col-rond',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 8500, 5, 300, 7, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["noir", "gris chiné", "bleu marine", "bordeaux"], "material": "80% coton 20% polyester 280g/m²"}',
        ARRAY['screen_print', 'dtg', 'embroidery', 'vinyl'],
        'Sweat-shirt classique'),

    ('Hoodie à capuche', 'Hoodie à capuche', 'hoodie-capuche',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 12000, 5, 300, 7, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["noir", "gris", "bleu marine", "bordeaux", "vert forêt"], "material": "80% coton 20% polyester 320g/m²", "features": ["capuche doublée", "poche kangourou"]}',
        ARRAY['screen_print', 'dtg', 'embroidery', 'vinyl'],
        'Hoodie avec capuche et poche kangourou'),

    ('Sweat zippé', 'Sweat zippé', 'sweat-zippe',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 14000, 5, 200, 7, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["noir", "gris", "bleu marine"], "material": "80% coton 20% polyester 300g/m²", "features": ["zip intégral", "2 poches"]}',
        ARRAY['embroidery', 'screen_print'],
        'Sweat avec fermeture zippée'),

    -- Vestes & Gilets
    ('Veste softshell', 'Veste softshell', 'veste-softshell',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 25000, 5, 100, 10, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["noir", "bleu marine", "gris"], "material": "softshell 3 couches", "features": ["coupe-vent", "déperlant"]}',
        ARRAY['embroidery'],
        'Veste softshell technique'),

    ('Gilet sans manches', 'Gilet sans manches', 'gilet-sans-manches',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 18000, 5, 100, 10, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["noir", "bleu marine", "rouge"], "material": "polyester matelassé"}',
        ARRAY['embroidery'],
        'Gilet matelassé sans manches'),

    -- Casquettes & Chapeaux
    ('Casquette baseball', 'Casquette baseball', 'casquette-baseball',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 4500, 20, 500, 7, true, true,
        '{"style": "baseball 5 panneaux", "colors": ["noir", "blanc", "bleu marine", "rouge", "vert", "orange"], "material": "100% coton", "closure": "snapback ajustable"}',
        ARRAY['embroidery', 'screen_print'],
        'Casquette baseball classique'),

    ('Casquette trucker', 'Casquette trucker', 'casquette-trucker',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 4000, 20, 500, 7, true, true,
        '{"style": "trucker mesh", "colors": ["noir/noir", "blanc/noir", "bleu/blanc", "rouge/blanc"], "material": "coton + filet", "closure": "snapback"}',
        ARRAY['embroidery', 'screen_print', 'vinyl'],
        'Casquette trucker avec filet'),

    ('Casquette fitted', 'Casquette fitted', 'casquette-fitted',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 5500, 20, 300, 7, true, true,
        '{"style": "fitted", "sizes": ["S/M", "L/XL"], "colors": ["noir", "bleu marine", "gris"], "material": "coton stretch"}',
        ARRAY['embroidery'],
        'Casquette fitted ajustée'),

    ('Bonnet', 'Bonnet', 'bonnet',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 3500, 20, 500, 7, true, true,
        '{"style": "beanie", "colors": ["noir", "gris", "bleu marine", "bordeaux", "vert forêt"], "material": "acrylique doux"}',
        ARRAY['embroidery'],
        'Bonnet tricoté'),

    ('Bob / Bucket hat', 'Bob', 'bob-bucket-hat',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 5000, 20, 300, 7, true, true,
        '{"style": "bucket", "sizes": ["S/M", "L/XL"], "colors": ["noir", "blanc", "beige", "kaki"], "material": "100% coton"}',
        ARRAY['embroidery', 'screen_print'],
        'Bob tendance'),

    -- Tabliers & Workwear
    ('Tablier de cuisine', 'Tablier de cuisine', 'tablier-cuisine',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 6500, 10, 200, 7, true, true,
        '{"style": "bavette", "colors": ["noir", "blanc", "bordeaux", "bleu"], "material": "coton épais", "features": ["poche frontale", "attaches réglables"]}',
        ARRAY['embroidery', 'screen_print'],
        'Tablier professionnel'),

    ('Tablier serveur', 'Tablier serveur', 'tablier-serveur',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 5000, 10, 200, 7, true, true,
        '{"style": "taille", "colors": ["noir", "blanc", "gris"], "material": "polycoton", "features": ["3 poches"]}',
        ARRAY['embroidery'],
        'Tablier de service mi-long'),

    -- Sacs
    ('Tote bag coton', 'Tote bag coton', 'tote-bag-coton',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 2500, 50, 1000, 5, true, true,
        '{"dimensions": "38x42cm", "colors": ["naturel", "noir", "blanc"], "material": "coton 140g/m²", "handles": "anses longues"}',
        ARRAY['screen_print', 'dtg'],
        'Sac cabas écologique'),

    ('Tote bag premium', 'Tote bag premium', 'tote-bag-premium',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 4500, 25, 500, 5, true, true,
        '{"dimensions": "38x42cm", "colors": ["naturel", "noir"], "material": "coton bio 280g/m²", "handles": "anses longues renforcées"}',
        ARRAY['screen_print', 'dtg', 'embroidery'],
        'Sac cabas coton épais'),

    ('Sac à dos', 'Sac à dos', 'sac-a-dos',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 15000, 10, 100, 10, true, true,
        '{"dimensions": "30x40x15cm", "colors": ["noir", "gris", "bleu marine"], "material": "polyester 600D", "features": ["poche laptop", "bretelles rembourrées"]}',
        ARRAY['embroidery', 'screen_print'],
        'Sac à dos personnalisable'),

    ('Sac de sport', 'Sac de sport', 'sac-sport',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        'core', 12000, 10, 100, 10, true, true,
        '{"dimensions": "50x30x25cm", "colors": ["noir", "bleu marine", "rouge"], "material": "polyester résistant", "features": ["compartiment chaussures", "bandoulière"]}',
        ARRAY['embroidery', 'screen_print'],
        'Sac de sport avec compartiments')
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques,
    description = EXCLUDED.description;

-- =============================================
-- IMPRESSION PAPIER (30 products)
-- =============================================

INSERT INTO public.print_products (name, name_fr, slug, category_id, catalog_type, base_price, min_quantity, max_quantity, production_days, requires_design, is_active, specifications, available_print_techniques, description) VALUES
    -- Cartes de visite
    ('Cartes de visite standard', 'Cartes de visite standard', 'cartes-visite-standard',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 150, 100, 5000, 3, true, true,
        '{"format": "85x55mm", "paper": ["350g couché brillant", "350g couché mat"], "sides": ["recto", "recto-verso"], "finish": ["standard", "pelliculage brillant", "pelliculage mat"]}',
        ARRAY['offset', 'digital'],
        'Cartes de visite format standard'),

    ('Cartes de visite premium', 'Cartes de visite premium', 'cartes-visite-premium',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 350, 100, 2000, 5, true, true,
        '{"format": "85x55mm", "paper": ["400g soft-touch", "350g texturé", "300g recyclé kraft"], "sides": ["recto-verso"], "finish": ["soft-touch", "vernis sélectif", "dorure à chaud"]}',
        ARRAY['offset'],
        'Cartes de visite finition premium'),

    ('Cartes de visite carrées', 'Cartes de visite carrées', 'cartes-visite-carrees',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 200, 100, 2000, 5, true, true,
        '{"format": "55x55mm", "paper": ["350g couché mat", "400g soft-touch"], "sides": ["recto-verso"]}',
        ARRAY['offset', 'digital'],
        'Cartes de visite format carré'),

    ('Cartes de visite coins arrondis', 'Cartes de visite coins arrondis', 'cartes-visite-coins-arrondis',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 200, 100, 2000, 5, true, true,
        '{"format": "85x55mm", "paper": ["350g couché mat", "350g couché brillant"], "sides": ["recto-verso"], "corners": "arrondis 5mm"}',
        ARRAY['offset', 'digital'],
        'Cartes de visite aux coins arrondis'),

    -- Flyers
    ('Flyers A6', 'Flyers A6', 'flyers-a6',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 35, 100, 10000, 3, true, true,
        '{"format": "A6 (105x148mm)", "paper": ["135g brillant", "135g mat", "170g brillant", "170g mat"], "sides": ["recto", "recto-verso"]}',
        ARRAY['offset', 'digital'],
        'Flyers petit format A6'),

    ('Flyers A5', 'Flyers A5', 'flyers-a5',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 50, 100, 10000, 3, true, true,
        '{"format": "A5 (148x210mm)", "paper": ["135g brillant", "135g mat", "170g brillant", "170g mat", "250g"], "sides": ["recto", "recto-verso"]}',
        ARRAY['offset', 'digital'],
        'Flyers format A5'),

    ('Flyers A4', 'Flyers A4', 'flyers-a4',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 80, 100, 10000, 3, true, true,
        '{"format": "A4 (210x297mm)", "paper": ["135g brillant", "135g mat", "170g brillant", "170g mat", "250g"], "sides": ["recto", "recto-verso"]}',
        ARRAY['offset', 'digital'],
        'Flyers grand format A4'),

    ('Flyers DL', 'Flyers DL', 'flyers-dl',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 45, 100, 10000, 3, true, true,
        '{"format": "DL (99x210mm)", "paper": ["135g brillant", "170g mat", "250g"], "sides": ["recto", "recto-verso"]}',
        ARRAY['offset', 'digital'],
        'Flyers format DL (1/3 A4)'),

    -- Dépliants
    ('Dépliant 2 volets A5', 'Dépliant 2 volets A5', 'depliant-2-volets-a5',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 120, 100, 5000, 5, true, true,
        '{"format": "A5 fermé (A4 ouvert)", "paper": ["170g couché", "250g couché"], "folds": "1 pli", "sides": "recto-verso"}',
        ARRAY['offset', 'digital'],
        'Dépliant 2 volets format A5'),

    ('Dépliant 2 volets A4', 'Dépliant 2 volets A4', 'depliant-2-volets-a4',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 180, 100, 5000, 5, true, true,
        '{"format": "A4 fermé (A3 ouvert)", "paper": ["170g couché", "250g couché"], "folds": "1 pli", "sides": "recto-verso"}',
        ARRAY['offset', 'digital'],
        'Dépliant 2 volets format A4'),

    ('Dépliant 3 volets A4', 'Dépliant 3 volets A4', 'depliant-3-volets-a4',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 150, 100, 5000, 5, true, true,
        '{"format": "DL fermé (A4 ouvert)", "paper": ["170g couché", "250g couché"], "folds": "2 plis roulés ou accordéon", "sides": "recto-verso"}',
        ARRAY['offset', 'digital'],
        'Dépliant 3 volets classique'),

    ('Dépliant 4 volets', 'Dépliant 4 volets', 'depliant-4-volets',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 200, 100, 3000, 5, true, true,
        '{"format": "A5 fermé", "paper": ["170g couché", "250g couché"], "folds": "3 plis", "sides": "recto-verso"}',
        ARRAY['offset'],
        'Dépliant 4 volets'),

    -- Affiches
    ('Affiche A4', 'Affiche A4', 'affiche-a4',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 300, 10, 1000, 3, true, true,
        '{"format": "A4 (210x297mm)", "paper": ["170g couché brillant", "170g couché mat", "photo glossy"]}',
        ARRAY['digital', 'offset'],
        'Affiche format A4'),

    ('Affiche A3', 'Affiche A3', 'affiche-a3',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 500, 10, 1000, 3, true, true,
        '{"format": "A3 (297x420mm)", "paper": ["170g couché brillant", "170g couché mat", "photo glossy"]}',
        ARRAY['digital', 'offset'],
        'Affiche format A3'),

    ('Affiche A2', 'Affiche A2', 'affiche-a2',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 1200, 5, 500, 5, true, true,
        '{"format": "A2 (420x594mm)", "paper": ["170g couché", "photo premium"]}',
        ARRAY['digital'],
        'Affiche grand format A2'),

    ('Affiche A1', 'Affiche A1', 'affiche-a1',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 2500, 5, 200, 5, true, true,
        '{"format": "A1 (594x841mm)", "paper": ["170g couché", "photo premium"]}',
        ARRAY['digital'],
        'Affiche très grand format A1'),

    ('Affiche A0', 'Affiche A0', 'affiche-a0',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 5000, 1, 100, 5, true, true,
        '{"format": "A0 (841x1189mm)", "paper": ["170g couché", "photo premium"]}',
        ARRAY['digital'],
        'Affiche géante A0'),

    -- Brochures
    ('Brochure A5 8 pages', 'Brochure A5 8 pages', 'brochure-a5-8pages',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 800, 50, 2000, 7, true, true,
        '{"format": "A5", "pages": 8, "paper": ["135g couché", "170g couché"], "binding": "piqûre 2 points"}',
        ARRAY['offset', 'digital'],
        'Brochure 8 pages agrafée'),

    ('Brochure A5 12 pages', 'Brochure A5 12 pages', 'brochure-a5-12pages',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 1000, 50, 2000, 7, true, true,
        '{"format": "A5", "pages": 12, "paper": ["135g couché", "170g couché"], "binding": "piqûre 2 points"}',
        ARRAY['offset', 'digital'],
        'Brochure 12 pages agrafée'),

    ('Brochure A5 16 pages', 'Brochure A5 16 pages', 'brochure-a5-16pages',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 1200, 50, 2000, 7, true, true,
        '{"format": "A5", "pages": 16, "paper": ["135g couché", "170g couché"], "binding": "piqûre 2 points"}',
        ARRAY['offset', 'digital'],
        'Brochure 16 pages agrafée'),

    ('Brochure A4 8 pages', 'Brochure A4 8 pages', 'brochure-a4-8pages',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 1200, 50, 1000, 7, true, true,
        '{"format": "A4", "pages": 8, "paper": ["135g couché", "170g couché"], "binding": "piqûre 2 points"}',
        ARRAY['offset', 'digital'],
        'Brochure A4 8 pages'),

    ('Catalogue A4 dos carré collé', 'Catalogue A4 dos carré collé', 'catalogue-a4-dos-carre',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'extended', 3500, 50, 500, 10, true, true,
        '{"format": "A4", "pages": "24-100", "paper": ["135g couché intérieur", "250g couché couverture"], "binding": "dos carré collé"}',
        ARRAY['offset'],
        'Catalogue relié dos carré collé'),

    -- Menus & Cartes
    ('Menu restaurant A4', 'Menu restaurant A4', 'menu-restaurant-a4',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 500, 25, 500, 5, true, true,
        '{"format": "A4", "paper": ["350g couché mat", "350g texturé"], "finish": ["pelliculage mat", "pelliculage brillant", "vernis soft-touch"]}',
        ARRAY['digital', 'offset'],
        'Menu de restaurant format A4'),

    ('Menu restaurant A3 plié', 'Menu restaurant A3 plié', 'menu-restaurant-a3-plie',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 800, 25, 300, 5, true, true,
        '{"format": "A3 plié en 2 (A4 fermé)", "paper": ["350g couché mat"], "finish": ["pelliculage mat"]}',
        ARRAY['digital', 'offset'],
        'Menu A3 plié'),

    ('Set de table', 'Set de table', 'set-de-table',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 100, 250, 5000, 5, true, true,
        '{"format": "A3 (297x420mm)", "paper": ["80g offset", "100g offset"]}',
        ARRAY['offset'],
        'Set de table papier'),

    -- Autres papier
    ('Tête de lettre', 'Tête de lettre', 'tete-de-lettre',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 80, 100, 5000, 5, true, true,
        '{"format": "A4", "paper": ["90g offset", "100g vélin", "120g vergé"]}',
        ARRAY['offset', 'digital'],
        'Papier à en-tête'),

    ('Enveloppes personnalisées', 'Enveloppes personnalisées', 'enveloppes-personnalisees',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 150, 100, 5000, 5, true, true,
        '{"formats": ["DL (110x220mm)", "C5 (162x229mm)", "C4 (229x324mm)"], "paper": ["80g offset blanc"], "print": "recto"}',
        ARRAY['offset'],
        'Enveloppes avec logo'),

    ('Chemises à rabats', 'Chemises à rabats', 'chemises-rabats',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'core', 1500, 50, 1000, 7, true, true,
        '{"format": "A4", "paper": ["350g couché mat", "350g couché brillant"], "features": ["2 rabats", "encoche carte de visite"]}',
        ARRAY['offset'],
        'Pochette à rabats pour documents'),

    ('Calendrier mural', 'Calendrier mural', 'calendrier-mural',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'extended', 3000, 25, 500, 10, true, true,
        '{"format": "A3", "pages": 13, "paper": ["170g couché brillant"], "binding": "spirale métal", "features": ["trou de suspension"]}',
        ARRAY['offset', 'digital'],
        'Calendrier mural 12 mois'),

    ('Calendrier de bureau', 'Calendrier de bureau', 'calendrier-bureau',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        'extended', 2500, 25, 500, 10, true, true,
        '{"format": "DL", "pages": 13, "paper": ["250g couché"], "binding": "spirale", "features": ["support carton"]}',
        ARRAY['offset', 'digital'],
        'Calendrier chevalet de bureau')
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques,
    description = EXCLUDED.description;

-- =============================================
-- GRAND FORMAT (20 products)
-- =============================================

INSERT INTO public.print_products (name, name_fr, slug, category_id, catalog_type, base_price, min_quantity, max_quantity, production_days, requires_design, is_active, specifications, available_print_techniques, description) VALUES
    -- Roll-ups & Kakémonos
    ('Roll-up 85x200cm', 'Roll-up 85x200cm', 'roll-up-85x200',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 35000, 1, 50, 5, true, true,
        '{"dimensions": "85x200cm", "material": "bâche PVC 440g anti-reflet", "includes": "structure aluminium + housse", "print": "recto"}',
        ARRAY['digital'],
        'Roll-up standard avec structure'),

    ('Roll-up 100x200cm', 'Roll-up 100x200cm', 'roll-up-100x200',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 40000, 1, 50, 5, true, true,
        '{"dimensions": "100x200cm", "material": "bâche PVC 440g anti-reflet", "includes": "structure aluminium + housse", "print": "recto"}',
        ARRAY['digital'],
        'Roll-up large avec structure'),

    ('Roll-up premium 85x200cm', 'Roll-up premium 85x200cm', 'roll-up-premium-85x200',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 55000, 1, 30, 5, true, true,
        '{"dimensions": "85x200cm", "material": "bâche premium", "includes": "structure aluminium renforcée + housse rigide", "features": ["anti-curl", "éclairage LED optionnel"]}',
        ARRAY['digital'],
        'Roll-up haut de gamme'),

    ('Roll-up double face', 'Roll-up double face', 'roll-up-double-face',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 65000, 1, 20, 7, true, true,
        '{"dimensions": "85x200cm", "material": "bâche blockout", "includes": "structure double face + housse", "print": "recto-verso"}',
        ARRAY['digital'],
        'Roll-up visible des deux côtés'),

    ('Kakémono 60x160cm', 'Kakémono 60x160cm', 'kakemono-60x160',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 25000, 1, 50, 5, true, true,
        '{"dimensions": "60x160cm", "material": "bâche PVC 440g", "includes": "structure X-banner + housse"}',
        ARRAY['digital'],
        'Kakémono X-banner'),

    ('Kakémono 80x180cm', 'Kakémono 80x180cm', 'kakemono-80x180',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 30000, 1, 50, 5, true, true,
        '{"dimensions": "80x180cm", "material": "bâche PVC 440g", "includes": "structure X-banner + housse"}',
        ARRAY['digital'],
        'Kakémono X-banner grand'),

    -- Bâches & Banderoles
    ('Bâche PVC', 'Bâche PVC', 'bache-pvc',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 8000, 1, 100, 5, true, true,
        '{"unit": "m²", "material": "PVC 500g", "finish": ["œillets tous les 50cm", "ourlets renforcés"], "print": "recto"}',
        ARRAY['digital', 'uv'],
        'Bâche PVC au m²'),

    ('Bâche micro-perforée', 'Bâche micro-perforée', 'bache-micro-perforee',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 12000, 1, 50, 5, true, true,
        '{"unit": "m²", "material": "PVC micro-perforé", "finish": ["œillets", "ourlets"], "features": ["laisse passer l air", "idéal façades"]}',
        ARRAY['digital'],
        'Bâche perforée pour façades'),

    ('Bâche mesh', 'Bâche mesh', 'bache-mesh',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 10000, 1, 50, 5, true, true,
        '{"unit": "m²", "material": "mesh aéré", "finish": ["œillets", "ourlets"], "features": ["résistant au vent"]}',
        ARRAY['digital'],
        'Bâche aérée pour grands formats'),

    ('Banderole', 'Banderole', 'banderole',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 8000, 1, 50, 3, true, true,
        '{"dimensions": "sur mesure", "material": "PVC 500g", "finish": ["œillets", "ourlets", "sandows optionnels"]}',
        ARRAY['digital'],
        'Banderole publicitaire'),

    -- Panneaux & Plaques
    ('Panneau Dibond', 'Panneau Dibond', 'panneau-dibond',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 15000, 1, 50, 5, true, true,
        '{"unit": "m²", "material": "Dibond 3mm (aluminium composite)", "finish": ["découpe droite", "découpe forme"], "features": ["usage intérieur/extérieur"]}',
        ARRAY['digital', 'uv'],
        'Panneau rigide aluminium'),

    ('Panneau PVC expansé', 'Panneau PVC expansé', 'panneau-pvc-expanse',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 10000, 1, 50, 5, true, true,
        '{"unit": "m²", "material": "PVC expansé 3mm ou 5mm", "finish": ["découpe droite"], "features": ["léger", "usage intérieur"]}',
        ARRAY['digital', 'uv'],
        'Panneau PVC léger'),

    ('Panneau Akylux', 'Panneau Akylux', 'panneau-akylux',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 6000, 1, 100, 3, true, true,
        '{"unit": "m²", "material": "polypropylène alvéolaire 3.5mm", "finish": ["découpe droite"], "features": ["économique", "temporaire"]}',
        ARRAY['digital'],
        'Panneau alvéolaire économique'),

    ('Plaque plexiglas', 'Plaque plexiglas', 'plaque-plexiglas',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'extended', 25000, 1, 20, 7, true, true,
        '{"unit": "m²", "material": "PMMA transparent ou blanc 3mm", "finish": ["découpe droite", "perçages"], "features": ["élégant", "intérieur"]}',
        ARRAY['uv'],
        'Plaque en plexiglas'),

    -- Stands & PLV
    ('Stand parapluie 3x3', 'Stand parapluie 3x3', 'stand-parapluie-3x3',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'extended', 180000, 1, 10, 10, true, true,
        '{"dimensions": "3x3 panneaux (env. 230x230cm)", "material": "tissu polyester sublimé", "includes": "structure aluminium + housse + spots"}',
        ARRAY['sublimation'],
        'Mur d image stand'),

    ('Comptoir d accueil', 'Comptoir d accueil', 'comptoir-accueil',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'extended', 85000, 1, 10, 10, true, true,
        '{"dimensions": "env. 100x100x40cm", "material": "structure aluminium + impression textile ou rigide", "features": ["tablette", "rangement"]}',
        ARRAY['digital', 'sublimation'],
        'Comptoir promotionnel'),

    ('Totem carton', 'Totem carton', 'totem-carton',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 15000, 1, 50, 5, true, true,
        '{"dimensions": "sur mesure (160-180cm hauteur)", "material": "carton alvéolaire", "print": "recto-verso ou découpe silhouette"}',
        ARRAY['digital'],
        'Totem PLV en carton'),

    -- Adhésifs & Vitrophanies
    ('Adhésif vinyle', 'Adhésif vinyle', 'adhesif-vinyle',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 8000, 1, 100, 3, true, true,
        '{"unit": "m²", "material": "vinyle monomère ou polymère", "finish": ["mat", "brillant", "transparent"], "features": ["intérieur/extérieur"]}',
        ARRAY['digital'],
        'Adhésif vinyle au m²'),

    ('Vitrophanie', 'Vitrophanie', 'vitrophanie',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 10000, 1, 50, 3, true, true,
        '{"unit": "m²", "material": "vinyle transparent ou dépoli", "options": ["micro-perforé one-way"], "features": ["pose intérieure ou extérieure"]}',
        ARRAY['digital'],
        'Adhésif pour vitrines'),

    ('Stickers découpés', 'Stickers découpés', 'stickers-decoupes',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        'core', 3000, 10, 1000, 3, true, true,
        '{"dimensions": "sur mesure", "material": "vinyle adhésif", "finish": ["découpe à la forme", "échenillage"], "features": ["intérieur/extérieur"]}',
        ARRAY['digital'],
        'Autocollants découpés à la forme')
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques,
    description = EXCLUDED.description;

-- =============================================
-- OBJETS PUBLICITAIRES / GOODIES (20 products)
-- =============================================

INSERT INTO public.print_products (name, name_fr, slug, category_id, catalog_type, base_price, min_quantity, max_quantity, production_days, requires_design, is_active, specifications, available_print_techniques, description) VALUES
    -- Mugs & Bouteilles
    ('Mug céramique blanc', 'Mug céramique blanc', 'mug-ceramique-blanc',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 3500, 24, 500, 7, true, true,
        '{"capacity": "330ml", "material": "céramique", "colors": ["blanc"], "print_area": "wrap around"}',
        ARRAY['sublimation'],
        'Mug classique sublimé'),

    ('Mug magique', 'Mug magique', 'mug-magique',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 5500, 24, 200, 7, true, true,
        '{"capacity": "330ml", "material": "céramique thermosensible", "colors": ["noir révélateur"], "features": ["image apparaît avec chaleur"]}',
        ARRAY['sublimation'],
        'Mug qui révèle l image à chaud'),

    ('Mug coloré intérieur', 'Mug coloré intérieur', 'mug-colore-interieur',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 4000, 24, 300, 7, true, true,
        '{"capacity": "330ml", "material": "céramique", "colors": ["intérieur rouge", "intérieur bleu", "intérieur vert", "intérieur jaune"]}',
        ARRAY['sublimation'],
        'Mug blanc avec intérieur coloré'),

    ('Gourde isotherme', 'Gourde isotherme', 'gourde-isotherme',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'extended', 12000, 25, 200, 10, true, true,
        '{"capacity": "500ml", "material": "inox double paroi", "colors": ["argent", "noir", "blanc"], "features": ["garde chaud 12h / froid 24h"]}',
        ARRAY['laser', 'uv'],
        'Bouteille isotherme gravée'),

    ('Bouteille sport', 'Bouteille sport', 'bouteille-sport',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 4500, 50, 500, 7, true, true,
        '{"capacity": "750ml", "material": "plastique BPA free", "colors": ["transparent", "noir", "bleu", "rouge"]}',
        ARRAY['screen_print', 'digital'],
        'Gourde sport réutilisable'),

    -- Stylos & Bureau
    ('Stylo bille classique', 'Stylo bille classique', 'stylo-bille-classique',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 350, 100, 5000, 5, true, true,
        '{"type": "bille rétractable", "colors": ["blanc", "noir", "bleu", "rouge"], "print_area": "corps"}',
        ARRAY['screen_print', 'digital'],
        'Stylo publicitaire économique'),

    ('Stylo bille premium', 'Stylo bille premium', 'stylo-bille-premium',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 800, 50, 2000, 7, true, true,
        '{"type": "bille métal", "colors": ["argent", "noir", "bleu foncé"], "print_area": "corps gravure ou impression"}',
        ARRAY['laser', 'screen_print'],
        'Stylo métal élégant'),

    ('Stylo 4 couleurs', 'Stylo 4 couleurs', 'stylo-4-couleurs',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 1200, 50, 1000, 7, true, true,
        '{"type": "4 couleurs", "inks": ["bleu", "noir", "rouge", "vert"], "colors": ["blanc", "transparent"]}',
        ARRAY['screen_print'],
        'Stylo 4 couleurs personnalisé'),

    ('Bloc-notes A5', 'Bloc-notes A5', 'bloc-notes-a5',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 2500, 50, 500, 7, true, true,
        '{"format": "A5", "pages": "50 feuilles", "paper": "80g offset", "binding": "collé tête", "cover": "couverture imprimée"}',
        ARRAY['offset', 'digital'],
        'Bloc-notes avec couverture personnalisée'),

    ('Carnet A5 relié', 'Carnet A5 relié', 'carnet-a5-relie',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'extended', 6500, 25, 200, 10, true, true,
        '{"format": "A5", "pages": "80 feuilles", "paper": "90g ivoire", "binding": "cousu", "cover": "couverture rigide"}',
        ARRAY['offset', 'digital'],
        'Carnet élégant couverture rigide'),

    -- Textile goodies
    ('Lanyard / Tour de cou', 'Lanyard', 'lanyard-tour-de-cou',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 1500, 50, 1000, 7, true, true,
        '{"width": "15mm ou 20mm", "material": "polyester satiné", "attachment": ["mousqueton", "porte-badge"], "print": "sublimation recto ou recto-verso"}',
        ARRAY['sublimation'],
        'Tour de cou porte-badge'),

    ('Bracelet tissu événement', 'Bracelet tissu', 'bracelet-tissu-evenement',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 500, 100, 5000, 5, true, true,
        '{"width": "15mm", "material": "polyester", "closure": "clip plastique sécurisé", "print": "sublimation"}',
        ARRAY['sublimation'],
        'Bracelet festival personnalisé'),

    ('Bandana', 'Bandana', 'bandana',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 2500, 50, 500, 7, true, true,
        '{"dimensions": "55x55cm", "material": "polyester", "finish": "ourlets"}',
        ARRAY['sublimation'],
        'Bandana sublimé'),

    -- Tech & Accessoires
    ('Clé USB personnalisée', 'Clé USB personnalisée', 'cle-usb-personnalisee',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'extended', 8000, 25, 500, 10, true, true,
        '{"capacity": ["8GB", "16GB", "32GB"], "styles": ["carte", "classique", "métal"], "print": "logo imprimé ou gravé"}',
        ARRAY['digital', 'laser'],
        'Clé USB avec logo'),

    ('Power bank', 'Power bank', 'power-bank',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'extended', 15000, 25, 200, 10, true, true,
        '{"capacity": "5000mAh ou 10000mAh", "outputs": ["USB-A", "USB-C"], "print_area": "face avant"}',
        ARRAY['digital', 'uv'],
        'Batterie externe personnalisée'),

    ('Support téléphone', 'Support téléphone', 'support-telephone',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 2000, 50, 500, 7, true, true,
        '{"material": "plastique ou bambou", "type": "pliable", "print_area": "face visible"}',
        ARRAY['digital', 'screen_print'],
        'Support smartphone de bureau'),

    ('Tapis de souris', 'Tapis de souris', 'tapis-de-souris',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 3000, 25, 500, 5, true, true,
        '{"dimensions": "22x18cm ou 24x20cm", "material": "mousse + surface textile", "print": "sublimation full color"}',
        ARRAY['sublimation'],
        'Tapis de souris sublimé'),

    ('Porte-clés métal', 'Porte-clés métal', 'porte-cles-metal',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 2500, 50, 1000, 7, true, true,
        '{"material": "métal chromé ou brossé", "shapes": ["rectangle", "rond", "maison", "voiture"], "print": "gravure laser ou résine"}',
        ARRAY['laser'],
        'Porte-clés métal gravé'),

    ('Porte-clés plastique', 'Porte-clés plastique', 'porte-cles-plastique',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'core', 1200, 100, 2000, 5, true, true,
        '{"material": "acrylique", "shapes": ["rectangle", "rond", "forme personnalisée"], "print": "impression couleur"}',
        ARRAY['digital'],
        'Porte-clés acrylique personnalisé'),

    ('Parapluie personnalisé', 'Parapluie personnalisé', 'parapluie-personnalise',
        (SELECT id FROM public.print_product_categories WHERE slug = 'goodies'),
        'extended', 12000, 25, 200, 10, true, true,
        '{"types": ["pliant", "golf", "canne"], "colors": ["noir", "bleu marine", "rouge"], "print": "1 à 4 panneaux"}',
        ARRAY['screen_print', 'sublimation'],
        'Parapluie avec logo')
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques,
    description = EXCLUDED.description;

-- =============================================
-- PACKAGING (10 products)
-- =============================================

INSERT INTO public.print_products (name, name_fr, slug, category_id, catalog_type, base_price, min_quantity, max_quantity, production_days, requires_design, is_active, specifications, available_print_techniques, description) VALUES
    ('Boîte carton kraft', 'Boîte carton kraft', 'boite-carton-kraft',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'core', 2000, 50, 1000, 7, true, true,
        '{"sizes": ["petite 10x10x10cm", "moyenne 15x15x10cm", "grande 20x20x15cm"], "material": "carton kraft 350g", "print": "1 à 4 couleurs"}',
        ARRAY['offset', 'digital'],
        'Boîte en carton kraft naturel'),

    ('Boîte carton blanc', 'Boîte carton blanc', 'boite-carton-blanc',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'core', 2500, 50, 1000, 7, true, true,
        '{"sizes": ["petite", "moyenne", "grande", "sur mesure"], "material": "carton blanc couché 350g", "print": "quadri"}',
        ARRAY['offset', 'digital'],
        'Boîte blanche imprimée'),

    ('Boîte luxe aimantée', 'Boîte luxe aimantée', 'boite-luxe-aimantee',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'extended', 8000, 25, 300, 10, true, true,
        '{"sizes": ["sur mesure"], "material": "carton rigide 2mm + pelliculage", "features": ["fermeture aimantée", "mousse intérieure optionnelle"]}',
        ARRAY['offset'],
        'Coffret premium avec aimant'),

    ('Pochette cadeau', 'Pochette cadeau', 'pochette-cadeau',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'core', 1500, 100, 2000, 5, true, true,
        '{"sizes": ["petite", "moyenne", "grande"], "material": "papier kraft ou couché", "handles": "cordelettes ou rubans"}',
        ARRAY['offset', 'digital'],
        'Sac cadeau avec poignées'),

    ('Sac papier kraft', 'Sac papier kraft', 'sac-papier-kraft',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'core', 800, 100, 5000, 5, true, true,
        '{"sizes": ["S 18x8x22cm", "M 26x12x32cm", "L 32x12x40cm"], "material": "kraft 100g", "handles": "poignées torsadées papier"}',
        ARRAY['offset'],
        'Sac shopping kraft'),

    ('Sac papier luxe', 'Sac papier luxe', 'sac-papier-luxe',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'extended', 3500, 50, 1000, 7, true, true,
        '{"sizes": ["sur mesure"], "material": "papier couché 200g + pelliculage", "handles": "cordelettes coton", "finish": ["mat", "brillant", "soft-touch"]}',
        ARRAY['offset'],
        'Sac shopping haut de gamme'),

    ('Papier de soie', 'Papier de soie', 'papier-de-soie',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'core', 300, 500, 10000, 5, true, true,
        '{"dimensions": "50x75cm", "colors": ["blanc", "kraft", "couleurs assorties"], "print": "logo 1 couleur"}',
        ARRAY['offset'],
        'Papier de soie pour emballage'),

    ('Ruban personnalisé', 'Ruban personnalisé', 'ruban-personnalise',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'extended', 5000, 100, 1000, 7, true, true,
        '{"width": ["15mm", "25mm", "40mm"], "material": "satin ou gros-grain", "print": "logo répété", "unit": "rouleau 100m"}',
        ARRAY['screen_print'],
        'Ruban cadeau avec logo'),

    ('Étiquettes adhésives', 'Étiquettes adhésives', 'etiquettes-adhesives',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'core', 100, 100, 10000, 3, true, true,
        '{"shapes": ["rond", "carré", "rectangle", "forme personnalisée"], "material": ["papier mat", "papier brillant", "transparent"], "sizes": ["sur mesure"]}',
        ARRAY['digital', 'offset'],
        'Étiquettes autocollantes'),

    ('Scotch personnalisé', 'Scotch personnalisé', 'scotch-personnalise',
        (SELECT id FROM public.print_product_categories WHERE slug = 'packaging'),
        'extended', 8000, 36, 500, 7, true, true,
        '{"width": "48mm ou 75mm", "length": "66m par rouleau", "print": "logo répété", "colors": ["fond blanc", "fond kraft", "transparent"]}',
        ARRAY['offset'],
        'Ruban adhésif imprimé')
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques,
    description = EXCLUDED.description;

-- =============================================
-- BUREAUTIQUE (10 products)
-- =============================================

INSERT INTO public.print_products (name, name_fr, slug, category_id, catalog_type, base_price, min_quantity, max_quantity, production_days, requires_design, is_active, specifications, available_print_techniques, description) VALUES
    ('Tampon encreur', 'Tampon encreur', 'tampon-encreur',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 8000, 1, 50, 5, false, true,
        '{"sizes": ["petit 38x14mm", "moyen 58x22mm", "grand 76x37mm"], "type": "auto-encreur", "ink_colors": ["noir", "bleu", "rouge"]}',
        ARRAY['laser'],
        'Tampon automatique personnalisé'),

    ('Tampon bois', 'Tampon bois', 'tampon-bois',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 5000, 1, 50, 5, false, true,
        '{"sizes": ["sur mesure"], "type": "bois + caoutchouc", "requires": "encreur séparé"}',
        ARRAY['laser'],
        'Tampon traditionnel en bois'),

    ('Cachet de cire', 'Cachet de cire', 'cachet-de-cire',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'extended', 15000, 1, 20, 10, false, true,
        '{"diameter": "25mm ou 30mm", "material": "laiton gravé", "handle": "bois"}',
        ARRAY['laser'],
        'Sceau pour cire à cacheter'),

    ('Plaque de porte', 'Plaque de porte', 'plaque-de-porte',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 8000, 1, 50, 5, true, true,
        '{"sizes": ["15x5cm", "20x5cm", "30x10cm"], "material": ["aluminium brossé", "plexiglas", "laiton"], "print": "gravure ou impression"}',
        ARRAY['laser', 'uv'],
        'Plaque signalétique de bureau'),

    ('Plaque entreprise', 'Plaque entreprise', 'plaque-entreprise',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 25000, 1, 10, 7, true, true,
        '{"sizes": ["30x20cm", "40x30cm", "60x40cm"], "material": ["plexiglas", "dibond", "aluminium"], "mounting": "entretoises inox"}',
        ARRAY['uv', 'laser'],
        'Plaque professionnelle extérieure'),

    ('Badge nominatif', 'Badge nominatif', 'badge-nominatif',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 2500, 10, 200, 5, true, true,
        '{"sizes": ["7x2.5cm", "8x3cm"], "material": ["plastique", "métal"], "attachment": ["épingle", "aimant", "clip"]}',
        ARRAY['digital', 'laser'],
        'Badge prénom pour employés'),

    ('Enseigne lumineuse', 'Enseigne lumineuse', 'enseigne-lumineuse',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'extended', 150000, 1, 5, 15, true, true,
        '{"type": "caisson LED", "material": "aluminium + face plexiglas", "lighting": "LED blanc ou couleur", "sizes": "sur mesure"}',
        ARRAY['uv'],
        'Caisson lumineux pour façade'),

    ('Lettres découpées', 'Lettres découpées', 'lettres-decoupees',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'extended', 5000, 1, 20, 10, true, true,
        '{"material": ["PVC 10mm", "alu dibond", "inox brossé"], "height": "sur mesure", "unit": "par lettre", "mounting": "adhésif ou entretoises"}',
        ARRAY['laser'],
        'Lettres relief pour enseigne'),

    ('Chevalet de bureau', 'Chevalet de bureau', 'chevalet-de-bureau',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 3500, 10, 100, 5, true, true,
        '{"format": "A5 ou A6", "material": "carton 350g + pelliculage", "type": "chevalet plié"}',
        ARRAY['digital', 'offset'],
        'Chevalet de table personnalisé'),

    ('Diplôme / Certificat', 'Diplôme', 'diplome-certificat',
        (SELECT id FROM public.print_product_categories WHERE slug = 'bureautique'),
        'core', 1500, 10, 500, 3, true, true,
        '{"format": "A4", "paper": ["240g vergé", "250g texturé", "parchemin"], "finish": ["dorure à chaud optionnelle"]}',
        ARRAY['digital', 'offset'],
        'Diplômes et certificats')
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques,
    description = EXCLUDED.description;

-- =============================================
-- PRODUCT MOCKUPS (for key products)
-- =============================================

-- T-shirt mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 't-shirt-col-rond'),
        'T-Shirt Front White',
        'T-Shirt Face Blanc',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_chest", "label": "Poitrine", "x": 180, "y": 150, "width": 440, "height": 400}]'::jsonb,
        1
    ),
    (
        (SELECT id FROM public.print_products WHERE slug = 't-shirt-col-rond'),
        'T-Shirt Back',
        'T-Shirt Dos',
        'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&h=800&fit=crop',
        'back',
        false,
        '[{"name": "back_full", "label": "Dos complet", "x": 150, "y": 120, "width": 500, "height": 480}]'::jsonb,
        2
    )
ON CONFLICT DO NOTHING;

-- Polo mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'polo-classique'),
        'Polo Front',
        'Polo Face',
        'https://images.unsplash.com/photo-1625910513413-5fc42c5cd8d4?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_left", "label": "Poitrine gauche", "x": 120, "y": 180, "width": 200, "height": 150}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Hoodie mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'hoodie-capuche'),
        'Hoodie Front',
        'Hoodie Face',
        'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_chest", "label": "Poitrine", "x": 200, "y": 200, "width": 400, "height": 350}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Casquette mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'casquette-baseball'),
        'Cap Front',
        'Casquette Face',
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_panel", "label": "Panneau frontal", "x": 200, "y": 180, "width": 400, "height": 200}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Tote bag mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'tote-bag-coton'),
        'Tote Bag Front',
        'Tote Bag Face',
        'https://images.unsplash.com/photo-1597633425046-08f5110420b5?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "center", "label": "Centre", "x": 150, "y": 150, "width": 500, "height": 450}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Mug mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'mug-ceramique-blanc'),
        'Mug Side',
        'Mug Côté',
        'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&h=800&fit=crop',
        'wrap',
        true,
        '[{"name": "wrap_area", "label": "Zone impression", "x": 100, "y": 150, "width": 600, "height": 400}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Flyer mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'flyers-a5'),
        'Flyer A5',
        'Flyer A5',
        'https://images.unsplash.com/photo-1557821552-17105176677c?w=800&h=800&fit=crop',
        'full',
        true,
        '[{"name": "full_area", "label": "Zone complète", "x": 50, "y": 50, "width": 700, "height": 990}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Business card mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'cartes-visite-standard'),
        'Business Card',
        'Carte de visite',
        'https://images.unsplash.com/photo-1589041127168-9b1915731571?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "full_area", "label": "Zone complète", "x": 50, "y": 150, "width": 700, "height": 400}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Roll-up mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'roll-up-85x200'),
        'Roll-up',
        'Roll-up',
        'https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&h=800&fit=crop',
        'full',
        true,
        '[{"name": "full_banner", "label": "Bannière", "x": 200, "y": 50, "width": 400, "height": 700}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Bâche mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'bache-pvc'),
        'Bâche PVC',
        'Bâche PVC',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop',
        'full',
        true,
        '[{"name": "full_area", "label": "Zone complète", "x": 50, "y": 50, "width": 700, "height": 500}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- =============================================
-- SUMMARY
-- =============================================
-- Total products: 105
-- Categories: 6
-- - Textile & Vêtements: 25 products
-- - Impression Papier: 30 products
-- - Grand Format: 20 products
-- - Objets Publicitaires: 20 products
-- - Packaging: 10 products
-- - Bureautique: 10 products
