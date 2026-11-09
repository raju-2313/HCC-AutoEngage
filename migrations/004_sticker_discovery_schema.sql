-- ==============================================================================
-- HCC AutoEngage - Sticker Discovery & Management Schema
-- Version: 004
-- Tables:
--   1. sticker_candidates
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sticker_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) NOT NULL,
    description VARCHAR(100) DEFAULT '',
    tags VARCHAR(32) NOT NULL DEFAULT '🏷️',
    pack_id VARCHAR(64) NOT NULL DEFAULT 'default_pack',
    pack_name VARCHAR(100) NOT NULL DEFAULT 'HCC Community Pack',
    category VARCHAR(50) NOT NULL DEFAULT 'coding_memes',
    preview_url TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    source_url TEXT NOT NULL,
    creator VARCHAR(100) DEFAULT 'Unknown Artist',
    license VARCHAR(50) NOT NULL DEFAULT 'CC-BY-4.0',
    license_details TEXT DEFAULT '',
    trend_reason TEXT NOT NULL DEFAULT 'Popular community reaction',
    content_status VARCHAR(30) NOT NULL DEFAULT 'pending' 
        CHECK (content_status IN ('pending', 'verified', 'flagged_profanity', 'flagged_license', 'flagged_quality')),
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending_review'
        CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by VARCHAR(32),
    approved_at TIMESTAMPTZ,
    upload_status VARCHAR(20) NOT NULL DEFAULT 'not_uploaded'
        CHECK (upload_status IN ('not_uploaded', 'uploading', 'uploaded', 'failed', 'skipped_slots')),
    discord_sticker_id VARCHAR(32),
    upload_error TEXT,
    file_size_bytes INTEGER DEFAULT 0,
    asset_format VARCHAR(10) DEFAULT 'png',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_sticker_name_pack UNIQUE (name, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_sticker_review_status ON public.sticker_candidates (review_status);
CREATE INDEX IF NOT EXISTS idx_sticker_upload_status ON public.sticker_candidates (upload_status);
CREATE INDEX IF NOT EXISTS idx_sticker_pack_id ON public.sticker_candidates (pack_id);
CREATE INDEX IF NOT EXISTS idx_sticker_category ON public.sticker_candidates (category);
CREATE INDEX IF NOT EXISTS idx_sticker_created_at ON public.sticker_candidates (created_at DESC);

-- Trigger to auto-update updated_at column
CREATE OR REPLACE TRIGGER update_sticker_candidates_modtime
    BEFORE UPDATE ON public.sticker_candidates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.sticker_candidates ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on sticker_candidates"
    ON public.sticker_candidates
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Public/anon read access for safe sticker browsing
CREATE POLICY "Public read access on sticker_candidates"
    ON public.sticker_candidates
    FOR SELECT
    USING (true);

