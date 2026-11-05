-- ==============================================================================
-- HCC AutoEngage - Community Engagement Engine Schema & Migration
-- Version: 002
-- Description:
--   Transforms HCC AutoEngage into a multi-dimensional community engagement engine.
--   Adds 7 new tables, atomic stored procedures, RLS policies, and normalization logic.
--
-- Tables:
--   1. engagement_score_settings
--   2. engagement_channel_settings
--   3. engagement_events
--   4. voice_sessions
--   5. contribution_recognitions
--   6. engagement_daily_stats
--   7. engagement_scores
--
-- Procedures:
--   - record_engagement_event()
--   - record_voice_session_end()
--   - award_community_contribution()
--   - calculate_engagement_leaderboard()
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. ENGAGEMENT SCORE SETTINGS TABLE
-- Global weights, daily caps, and anti-spam threshold configuration
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_score_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.40 CHECK (learning_weight >= 0),
    text_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.25 CHECK (text_weight >= 0),
    reaction_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.10 CHECK (reaction_weight >= 0),
    voice_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.15 CHECK (voice_weight >= 0),
    contribution_weight NUMERIC(4, 2) NOT NULL DEFAULT 0.10 CHECK (contribution_weight >= 0),
    text_daily_cap NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    reaction_daily_cap NUMERIC(6, 2) NOT NULL DEFAULT 20.00,
    voice_daily_cap NUMERIC(6, 2) NOT NULL DEFAULT 45.00,
    contribution_daily_cap NUMERIC(6, 2) NOT NULL DEFAULT 50.00,
    voice_min_session_seconds INTEGER NOT NULL DEFAULT 120,
    text_cooldown_seconds INTEGER NOT NULL DEFAULT 45,
    reaction_cooldown_seconds INTEGER NOT NULL DEFAULT 15,
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed default settings row if none exists
INSERT INTO public.engagement_score_settings (
    learning_weight, text_weight, reaction_weight, voice_weight, contribution_weight,
    text_daily_cap, reaction_daily_cap, voice_daily_cap, contribution_daily_cap,
    voice_min_session_seconds, text_cooldown_seconds, reaction_cooldown_seconds, is_active
)
SELECT 0.40, 0.25, 0.10, 0.15, 0.10, 50.00, 20.00, 45.00, 50.00, 120, 45, 15, true
WHERE NOT EXISTS (SELECT 1 FROM public.engagement_score_settings);

