/**
 * src/services/automation/scheduler.js
 * Automated Cron and Scheduling System (Phase 5).
 *
 * Runs background jobs in Asia/Kolkata timezone:
 *   1. Daily Quiz Drop (19:00 / 07:00 PM IST from Day 2 onward)
 *   2. Daily Quiz Auto-Close (23:59 IST)
 *   3. Weekly Sunday Leaderboard Post & DB Snapshot (Sunday 21:00 IST)
 *   4. Monthly Winner Crowning & Champion Announcement (1st of month 00:05 IST)
 *   5. Inactive Member Streak Reset (Daily 03:00 AM IST)
 */

import cron from 'node-cron';
import { EmbedBuilder } from 'discord.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { publishDailyQuiz } from '../quiz/quizService.js';
import { getActiveQuiz, closeQuiz, closeExpiredQuizzes, getQuizByScheduledDate } from '../../database/queries/quizzes.js';
import { getKolkataDateString } from '../quiz/questionBank.js';
import { getDayQuestionSet, isSprintDate } from '../quiz/sessionQuestionManager.js';
import { runDailyTimedSession, reconcileDailySessionOnStartup } from '../quiz/dailyTimedSessionEngine.js';
import { getDailySessionRecord } from '../../database/queries/quizSessions.js';
import {
  buildWeeklyLeaderboardEmbed,
  computeMonthlyWinners,
  buildMonthlyWinnerAnnouncement,
  takeLeaderboardSnapshot,
} from '../recognition/leaderboardService.js';
import { postWeeklyAnnouncement } from '../recognition/weeklyAnnouncementService.js';
import { resetInactiveStreaks } from '../../database/queries/members.js';
import { logActivity } from '../../database/queries/logs.js';

