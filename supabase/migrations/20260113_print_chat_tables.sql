-- =============================================
-- BLOOPRINT CHAT & PRINT TABLES FOR SEETU
-- =============================================
-- Using "print_" prefix to avoid conflicts with existing Seetu tables

-- Chat Sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID,
    status TEXT DEFAULT 'active',
    context JSONB DEFAULT '{}',
    extracted_order JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat Messages table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    model TEXT,
    tokens_used INTEGER,
    action_type TEXT,
    action_result JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Print Product Categories table (renamed to avoid conflict)
CREATE TABLE IF NOT EXISTS public.print_product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_fr TEXT,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    image_url TEXT,
    parent_id UUID REFERENCES public.print_product_categories(id),
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Print Products table (renamed to avoid conflict with Seetu products)
CREATE TABLE IF NOT EXISTS public.print_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID REFERENCES public.print_product_categories(id),
    name TEXT NOT NULL,
    name_fr TEXT,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    catalog_type TEXT NOT NULL DEFAULT 'core',
    base_price INTEGER,
    price_unit TEXT DEFAULT 'lot',
    min_quantity INTEGER DEFAULT 1,
    max_quantity INTEGER DEFAULT 10000,
    quantity_step INTEGER DEFAULT 1,
    default_specs JSONB DEFAULT '{}',
    available_options JSONB DEFAULT '{}',
    available_print_techniques TEXT[],
    specifications JSONB DEFAULT '{}',
    production_days INTEGER DEFAULT 5,
    requires_design BOOLEAN DEFAULT false,
    image_url TEXT,
    gallery_urls TEXT[],
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Print Orders table
CREATE TABLE IF NOT EXISTS public.print_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    client_id UUID NOT NULL REFERENCES auth.users(id),
    subtotal INTEGER NOT NULL DEFAULT 0,
    platform_fee INTEGER NOT NULL DEFAULT 0,
    delivery_fee INTEGER NOT NULL DEFAULT 0,
    total_amount INTEGER NOT NULL DEFAULT 0,
    payment_type TEXT NOT NULL DEFAULT 'full',
    payment_status TEXT NOT NULL DEFAULT 'pending',
    status TEXT NOT NULL DEFAULT 'draft',
    delivery_address TEXT,
    delivery_city TEXT DEFAULT 'Dakar',
    delivery_phone TEXT,
    delivery_notes TEXT,
    estimated_delivery_date DATE,
    entry_point TEXT DEFAULT 'chat',
    chat_session_id UUID REFERENCES public.chat_sessions(id),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Print Order Items table
CREATE TABLE IF NOT EXISTS public.print_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.print_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.print_products(id),
    item_number INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    specifications JSONB DEFAULT '{}',
    provider_cost INTEGER,
    client_price INTEGER NOT NULL DEFAULT 0,
    file_ready BOOLEAN DEFAULT false,
    design_status TEXT DEFAULT 'pending_brief',
    status TEXT NOT NULL DEFAULT 'pending',
    requires_quote BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chat_sessions_client_id ON public.chat_sessions(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_print_products_category ON public.print_products(category_id);
CREATE INDEX IF NOT EXISTS idx_print_products_is_active ON public.print_products(is_active);
CREATE INDEX IF NOT EXISTS idx_print_products_slug ON public.print_products(slug);
CREATE INDEX IF NOT EXISTS idx_print_orders_client_id ON public.print_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_print_orders_status ON public.print_orders(status);
CREATE INDEX IF NOT EXISTS idx_print_order_items_order_id ON public.print_order_items(order_id);

-- Update timestamp function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_chat_sessions_updated_at ON public.chat_sessions;
CREATE TRIGGER trigger_chat_sessions_updated_at
    BEFORE UPDATE ON public.chat_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_print_products_updated_at ON public.print_products;
CREATE TRIGGER trigger_print_products_updated_at
    BEFORE UPDATE ON public.print_products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_print_orders_updated_at ON public.print_orders;
CREATE TRIGGER trigger_print_orders_updated_at
    BEFORE UPDATE ON public.print_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_print_order_items_updated_at ON public.print_order_items;
CREATE TRIGGER trigger_print_order_items_updated_at
    BEFORE UPDATE ON public.print_order_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Generate print order number function
CREATE OR REPLACE FUNCTION generate_print_order_number()
RETURNS TRIGGER AS $$
DECLARE
    year_part TEXT;
    sequence_num INTEGER;
BEGIN
    year_part := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SPLIT_PART(order_number, '-', 3) AS INTEGER)
    ), 0) + 1
    INTO sequence_num
    FROM public.print_orders
    WHERE order_number LIKE 'BLP-' || year_part || '-%';

    NEW.order_number := 'BLP-' || year_part || '-' || LPAD(sequence_num::TEXT, 4, '0');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_print_order_number ON public.print_orders;
CREATE TRIGGER trigger_generate_print_order_number
    BEFORE INSERT ON public.print_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_print_order_number();

-- Row Level Security
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_sessions
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can create chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can create chat sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own chat sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid() = client_id);

