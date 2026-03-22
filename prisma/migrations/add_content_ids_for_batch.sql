-- Migration: Add contentIds for batch processing
-- This adds support for batch media processing in WhatsApp billboard bookings

-- Add content_ids array column (for batch processing)
ALTER TABLE billboard_payments
ADD COLUMN IF NOT EXISTS content_ids TEXT[] DEFAULT '{}';

-- Make content_id optional (for backwards compatibility)
ALTER TABLE billboard_payments
ALTER COLUMN content_id DROP NOT NULL;

-- Migrate existing data: copy contentId to contentIds array
UPDATE billboard_payments
SET content_ids = ARRAY[content_id]
WHERE content_id IS NOT NULL AND (content_ids IS NULL OR content_ids = '{}');

-- Add comment for documentation
COMMENT ON COLUMN billboard_payments.content_ids IS 'Array of content IDs for batch processing. Replaces single contentId for multi-content payments.';