const activeTasks = new Map();
let isDailyQuizJobRunning = false;
let isDailyCloseJobRunning = false;
let isWeeklyJobRunning = false;
let isMonthlyJobRunning = false;
let isStreakJobRunning = false;

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
export async function runDailyQuizDropJob(client, options = {}) {
  const currentDate = options.date || getKolkataDateString();
  // Channel resolution: use explicitly passed channelId → production quiz channel (never test channel in production)
  const channelId = options.channelId || config.discord.channels.quiz;

  logger.info('⏰ Running scheduled task: Daily Quiz Drop', {
    targetDate: currentDate,
    channelId,
    retryAttempt: options.retryAttempt || 0,
  });

  if (isDailyQuizJobRunning && !options.force) {
    logger.warn('Daily Quiz Drop already in progress. Skipping concurrent run.');
    return { success: false, reason: 'JOB_ALREADY_RUNNING' };
  }

  if (!channelId) {
    logger.warn('Skipping Daily Quiz Drop: No target channel is configured');
    return { success: false, reason: 'CHANNEL_NOT_CONFIGURED' };
  }

  isDailyQuizJobRunning = true;

  try {
    // 1. Auto-close any lingering active quizzes from previous dates
    const closedCount = await closeExpiredQuizzes(currentDate).catch((err) => {
      logger.warn('Notice: error during expired quiz cleanup before drop', { error: err.message });
      return [];
    });
    if (closedCount.length > 0) {
      logger.info(`Auto-closed ${closedCount.length} expired quiz(zes) from prior dates.`);
    }

    // Check if a 10-question timed challenge session is scheduled for this date
    const timedBank = getDayQuestionSet(currentDate);
    if (timedBank) {
      const sessionResult = await runDailyTimedSession({
        client,
        channelId,
        dateStr: currentDate,
        suppressEveryonePing: options.suppressEveryonePing ?? false,
        customCountdownSeconds: options.customCountdownSeconds,
        customQuestionTimeSeconds: options.customQuestionTimeSeconds,
      });
      return sessionResult;
    }

    // CRITICAL GUARD: Outside the curated 7-day challenge window (Nov 9 - Nov 15, 2026),
    // NEVER fall back to uncurated single quizzes or broadcast @everyone pings!
    if (!options.forceLegacyQuiz) {
      logger.info(`[QUIZ DROP SKIPPED] No curated 7-day challenge scheduled for ${currentDate}. Quiz drop cleanly bypassed.`, {
        currentDate,
        channelId,
      });
      return {
        success: true,
        reason: 'NO_CHALLENGE_SCHEDULED_FOR_DATE',
        skipped: true,
        date: currentDate,
      };
    }

    // 2. Check if today's quiz was already posted (duplicate protection & restart recovery - ONLY if forceLegacyQuiz is true)
    const existingQuiz = await getQuizByScheduledDate(currentDate);
    if (existingQuiz && (existingQuiz.status === 'active' || existingQuiz.status === 'closed')) {
      logger.info('Today\'s quiz has already been posted. No duplicate publication needed.', {
        quizId: existingQuiz.id,
        scheduledFor: existingQuiz.scheduled_for,
        status: existingQuiz.status,
      });
      return { success: true, quizId: existingQuiz.id, alreadyExisted: true };
    }

    // 3. Publish daily quiz with automatic retry mechanism (up to 3 attempts)
    let result = null;
    let lastError = null;
    const maxRetries = options.maxRetries ?? 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await publishDailyQuiz({
          client,
          channelId,
          scheduledFor: currentDate,
          suppressEveryonePing: options.suppressEveryonePing ?? true,
        });
        break; // Success
      } catch (postErr) {
        lastError = postErr;
        logger.error(`Failed attempt ${attempt}/${maxRetries} to publish daily quiz`, {
          error: postErr.message,
          channelId,
          date: currentDate,
        });
        if (attempt < maxRetries) {
          const delayMs = attempt * 5000;
          logger.info(`Retrying Daily Quiz Drop in ${delayMs / 1000}s...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Daily quiz publication failed after retries.');
    }

    await logActivity('daily_quiz_scheduled_drop', 'scheduler', {
      quizId: result.quiz.id,
      channelId,
      scheduledFor: currentDate,
    });

    logger.info('Daily Quiz Drop completed successfully ✅', {
      quizId: result.quiz.id,
      date: currentDate,
      channelId,
    });

    return { success: true, quizId: result.quiz.id };
  } catch (err) {
    logger.error('Failed to run Daily Quiz Drop job', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  } finally {
    isDailyQuizJobRunning = false;
  }
}

/**
 * Job 2: Daily Quiz Auto-Close
 */
export async function runDailyQuizCloseJob() {
  logger.info('⏰ Running scheduled task: Daily Quiz Auto-Close');
  if (isDailyCloseJobRunning) {
    logger.warn('Daily Quiz Auto-Close job already running. Skipping.');
    return { success: false, reason: 'JOB_ALREADY_RUNNING' };
  }

  isDailyCloseJobRunning = true;
  try {
    const active = await getActiveQuiz();
    if (!active) {
      logger.info('No active quiz found to close.');
      return { success: true, closed: false };
    }

    await closeQuiz(active.id);
    await logActivity('daily_quiz_auto_close', 'scheduler', { quizId: active.id });
    logger.info('Active quiz auto-closed successfully ✅', { quizId: active.id });
    return { success: true, closed: true, quizId: active.id };
  } catch (err) {
    logger.error('Failed to auto-close active quiz', { error: err.message, stack: err.stack });
    return { success: false, error: err.message };
  } finally {
    isDailyCloseJobRunning = false;
  }
}

/**
 * Job 3: Weekly Leaderboard Drop & Snapshot (Official Community Roundup)
 */
export async function runWeeklyLeaderboardJob(client) {
  logger.info('⏰ Running scheduled task: Weekly Community Roundup & Leaderboard');
  try {
    const today = getKolkataDateString();
    // Guard: Only post weekly announcement on Sunday Nov 15 (conclusion of 7-day sprint) or beyond.
    // Prevents posting premature/empty roundup on Sunday Nov 8 before sprint starts.
    if (today < '2026-11-15') {
      logger.info(`Weekly roundup skipped for ${today}: Sprint begins Nov 9 and concludes on Nov 15.`);
      return { success: true, reason: 'SPRINT_NOT_YET_CONCLUDED', skipped: true };
    }

    const result = await postWeeklyAnnouncement({ client });
    return result;
  } catch (err) {
    logger.error('Failed to execute Weekly Leaderboard announcement job', { error: err.message });
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
        content: '🏆 **@everyone — The Monthly HCC Champions Have Been Crowned!** 🎊\nGive it up for this month\'s top performers and community contributors:',
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

/**
 * Job 6: 24/7 Keep-Alive & Active Connection Heartbeat
 * Runs every 5 minutes to prevent container sleep, keep DB pools warm, and monitor gateway health.
 */
export async function runKeepAliveHeartbeatJob(client) {
  try {
    const port = process.env.PORT || 8080;

    // 1. Self-ping local HTTP health endpoint
    try {
      const selfUrl = `http://127.0.0.1:${port}/ping`;
      await fetch(selfUrl, { signal: AbortSignal.timeout(3000) });
    } catch {
      // Local port may be handled by external proxy or container network
    }

    // 2. Ping external URL if provided (Railway/Render public domains)
    const publicHost = process.env.PUBLIC_URL || process.env.RAILWAY_STATIC_URL || process.env.RAILWAY_PUBLIC_DOMAIN;
    if (publicHost) {
      const fullUrl = publicHost.startsWith('http') ? `${publicHost}/ping` : `https://${publicHost}/ping`;
      try {
        await fetch(fullUrl, { signal: AbortSignal.timeout(4000) });
      } catch {
        // Silently catch external network timeouts
      }
    }

    // 3. Keep Supabase connection pool warm
    try {
      const { pingDatabase } = await import('../../database/client.js');
      await pingDatabase();
    } catch {
      // Ignore
    }

    // 4. Log heartbeat periodically (every 30 mins) to confirm 24/7 active status without log flooding
    const minute = new Date().getMinutes();
    if (minute % 30 === 0) {
      logger.info('💓 24/7 Keep-Alive Heartbeat: Bot & database connection healthy', {
        wsPingMs: client?.ws?.ping ?? -1,
        uptimeSeconds: Math.floor(process.uptime()),
        guilds: client?.guilds?.cache?.size ?? 0,
      });
    }

    return { success: true };
  } catch (err) {
    logger.warn('Notice: keep-alive heartbeat encounter', { error: err.message });
    return { success: false, error: err.message };
  }
}

/**
 * Job 7: Channel Self-Test & Diagnostic Check
 * Posts a silent diagnostic embed (zero user/role mentions) to verify the channel,
 * then automatically deletes the message after autoDeleteSeconds (default 10s).
 */
export async function runChannelSelfTestJob(client, options = {}) {
  const channelId = options.channelId || config.discord.channels.general || config.discord.channels.quiz;
  const autoDeleteSeconds = options.autoDeleteSeconds ?? 10;

  logger.info('⏰ Running scheduled task: Channel Self-Test', { channelId, autoDeleteSeconds });

  if (!channelId) {
    logger.warn('Skipping Channel Self-Test: No target channel configured');
    return { success: false, reason: 'CHANNEL_NOT_CONFIGURED' };
  }

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel) {
      throw new Error(`Target channel ${channelId} not found or inaccessible by bot.`);
    }

    const testEmbed = new EmbedBuilder()
      .setColor(0x00C853)
      .setTitle('🟢  HCC AutoEngage — System Diagnostic Check')
      .setDescription(
        '> Automated connection and channel pipeline test.\n\n' +
        '• **Status:** Operational ✅\n' +
        '• **Scheduler:** Active (Asia/Kolkata)\n' +
        '• **Channel:** Verified\n' +
        '• **Mentions:** Disabled (Silent)\n\n' +
        `_This diagnostic notice will automatically delete in **${autoDeleteSeconds} seconds**._`
      )
      .setFooter({ text: `HCC AutoEngage • Automated Health Check • Auto-deleting in ${autoDeleteSeconds}s` })
      .setTimestamp();

    const msg = await channel.send({
      embeds: [testEmbed],
      allowedMentions: { parse: [] }, // Strict zero mentions
    });

    logger.info(`Channel self-test message sent (ID: ${msg.id}) to ${channelId} — auto-deleting in ${autoDeleteSeconds}s`);

    setTimeout(async () => {
      await msg.delete().catch(() => {});
      logger.info(`Channel self-test message (${msg.id}) auto-deleted successfully ✅`);
    }, autoDeleteSeconds * 1000);

    return { success: true, messageId: msg.id, channelId };
  } catch (err) {
    logger.error('Channel Self-Test job failed', { error: err.message });
    return { success: false, error: err.message };
  }
}

