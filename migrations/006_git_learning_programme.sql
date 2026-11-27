-- ==============================================================================
-- HCC AutoEngage - 15-Day Git & GitHub Learning Programme Migration
-- Version: 006
-- Table: git_learning_progress
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.git_learning_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_id UUID REFERENCES public.members(id) ON DELETE CASCADE,
    discord_id VARCHAR(32) NOT NULL,
    programme_day INTEGER NOT NULL CHECK (programme_day BETWEEN 1 AND 15),
    learning_status VARCHAR(20) NOT NULL DEFAULT 'not_started' 
        CHECK (learning_status IN ('not_started', 'in_progress', 'completed', 'need_help')),
    practical_task_done BOOLEAN NOT NULL DEFAULT FALSE,
    practical_task_notes TEXT,
    quiz_attempted BOOLEAN NOT NULL DEFAULT FALSE,
    quiz_score INTEGER NOT NULL DEFAULT 0 CHECK (quiz_score >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_member_programme_day UNIQUE (discord_id, programme_day)
);

CREATE INDEX IF NOT EXISTS idx_git_progress_discord_id ON public.git_learning_progress (discord_id);
CREATE INDEX IF NOT EXISTS idx_git_progress_day ON public.git_learning_progress (programme_day);
CREATE INDEX IF NOT EXISTS idx_git_progress_status ON public.git_learning_progress (learning_status);

-- Automatic updated_at trigger
DROP TRIGGER IF EXISTS trg_git_progress_updated_at ON public.git_learning_progress;
CREATE TRIGGER trg_git_progress_updated_at
    BEFORE UPDATE ON public.git_learning_progress
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Grant permissions to standard Supabase roles
GRANT ALL ON TABLE public.git_learning_progress TO authenticated;
GRANT ALL ON TABLE public.git_learning_progress TO service_role;
