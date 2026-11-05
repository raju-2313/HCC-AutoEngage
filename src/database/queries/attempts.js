/**
 * src/database/queries/attempts.js
 * Database operations for quiz_attempts table.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Checks whether a member has already submitted an answer for a specific quiz.
 * @returns {Promise<boolean>}
 */
export async function hasMemberAttempted(quizId, memberId) {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select('id')
    .eq('quiz_id', quizId)
    .eq('member_id', memberId)
    .maybeSingle();

  if (error) {
    logger.error('Error checking quiz attempt', { quizId, memberId, error: error.message });
    throw error;
  }
  return Boolean(data);
}

/**
 * Records a quiz attempt. Duplicate submissions are strictly prevented by the DB unique constraint.
 */
export async function recordQuizAttempt({
  quizId,
  memberId,
  discordId,
  selectedOption,
  isCorrect,
  pointsAwarded,
  xpAwarded,
}) {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .insert({
      quiz_id: quizId,
      member_id: memberId,
      discord_id: discordId,
      selected_option: selectedOption,
      is_correct: isCorrect,
      points_awarded: pointsAwarded,
      xp_awarded: xpAwarded,
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Postgres unique_violation
      logger.warn('Duplicate quiz attempt prevented', { quizId, memberId, discordId });
      throw new Error('DUPLICATE_ATTEMPT');
    }
    logger.error('Error recording quiz attempt', { quizId, memberId, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Fetches recent quiz attempts for a member.
 */
export async function getMemberQuizAttempts(discordId, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('quiz_attempts')
    .select(`
      *,
      quizzes (title, category, difficulty)
    `)
    .eq('discord_id', discordId)
    .order('submitted_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching member quiz attempts', { discordId, error: error.message });
    throw error;
  }
  return data || [];
}