-- ------------------------------------------------------------------------------
-- 2. ENGAGEMENT CHANNEL SETTINGS TABLE
-- Channel classifications and category point multipliers
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_channel_settings (
    channel_id VARCHAR(32) PRIMARY KEY,
    channel_name VARCHAR(100),
    category VARCHAR(50) NOT NULL DEFAULT 'general' 
        CHECK (category IN ('learning', 'technical', 'general', 'projects', 'events', 'excluded')),
    multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00 CHECK (multiplier >= 0),
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_settings_category ON public.engagement_channel_settings (category);

-- ------------------------------------------------------------------------------
-- 3. ENGAGEMENT EVENTS TABLE (Privacy-Preserving Audit Log)
-- Stores non-content metadata for event deduplication, rate-limiting, and cooldowns
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    event_type VARCHAR(50) NOT NULL 
        CHECK (event_type IN ('message', 'reaction_add', 'voice_session', 'contribution', 'learning')),
    channel_id VARCHAR(32) NOT NULL,
    reference_id VARCHAR(100), -- Deduplication key (e.g., message_id:emoji)
    points_awarded NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_engagement_events_member_type ON public.engagement_events (member_id, event_type);
CREATE INDEX IF NOT EXISTS idx_engagement_events_discord_created ON public.engagement_events (discord_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_engagement_events_ref ON public.engagement_events (reference_id) WHERE reference_id IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. VOICE SESSIONS TABLE
-- Persistent state tracking for voice connections, duration, and restart recovery
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id VARCHAR(32) NOT NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    channel_id VARCHAR(32) NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    left_at TIMESTAMPTZ,
    duration_seconds INTEGER DEFAULT 0 CHECK (duration_seconds >= 0),
    points_awarded NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(20) NOT NULL DEFAULT 'active' 
        CHECK (status IN ('active', 'completed', 'reconciled', 'discarded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_sessions_active ON public.voice_sessions (discord_id, status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_voice_sessions_joined ON public.voice_sessions (joined_at DESC);

-- ------------------------------------------------------------------------------
-- 5. CONTRIBUTION RECOGNITIONS TABLE
-- Peer 'thanks' and verified moderator awards with anti-farming rules
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contribution_recognitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    recipient_discord_id VARCHAR(32) NOT NULL,
    giver_discord_id VARCHAR(32) NOT NULL,
    type VARCHAR(30) NOT NULL 
        CHECK (type IN ('peer_thanks', 'moderator_award', 'project_submission', 'peer_help')),
    points NUMERIC(6, 2) NOT NULL CHECK (points > 0),
    reason TEXT NOT NULL,
    channel_id VARCHAR(32),
    message_id VARCHAR(32),
    verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Prevent self-awarding at database level
    CONSTRAINT check_no_self_recognition CHECK (recipient_discord_id <> giver_discord_id)
);

CREATE INDEX IF NOT EXISTS idx_contributions_recipient ON public.contribution_recognitions (recipient_member_id);
CREATE INDEX IF NOT EXISTS idx_contributions_giver_date ON public.contribution_recognitions (giver_discord_id, recipient_discord_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. ENGAGEMENT DAILY STATS TABLE
-- Per-member daily rollups for enforcing daily scoring caps and tracking streaks
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    learning_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    text_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    reaction_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    voice_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    contribution_points NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    message_count INTEGER NOT NULL DEFAULT 0,
    reaction_count INTEGER NOT NULL DEFAULT 0,
    voice_seconds INTEGER NOT NULL DEFAULT 0,
    last_text_at TIMESTAMPTZ,
    last_reaction_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_member_stat_date UNIQUE (member_id, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.engagement_daily_stats (stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_member_date ON public.engagement_daily_stats (member_id, stat_date DESC);

-- ------------------------------------------------------------------------------
-- 7. ENGAGEMENT SCORES TABLE
-- Precomputed normalized scores across weekly, monthly, and all-time periods
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.engagement_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'all_time')),
    period_identifier VARCHAR(50) NOT NULL,
    learning_raw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    learning_norm NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    text_raw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    text_norm NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    reaction_raw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    reaction_norm NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    voice_raw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    voice_norm NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    contribution_raw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    contribution_norm NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    overall_score NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
    rank INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_period_member_score UNIQUE (period_type, period_identifier, member_id)
);

CREATE INDEX IF NOT EXISTS idx_engagement_scores_ranking ON public.engagement_scores (period_type, period_identifier, rank ASC);
CREATE INDEX IF NOT EXISTS idx_engagement_scores_member ON public.engagement_scores (member_id);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.engagement_score_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_channel_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_recognitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_scores ENABLE ROW LEVEL SECURITY;

-- Public read for settings, leaderboards, recognitions
DROP POLICY IF EXISTS "Public read engagement settings" ON public.engagement_score_settings;
CREATE POLICY "Public read engagement settings" ON public.engagement_score_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read channel settings" ON public.engagement_channel_settings;
CREATE POLICY "Public read channel settings" ON public.engagement_channel_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read engagement scores" ON public.engagement_scores;
CREATE POLICY "Public read engagement scores" ON public.engagement_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read contribution recognitions" ON public.contribution_recognitions;
CREATE POLICY "Public read contribution recognitions" ON public.contribution_recognitions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read daily stats" ON public.engagement_daily_stats;
CREATE POLICY "Public read daily stats" ON public.engagement_daily_stats FOR SELECT USING (true);

-- Deny public direct access to raw metadata logs and voice sessions (service role only)
DROP POLICY IF EXISTS "Deny public access to engagement events" ON public.engagement_events;
CREATE POLICY "Deny public access to engagement events" ON public.engagement_events FOR ALL USING (false);

DROP POLICY IF EXISTS "Deny public access to voice sessions" ON public.voice_sessions;
CREATE POLICY "Deny public access to voice sessions" ON public.voice_sessions FOR ALL USING (false);

-- ==============================================================================
-- STORED PROCEDURES & ATOMIC FUNCTIONS
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- Procedure: record_engagement_event()
-- Atomically handles message and reaction events with cooldowns and daily caps
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_engagement_event(
    p_discord_id VARCHAR,
    p_event_type VARCHAR,
    p_channel_id VARCHAR,
    p_reference_id VARCHAR DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (
    success BOOLEAN,
    points_awarded NUMERIC,
    reason VARCHAR
) AS $$
DECLARE
    v_member_id UUID;
    v_settings RECORD;
    v_channel RECORD;
    v_daily RECORD;
    v_points_to_award NUMERIC := 0.00;
    v_now TIMESTAMPTZ := now();
    v_today DATE := CURRENT_DATE;
    v_base_points NUMERIC := 1.00;
    v_cooldown_seconds INTEGER := 45;
    v_daily_cap NUMERIC := 50.00;
    v_current_daily_points NUMERIC := 0.00;
BEGIN
    -- 1. Get member ID
    SELECT id INTO v_member_id FROM public.members WHERE discord_id = p_discord_id;
    IF v_member_id IS NULL THEN
        RETURN QUERY SELECT false, 0.00::NUMERIC, 'MEMBER_NOT_FOUND'::VARCHAR;
        RETURN;
    END IF;

    -- 2. Check channel settings (is channel excluded?)
    SELECT * INTO v_channel FROM public.engagement_channel_settings WHERE channel_id = p_channel_id;
    IF FOUND AND (NOT v_channel.is_enabled OR v_channel.category = 'excluded') THEN
        RETURN QUERY SELECT false, 0.00::NUMERIC, 'CHANNEL_EXCLUDED'::VARCHAR;
        RETURN;
    END IF;

    -- 3. Get active score settings
    SELECT * INTO v_settings FROM public.engagement_score_settings WHERE is_active = true LIMIT 1;
    IF NOT FOUND THEN
        -- Fallback defaults
        v_cooldown_seconds := 45;
        v_daily_cap := 50.00;
    ELSE
        IF p_event_type = 'message' THEN
            v_cooldown_seconds := v_settings.text_cooldown_seconds;
            v_daily_cap := v_settings.text_daily_cap;
            v_base_points := 1.00 * COALESCE(v_channel.multiplier, 1.00);
        ELSIF p_event_type = 'reaction_add' THEN
            v_cooldown_seconds := v_settings.reaction_cooldown_seconds;
            v_daily_cap := v_settings.reaction_daily_cap;
            v_base_points := 0.25 * COALESCE(v_channel.multiplier, 1.00);
        END IF;
    END IF;

    -- 4. Deduplication: Check if reference_id was already recorded
    IF p_reference_id IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.engagement_events WHERE reference_id = p_reference_id) THEN
            RETURN QUERY SELECT false, 0.00::NUMERIC, 'DUPLICATE_EVENT'::VARCHAR;
            RETURN;
        END IF;
    END IF;

    -- 5. Lock or create daily stats record for this member today
    INSERT INTO public.engagement_daily_stats (member_id, discord_id, stat_date)
    VALUES (v_member_id, p_discord_id, v_today)
    ON CONFLICT (member_id, stat_date) DO NOTHING;

    SELECT * INTO v_daily 
    FROM public.engagement_daily_stats 
    WHERE member_id = v_member_id AND stat_date = v_today 
    FOR UPDATE;

    -- 6. Cooldown enforcement
    IF p_event_type = 'message' AND v_daily.last_text_at IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (v_now - v_daily.last_text_at)) < v_cooldown_seconds THEN
            RETURN QUERY SELECT false, 0.00::NUMERIC, 'COOLDOWN_ACTIVE'::VARCHAR;
            RETURN;
        END IF;
    ELSIF p_event_type = 'reaction_add' AND v_daily.last_reaction_at IS NOT NULL THEN
        IF EXTRACT(EPOCH FROM (v_now - v_daily.last_reaction_at)) < v_cooldown_seconds THEN
            RETURN QUERY SELECT false, 0.00::NUMERIC, 'COOLDOWN_ACTIVE'::VARCHAR;
            RETURN;
        END IF;
    END IF;

    -- 7. Daily cap check with diminishing returns
    IF p_event_type = 'message' THEN
        v_current_daily_points := v_daily.text_points;
    ELSIF p_event_type = 'reaction_add' THEN
        v_current_daily_points := v_daily.reaction_points;
    END IF;

    IF v_current_daily_points >= v_daily_cap THEN
        RETURN QUERY SELECT false, 0.00::NUMERIC, 'DAILY_CAP_REACHED'::VARCHAR;
        RETURN;
    END IF;

    -- Calculate awarded points without exceeding cap
    v_points_to_award := LEAST(v_base_points, v_daily_cap - v_current_daily_points);

    -- 8. Record event
    INSERT INTO public.engagement_events (
        member_id, discord_id, event_type, channel_id, reference_id, points_awarded, metadata, created_at
    ) VALUES (
        v_member_id, p_discord_id, p_event_type, p_channel_id, p_reference_id, v_points_to_award, p_metadata, v_now
    );

    -- 9. Update daily stats
    IF p_event_type = 'message' THEN
        UPDATE public.engagement_daily_stats
        SET text_points = text_points + v_points_to_award,
            message_count = message_count + 1,
            last_text_at = v_now,
            updated_at = v_now
        WHERE id = v_daily.id;
    ELSIF p_event_type = 'reaction_add' THEN
        UPDATE public.engagement_daily_stats
        SET reaction_points = reaction_points + v_points_to_award,
            reaction_count = reaction_count + 1,
            last_reaction_at = v_now,
            updated_at = v_now
        WHERE id = v_daily.id;
    END IF;

    -- 10. Update member last_active_at timestamp
    UPDATE public.members SET last_active_at = v_now WHERE id = v_member_id;

    RETURN QUERY SELECT true, v_points_to_award, 'RECORDED'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- Procedure: record_voice_session_end()
-- Concludes a voice session, computes duration, applies minimums and daily caps
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_voice_session_end(
    p_session_id UUID,
    p_left_at TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
    success BOOLEAN,
    duration_seconds INTEGER,
    points_awarded NUMERIC,
    status VARCHAR
) AS $$
DECLARE
    v_session RECORD;
    v_settings RECORD;
    v_channel RECORD;
    v_daily RECORD;
    v_duration INTEGER;
    v_points NUMERIC := 0.00;
    v_min_seconds INTEGER := 120;
    v_daily_cap NUMERIC := 45.00;
    v_today DATE;
    v_multiplier NUMERIC := 1.00;
BEGIN
    SELECT * INTO v_session FROM public.voice_sessions WHERE id = p_session_id FOR UPDATE;
    IF NOT FOUND OR v_session.status <> 'active' THEN
        RETURN QUERY SELECT false, 0, 0.00::NUMERIC, 'INVALID_SESSION'::VARCHAR;
        RETURN;
    END IF;

    -- Calculate duration
    v_duration := GREATEST(0, EXTRACT(EPOCH FROM (p_left_at - v_session.joined_at))::INTEGER);
    v_today := v_session.joined_at::DATE;

    -- Settings & Channel lookup
    SELECT * INTO v_settings FROM public.engagement_score_settings WHERE is_active = true LIMIT 1;
    IF FOUND THEN
        v_min_seconds := v_settings.voice_min_session_seconds;
        v_daily_cap := v_settings.voice_daily_cap;
    END IF;

    SELECT * INTO v_channel FROM public.engagement_channel_settings WHERE channel_id = v_session.channel_id;
    IF FOUND THEN
        IF NOT v_channel.is_enabled OR v_channel.category = 'excluded' THEN
            UPDATE public.voice_sessions
            SET left_at = p_left_at, duration_seconds = v_duration, status = 'discarded'
            WHERE id = p_session_id;
            RETURN QUERY SELECT true, v_duration, 0.00::NUMERIC, 'discarded'::VARCHAR;
            RETURN;
        END IF;
        v_multiplier := v_channel.multiplier;
    END IF;

    -- Discard sessions shorter than minimum qualifying threshold (e.g., 2 minutes)
    IF v_duration < v_min_seconds THEN
        UPDATE public.voice_sessions
        SET left_at = p_left_at, duration_seconds = v_duration, status = 'discarded'
        WHERE id = p_session_id;
        RETURN QUERY SELECT true, v_duration, 0.00::NUMERIC, 'discarded'::VARCHAR;
        RETURN;
    END IF;

    -- Lock daily stats
    INSERT INTO public.engagement_daily_stats (member_id, discord_id, stat_date)
    VALUES (v_session.member_id, v_session.discord_id, v_today)
    ON CONFLICT (member_id, stat_date) DO NOTHING;

    SELECT * INTO v_daily 
    FROM public.engagement_daily_stats 
    WHERE member_id = v_session.member_id AND stat_date = v_today 
    FOR UPDATE;

    -- Voice points: 0.5 points per minute, multiplied by channel tier
    v_points := ((v_duration / 60.0) * 0.5) * v_multiplier;
    v_points := LEAST(v_points, GREATEST(0.00, v_daily_cap - v_daily.voice_points));

    -- Complete voice session record
    UPDATE public.voice_sessions
    SET left_at = p_left_at,
        duration_seconds = v_duration,
        points_awarded = v_points,
        status = 'completed'
    WHERE id = p_session_id;

    -- Update daily stats
    UPDATE public.engagement_daily_stats
    SET voice_points = voice_points + v_points,
        voice_seconds = voice_seconds + v_duration,
        updated_at = now()
    WHERE id = v_daily.id;

    RETURN QUERY SELECT true, v_duration, v_points, 'completed'::VARCHAR;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- Procedure: calculate_engagement_leaderboard()
-- Aggregates raw categories, normalizes to 0-100, and calculates weighted composite scores
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calculate_engagement_leaderboard(
    p_period_type VARCHAR,
    p_period_identifier VARCHAR,
    p_since TIMESTAMPTZ DEFAULT (now() - INTERVAL '7 days')
)
RETURNS TABLE (
    member_id UUID,
    discord_id VARCHAR,
    username VARCHAR,
    learning_score NUMERIC,
    text_score NUMERIC,
    reaction_score NUMERIC,
    voice_score NUMERIC,
    contribution_score NUMERIC,
    overall_score NUMERIC,
    rank INTEGER
) AS $$
DECLARE
    v_settings RECORD;
    v_learning_benchmark NUMERIC := 80.00;
    v_text_benchmark NUMERIC := 120.00;
    v_reaction_benchmark NUMERIC := 30.00;
    v_voice_benchmark NUMERIC := 60.00;
    v_contribution_benchmark NUMERIC := 40.00;
BEGIN
    SELECT * INTO v_settings FROM public.engagement_score_settings WHERE is_active = true LIMIT 1;

    RETURN QUERY
    WITH raw_aggregated AS (
        SELECT
            m.id AS m_id,
            m.discord_id AS m_discord_id,
            m.username AS m_username,
            -- 1. Learning (points earned from quizzes in period)
            COALESCE(SUM(ph.amount) FILTER (WHERE ph.created_at >= p_since AND ph.reason LIKE '%quiz%'), 0)::NUMERIC AS raw_learning,
            -- 2. Text Points
            COALESCE(SUM(eds.text_points) FILTER (WHERE eds.stat_date >= p_since::DATE), 0)::NUMERIC AS raw_text,
            -- 3. Reaction Points
            COALESCE(SUM(eds.reaction_points) FILTER (WHERE eds.stat_date >= p_since::DATE), 0)::NUMERIC AS raw_reaction,
            -- 4. Voice Points
            COALESCE(SUM(eds.voice_points) FILTER (WHERE eds.stat_date >= p_since::DATE), 0)::NUMERIC AS raw_voice,
            -- 5. Contribution Points
            COALESCE(SUM(cr.points) FILTER (WHERE cr.created_at >= p_since), 0)::NUMERIC AS raw_contribution
        FROM public.members m
        LEFT JOIN public.points_history ph ON ph.member_id = m.id
        LEFT JOIN public.engagement_daily_stats eds ON eds.member_id = m.id
        LEFT JOIN public.contribution_recognitions cr ON cr.recipient_member_id = m.id AND cr.verified = true
        GROUP BY m.id, m.discord_id, m.username
    ),
    normalized AS (
        SELECT
            ra.m_id,
            ra.m_discord_id,
            ra.m_username,
            -- Normalize each category to 0 - 100 benchmark scale
            LEAST(100.00, (ra.raw_learning / v_learning_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_learning,
            LEAST(100.00, (ra.raw_text / v_text_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_text,
            LEAST(100.00, (ra.raw_reaction / v_reaction_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_reaction,
            LEAST(100.00, (ra.raw_voice / v_voice_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_voice,
            LEAST(100.00, (ra.raw_contribution / v_contribution_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_contribution,
            -- Diversity count (how many categories had active participation)
            (
                (CASE WHEN ra.raw_learning > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN ra.raw_text > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN ra.raw_reaction > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN ra.raw_voice > 0 THEN 1 ELSE 0 END) +
                (CASE WHEN ra.raw_contribution > 0 THEN 1 ELSE 0 END)
            ) AS active_categories
        FROM raw_aggregated ra
    ),
    weighted_scores AS (
        SELECT
            n.m_id,
            n.m_discord_id,
            n.m_username,
            n.norm_learning,
            n.norm_text,
            n.norm_reaction,
            n.norm_voice,
            n.norm_contribution,
            -- Composite weighted calculation + 5% diversity synergy bonus if active across 4+ categories
            ROUND(
                (
                    (n.norm_learning * COALESCE(v_settings.learning_weight, 0.40)) +
                    (n.norm_text * COALESCE(v_settings.text_weight, 0.25)) +
                    (n.norm_reaction * COALESCE(v_settings.reaction_weight, 0.10)) +
                    (n.norm_voice * COALESCE(v_settings.voice_weight, 0.15)) +
                    (n.norm_contribution * COALESCE(v_settings.contribution_weight, 0.10))
                ) * (CASE WHEN n.active_categories >= 4 THEN 1.05 ELSE 1.00 END)
            , 2) AS composite_overall
        FROM normalized n
    )
    SELECT
        ws.m_id,
        ws.m_discord_id,
        ws.m_username,
        ws.norm_learning,
        ws.norm_text,
        ws.norm_reaction,
        ws.norm_voice,
        ws.norm_contribution,
        ws.composite_overall,
        DENSE_RANK() OVER (ORDER BY ws.composite_overall DESC, ws.norm_learning DESC)::INTEGER AS rank
    FROM weighted_scores ws
    WHERE ws.composite_overall > 0
    ORDER BY rank ASC;
END;
$$ LANGUAGE plpgsql STABLE;

