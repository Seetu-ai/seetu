-- =============================================
-- BLOOPRINT PRODUCT MOCKUPS TABLE
-- =============================================
-- Stores mockup images and design zones for each product

-- Print Product Mockups table
CREATE TABLE IF NOT EXISTS public.print_product_mockups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.print_products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    name_fr TEXT,
    mockup_url TEXT NOT NULL,  -- URL to the blank product mockup image
    print_area TEXT DEFAULT 'front',  -- front, back, sleeve, full, etc.
    is_default BOOLEAN DEFAULT false,
    zones JSONB DEFAULT '[]',  -- Array of zones: [{name, label, x, y, width, height, rotation}]
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_print_product_mockups_product_id ON public.print_product_mockups(product_id);
CREATE INDEX IF NOT EXISTS idx_print_product_mockups_is_default ON public.print_product_mockups(is_default);
CREATE INDEX IF NOT EXISTS idx_print_product_mockups_is_active ON public.print_product_mockups(is_active);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_print_product_mockups_updated_at ON public.print_product_mockups;
CREATE TRIGGER trigger_print_product_mockups_updated_at
    BEFORE UPDATE ON public.print_product_mockups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.print_product_mockups ENABLE ROW LEVEL SECURITY;

-- RLS Policy for mockups (public read)
DROP POLICY IF EXISTS "Anyone can view active print mockups" ON public.print_product_mockups;
CREATE POLICY "Anyone can view active print mockups" ON public.print_product_mockups
    FOR SELECT USING (is_active = true);

-- Grant permissions to authenticated users
GRANT SELECT ON public.print_product_mockups TO authenticated;

-- Seed mockups for products
-- T-shirt mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 't-shirt-personnalise'),
        'T-Shirt Front',
        'T-Shirt Face avant',
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_chest", "label": "Poitrine", "x": 180, "y": 150, "width": 440, "height": 400}]'::jsonb,
        1
    ),
    (
        (SELECT id FROM public.print_products WHERE slug = 't-shirt-personnalise'),
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
        (SELECT id FROM public.print_products WHERE slug = 'polo-personnalise'),
        'Polo Front',
        'Polo Face avant',
        'https://images.unsplash.com/photo-1625910513413-5fc42c5cd8d4?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_left", "label": "Poitrine gauche", "x": 120, "y": 180, "width": 200, "height": 150}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Casquette mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'casquette-brodee'),
        'Cap Front',
        'Casquette Face avant',
        'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "front_panel", "label": "Panneau frontal", "x": 200, "y": 180, "width": 400, "height": 200}]'::jsonb,
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

-- Cartes de visite mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'cartes-de-visite'),
        'Business Card',
        'Carte de visite',
        'https://images.unsplash.com/photo-1589041127168-9b1915731571?w=800&h=800&fit=crop',
        'front',
        true,
        '[{"name": "full_area", "label": "Zone complète", "x": 50, "y": 150, "width": 700, "height": 400}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Affiche mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'affiche-a3'),
        'Poster A3',
        'Affiche A3',
        'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&h=800&fit=crop',
        'full',
        true,
        '[{"name": "full_area", "label": "Zone complète", "x": 100, "y": 100, "width": 600, "height": 850}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Roll-up mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'roll-up-85x200'),
        'Roll-up Banner',
        'Roll-up',
        'https://images.unsplash.com/photo-1553484771-371a605b060b?w=800&h=800&fit=crop',
        'full',
        true,
        '[{"name": "full_banner", "label": "Bannière complète", "x": 200, "y": 50, "width": 400, "height": 700}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;

-- Bâche mockups
INSERT INTO public.print_product_mockups (product_id, name, name_fr, mockup_url, print_area, is_default, zones, sort_order) VALUES
    (
        (SELECT id FROM public.print_products WHERE slug = 'bache-pvc'),
        'PVC Banner',
        'Bâche PVC',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=800&fit=crop',
        'full',
        true,
        '[{"name": "full_area", "label": "Zone complète", "x": 50, "y": 50, "width": 700, "height": 500}]'::jsonb,
        1
    )
ON CONFLICT DO NOTHING;
