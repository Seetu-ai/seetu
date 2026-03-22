-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('fashion', 'food', 'beauty', 'realestate', 'other');

-- CreateEnum
CREATE TYPE "ShootStatus" AS ENUM ('draft', 'in_progr-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('fashion', 'food', 'beauty', 'realestate', 'other');

-- CreateEnum
CREATE TYPE "ShootStatus" AS ENUM ('draft', 'in_progress', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('product_photo', 'promo', 'model', 'caption');

-- CreateEnum
CREATE TYPE "JobMode" AS ENUM ('preview', 'final', 'final_4k');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('queued', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('wave', 'orange_money', 'visa', 'free_trial', 'bonus');

-- CreateEnum
CREATE TYPE "CreatorType" AS ENUM ('MODEL', 'PHOTOGRAPHER', 'LOCATION_OWNER');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('MODEL_PROFILE', 'PHOTO_STYLE', 'LOCATION');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'partial');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('draft', 'active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('pending', 'processing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "BillboardStatus" AS ENUM ('online', 'offline', 'maintenance');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('pending_validation', 'pending_moderation', 'pending_payment', 'processing', 'ready', 'rejected');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('queued', 'playing', 'completed', 'skipped');

-- CreateEnum
CREATE TYPE "BillboardPaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "WhatsAppSessionState" AS ENUM ('START', 'AWAITING_MEDIA', 'AWAITING_BILLBOARD', 'AWAITING_PAYMENT', 'CONFIRMED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BackgroundType" AS ENUM ('real_place', 'studio', 'lifestyle', 'custom');

-- CreateEnum
CREATE TYPE "PlacementType" AS ENUM ('table', 'model', 'floor', 'shelf', 'hanging', 'custom');

-- CreateEnum
CREATE TYPE "PresentationType" AS ENUM ('product_only', 'on_model', 'ghost');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatar_url" TEXT,
    "credit_units" INTEGER NOT NULL DEFAULT 300,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "business_type" "BusinessType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "instagram_handle" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "visual_dna" JSONB,
    "verbal_dna" JSONB,
    "analyzed_at" TIMESTAMP(3),
    "analysis_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "performance_insights" JSONB,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credit_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance_after" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_type" TEXT,
    "ref_id" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credit_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "name" TEXT,
    "original_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "nobg_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_packs" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vertical" "BusinessType" NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "template_packs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "thumbnail_url" TEXT,
    "prompt" TEXT NOT NULL,
    "negative_prompt" TEXT,
    "system_prompt" TEXT,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "default_params" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shoots" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "template_pack_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "style_seed" INTEGER,
    "style_lock" JSONB,
    "fidelity_percent" INTEGER NOT NULL DEFAULT 70,
    "default_aspect_ratio" TEXT NOT NULL DEFAULT '1:1',
    "status" "ShootStatus" NOT NULL DEFAULT 'draft',
    "is_quick_generate" BOOLEAN NOT NULL DEFAULT false,
    "total_jobs" INTEGER NOT NULL DEFAULT 0,
    "completed_jobs" INTEGER NOT NULL DEFAULT 0,
    "credits_used" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shoots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "generation_jobs" (
    "id" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "shoot_id" TEXT NOT NULL,
    "product_id" TEXT,
    "template_id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "mode" "JobMode" NOT NULL DEFAULT 'preview',
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "input_params" JSONB NOT NULL DEFAULT '{}',
    "prompt_used" TEXT,
    "seed_used" INTEGER,
    "output_url" TEXT,
    "output_text" TEXT,
    "credits_cost" INTEGER NOT NULL DEFAULT 100,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "approved" BOOLEAN,
    "queued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "generation_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "export_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "shoot_id" TEXT,
    "job_ids" TEXT[],
    "format" TEXT NOT NULL DEFAULT 'zip',
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "output_url" TEXT,
    "signed_url" TEXT,
    "signed_url_exp" TIMESTAMP(3),
    "file_size" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount_fcfa" INTEGER NOT NULL,
    "credits_purchased" INTEGER NOT NULL,
    "units_to_add" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "checkout_url" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backgrounds" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "type" "BackgroundType" NOT NULL,
    "category" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "lighting" TEXT NOT NULL,
    "mood" TEXT NOT NULL,
    "colors" TEXT[],
    "location" TEXT,
    "landmark" TEXT,
    "prompt_hints" TEXT,
    "negative_hints" TEXT,
    "lighting_data" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "backgrounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "studio_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" TEXT,
    "product_analysis" JSONB,
    "presentation" "PresentationType" DEFAULT 'product_only',
    "presentation_details" TEXT,
    "background_id" TEXT,
    "scene_type" TEXT,
    "moodboard_url" TEXT,
    "style_instruction" TEXT,
    "modifiers" JSONB NOT NULL DEFAULT '{}',
    "canvas_state" JSONB,
    "current_step" INTEGER NOT NULL DEFAULT 1,
    "completed_steps" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "final_prompt" TEXT,
    "generated_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selected_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "credits_cost" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "CreatorType" NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT,
    "avatar_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_at" TIMESTAMP(3),
    "payout_method" TEXT,
    "payout_phone" TEXT,
    "total_assets" INTEGER NOT NULL DEFAULT 0,
    "total_usages" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "instagram_handle" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_assets" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "status" "AssetStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model_gender" TEXT,
    "model_age_range" TEXT,
    "model_styles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "consent_form_path" TEXT,
    "id_doc_path" TEXT,
    "selfie_verify_path" TEXT,
    "consent_verified" BOOLEAN NOT NULL DEFAULT false,
    "style_preset" JSONB,
    "location_name" TEXT,
    "location_city" TEXT,
    "location_type" TEXT,
    "price_units" INTEGER NOT NULL DEFAULT 50,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "reviewed_at" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "rejection_reason" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "creator_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_usages" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "studio_session_id" TEXT,
    "units_charged" INTEGER NOT NULL,
    "settled_at" TIMESTAMP(3),
    "payout_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_payouts" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "amount_fcfa" INTEGER NOT NULL,
    "usage_count" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payout_method" TEXT,
    "payout_phone" TEXT,
    "external_ref" TEXT,
    "processed_at" TIMESTAMP(3),
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "creator_reviews" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "creator_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'pending',
    "product_ids" TEXT[],
    "total_products" INTEGER NOT NULL,
    "style_settings" JSONB NOT NULL,
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "estimated_credits" INTEGER NOT NULL,
    "used_credits" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "batch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_generations" (
    "id" TEXT NOT NULL,
    "batch_job_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'queued',
    "output_url" TEXT,
    "caption" TEXT,
    "error_message" TEXT,
    "credits_cost" INTEGER NOT NULL DEFAULT 100,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "batch_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_templates" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_fr" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "style_lock" JSONB NOT NULL,
    "occasion" TEXT,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaigns" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "brand_id" TEXT,
    "template_id" TEXT,
    "name" TEXT NOT NULL,
    "target_count" INTEGER NOT NULL DEFAULT 10,
    "style_lock" JSONB NOT NULL,
    "style_seed" INTEGER,
    "status" "CampaignStatus" NOT NULL DEFAULT 'draft',
    "generated_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campaign_images" (
    "id" TEXT NOT NULL,
    "campaign_id" TEXT NOT NULL,
    "product_id" TEXT,
    "output_url" TEXT,
    "approved" BOOLEAN,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instagram_posts" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "instagram_id" TEXT,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "likes_count" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "visual_tokens" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lighting" TEXT,
    "framing" TEXT,
    "engagement_score" DOUBLE PRECISION,
    "posted_at" TIMESTAMP(3),
    "scraped_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instagram_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "video_generations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "source_image_url" TEXT NOT NULL,
    "prompt" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "quality" TEXT NOT NULL DEFAULT 'standard',
    "external_task_id" TEXT,
    "status" "VideoStatus" NOT NULL DEFAULT 'pending',
    "output_url" TEXT,
    "credits_cost" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "video_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billboards" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "resolution_width" INTEGER NOT NULL DEFAULT 1920,
    "resolution_height" INTEGER NOT NULL DEFAULT 1080,
    "supported_formats" TEXT[] DEFAULT ARRAY['mp4', 'jpg']::TEXT[],
    "price_per_slot" INTEGER NOT NULL,
    "slot_duration_secs" INTEGER NOT NULL DEFAULT 300,
    "status" "BillboardStatus" NOT NULL DEFAULT 'offline',
    "last_heartbeat" TIMESTAMP(3),
    "preview_image_url" TEXT,
    "default_content_url" TEXT,
    "api_key" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billboards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billboard_content" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "whatsapp_phone" TEXT,
    "whatsapp_name" TEXT,
    "media_type" TEXT NOT NULL,
    "original_url" TEXT NOT NULL,
    "processed_urls" JSONB NOT NULL DEFAULT '{}',
    "duration_seconds" INTEGER,
    "media_metadata" JSONB,
    "status" "ContentStatus" NOT NULL DEFAULT 'pending_validation',
    "rejection_reason" TEXT,
    "moderation_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billboard_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billboard_queue" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "billboard_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'queued',
    "scheduled_for" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "proof_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billboard_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billboard_payments" (
    "id" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "user_id" TEXT,
    "whatsapp_phone" TEXT,
    "billboard_ids" TEXT[],
    "amount_cfa" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "BillboardPaymentStatus" NOT NULL DEFAULT 'pending',
    "external_ref" TEXT,
    "checkout_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(3),

    CONSTRAINT "billboard_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_sessions" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT,
    "state" "WhatsAppSessionState" NOT NULL DEFAULT 'START',
    "session_data" JSONB NOT NULL DEFAULT '{}',
    "current_content_id" TEXT,
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_auth_id_key" ON "users"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "brands_user_id_idx" ON "brands"("user_id");

-- CreateIndex
CREATE INDEX "credit_ledger_user_id_created_at_idx" ON "credit_ledger"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "products_brand_id_idx" ON "products"("brand_id");

-- CreateIndex
CREATE UNIQUE INDEX "template_packs_slug_key" ON "template_packs"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "templates_pack_id_slug_key" ON "templates"("pack_id", "slug");

-- CreateIndex
CREATE INDEX "shoots_user_id_status_idx" ON "shoots"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "generation_jobs_idempotency_key_key" ON "generation_jobs"("idempotency_key");

-- CreateIndex
CREATE INDEX "generation_jobs_shoot_id_status_idx" ON "generation_jobs"("shoot_id", "status");

-- CreateIndex
CREATE INDEX "generation_jobs_status_priority_idx" ON "generation_jobs"("status", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_external_ref_key" ON "transactions"("external_ref");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "backgrounds_slug_key" ON "backgrounds"("slug");

-- CreateIndex
CREATE INDEX "backgrounds_type_is_active_idx" ON "backgrounds"("type", "is_active");

-- CreateIndex
CREATE INDEX "studio_sessions_user_id_status_idx" ON "studio_sessions"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "creator_profiles_user_id_key" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "creator_profiles_user_id_idx" ON "creator_profiles"("user_id");

-- CreateIndex
CREATE INDEX "creator_profiles_type_idx" ON "creator_profiles"("type");

-- CreateIndex
CREATE INDEX "creator_profiles_is_verified_idx" ON "creator_profiles"("is_verified");

-- CreateIndex
CREATE INDEX "creator_assets_creator_id_idx" ON "creator_assets"("creator_id");

-- CreateIndex
CREATE INDEX "creator_assets_type_status_idx" ON "creator_assets"("type", "status");

-- CreateIndex
CREATE INDEX "creator_assets_status_idx" ON "creator_assets"("status");

-- CreateIndex
CREATE INDEX "creator_assets_deleted_at_idx" ON "creator_assets"("deleted_at");

-- CreateIndex
CREATE INDEX "asset_usages_asset_id_idx" ON "asset_usages"("asset_id");

-- CreateIndex
CREATE INDEX "asset_usages_user_id_idx" ON "asset_usages"("user_id");

-- CreateIndex
CREATE INDEX "asset_usages_settled_at_idx" ON "asset_usages"("settled_at");

-- CreateIndex
CREATE INDEX "asset_usages_payout_id_idx" ON "asset_usages"("payout_id");

-- CreateIndex
CREATE INDEX "creator_payouts_creator_id_idx" ON "creator_payouts"("creator_id");

-- CreateIndex
CREATE INDEX "creator_payouts_status_idx" ON "creator_payouts"("status");

-- CreateIndex
CREATE INDEX "creator_payouts_created_at_idx" ON "creator_payouts"("created_at");

-- CreateIndex
CREATE INDEX "creator_reviews_creator_id_idx" ON "creator_reviews"("creator_id");

-- CreateIndex
CREATE UNIQUE INDEX "creator_reviews_user_id_creator_id_key" ON "creator_reviews"("user_id", "creator_id");

-- CreateIndex
CREATE INDEX "batch_jobs_user_id_status_idx" ON "batch_jobs"("user_id", "status");

-- CreateIndex
CREATE INDEX "batch_generations_batch_job_id_status_idx" ON "batch_generations"("batch_job_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "campaign_templates_slug_key" ON "campaign_templates"("slug");

-- CreateIndex
CREATE INDEX "campaigns_user_id_status_idx" ON "campaigns"("user_id", "status");

-- CreateIndex
CREATE INDEX "campaign_images_campaign_id_idx" ON "campaign_images"("campaign_id");

-- CreateIndex
CREATE INDEX "instagram_posts_brand_id_engagement_score_idx" ON "instagram_posts"("brand_id", "engagement_score");

-- CreateIndex
CREATE UNIQUE INDEX "instagram_posts_brand_id_instagram_id_key" ON "instagram_posts"("brand_id", "instagram_id");

-- CreateIndex
CREATE INDEX "video_generations_user_id_status_idx" ON "video_generations"("user_id", "status");

-- CreateIndex
CREATE INDEX "video_generations_external_task_id_idx" ON "video_generations"("external_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "billboards_slug_key" ON "billboards"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "billboards_api_key_key" ON "billboards"("api_key");

-- CreateIndex
CREATE INDEX "billboards_status_is_active_idx" ON "billboards"("status", "is_active");

-- CreateIndex
CREATE INDEX "billboard_content_user_id_idx" ON "billboard_content"("user_id");

-- CreateIndex
CREATE INDEX "billboard_content_status_idx" ON "billboard_content"("status");

-- CreateIndex
CREATE INDEX "billboard_content_whatsapp_phone_idx" ON "billboard_content"("whatsapp_phone");

-- CreateIndex
CREATE INDEX "billboard_queue_billboard_id_status_idx" ON "billboard_queue"("billboard_id", "status");

-- CreateIndex
CREATE INDEX "billboard_queue_content_id_idx" ON "billboard_queue"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "billboard_queue_billboard_id_position_key" ON "billboard_queue"("billboard_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "billboard_payments_content_id_key" ON "billboard_payments"("content_id");

-- CreateIndex
CREATE UNIQUE INDEX "billboard_payments_external_ref_key" ON "billboard_payments"("external_ref");

-- CreateIndex
CREATE INDEX "billboard_payments_user_id_idx" ON "billboard_payments"("user_id");

-- CreateIndex
CREATE INDEX "billboard_payments_whatsapp_phone_idx" ON "billboard_payments"("whatsapp_phone");

-- CreateIndex
CREATE INDEX "billboard_payments_status_idx" ON "billboard_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_sessions_phone_key" ON "whatsapp_sessions"("phone");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_state_idx" ON "whatsapp_sessions"("state");

-- CreateIndex
CREATE INDEX "whatsapp_sessions_expires_at_idx" ON "whatsapp_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "templates" ADD CONSTRAINT "templates_pack_id_fkey" FOREIGN KEY ("pack_id") REFERENCES "template_packs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shoots" ADD CONSTRAINT "shoots_template_pack_id_fkey" FOREIGN KEY ("template_pack_id") REFERENCES "template_packs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_shoot_id_fkey" FOREIGN KEY ("shoot_id") REFERENCES "shoots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generation_jobs" ADD CONSTRAINT "generation_jobs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "export_jobs" ADD CONSTRAINT "export_jobs_shoot_id_fkey" FOREIGN KEY ("shoot_id") REFERENCES "shoots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sessions" ADD CONSTRAINT "studio_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sessions" ADD CONSTRAINT "studio_sessions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_sessions" ADD CONSTRAINT "studio_sessions_background_id_fkey" FOREIGN KEY ("background_id") REFERENCES "backgrounds"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_assets" ADD CONSTRAINT "creator_assets_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_usages" ADD CONSTRAINT "asset_usages_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "creator_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_usages" ADD CONSTRAINT "asset_usages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_usages" ADD CONSTRAINT "asset_usages_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "creator_payouts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_payouts" ADD CONSTRAINT "creator_payouts_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_reviews" ADD CONSTRAINT "creator_reviews_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "creator_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "creator_reviews" ADD CONSTRAINT "creator_reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_jobs" ADD CONSTRAINT "batch_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_generations" ADD CONSTRAINT "batch_generations_batch_job_id_fkey" FOREIGN KEY ("batch_job_id") REFERENCES "batch_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_generations" ADD CONSTRAINT "batch_generations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "campaign_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campaign_images" ADD CONSTRAINT "campaign_images_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "video_generations" ADD CONSTRAINT "video_generations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billboard_content" ADD CONSTRAINT "billboard_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billboard_queue" ADD CONSTRAINT "billboard_queue_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "billboard_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billboard_queue" ADD CONSTRAINT "billboard_queue_billboard_id_fkey" FOREIGN KEY ("billboard_id") REFERENCES "billboards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billboard_payments" ADD CONSTRAINT "billboard_payments_content_id_fkey" FOREIGN KEY ("content_id") REFERENCES "billboard_content"("id"
 ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billboard_payments" ADD CONSTRAINT "billboard_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

