-- ==============================================================================
-- HCC AutoEngage - Hardened Database Schema & Migration
-- Version: 001
-- Tables:
--   1. members
--   2. quizzes
--   3. quiz_questions
--   4. quiz_attempts
--   5. points_history
--   6. leaderboard_snapshots
--   7. monthly_rewards
--   8. activity_logs
-- Functions & Procedures:
--   - handle_updated_at()
--   - record_points_transaction() [ATOMIC]
--   - submit_quiz_attempt()       [ATOMIC + DEDUP]
--   - get_leaderboard_standings()  [WEEKLY/MONTHLY]
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. MEMBERS TABLE
-- Tracks community members, total XP, points, current levels, and activity streaks
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    discord_id VARCHAR(32) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    discriminator VARCHAR(10) DEFAULT '0',
    avatar_url TEXT,
    total_xp INTEGER NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
    total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
    level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
    quizzes_completed INTEGER NOT NULL DEFAULT 0 CHECK (quizzes_completed >= 0),
    quizzes_won INTEGER NOT NULL DEFAULT 0 CHECK (quizzes_won >= 0),
    streak_current INTEGER NOT NULL DEFAULT 0 CHECK (streak_current >= 0),
    streak_max INTEGER NOT NULL DEFAULT 0 CHECK (streak_max >= 0),
    last_active_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_members_discord_id ON public.members (discord_id);
CREATE INDEX IF NOT EXISTS idx_members_total_xp ON public.members (total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_members_total_points ON public.members (total_points DESC);
CREATE INDEX IF NOT EXISTS idx_members_last_active ON public.members (last_active_at DESC);

-- ==============================================================================
-- 2. QUIZZES TABLE
-- Stores daily quizzes, coding puzzles, tech challenges, and their lifecycle status
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL DEFAULT 'daily_tech_quiz',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'beginner' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'closed')),
    scheduled_for DATE,
    published_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    discord_message_id VARCHAR(32),
    discord_channel_id VARCHAR(32),
    points_reward INTEGER NOT NULL DEFAULT 10 CHECK (points_reward >= 0),
    xp_reward INTEGER NOT NULL DEFAULT 20 CHECK (xp_reward >= 0),
    created_by VARCHAR(32) DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_status ON public.quizzes (status);
CREATE INDEX IF NOT EXISTS idx_quizzes_scheduled_for ON public.quizzes (scheduled_for);
CREATE INDEX IF NOT EXISTS idx_quizzes_published_at ON public.quizzes (published_at DESC);

-- ==============================================================================
-- 3. QUIZ QUESTIONS TABLE
-- Stores multiple-choice questions, code snippets, verified options, and explanations
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    code_snippet TEXT,
    options JSONB NOT NULL,
    correct_option VARCHAR(10) NOT NULL,
    explanation TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON public.quiz_questions (quiz_id);