// ─── Scheduler Initialization ─────────────────────────────────────────────────

/**
 * Reconciles scheduler state on bot startup.
 * Checks if today's quiz was missed (e.g. Due to downtime / restart around scheduled time)
 * and safely publishes it without duplicates.
 */
export async function reconcileMissedJobsOnStartup(client) {
  try {
    const today = getKolkataDateString();
    const [targetHourStr = '19', targetMinStr = '00'] = (config.app.quizPostTime || '19:00').split(':');
    const targetHour = parseInt(targetHourStr, 10);
    const targetMin = parseInt(targetMinStr, 10);

    // Get current IST hour & minute
    const nowISTParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: config.app.timezone || 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date());

    const currentHour = parseInt(nowISTParts.find((p) => p.type === 'hour')?.value || '0', 10);
    const currentMin  = parseInt(nowISTParts.find((p) => p.type === 'minute')?.value || '0', 10);

    const isPastScheduledTime = (currentHour > targetHour) || (currentHour === targetHour && currentMin >= targetMin);

    logger.info('Checking for missed scheduled executions on startup...', {
      today,
      currentIST: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`,
      targetIST: `${targetHourStr}:${targetMinStr}`,
      isPastScheduledTime,
    });

    // 1. Auto-close previous days' quizzes if still open
    await closeExpiredQuizzes(today);

    // 2. Resume any active or interrupted daily timed session
    await reconcileDailySessionOnStartup(client);

    // 3. If it's past the scheduled post time today, check if today's quiz was published
    if (isPastScheduledTime) {
      const hasTimedBank = getDayQuestionSet(today);
      if (hasTimedBank) {
        const sessionRecord = await getDailySessionRecord(today);
        if (!sessionRecord || sessionRecord.sessionState.status !== 'completed') {
          logger.warn(`Missed daily timed session detected for today (${today}). Initiating session...`);
          await runDailyQuizDropJob(client, { date: today });
        } else {
          logger.info(`Today's timed session (${today}) already completed.`, { sessionId: sessionRecord.id });
        }
      } else {
        logger.info(`No 7-day challenge scheduled for today (${today}). Skipping startup quiz recovery.`);
      }
    }
  } catch (err) {
    logger.error('Error during startup scheduler reconciliation', { error: err.message, stack: err.stack });
  }
}

