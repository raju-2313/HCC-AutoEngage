/**
 * src/services/automation/scheduler.js
 * Automated Cron and Scheduling System (Phase 5).
 *
 * Runs background jobs in Asia/Kolkata timezone:
 *   1. Daily Quiz Drop (09:00 AM IST)
 *   2. Daily Quiz Auto-Close (23:59 IST)
 *   3. Weekly Sunday Leaderboard Post & DB Snapshot (Sunday 21:00 IST)
 *   4. Monthly Winner Crowning & Champion Announcement (1st of month 00:05 IST)
 *   5. Inactive Member Streak Reset (Daily 03:00 AM IST)
 */

import cron from 'node-cron';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { publishDailyQuiz } from '../quiz/quizService.js';
import { getActiveQuiz, closeQuiz } from '../../database/queries/quizzes.js';
import {
  buildWeeklyLeaderboardEmbed,
  computeMonthlyWinners,
  buildMonthlyWinnerAnnouncement,
  takeLeaderboardSnapshot,
} from '../recognition/leaderboardService.js';
import { resetInactiveStreaks } from '../../database/queries/members.js';
import { logActivity } from '../../database/queries/logs.js';

const activeTasks = new Map();

/**
 * Resolves a channel by ID with fallback.
 */
async function resolveChannel(client, ...channelIds) {
  for (const id of channelIds) {
    if (!id) continue;
    const channel = await client.channels.fetch(id).catch(() => null);
    if (channel) return channel;
  }
  return null;
}

// ─── Individual Job Runners (Also used by Admin Commands & Tests) ─────────────

/**
 * Job 1: Daily Quiz Drop
 */
