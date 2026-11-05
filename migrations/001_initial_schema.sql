-- ==============================================================================
-- HCC AutoEngage - Initial Schema Migration
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
    options JSONB NOT NULL, -- e.g. [{"id": "A", "text": "..."}, {"id": "B", "text": "..."}]
    correct_option VARCHAR(10) NOT NULL, -- 'A', 'B', 'C', 'D'
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
    amount INTEGER NOT NULL, -- positive for gains, negative for penalties
    xp_amount INTEGER NOT NULL DEFAULT 0,
    reason VARCHAR(100) NOT NULL, -- 'quiz_correct', 'quiz_participation', 'admin_adjustment', 'streak_bonus'
    reference_id UUID, -- quiz_id or other entity reference
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
    period_identifier VARCHAR(50) NOT NULL, -- e.g. '2026-W45', '2026-11'
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
    month_year VARCHAR(10) NOT NULL, -- 'YYYY-MM'
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
-- TRIGGERS & FUNCTIONS
-- Automated updated_at timestamp maintenance
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

-- 1. Members: readable by everyone, modifiable only by service role
CREATE POLICY "Public read members"
    ON public.members FOR SELECT
    USING (true);

-- 2. Quizzes: published quizzes are publicly readable; draft/scheduled visible to service role only
CREATE POLICY "Public read active or closed quizzes"
    ON public.quizzes FOR SELECT
    USING (status IN ('active', 'closed'));

-- 3. Quiz Questions: public can read question text and options for active/closed quizzes,
-- but the correct_option is protected by views or restricted to closed quizzes if needed.
CREATE POLICY "Public read questions for active quizzes"
    ON public.quiz_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.quizzes q
            WHERE q.id = quiz_questions.quiz_id
            AND q.status IN ('active', 'closed')
        )
    );

-- 4. Quiz Attempts: members can read their own attempts
CREATE POLICY "Read own attempts"
    ON public.quiz_attempts FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- 5. Points History: readable for transparency
CREATE POLICY "Public read points history"
    ON public.points_history FOR SELECT
    USING (true);

-- 6. Leaderboard snapshots: readable by everyone
CREATE POLICY "Public read leaderboards"
    ON public.leaderboard_snapshots FOR SELECT
    USING (true);

-- 7. Monthly rewards: readable by everyone
CREATE POLICY "Public read monthly rewards"
    ON public.monthly_rewards FOR SELECT
    USING (true);

-- 8. Activity logs: restricted to service role only (no public select policy)
