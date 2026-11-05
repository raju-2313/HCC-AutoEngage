/**
 * src/scripts/resetDatabase.js
 * Resets all testing data to 0 for a completely fresh community launch.
 *
 * Actions:
 *  1. Resets member scores, streaks, xp, quizzes to 0.
 *  2. Clears quiz attempts, points history, voice sessions, and engagement logs.
 *  3. Closes/clears active test quizzes.
 */

import { supabaseAdmin } from '../database/client.js';
import { logger } from '../utils/logger.js';

async function resetAllToZero() {
  logger.info('🔄 Starting complete database reset for fresh community launch…');

  const tablesToClear = [
    'engagement_events',
    'voice_sessions',
    'contribution_recognitions',
    'engagement_daily_stats',
    'engagement_scores',
    'quiz_attempts',
    'points_history',
    'leaderboard_snapshots',
    'monthly_rewards',
    'activity_logs',
    'quiz_questions',
    'quizzes',
  ];

  for (const table of tablesToClear) {
    try {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        logger.warn(`Could not clear table ${table}: ${error.message}`);
      } else {
        logger.info(`Cleared all testing records from: ${table} ✅`);
      }
    } catch (err) {
      logger.warn(`Error clearing ${table}: ${err.message}`);
    }
  }

  // Reset all members stats to zero
  try {
    const { data: updatedMembers, error: memberErr } = await supabaseAdmin
      .from('members')
      .update({
        total_points: 0,
        total_xp: 0,
        level: 1,
        streak_current: 0,
        streak_max: 0,
        quizzes_completed: 0,
        quizzes_won: 0,
      })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select('id, discord_id, username');

    if (memberErr) {
      logger.error('Failed to reset member stats:', memberErr);
    } else {
      logger.info(`Successfully reset ${updatedMembers?.length || 0} members back to Level 1, 0 Points, 0 Streak ✅`);
    }
  } catch (err) {
    logger.error('Error updating members:', err);
  }

  logger.info('🎉 Database reset complete! Everything is set to 0 for tomorrow\'s fresh start.');
}

resetAllToZero()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Reset failed:', err);
    process.exit(1);
  });
