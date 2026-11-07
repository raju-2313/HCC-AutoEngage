-- ==============================================================================
-- HCC AutoEngage - Migration 003: Fix Engagement Calculations & Voice Recovery
-- ==============================================================================

-- 1. Optimized, Cartesian-Free calculate_engagement_leaderboard()
-- Eliminates cross-table row multiplication by independently aggregating each pillar.
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
    WITH learning_agg AS (
        SELECT ph.member_id, COALESCE(SUM(ph.amount), 0)::NUMERIC AS raw_learning
        FROM public.points_history ph
        WHERE ph.created_at >= p_since AND ph.reason LIKE '%quiz%'
        GROUP BY ph.member_id
    ),
    daily_stats_agg AS (
        SELECT 
            eds.member_id,
            COALESCE(SUM(eds.text_points), 0)::NUMERIC AS raw_text,
            COALESCE(SUM(eds.reaction_points), 0)::NUMERIC AS raw_reaction,
            COALESCE(SUM(eds.voice_points), 0)::NUMERIC AS raw_voice
        FROM public.engagement_daily_stats eds
        WHERE eds.stat_date >= p_since::DATE
        GROUP BY eds.member_id
    ),
    contribution_agg AS (
        SELECT cr.recipient_member_id AS member_id, COALESCE(SUM(cr.points), 0)::NUMERIC AS raw_contribution
        FROM public.contribution_recognitions cr
        WHERE cr.created_at >= p_since AND cr.verified = true
        GROUP BY cr.recipient_member_id
    ),
    active_voice_agg AS (
        SELECT 
            vs.member_id,
            COALESCE(SUM((GREATEST(0, EXTRACT(EPOCH FROM (now() - vs.joined_at))) / 60.0) * 0.5), 0)::NUMERIC AS active_voice_points
        FROM public.voice_sessions vs
        WHERE vs.status = 'active'
        GROUP BY vs.member_id
    ),
    raw_aggregated AS (
        SELECT
            m.id AS m_id,
            m.discord_id AS m_discord_id,
            m.username AS m_username,
            COALESCE(l.raw_learning, 0) AS raw_learning,
            COALESCE(d.raw_text, 0) AS raw_text,
            COALESCE(d.raw_reaction, 0) AS raw_reaction,
            COALESCE(d.raw_voice, 0) + COALESCE(av.active_voice_points, 0) AS raw_voice,
            COALESCE(c.raw_contribution, 0) AS raw_contribution
        FROM public.members m
        LEFT JOIN learning_agg l ON l.member_id = m.id
        LEFT JOIN daily_stats_agg d ON d.member_id = m.id
        LEFT JOIN contribution_agg c ON c.member_id = m.id
        LEFT JOIN active_voice_agg av ON av.member_id = m.id
    ),
    normalized AS (
        SELECT
            ra.m_id,
            ra.m_discord_id,
            ra.m_username,
            LEAST(100.00, (ra.raw_learning / v_learning_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_learning,
            LEAST(100.00, (ra.raw_text / v_text_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_text,
            LEAST(100.00, (ra.raw_reaction / v_reaction_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_reaction,
            LEAST(100.00, (ra.raw_voice / v_voice_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_voice,
            LEAST(100.00, (ra.raw_contribution / v_contribution_benchmark) * 100.00)::NUMERIC(6, 2) AS norm_contribution,
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
            ROUND(
                (
                    (n.norm_learning * COALESCE(v_settings.learning_weight, 0.40)) +
                    (n.norm_text * COALESCE(v_settings.text_weight, 0.25)) +
                    (n.norm_reaction * COALESCE(v_settings.reaction_weight, 0.10)) +
                    (n.norm_voice * COALESCE(v_settings.voice_weight, 0.15)) +
                    (n.norm_contribution * COALESCE(v_settings.contribution_weight, 0.10))
                ) * (CASE WHEN n.active_categories >= 4 THEN 1.05 ELSE 1.00 END),
                2
            ) AS composite_score
        FROM normalized n
    )
    SELECT
        ws.m_id AS member_id,
        ws.m_discord_id AS discord_id,
        ws.m_username AS username,
        ws.norm_learning AS learning_score,
        ws.norm_text AS text_score,
        ws.norm_reaction AS reaction_score,
        ws.norm_voice AS voice_score,
        ws.norm_contribution AS contribution_score,
        ws.composite_score AS overall_score,
        DENSE_RANK() OVER (ORDER BY ws.composite_score DESC)::INTEGER AS rank
    FROM weighted_scores ws
    WHERE ws.composite_score > 0
    ORDER BY rank ASC, ws.norm_learning DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Calendar-Based Daily Participation Streak Function
-- Guarantees streaks increment only once per calendar day (Asia/Kolkata timezone)
CREATE OR REPLACE FUNCTION public.update_member_streak_atomic(p_discord_id VARCHAR)
RETURNS TABLE (
    current_streak INT,
    max_streak INT,
    is_streak_incremented BOOLEAN
) AS $$
DECLARE
    v_member_id UUID;
    v_current_streak INT;
    v_max_streak INT;
    v_last_active TIMESTAMPTZ;
    v_today_date DATE;
    v_last_date DATE;
    v_yesterday_date DATE;
    v_new_streak INT;
    v_new_max INT;
    v_incremented BOOLEAN := false;
BEGIN
    SELECT id, streak_current, streak_max, last_active_at
    INTO v_member_id, v_current_streak, v_max_streak, v_last_active
    FROM public.members
    WHERE discord_id = p_discord_id
    FOR UPDATE;

    IF v_member_id IS NULL THEN
        RETURN;
    END IF;

    -- Current date in Asia/Kolkata
    v_today_date := (now() AT TIME ZONE 'Asia/Kolkata')::DATE;
    v_yesterday_date := v_today_date - 1;

    IF v_last_active IS NULL THEN
        v_last_date := NULL;
    ELSE
        v_last_date := (v_last_active AT TIME ZONE 'Asia/Kolkata')::DATE;
    END IF;

    IF v_last_date = v_today_date THEN
        -- Already active today, streak remains unchanged
        v_new_streak := GREATEST(1, COALESCE(v_current_streak, 1));
        v_new_max := GREATEST(COALESCE(v_max_streak, 1), v_new_streak);
        v_incremented := false;
    ELSIF v_last_date = v_yesterday_date THEN
        -- Active yesterday, consecutive day streak!
        v_new_streak := COALESCE(v_current_streak, 0) + 1;
        v_new_max := GREATEST(COALESCE(v_max_streak, 0), v_new_streak);
        v_incremented := true;
    ELSE
        -- Missed a day or first time
        v_new_streak := 1;
        v_new_max := GREATEST(COALESCE(v_max_streak, 0), 1);
        v_incremented := (COALESCE(v_current_streak, 0) = 0);
    END IF;

    UPDATE public.members
    SET streak_current = v_new_streak,
        streak_max = v_new_max,
        last_active_at = now()
    WHERE id = v_member_id;

    RETURN QUERY SELECT v_new_streak, v_new_max, v_incremented;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

