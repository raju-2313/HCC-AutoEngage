-- ==============================================================================
-- HCC AutoEngage - Emoji Discovery & Management Schema
-- Version: 005
-- Tables:
--   1. emoji_candidates
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.emoji_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(32) NOT NULL,
    description VARCHAR(100) DEFAULT '',
    pack_id VARCHAR(64) NOT NULL DEFAULT 'popular_50_emojis',
    pack_name VARCHAR(100) NOT NULL DEFAULT 'HCC Top 50 Gen Z & Tech Emojis',
    category VARCHAR(50) NOT NULL DEFAULT 'coding_memes',
    preview_url TEXT NOT NULL,
    asset_url TEXT NOT NULL,
    source_url TEXT NOT NULL,
    creator VARCHAR(100) DEFAULT 'HCC Open Community',
    license VARCHAR(50) NOT NULL DEFAULT 'CC0-1.0',
    license_details TEXT DEFAULT '',
    trend_reason TEXT NOT NULL DEFAULT 'Popular Gen Z developer reaction',
    is_animated BOOLEAN NOT NULL DEFAULT false,
    content_status VARCHAR(30) NOT NULL DEFAULT 'pending' 
        CHECK (content_status IN ('pending', 'verified', 'flagged_profanity', 'flagged_license', 'flagged_quality')),
    review_status VARCHAR(20) NOT NULL DEFAULT 'pending_review'
        CHECK (review_status IN ('pending_review', 'approved', 'rejected')),
    rejection_reason TEXT,
    approved_by VARCHAR(32),
    approved_at TIMESTAMPTZ,
    upload_status VARCHAR(20) NOT NULL DEFAULT 'not_uploaded'
        CHECK (upload_status IN ('not_uploaded', 'uploading', 'uploaded', 'failed', 'skipped_slots')),
    discord_emoji_id VARCHAR(32),
    upload_error TEXT,
    file_size_bytes INTEGER DEFAULT 0,
    asset_format VARCHAR(10) DEFAULT 'png',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_emoji_name_pack UNIQUE (name, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_emoji_review_status ON public.emoji_candidates (review_status);
CREATE INDEX IF NOT EXISTS idx_emoji_upload_status ON public.emoji_candidates (upload_status);
CREATE INDEX IF NOT EXISTS idx_emoji_pack_id ON public.emoji_candidates (pack_id);
CREATE INDEX IF NOT EXISTS idx_emoji_category ON public.emoji_candidates (category);
CREATE INDEX IF NOT EXISTS idx_emoji_created_at ON public.emoji_candidates (created_at DESC);

-- Trigger to auto-update updated_at column
CREATE OR REPLACE TRIGGER update_emoji_candidates_modtime
    BEFORE UPDATE ON public.emoji_candidates
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Enable RLS
ALTER TABLE public.emoji_candidates ENABLE ROW LEVEL SECURITY;

-- Service role full access policy
CREATE POLICY "Service role full access on emoji_candidates"
    ON public.emoji_candidates
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Public/anon read access for safe emoji browsing
CREATE POLICY "Public read access on emoji_candidates"
    ON public.emoji_candidates
    FOR SELECT
    USING (true);

