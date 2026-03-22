-- Billboard System Tables Migration
-- Creates all tables needed for the digital billboard feature

-- ═══════════════════════════════════════════════════════════════
-- ENUMS
-- ═══════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE "BillboardStatus" AS ENUM ('online', 'offline', 'maintenance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentStatus" AS ENUM ('pending_validation', 'pending_moderation', 'pending_payment', 'processing', 'ready', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "QueueStatus" AS ENUM ('queued', 'playing', 'completed', 'skipped');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "BillboardPaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "WhatsAppSessionState" AS ENUM ('START', 'AWAITING_MEDIA', 'AWAITING_BILLBOARD', 'AWAITING_PAYMENT', 'CONFIRMED', 'EXPIRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('wave', 'orange_money', 'visa', 'free_trial', 'bonus');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- BILLBOARDS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  resolution_width INTEGER NOT NULL DEFAULT 1920,
  resolution_height INTEGER NOT NULL DEFAULT 1080,
  supported_formats TEXT[] DEFAULT ARRAY['mp4', 'jpg'],
  price_per_slot INTEGER NOT NULL,
  slot_duration_secs INTEGER NOT NULL DEFAULT 300,
  status "BillboardStatus" NOT NULL DEFAULT 'offline',
  last_heartbeat TIMESTAMPTZ,
  preview_image_url TEXT,
  default_content_url TEXT,
  api_key TEXT UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- BILLBOARD CONTENT TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billboard_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  whatsapp_phone TEXT,
  whatsapp_name TEXT,
  media_type TEXT NOT NULL,
  original_url TEXT NOT NULL,
  processed_urls JSONB NOT NULL DEFAULT '{}',
  duration_seconds INTEGER,
  media_metadata JSONB,
  status "ContentStatus" NOT NULL DEFAULT 'pending_validation',
  rejection_reason TEXT,
  moderation_result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- BILLBOARD QUEUE TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billboard_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES billboard_content(id) ON DELETE CASCADE,
  billboard_id UUID NOT NULL REFERENCES billboards(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  status "QueueStatus" NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  proof_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(billboard_id, position)
);

-- ═══════════════════════════════════════════════════════════════
-- BILLBOARD PAYMENTS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS billboard_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID UNIQUE NOT NULL REFERENCES billboard_content(id) ON DELETE CASCADE,
  user_id UUID,
  whatsapp_phone TEXT,
  billboard_ids TEXT[] NOT NULL,
  amount_cfa INTEGER NOT NULL,
  payment_method "PaymentMethod" NOT NULL,
  status "BillboardPaymentStatus" NOT NULL DEFAULT 'pending',
  external_ref TEXT UNIQUE,
  checkout_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

-- ═══════════════════════════════════════════════════════════════
-- WHATSAPP SESSIONS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  state "WhatsAppSessionState" NOT NULL DEFAULT 'START',
  session_data JSONB NOT NULL DEFAULT '{}',
  current_content_id TEXT,
  last_message_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- SEED TEST BILLBOARD (50 CFA for testing)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO billboards (name, slug, address, latitude, longitude, price_per_slot, status, is_active)
VALUES ('Panneau Sea Plaza', 'sea-plaza', 'Sea Plaza, Corniche Ouest, Dakar', 14.7167, -17.4677, 50, 'online', true)
ON CONFLICT (slug) DO UPDATE SET price_per_slot = 50;