export async function runDailyQuizDropJob(client) {
  logger.info('⏰ Running scheduled task: Daily Quiz Drop');
  const channelId = config.discord.channels.quiz;

  if (!channelId) {
    logger.warn('Skipping Daily Quiz Drop: DISCORD_QUIZ_CHANNEL_ID is not configured');
    return { success: false, reason: 'CHANNEL_NOT_CONFIGURED' };
  }

  try {
    const result = await publishDailyQuiz({ client, channelId });
    await logActivity('daily_quiz_scheduled_drop', 'scheduler', {
      quizId: result.quiz.id,
      channelId,
    });
    logger.info('Daily Quiz Drop completed successfully', { quizId: result.quiz.id });
    return { success: true, quizId: result.quiz.id };
  } catch (err) {
    logger.error('Failed to run Daily Quiz Drop job', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Job 2: Daily Quiz Auto-Close
 */
export async function runDailyQuizCloseJob() {
  logger.info('⏰ Running scheduled task: Daily Quiz Auto-Close');
  try {
    const active = await getActiveQuiz();
    if (!active) {
      logger.info('No active quiz found to close.');
      return { success: true, closed: false };
    }

    await closeQuiz(active.id);
    await logActivity('daily_quiz_auto_close', 'scheduler', { quizId: active.id });
    logger.info('Active quiz auto-closed', { quizId: active.id });
    return { success: true, closed: true, quizId: active.id };
  } catch (err) {
    logger.error('Failed to auto-close active quiz', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Job 3: Weekly Leaderboard Drop & Snapshot
 */
export async function runWeeklyLeaderboardJob(client) {
  logger.info('⏰ Running scheduled task: Weekly Leaderboard Drop');
  try {
    // 1. Take permanent snapshot in Supabase
    await takeLeaderboardSnapshot('weekly');

    // 2. Resolve destination channel
    const targetChannel = await resolveChannel(
      client,
      config.discord.channels.leaderboard,
      config.discord.channels.announcements,
      config.discord.channels.quiz
    );

    if (targetChannel) {
      const embed = await buildWeeklyLeaderboardEmbed();
      await targetChannel.send({
        content: '📢 **HCC Weekly Quiz Standings** are in! Check out our top contributors for the week:',
        embeds: [embed],
      });
      logger.info('Weekly Leaderboard posted to channel', { channelId: targetChannel.id });
    }

    await logActivity('weekly_leaderboard_published', 'scheduler');
    return { success: true };
  } catch (err) {
    logger.error('Failed to execute Weekly Leaderboard job', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Job 4: Monthly Winner Crowning & Announcement
 */
export async function runMonthlyWinnerJob(client) {
  logger.info('⏰ Running scheduled task: Monthly Winner Crowning');
  try {
    // 1. Record winners to monthly_rewards table
    const winners = await computeMonthlyWinners();

    // 2. Take monthly snapshot
    await takeLeaderboardSnapshot('monthly');

    // 3. Post announcement to channel
    const targetChannel = await resolveChannel(
      client,
      config.discord.channels.announcements,
      config.discord.channels.quiz
    );

    if (targetChannel && winners.length > 0) {
      const embed = buildMonthlyWinnerAnnouncement(winners);
      await targetChannel.send({
        content: '🎊 **CHAMPIONS CROWNED!** Announcing this month\'s top performers:',
        embeds: [embed],
      });
      logger.info('Monthly winners announced', { count: winners.length, channelId: targetChannel.id });
    }

    await logActivity('monthly_winners_crowned', 'scheduler', { winnersCount: winners.length });
    return { success: true, winners };
  } catch (err) {
    logger.error('Failed to execute Monthly Winner job', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Job 5: Streak Maintenance (Resets streaks older than 48 hours)
 */
export async function runStreakMaintenanceJob() {
  logger.info('⏰ Running scheduled task: Streak Maintenance');
  try {
    const resetMembers = await resetInactiveStreaks(48);
    logger.info(`Streak maintenance complete: ${resetMembers.length} inactive streaks reset.`);
    if (resetMembers.length > 0) {
      await logActivity('inactive_streaks_reset', 'scheduler', { count: resetMembers.length });
    }
    return { success: true, resetCount: resetMembers.length };
  } catch (err) {
    logger.error('Failed to run Streak Maintenance job', { error: err.message });
    return { success: false, error: err.message };
  }
}

// ─── Scheduler Initialization ─────────────────────────────────────────────────

/**
 * Initializes and starts all recurring cron jobs.
 */
export function initScheduler(client) {
  const timezone = config.app.timezone || 'Asia/Kolkata';
  logger.info(`Initializing HCC automation scheduler (Timezone: ${timezone})…`);

  // Parse quiz post time (e.g., '09:00')
  const [hourStr = '09', minStr = '00'] = (config.app.quizPostTime || '09:00').split(':');
  const quizCron = `${parseInt(minStr, 10)} ${parseInt(hourStr, 10)} * * *`;

  // 1. Daily Quiz Drop (Default: 09:00 AM IST)
  const taskDailyQuiz = cron.schedule(
    quizCron,
    () => runDailyQuizDropJob(client),
    { timezone }
  );
  activeTasks.set('dailyQuiz', taskDailyQuiz);

  // 2. Daily Quiz Close (23:59 IST)
  const taskDailyClose = cron.schedule(
    '59 23 * * *',
    () => runDailyQuizCloseJob(),
    { timezone }
  );
  activeTasks.set('dailyClose', taskDailyClose);

  // 3. Weekly Leaderboard (Sundays at 21:00 IST)
  const taskWeeklyLeaderboard = cron.schedule(
    '0 21 * * 0',
    () => runWeeklyLeaderboardJob(client),
    { timezone }
  );
  activeTasks.set('weeklyLeaderboard', taskWeeklyLeaderboard);

  // 4. Monthly Winner Crowning (1st of month at 00:05 IST)
  const taskMonthlyWinners = cron.schedule(
    '5 0 1 * *',
    () => runMonthlyWinnerJob(client),
    { timezone }
  );
  activeTasks.set('monthlyWinners', taskMonthlyWinners);

  // 5. Streak Maintenance (Daily at 03:00 AM IST)
  const taskStreakMaintenance = cron.schedule(
    '0 3 * * *',
    () => runStreakMaintenanceJob(),
    { timezone }
  );
  activeTasks.set('streakMaintenance', taskStreakMaintenance);

  logger.info(`Scheduler running with ${activeTasks.size} registered automated jobs ✅`);
}

/**
 * Stops all scheduled tasks gracefully.
 */
export function stopScheduler() {
  for (const [name, task] of activeTasks.entries()) {
    task.stop();
    logger.debug(`Stopped scheduled task: ${name}`);
  }
  activeTasks.clear();
}