-- RLS Policies for chat_messages
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.chat_messages;
CREATE POLICY "Users can view own chat messages" ON public.chat_messages
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND client_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert chat messages" ON public.chat_messages;
CREATE POLICY "Users can insert chat messages" ON public.chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND client_id = auth.uid())
    );

-- RLS Policies for print_products (public read)
DROP POLICY IF EXISTS "Anyone can view active print products" ON public.print_products;
CREATE POLICY "Anyone can view active print products" ON public.print_products
    FOR SELECT USING (is_active = true);

-- RLS Policies for print_product_categories (public read)
DROP POLICY IF EXISTS "Anyone can view active print categories" ON public.print_product_categories;
CREATE POLICY "Anyone can view active print categories" ON public.print_product_categories
    FOR SELECT USING (is_active = true);

-- RLS Policies for print_orders
DROP POLICY IF EXISTS "Users can view own print orders" ON public.print_orders;
CREATE POLICY "Users can view own print orders" ON public.print_orders
    FOR SELECT USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can create print orders" ON public.print_orders;
CREATE POLICY "Users can create print orders" ON public.print_orders
    FOR INSERT WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Users can update own draft print orders" ON public.print_orders;
CREATE POLICY "Users can update own draft print orders" ON public.print_orders
    FOR UPDATE USING (auth.uid() = client_id AND status = 'draft');

-- RLS Policies for print_order_items
DROP POLICY IF EXISTS "Users can view own print order items" ON public.print_order_items;
CREATE POLICY "Users can view own print order items" ON public.print_order_items
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.print_orders WHERE id = print_order_items.order_id AND client_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can insert print order items" ON public.print_order_items;
CREATE POLICY "Users can insert print order items" ON public.print_order_items
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.print_orders WHERE id = print_order_items.order_id AND client_id = auth.uid())
    );

-- Seed print product categories
INSERT INTO public.print_product_categories (name, name_fr, slug, icon, sort_order, is_active) VALUES
    ('Textile', 'Textile', 'textile', '👕', 1, true),
    ('Papier', 'Papier', 'papier', '📄', 2, true),
    ('Grand Format', 'Grand Format', 'grand-format', '🎯', 3, true),
    ('Packaging', 'Packaging', 'packaging', '📦', 4, true)
ON CONFLICT (slug) DO NOTHING;

-- Seed print products
INSERT INTO public.print_products (name, name_fr, slug, category_id, base_price, min_quantity, production_days, requires_design, is_active, specifications, available_print_techniques) VALUES
    ('T-shirt personnalisé', 'T-shirt personnalisé', 't-shirt-personnalise',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        3500, 10, 5, true, true,
        '{"sizes": ["XS", "S", "M", "L", "XL", "XXL"], "colors": ["blanc", "noir", "gris", "bleu", "rouge"]}',
        ARRAY['screen_print', 'dtg', 'embroidery']),
    ('Polo personnalisé', 'Polo personnalisé', 'polo-personnalise',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        5500, 10, 5, true, true,
        '{"sizes": ["S", "M", "L", "XL", "XXL"], "colors": ["blanc", "noir", "bleu marine"]}',
        ARRAY['embroidery', 'screen_print']),
    ('Casquette brodée', 'Casquette brodée', 'casquette-brodee',
        (SELECT id FROM public.print_product_categories WHERE slug = 'textile'),
        4500, 20, 7, true, true,
        '{"style": "baseball", "colors": ["noir", "blanc", "bleu marine", "rouge"]}',
        ARRAY['embroidery']),
    ('Flyers A5', 'Flyers A5', 'flyers-a5',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        50, 100, 3, true, true,
        '{"format": "A5", "paper": ["135g brillant", "170g mat"], "sides": ["recto", "recto-verso"]}',
        ARRAY['offset', 'digital']),
    ('Cartes de visite', 'Cartes de visite', 'cartes-de-visite',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        150, 100, 3, true, true,
        '{"format": "85x55mm", "paper": ["350g mat", "350g brillant", "soft-touch"]}',
        ARRAY['offset', 'digital']),
    ('Affiche A3', 'Affiche A3', 'affiche-a3',
        (SELECT id FROM public.print_product_categories WHERE slug = 'papier'),
        500, 10, 3, true, true,
        '{"format": "A3", "paper": ["170g couché", "photo glossy"]}',
        ARRAY['digital', 'offset']),
    ('Roll-up 85x200cm', 'Roll-up 85x200cm', 'roll-up-85x200',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        35000, 1, 5, true, true,
        '{"dimensions": "85x200cm", "includes": "structure aluminium"}',
        ARRAY['digital']),
    ('Bâche PVC', 'Bâche PVC', 'bache-pvc',
        (SELECT id FROM public.print_product_categories WHERE slug = 'grand-format'),
        8000, 1, 5, true, true,
        '{"material": "PVC 500g", "includes": "œillets", "unit": "m²"}',
        ARRAY['digital', 'uv'])
ON CONFLICT (slug) DO UPDATE SET
    base_price = EXCLUDED.base_price,
    specifications = EXCLUDED.specifications,
    available_print_techniques = EXCLUDED.available_print_techniques;
