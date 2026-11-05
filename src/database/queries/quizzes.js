/**
 * src/database/queries/quizzes.js
 * Database operations for quizzes and quiz_questions tables.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Gets the current active quiz including its questions.
 */
export async function getActiveQuiz() {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select(`
      *,
      quiz_questions (*)
    `)
    .eq('status', 'active')
    .order('published_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching active quiz', { error: error.message });
    throw error;
  }
  return data;
}

/**
 * Gets a quiz by ID including questions.
 */
export async function getQuizById(quizId) {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .select(`
      *,
      quiz_questions (*)
    `)
    .eq('id', quizId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching quiz by id', { quizId, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Creates a new quiz along with its question records in a single transaction-like sequence.
 */
export async function createQuiz({
  title,
  description = null,
  category = 'daily_tech_quiz',
  difficulty = 'beginner',
  pointsReward = 10,
  xpReward = 20,
  scheduledFor = null,
  createdBy = 'system',
  questions = [],
}) {
  // 1. Insert Quiz header
  const { data: quiz, error: quizError } = await supabaseAdmin
    .from('quizzes')
    .insert({
      title,
      description,
      category,
      difficulty,
      status: 'draft',
      points_reward: pointsReward,
      xp_reward: xpReward,
      scheduled_for: scheduledFor,
      created_by: createdBy,
    })
    .select()
    .single();

  if (quizError) {
    logger.error('Error creating quiz', { error: quizError.message });
    throw quizError;
  }

  // 2. Insert questions if provided
  if (questions && questions.length > 0) {
    const questionsToInsert = questions.map((q, idx) => ({
      quiz_id: quiz.id,
      question_text: q.questionText,
      code_snippet: q.codeSnippet || null,
      options: q.options,
      correct_option: q.correctOption,
      explanation: q.explanation,
      order_index: q.orderIndex ?? idx,
    }));

    const { error: questionsError } = await supabaseAdmin
      .from('quiz_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      logger.error('Error creating quiz questions', { quizId: quiz.id, error: questionsError.message });
      throw questionsError;
    }
  }

  return getQuizById(quiz.id);
}

/**
 * Marks a quiz as active and associates its Discord message and channel.
 */
export async function publishQuiz(quizId, { messageId, channelId }) {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .update({
      status: 'active',
      published_at: new Date().toISOString(),
      discord_message_id: messageId,
      discord_channel_id: channelId,
    })
    .eq('id', quizId)
    .select()
    .single();

  if (error) {
    logger.error('Error publishing quiz', { quizId, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Closes an active quiz.
 */
export async function closeQuiz(quizId) {
  const { data, error } = await supabaseAdmin
    .from('quizzes')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', quizId)
    .select()
    .single();

  if (error) {
    logger.error('Error closing quiz', { quizId, error: error.message });
    throw error;
  }
  return data;
}