/**
 * Initializes and starts all recurring cron jobs.
 */
export function initScheduler(client) {
  const timezone = config.app.timezone || 'Asia/Kolkata';
  logger.info(`Initializing HCC automation scheduler (Timezone: ${timezone})…`);

  // Parse quiz post time from env (e.g., '19:00')
  const [hourStr = '19', minStr = '00'] = (config.app.quizPostTime || '19:00').split(':');
  const quizCron = `${parseInt(minStr, 10)} ${parseInt(hourStr, 10)} * * *`;

  // Stop any existing active tasks before registering to avoid duplicates
  stopScheduler();

  // 1. Daily Quiz Drop (Configured via QUIZ_POST_TIME — now 07:00 PM IST / 19:00)
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

  // 6. 24/7 Keep-Alive & Active Connection Heartbeat (Every 5 minutes)
  const taskKeepAlive = cron.schedule(
    '*/5 * * * *',
    () => runKeepAliveHeartbeatJob(client),
    { timezone }
  );
  activeTasks.set('keepAlive', taskKeepAlive);

  // 7. Channel Self-Test & Diagnostic Check (e.g. Pre-quiz test or custom cron)
  const channelTestCron = process.env.CHANNEL_TEST_CRON;
  if (channelTestCron) {
    const taskChannelTest = cron.schedule(
      channelTestCron,
      () => runChannelSelfTestJob(client),
      { timezone }
    );
    activeTasks.set('channelSelfTest', taskChannelTest);
  }

  logger.info(`Scheduler running with ${activeTasks.size} registered automated jobs ✅`);

  // Run startup recovery check asynchronously so it doesn't block Gateway ready event
  setTimeout(() => {
    reconcileMissedJobsOnStartup(client).catch((err) => {
      logger.error('Startup recovery error', { error: err.message });
    });
  }, 3000);
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

