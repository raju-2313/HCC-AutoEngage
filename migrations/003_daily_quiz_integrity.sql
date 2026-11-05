-- Preserve existing progress while making daily quiz publication and streaks date-aware.

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS last_quiz_date DATE;

WITH ranked_open_quizzes AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY scheduled_for
      ORDER BY
        CASE WHEN status = 'active' THEN 0 ELSE 1 END,
        published_at DESC NULLS LAST,
        created_at DESC
    ) AS row_number
  FROM public.quizzes
  WHERE status IN ('draft', 'active') AND scheduled_for IS NOT NULL
)
UPDATE public.quizzes AS quizzes
SET status = 'closed',
    closed_at = COALESCE(closed_at, now())
FROM ranked_open_quizzes
WHERE quizzes.id = ranked_open_quizzes.id
  AND ranked_open_quizzes.row_number > 1;

CREATE UNIQUE INDEX IF NOT EXISTS unique_open_daily_quiz
  ON public.quizzes (scheduled_for)
  WHERE status IN ('draft', 'active') AND scheduled_for IS NOT NULL;

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
    v_quiz_date DATE;
    v_new_streak INT;
BEGIN
    SELECT id INTO v_member_id FROM public.members WHERE members.discord_id = p_discord_id;
    IF v_member_id IS NULL THEN
        RAISE EXCEPTION 'Member % not found', p_discord_id;
    END IF;

    SELECT status, points_reward, xp_reward, scheduled_for
    INTO v_quiz_status, v_points_reward, v_xp_reward, v_quiz_date
    FROM public.quizzes WHERE id = p_quiz_id;
    IF v_quiz_status IS NULL OR v_quiz_status != 'active' THEN
        RAISE EXCEPTION 'Quiz % is not active for submissions', p_quiz_id;
    END IF;

    SELECT correct_option, explanation
    INTO v_actual_correct_option, v_explanation
    FROM public.quiz_questions WHERE quiz_id = p_quiz_id LIMIT 1;

    v_is_correct := (UPPER(TRIM(p_selected_option)) = UPPER(TRIM(v_actual_correct_option)));
    IF v_is_correct THEN
        v_points_to_award := v_points_reward;
        v_xp_to_award := v_xp_reward;
    ELSE
        v_xp_to_award := 5;
    END IF;

    INSERT INTO public.quiz_attempts (
        quiz_id, member_id, discord_id, selected_option, is_correct, points_awarded, xp_awarded
    ) VALUES (
        p_quiz_id, v_member_id, p_discord_id, p_selected_option, v_is_correct, v_points_to_award, v_xp_to_award
    ) RETURNING id INTO v_attempt_id;

    IF v_points_to_award > 0 OR v_xp_to_award > 0 THEN
        PERFORM public.record_points_transaction(
            p_discord_id, v_points_to_award, v_xp_to_award,
            CASE WHEN v_is_correct THEN 'quiz_correct' ELSE 'quiz_participation' END,
            p_quiz_id, 'system'
        );
    END IF;

    SELECT CASE
      WHEN m.last_quiz_date = v_quiz_date THEN m.streak_current
      WHEN m.last_quiz_date = v_quiz_date - 1 THEN m.streak_current + 1
      ELSE 1
    END
    INTO v_new_streak
    FROM public.members m
    WHERE m.id = v_member_id
    FOR UPDATE;

    UPDATE public.members
    SET quizzes_completed = quizzes_completed + 1,
        quizzes_won = quizzes_won + (CASE WHEN v_is_correct THEN 1 ELSE 0 END),
        streak_current = v_new_streak,
        streak_max = GREATEST(streak_max, v_new_streak),
        last_quiz_date = COALESCE(v_quiz_date, CURRENT_DATE)
    WHERE id = v_member_id;

    RETURN QUERY SELECT v_attempt_id, v_is_correct, v_actual_correct_option,
        v_points_to_award, v_xp_to_award, v_explanation;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
