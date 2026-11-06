/**
 * src/database/queries/quizSessions.js
 * Database persistence queries for daily timed multi-question quiz sessions.
 * Stores master session state in `quizzes` and `activity_logs` without requiring DDL migrations.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';
import { createQuiz, getQuizById, closeQuiz } from './quizzes.js';

const SESSION_CATEGORY = 'daily_timed_session';

/**
 * Retrieves the master daily session record for a given date.
 * @param {string} dateStr 'YYYY-MM-DD'
 */
export async function getDailySessionRecord(dateStr) {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select('*, quiz_questions(*)')
    .eq('category', SESSION_CATEGORY)
    .eq('scheduled_for', dateStr)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching daily session record', { dateStr, error: error.message });
    throw error;
  }

  if (!data) return null;

  let sessionState = {};
  try {
    sessionState = data.description ? JSON.parse(data.description) : {};
  } catch {
    sessionState = {};
  }

  return {
    ...data,
    sessionState,
  };
}

/**
 * Creates or initializes the master session record for the day.
 */
export async function initDailySessionRecord({
  dateStr,
  topic,
  dayNumber,
  channelId,
  totalQuestions = 10,
}) {
  const existing = await getDailySessionRecord(dateStr);
  if (existing) {
    return existing;
  }

  const initialState = {
    sessionDate: dateStr,
    topic,
    dayNumber,
    channelId,
    totalQuestions,
    status: 'initialized',
    announcementSent: false,
    announcementMessageId: null,
    currentQuestionIndex: -1,
    currentQuizRecordId: null,
    questionStartTime: null,
    questionEndTime: null,
    completedQuestionRecordIds: [],
  };

  const created = await createQuiz({
    title: `HCC Daily Challenge: ${topic} (Day ${dayNumber}/7)`,
    description: JSON.stringify(initialState),
    category: SESSION_CATEGORY,
    difficulty: 'beginner',
    status: 'active',
    scheduledFor: dateStr,
    createdBy: 'daily_timed_session_master',
  });

  return {
    ...created,
    sessionState: initialState,
  };
}

/**
 * Atomically updates the master session's state payload.
 */
export async function updateDailySessionState(masterQuizId, updatedState) {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .update({
      description: JSON.stringify(updatedState),
      status: updatedState.status === 'completed' ? 'closed' : 'active',
      closed_at: updatedState.status === 'completed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', masterQuizId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating daily session state', { masterQuizId, error: error.message });
    throw error;
  }

  // Also record state transition in activity_logs
  try {
    await supabaseAdmin.from('activity_logs').insert({
      action_type: 'daily_session_state_update',
      actor_discord_id: 'scheduler',
      details: {
        masterQuizId,
        status: updatedState.status,
        questionIndex: updatedState.currentQuestionIndex,
        announcementSent: updatedState.announcementSent,
      },
    });
  } catch (err) {
    logger.warn('Failed to record activity log for session state update', { error: err.message });
  }

  return {
    ...data,
    sessionState: updatedState,
  };
}

/**
 * Fetches all attempts for a collection of question quiz IDs.
 */
export async function getSessionAttempts(quizIds) {
  if (!quizIds || quizIds.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('quiz_id, discord_id, selected_option, is_correct, points_awarded, members(username, avatar_url)')
    .in('quiz_id', quizIds);

  if (error) {
    logger.error('Error fetching session attempts', { error: error.message });
    return [];
  }

  return data || [];
}

