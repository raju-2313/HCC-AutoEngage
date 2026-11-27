/**
 * src/database/queries/gitLearning.js
 * Database operations for 15-Day Git & GitHub Learning Programme.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';
import { getMemberByDiscordId } from './members.js';

/**
 * Creates or updates a member's progress for a specific programme day.
 */
export async function upsertLearningProgress({
  discordId,
  programmeDay,
  learningStatus = undefined,
  practicalTaskDone = undefined,
  practicalTaskNotes = undefined,
  quizAttempted = undefined,
  quizScore = undefined,
}) {
  try {
    const member = await getMemberByDiscordId(discordId);
    const memberId = member?.id ?? null;

    // Fetch existing record if any
    const { data: existing } = await supabaseAdmin
      .from('git_learning_progress')
      .select('*')
      .eq('discord_id', discordId)
      .eq('programme_day', programmeDay)
      .maybeSingle();

    const payload = {
      discord_id: discordId,
      programme_day: programmeDay,
      member_id: memberId,
      updated_at: new Date().toISOString(),
    };

    if (learningStatus !== undefined) payload.learning_status = learningStatus;
    if (practicalTaskDone !== undefined) payload.practical_task_done = practicalTaskDone;
    if (practicalTaskNotes !== undefined) payload.practical_task_notes = practicalTaskNotes;
    if (quizAttempted !== undefined) payload.quiz_attempted = quizAttempted;
    if (quizScore !== undefined) payload.quiz_score = quizScore;

    if (!existing) {
      if (payload.learning_status === undefined) payload.learning_status = 'in_progress';
      if (payload.practical_task_done === undefined) payload.practical_task_done = false;
      if (payload.quiz_attempted === undefined) payload.quiz_attempted = false;
      if (payload.quiz_score === undefined) payload.quiz_score = 0;
    }

    const { data, error } = await supabaseAdmin
      .from('git_learning_progress')
      .upsert(payload, { onConflict: 'discord_id,programme_day' })
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
        logger.warn('⚠️ git_learning_progress table not yet created in Supabase. Run migrations/006_git_learning_programme.sql in Supabase SQL Editor.');
        return null;
      }
      logger.error('Error upserting git learning progress', { discordId, programmeDay, error: error.message });
      throw error;
    }

    return data;
  } catch (err) {
    if (err.message?.includes('schema cache') || err.code === 'PGRST205') {
      logger.warn('⚠️ git_learning_progress table pending migration 006.');
      return null;
    }
    logger.warn('git_learning_progress table query failed', {
      error: err.message,
      discordId,
      programmeDay,
    });
    return null;
  }
}

/**
 * Retrieves all progress records for a specific member across all 15 days.
 */
export async function getMemberLearningProgress(discordId) {
  try {
    const { data, error } = await supabaseAdmin
      .from('git_learning_progress')
      .select('*')
      .eq('discord_id', discordId)
      .order('programme_day', { ascending: true });

    if (error) {
      logger.warn('Error fetching member git learning progress', { discordId, error: error.message });
      return [];
    }

    return data || [];
  } catch (err) {
    logger.warn('Failed to query git_learning_progress', { error: err.message });
    return [];
  }
}

/**
 * Retrieves summary statistics for a given day (how many started, completed, etc.).
 */
export async function getDayLearningStats(programmeDay) {
  try {
    const { data, error } = await supabaseAdmin
      .from('git_learning_progress')
      .select('learning_status, practical_task_done, quiz_attempted')
      .eq('programme_day', programmeDay);

    if (error || !data) return null;

    const stats = {
      totalEngaged: data.length,
      inProgress: data.filter((r) => r.learning_status === 'in_progress').length,
      completed: data.filter((r) => r.learning_status === 'completed').length,
      needHelp: data.filter((r) => r.learning_status === 'need_help').length,
      tasksDone: data.filter((r) => r.practical_task_done).length,
      quizzesTaken: data.filter((r) => r.quiz_attempted).length,
    };

    return stats;
  } catch (err) {
    logger.warn('Failed to calculate day learning stats', { error: err.message });
    return null;
  }
}