-- ==============================================================================
-- 4. QUIZ ATTEMPTS TABLE
-- Logs answers submitted by members. Enforces strictly 1 attempt per member per quiz.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    selected_option VARCHAR(10) NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    xp_awarded INTEGER NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_quiz_member_attempt UNIQUE (quiz_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz_id ON public.quiz_attempts (quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_member_id ON public.quiz_attempts (member_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_discord_id ON public.quiz_attempts (discord_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_submitted_at ON public.quiz_attempts (submitted_at DESC);

-- ==============================================================================
-- 5. POINTS HISTORY TABLE
-- Immutable ledger of all points/XP awards and adjustments
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.points_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    amount INTEGER NOT NULL,
    xp_amount INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(100) NOT NULL,
    reference_id UUID,
    awarded_by VARCHAR(32) NOT NULL DEFAULT 'system',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_points_history_member_id ON public.points_history (member_id);
CREATE INDEX IF NOT EXISTS idx_points_history_discord_id ON public.points_history (discord_id);
CREATE INDEX IF NOT EXISTS idx_points_history_created_at ON public.points_history (created_at DESC);

-- ==============================================================================
-- 6. LEADERBOARD SNAPSHOTS TABLE
-- Periodic cached snapshots for weekly and monthly rankings
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type VARCHAR(20) NOT NULL CHECK (period_type IN ('weekly', 'monthly', 'all_time')),
    period_identifier VARCHAR(50) NOT NULL,
    rank INTEGER NOT NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    username VARCHAR(100) NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON public.leaderboard_snapshots (period_type, period_identifier, rank ASC);

-- ==============================================================================
-- 7. MONTHLY REWARDS TABLE
-- Tracks top monthly winners, accolades, and recognition history
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    month_year VARCHAR(10) NOT NULL,
    member_id UUID NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 10),
    reward_title VARCHAR(255) NOT NULL,
    reward_details TEXT,
    announced BOOLEAN NOT NULL DEFAULT false,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_monthly_rewards_period ON public.monthly_rewards (month_year, rank ASC);
CREATE INDEX IF NOT EXISTS idx_monthly_rewards_member ON public.monthly_rewards (member_id);

-- ==============================================================================
-- 8. ACTIVITY LOGS TABLE
-- Audit log of administrative commands, bot automated runs, and security events
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type VARCHAR(100) NOT NULL,
    actor_discord_id VARCHAR(32) DEFAULT 'system',
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON public.activity_logs (action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs (created_at DESC);

-- ==============================================================================
-- TRIGGERS & FUNCTIONS: UPDATED_AT
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_members_updated_at ON public.members;
CREATE TRIGGER set_members_updated_at
    BEFORE UPDATE ON public.members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_quizzes_updated_at ON public.quizzes;
CREATE TRIGGER set_quizzes_updated_at
    BEFORE UPDATE ON public.quizzes
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- ==============================================================================
-- ATOMIC TRANSACTION FUNCTION: RECORD POINTS & XP
-- Guarantees atomic ledger logging and member balance updates without race conditions
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_points_transaction(
    p_discord_id VARCHAR,
    p_points_delta INT,
    p_xp_delta INT,
    p_reason VARCHAR,
    p_reference_id UUID DEFAULT NULL,
    p_awarded_by VARCHAR DEFAULT 'system'
)
RETURNS TABLE (
    member_id UUID,
    total_points INT,
    total_xp INT,
    new_level INT
) AS $$
DECLARE
    v_member_id UUID;
    v_current_points INT;
    v_current_xp INT;
    v_new_points INT;
    v_new_xp INT;
    v_new_level INT;
BEGIN
    -- Row-level lock to prevent concurrent update races
    SELECT id, members.total_points, members.total_xp
    INTO v_member_id, v_current_points, v_current_xp
    FROM public.members
    WHERE members.discord_id = p_discord_id
    FOR UPDATE;

    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Member with discord_id % not found', p_discord_id;
    END IF;

    v_new_points := GREATEST(0, v_current_points + p_points_delta);
    v_new_xp := GREATEST(0, v_current_xp + p_xp_delta);
    v_new_level := 1 + FLOOR(SQRT(v_new_xp / 50.0))::INT;

    -- 1. Insert into immutable points_history
    INSERT INTO public.points_history (
        member_id,
        discord_id,
        amount,
        xp_amount,
        reason,
        reference_id,
        awarded_by
    ) VALUES (
        v_member_id,
        p_discord_id,
        p_points_delta,
        p_xp_delta,
        p_reason,
        p_reference_id,
        p_awarded_by
    );

    -- 2. Update member balance atomically
    UPDATE public.members
    SET total_points = v_new_points,
        total_xp = v_new_xp,
        level = v_new_level,
        last_active_at = now()
    WHERE id = v_member_id;

    RETURN QUERY
    SELECT v_member_id, v_new_points, v_new_xp, v_new_level;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- ATOMIC TRANSACTION FUNCTION: SUBMIT QUIZ ATTEMPT
-- Atomically handles answer validation, attempt record, points ledger, and streaks
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
    p_quiz_id UUID,
    p_discord_id VARCHAR,
    p_selected_option VARCHAR
)
RETURNS TABLE (
    attempt_id UUID,
    is_correct BOOLEAN,
    correct_option VARCHAR,
    points_awarded INT,
    xp_awarded INT,
    explanation TEXT
) AS $$
DECLARE
    v_member_id UUID;
    v_quiz_status VARCHAR;
    v_points_reward INT;
    v_xp_reward INT;
    v_actual_correct_option VARCHAR;
    v_explanation TEXT;
    v_is_correct BOOLEAN;
    v_attempt_id UUID;
    v_points_to_award INT := 0;
    v_xp_to_award INT := 0;
BEGIN
    -- 1. Verify member exists
    SELECT id INTO v_member_id FROM public.members WHERE members.discord_id = p_discord_id;
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Member % not found', p_discord_id;
    END IF;

    -- 2. Verify quiz is active
    SELECT status, points_reward, xp_reward
    INTO v_quiz_status, v_points_reward, v_xp_reward
    FROM public.quizzes
    WHERE id = p_quiz_id;

    IF v_quiz_status IS NULL OR v_quiz_status != 'active' THEN
        RAISE EXCEPTION 'Quiz % is not active for submissions', p_quiz_id;
    END IF;

    -- 3. Retrieve question answer key
    SELECT quiz_questions.correct_option, quiz_questions.explanation
    INTO v_actual_correct_option, v_explanation
    FROM public.quiz_questions
    WHERE quiz_questions.quiz_id = p_quiz_id
    LIMIT 1;

    v_is_correct := (UPPER(TRIM(p_selected_option)) = UPPER(TRIM(v_actual_correct_option)));

    IF v_is_correct THEN
        v_points_to_award := v_points_reward;
        v_xp_to_award := v_xp_reward;
    ELSE
        -- Minimum participation XP
        v_xp_to_award := 5;
    END IF;

    -- 4. Insert attempt (enforces unique constraint; throws duplicate exception if already attempted)
    INSERT INTO public.quiz_attempts (
        quiz_id,
        member_id,
        discord_id,
        selected_option,
        is_correct,
        points_awarded,
        xp_awarded
    ) VALUES (
        p_quiz_id,
        v_member_id,
        p_discord_id,
        p_selected_option,
        v_is_correct,
        v_points_to_award,
        v_xp_to_award
    ) RETURNING id INTO v_attempt_id;

    -- 5. Atomically update points & ledger
    IF v_points_to_award > 0 OR v_xp_to_award > 0 THEN
        PERFORM public.record_points_transaction(
            p_discord_id,
            v_points_to_award,
            v_xp_to_award,
            CASE WHEN v_is_correct THEN 'quiz_correct' ELSE 'quiz_participation' END,
            p_quiz_id,
            'system'
        );
    END IF;

    -- 6. Update member quiz counters & streaks
    UPDATE public.members
    SET quizzes_completed = quizzes_completed + 1,
        quizzes_won = quizzes_won + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        streak_current = streak_current + 1,
        streak_max = GREATEST(streak_max, streak_current + 1)
    WHERE id = v_member_id;

    RETURN QUERY
    SELECT v_attempt_id, v_is_correct, v_actual_correct_option, v_points_to_award, v_xp_to_award, v_explanation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- PERIODIC LEADERBOARD FUNCTION
-- Calculates points earned since a given cutoff date (weekly / monthly)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_leaderboard_standings(
    p_since TIMESTAMPTZ DEFAULT (now() - INTERVAL '7 days'),
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    discord_id VARCHAR,
    username VARCHAR,
    period_points BIGINT,
    total_points INT,
    total_xp INT,
    level INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        m.discord_id,
        m.username,
        COALESCE(SUM(ph.amount), 0)::BIGINT AS period_points,
        m.total_points,
        m.total_xp,
        m.level
    FROM public.members m
    LEFT JOIN public.points_history ph ON ph.member_id = m.id AND ph.created_at >= p_since
    GROUP BY m.id, m.discord_id, m.username, m.total_points, m.total_xp, m.level
    ORDER BY period_points DESC, m.total_xp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 1. Members: public read access; strictly no public write/update
DROP POLICY IF EXISTS "Public read members" ON public.members;
CREATE POLICY "Public read members"
    ON public.members FOR SELECT
    USING (true);

-- 2. Quizzes: public read for active or closed quizzes only
DROP POLICY IF EXISTS "Public read active or closed quizzes" ON public.quizzes;
CREATE POLICY "Public read active or closed quizzes"
    ON public.quizzes FOR SELECT
    USING (status IN ('active', 'closed'));

-- 3. Quiz Questions: public read only when quiz is closed (protects active question answer keys!)
DROP POLICY IF EXISTS "Public read questions when quiz closed" ON public.quiz_questions;
CREATE POLICY "Public read questions when quiz closed"
    ON public.quiz_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes q
            WHERE q.id = quiz_questions.quiz_id
            AND q.status = 'closed'
        )
    );

-- 4. Quiz Attempts: no public select
DROP POLICY IF EXISTS "Deny public select attempts" ON public.quiz_attempts;
CREATE POLICY "Deny public select attempts"
    ON public.quiz_attempts FOR SELECT
    USING (false);

-- 5. Points History: public read for transparency
DROP POLICY IF EXISTS "Public read points history" ON public.points_history;
CREATE POLICY "Public read points history"
    ON public.points_history FOR SELECT
    USING (true);

-- 6. Leaderboard Snapshots: public read
DROP POLICY IF EXISTS "Public read leaderboards" ON public.leaderboard_snapshots;
CREATE POLICY "Public read leaderboards"
    ON public.leaderboard_snapshots FOR SELECT
    USING (true);

-- 7. Monthly Rewards: public read
DROP POLICY IF EXISTS "Public read monthly rewards" ON public.monthly_rewards;
CREATE POLICY "Public read monthly rewards"
    ON public.monthly_rewards FOR SELECT
    USING (true);

-- 8. Activity Logs: no public access
DROP POLICY IF EXISTS "Deny public activity logs" ON public.activity_logs;
CREATE POLICY "Deny public activity logs"
    ON public.activity_logs FOR SELECT
    USING (false);
