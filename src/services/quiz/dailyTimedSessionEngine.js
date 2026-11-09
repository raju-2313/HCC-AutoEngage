/**
 * src/services/quiz/dailyTimedSessionEngine.js
 * Comprehensive 10-Question Timed Daily Quiz Session Engine.
 *
 * Implements:
 *   - Phase 2: Initial announcement with exactly ONE @everyone ping & countdown.
 *   - Phase 3: 10 sequential questions, 15s timer per question, live multi-user button submissions.
 *   - Phase 4: Database state persistence in Supabase & resilient restart recovery.
 *   - Phase 5: Final results, scoring compilation, podium reveal, and leaderboard updates.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { COLORS } from '../../utils/embeds.js';
import { getDayQuestionSet } from './sessionQuestionManager.js';
import {
  getDailySessionRecord,
  initDailySessionRecord,
  updateDailySessionState,
  getSessionAttempts,
} from '../../database/queries/quizSessions.js';
import { createQuiz, publishQuiz, closeQuiz, getQuizById } from '../../database/queries/quizzes.js';
import { getKolkataDateString } from './questionBank.js';
import { buildStandaloneHintEmbed } from '../../utils/leaderboardTips.js';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCountdownProgressBar(remainingSec, totalSec, length = 10) {
  const fraction = Math.max(0, Math.min(1, remainingSec / totalSec));
  const filled = Math.round(fraction * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

const HR = '┄'.repeat(28);

const OPTION_STYLES = {
  A: { emoji: '🅰️', style: ButtonStyle.Primary },
  B: { emoji: '🅱️', style: ButtonStyle.Primary },
  C: { emoji: '🇨',  style: ButtonStyle.Primary },
  D: { emoji: '🇩',  style: ButtonStyle.Primary },
};

const CATEGORY_ICONS = {
  python: '🐍',
  c: '💻',
  loops: '🔄',
  conditionals: '⚖️',
  git: '🔀',
  web: '🌐',
  fundamentals: '🖥️',
  javascript: '🟨',
  dsa: '🌳',
  strings: '🔤',
  default: '🧠',
};

function getCategoryIcon(cat = '') {
  return CATEGORY_ICONS[cat.toLowerCase()] ?? CATEGORY_ICONS.default;
}

function mapDifficultyToDb(diff = '') {
  const d = diff.toLowerCase();
  if (d === 'challenge' || d === 'advanced') return 'advanced';
  if (d === 'medium' || d === 'intermediate') return 'intermediate';
  return 'beginner';
}

// Global in-memory lock to prevent concurrent sessions on the same process
let isSessionRunning = false;

/**
 * Main entry point: Runs or resumes the daily 10-question timed quiz session for a target date.
 */
export async function runDailyTimedSession({
  client,
  channelId,
  dateStr = getKolkataDateString(),
  suppressEveryonePing = false, // Used during automated testing
  customCountdownSeconds = null,
  customQuestionTimeSeconds = null,
  customIntermissionSeconds = null,
}) {
  if (isSessionRunning) {
    logger.warn('A daily quiz session is already actively running. Skipping concurrent start.');
    return { success: false, reason: 'SESSION_ALREADY_RUNNING' };
  }

  isSessionRunning = true;

  try {
    const questionBank = getDayQuestionSet(dateStr);
    if (!questionBank) {
      logger.warn(`No question set found for date: ${dateStr}. Session aborted.`);
      return { success: false, reason: 'NO_QUESTIONS_FOR_DATE' };
    }

    const { meta, questions } = questionBank;
    const activeQuestions = meta.singleQuestionTest ? questions.slice(0, 1) : questions;
    const targetChannel = await client.channels.fetch(channelId).catch(() => null);
    if (!targetChannel) {
      throw new Error(`Target quiz channel ${channelId} not found or inaccessible by the bot.`);
    }

    const countdownSec = customCountdownSeconds ?? config.app.countdownSeconds ?? 30;
    // Always respect per-question time from env (QUIZ_QUESTION_TIME_SECONDS=15) unless overridden by caller
    const qTimeSec = customQuestionTimeSeconds ?? config.app.questionTimeSeconds ?? 15;

    logger.info(`Starting daily timed quiz session for ${dateStr}`, {
      topic: meta.topic,
      channelId,
      questionsCount: activeQuestions.length,
      countdownSec,
      qTimeSec,
      singleQuestionTest: Boolean(meta.singleQuestionTest),
    });

    // 1. Initialize or load existing master session record in Supabase
    let sessionRecord = await initDailySessionRecord({
      dateStr,
      topic: meta.topic,
      dayNumber: meta.dayNumber,
      channelId,
      totalQuestions: activeQuestions.length,
    });

    let state = sessionRecord.sessionState;

    if (state.status === 'completed') {
      logger.info(`Session for ${dateStr} has already been marked completed. No re-run needed.`);
      return { success: true, completed: true, alreadyCompleted: true };
    }

    // 2. Initial Announcement with First @everyone Ping (Phase 2 - 1 of 2 pings)
    if (!state.announcementSent) {
      const catEmoji = getCategoryIcon(meta.category);
      const qCountLabel = activeQuestions.length === 1 ? '1 Rapid-Fire Verification Question' : '10 Rapid-Fire Questions';
      const announceEmbed = new EmbedBuilder()
        .setColor(0x00C853) // HackerRank vibrant green
        .setTitle(`🟢  Today's HCC Daily Tech Challenge is Live!  🟢`)
        .setDescription(
          `## 🚀  **Day ${meta.dayNumber} of 7: ${meta.topic}**\n\n` +
          `${HR}\n\n` +
          `📚  **Topic:** ${catEmoji}  **${meta.topic}**\n` +
          `❓  **Questions:** **${qCountLabel}**\n` +
          `⏱️  **Time per question:** **${qTimeSec} seconds**\n` +
          `🎁  **Rewards:** **+10 Points & +20 XP** per correct answer\n` +
          `🔥  **Streaks:** Keep your daily streak burning!\n\n` +
          `${HR}\n\n` +
          `⚡ **Get ready! The quiz is starting in <t:${Math.floor((Date.now() + countdownSec * 1000) / 1000)}:R>!**\n\n` +
          `> _React fast, think sharp, and good luck!_ 🎯`
        )
        .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew  │  Start announcement (Ping 1 of 2)' })
        .setTimestamp();

      const mentionContent = `🔔 **@everyone — The HCC Daily Tech Challenge (${meta.topic}) is starting now! Get ready — Question 1 drops in ${countdownSec} seconds!**`;

      const announcementMsg = await targetChannel.send({
        content: mentionContent,
        embeds: [announceEmbed],
        allowedMentions: { parse: ['everyone'] },
      });

      state.announcementSent = true;
      state.announcementMessageId = announcementMsg.id;
      state.status = 'in_progress';
      sessionRecord = await updateDailySessionState(sessionRecord.id, state);

      logger.info(`Initial announcement published for ${dateStr}`, {
        messageId: announcementMsg.id,
      });

      // Countdown delay before first question
      if (countdownSec > 0) {
        await sleep(countdownSec * 1000);
      }
    }

    // 3. Question Execution Loop (Phase 3 & 4)
    const startIndex = state.currentQuestionIndex >= 0 ? state.currentQuestionIndex : 0;
    const completedQuizIds = [...(state.completedQuestionRecordIds || [])];

    for (let i = startIndex; i < activeQuestions.length; i++) {
      const q = activeQuestions[i];
      const qNumber = i + 1;
      const totalQ = activeQuestions.length;
      const catEmoji = getCategoryIcon(meta.category);

      // Check if this question was already created in DB for this session
      let questionQuiz = null;
      if (state.currentQuestionIndex === i && state.currentQuizRecordId) {
        questionQuiz = await getQuizById(state.currentQuizRecordId);
      }

      if (!questionQuiz) {
        questionQuiz = await createQuiz({
          title: `Day ${meta.dayNumber} (Q${qNumber}/${totalQ}): ${q.title || q.questionText.slice(0, 45)}`,
          description: JSON.stringify({
            masterSessionId: sessionRecord.id,
            dayNumber: meta.dayNumber,
            questionIndex: i,
            questionId: q.id,
          }),
          category: meta.category,
          difficulty: mapDifficultyToDb(q.difficulty),
          pointsReward: q.pointsReward || 10,
          xpReward: q.xpReward || 20,
          scheduledFor: dateStr,
          createdBy: 'daily_timed_session',
          questions: [
            {
              questionText: q.questionText,
              codeSnippet: q.codeSnippet,
              options: q.options,
              correctOption: q.correctOption,
              explanation: q.explanation,
            },
          ],
        });
      }

      state.currentQuestionIndex = i;
      state.currentQuizRecordId = questionQuiz.id;
      state.questionStartTime = new Date(now).toISOString();
      state.questionEndTime = new Date(now + qTimeSec * 1000).toISOString();
      await updateDailySessionState(sessionRecord.id, state);

      // Build options text
      const optionsText = q.options
        .map((opt) => {
          const cfg = OPTION_STYLES[opt.id] ?? { emoji: opt.id };
          return `${cfg.emoji}  **${opt.id}.**  ${opt.text}`;
        })
        .join('\n\n');

      let desc = `### ${q.questionText}\n`;
      if (q.codeSnippet) {
        desc += `\n\`\`\`javascript\n${q.codeSnippet}\n\`\`\`\n`;
      }
      desc += `\n${HR}\n\n${optionsText}\n\n${HR}`;

      const diffLabel = q.difficulty === 'challenge' ? '🔥 Challenge' : q.difficulty === 'medium' ? '⚡ Medium' : '🌱 Easy';

      const activeButtons = q.options.map((opt) => {
        const cfg = OPTION_STYLES[opt.id] ?? { emoji: '', style: ButtonStyle.Primary };
        return new ButtonBuilder()
          .setCustomId(`quiz_ans:${questionQuiz.id}:${opt.id}`)
          .setLabel(`Option ${opt.id}`)
          .setEmoji(cfg.emoji)
          .setStyle(cfg.style);
      });
      const row = new ActionRowBuilder().addComponents(activeButtons);

      // ─── PUBLISH: Compute timer RIGHT before .send() so Discord countdown is accurate ──
      const questionEndUnix = Math.floor((Date.now() + qTimeSec * 1000) / 1000);

      // Builder for dynamic, responsive question embeds that update live
      const makeQuestionEmbed = (secondsLeft, isClosed = false) => {
        const isUrgent = secondsLeft <= 5 && !isClosed;
        const bar = buildCountdownProgressBar(isClosed ? 0 : secondsLeft, qTimeSec, 10);
        const timerColor = isClosed ? 0x95A5A6 : isUrgent ? 0xE74C3C : secondsLeft <= 10 ? 0xE67E22 : COLORS.primary;

        const timeHeader = isClosed
          ? `🔒 **Closed** \`${bar}\``
          : isUrgent
          ? `🚨 **${secondsLeft}s LEFT!** \`${bar}\``
          : `⏳ **${secondsLeft}s** \`${bar}\``;

        const timeValue = isClosed
          ? `${timeHeader}\nTime's up!`
          : `${timeHeader}\nEnds <t:${questionEndUnix}:R>`;

        return new EmbedBuilder()
          .setColor(timerColor)
          .setTitle(`${catEmoji}  Question ${qNumber} of ${totalQ}  ·  ${meta.topic}`)
          .setDescription(desc)
          .addFields(
            { name: '⏱️ Time Remaining', value: timeValue,                            inline: true },
            { name: '🎯 Tier',           value: diffLabel,                             inline: true },
            { name: '🎁 Stakes',         value: `**+${q.pointsReward}** pts`,          inline: true }
          )
          .setFooter({
            text: isClosed
              ? `Q${qNumber}/${totalQ}  │  Submissions closed`
              : `Q${qNumber}/${totalQ}  │  Click your answer below (private)  │  ${qTimeSec}s limit`,
          })
          .setTimestamp();
      };

      const qEmbed = makeQuestionEmbed(qTimeSec);

      // Publish question message (NEVER mention @everyone on questions)
      const qMessage = await targetChannel.send({
        embeds: [qEmbed],
        components: [row],
        allowedMentions: { parse: [] },
      });

      // Update the message ID in Supabase now that we have it
      await publishQuiz(questionQuiz.id, {
        messageId: qMessage.id,
        channelId: targetChannel.id,
      });

      logger.info(`Question ${qNumber}/${totalQ} published (Quiz ID: ${questionQuiz.id})`);

      // ─── DYNAMIC LIVE COUNTDOWN LOOP ───
      // Updates the embed at safe 5-second intervals to show the progress bar shrinking
      // and urgency colors shifting (Blue -> Orange -> Red), preventing the "stuck" feeling
      // while staying strictly under Discord's 5 edits / 5s rate limit.
      let secondsRemaining = qTimeSec;
      const stepSeconds = 5;

      while (secondsRemaining > stepSeconds) {
        await sleep(stepSeconds * 1000);
        secondsRemaining -= stepSeconds;

        const liveEmbed = makeQuestionEmbed(secondsRemaining);
        await qMessage.edit({
          embeds: [liveEmbed],
          components: [row],
        }).catch((editErr) => {
          logger.debug('Non-critical live timer embed update failed', { error: editErr.message });
        });
      }

      // Wait for EXACTLY the remaining answering window to finish
      const exactRemainingMs = Math.max(0, (questionEndUnix * 1000) - Date.now());
      if (exactRemainingMs > 0) {
        await sleep(exactRemainingMs);
      }

      // Close question in Supabase immediately (rejects late submissions at DB level)
      await closeQuiz(questionQuiz.id);
      completedQuizIds.push(questionQuiz.id);

      // Fetch attempts for this question (guaranteed array handling)
      const rawAttempts = await getSessionAttempts([questionQuiz.id]);
      const attempts = Array.isArray(rawAttempts) ? rawAttempts : (rawAttempts?.data || []);
      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter((a) => a.is_correct).length;
      const accuracyStr = totalAttempts > 0 ? `${Math.round((correctAttempts / totalAttempts) * 100)}%` : '0%';

      // Reveal correct answer and disable buttons
      const disabledButtons = q.options.map((opt) => {
        const isCorrectOpt = opt.id === q.correctOption;
        const cfg = OPTION_STYLES[opt.id] ?? { emoji: '', style: ButtonStyle.Secondary };
        return new ButtonBuilder()
          .setCustomId(`quiz_closed:${questionQuiz.id}:${opt.id}`)
          .setLabel(`Option ${opt.id}`)
          .setEmoji(cfg.emoji)
          .setStyle(isCorrectOpt ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true);
      });
      const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

      const resultEmbed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`⏰  Time's Up! — Question ${qNumber} of ${totalQ}`)
        .setDescription(
          `> **✅ Correct Answer: Option ${q.correctOption}**\n\n` +
          `### 💡 Explanation\n${q.explanation}\n\n` +
          `${HR}\n\n` +
          `📊  **${correctAttempts}** of **${totalAttempts}** answered correctly  ·  Accuracy: **${accuracyStr}**`
        )
        .setFooter({
          text: qNumber < totalQ
            ? `⏭️  Next question in 4 seconds...  (Q${qNumber + 1}/${totalQ})`
            : '🏆  Calculating final standings...',
        });

      const finalQEmbed = makeQuestionEmbed(0, true);
      await qMessage.edit({
        embeds: [finalQEmbed, resultEmbed],
        components: [disabledRow],
      }).catch((editErr) => {
        logger.warn('Failed to edit expired question message', { error: editErr.message });
      });

      // Update completed list in checkpoint
      state.completedQuestionRecordIds = completedQuizIds;
      await updateDailySessionState(sessionRecord.id, state);

      // Intermission before next question
      if (qNumber < totalQ) {
        const gap = customIntermissionSeconds !== null ? customIntermissionSeconds * 1000 : 4000;
        await sleep(gap);
      }
    }

    // 4. Final Results, Podium & Leaderboard Integration (Phase 5)
    await sleep(2000);
    const rawAllAttempts = await getSessionAttempts(completedQuizIds);
    const allAttempts = Array.isArray(rawAllAttempts) ? rawAllAttempts : (rawAllAttempts?.data || []);

    // Aggregate user scores for this 10-question session
    const participantMap = new Map();
    for (const att of allAttempts) {
      const uid = att.discord_id;
      const uname = att.members?.username || uid;
      const entry = participantMap.get(uid) || {
        discordId: uid,
        username: uname,
        totalPoints: 0,
        correctCount: 0,
        totalAttempted: 0,
      };

      entry.totalAttempted += 1;
      if (att.is_correct) {
        entry.correctCount += 1;
        entry.totalPoints += (att.points_awarded || 10);
      }
      participantMap.set(uid, entry);
    }

    const sortedRankings = Array.from(participantMap.values()).sort(
      (a, b) => b.totalPoints - a.totalPoints || b.correctCount - a.correctCount
    );

    const PODIUM_MEDALS = ['🥇', '🥈', '🥉'];
    let podiumSection = '';
    let standingsText = '';

    if (sortedRankings.length === 0) {
      standingsText = '> *No answers were submitted during today\'s session.*\n> Be ready for the next challenge at 07:00 PM IST!';
    } else {
      const top3 = sortedRankings.slice(0, 3);
      podiumSection = top3
        .map((p, idx) => {
          const medal = PODIUM_MEDALS[idx];
          const title = idx === 0 ? '👑 **CHAMPION**' : idx === 1 ? '🥈 **RUNNER-UP**' : '🥉 **3RD PLACE**';
          return `${medal} ${title}: <@${p.discordId}>  —  **${p.totalPoints} pts**  ·  ${p.correctCount}/10 correct (${Math.round((p.correctCount / 10) * 100)}% accuracy)`;
        })
        .join('\n');

      standingsText = sortedRankings
        .slice(0, 10)
        .map((p, idx) => {
          const medal = PODIUM_MEDALS[idx] ?? `\`#${String(idx + 1).padStart(2, '0')}\``;
          const mention = `<@${p.discordId}>`;
          return `${medal}  ${mention}  —  **${p.totalPoints} pts**  ·  ${p.correctCount}/10 correct ✅`;
        })
        .join('\n');
    }

    const totalAnswersLogged = Array.from(participantMap.values()).reduce((sum, p) => sum + p.totalAttempted, 0);
    const totalCorrectLogged = Array.from(participantMap.values()).reduce((sum, p) => sum + p.correctCount, 0);

    let desc = `## 🏁  **Day ${meta.dayNumber} of 7: ${meta.topic} — Final Results**\n\n${HR}\n\n`;
    if (podiumSection) {
      desc += `### 🌟  **TODAY'S WINNERS & PODIUM**  🌟\n\n${podiumSection}\n\n${HR}\n\n`;
    }
    desc += `### 📊  **SESSION LEADERBOARD (TOP 10)**\n\n${standingsText}\n\n${HR}\n\n` +
      `🎉  Huge shoutout to all **${sortedRankings.length}** participants for testing your skills today!\n` +
      `⚡  **Rewards:** All points, XP, and daily streaks have been locked into your profile.\n\n` +
      `> _Check your overall rank anytime with \`/leaderboard\` and inspect your badges with \`/profile\`!_`;

    const finalEmbed = new EmbedBuilder()
      .setColor(0xFFD700) // Championship Gold
      .setTitle(`🏆  HCC Daily Tech Challenge: ${meta.topic} — Complete!  🏆`)
      .setDescription(desc)
      .addFields(
        { name: '👥 Challengers', value: `${sortedRankings.length} members`, inline: true },
        { name: '🎯 Total Answers', value: `${totalAnswersLogged} (${totalCorrectLogged} correct)`, inline: true },
        { name: '🔥 Next Challenge', value: 'Tomorrow @ 07:00 PM IST', inline: true }
      )
      .setFooter({
        text: `HCC AutoEngage • Day ${meta.dayNumber}/7 Complete  │  Wrap-up announcement (Ping 2 of 2)`,
      })
      .setTimestamp();

    const finalMention = `🏆 **@everyone — That's a wrap! The HCC Daily Tech Challenge (${meta.topic}) is complete! Check out today's Champions & Leaderboard below!** 🎊`;

    await targetChannel.send({
      content: finalMention,
      embeds: [finalEmbed],
      allowedMentions: { parse: ['everyone'] }, // Final announcement ping #2 of 2
    });

    // Send the standalone "Whispers from the Mod" card as a separate follow-up message
    await sleep(1500);
    const standaloneHintCard = buildStandaloneHintEmbed();
    await targetChannel.send({
      embeds: [standaloneHintCard],
      allowedMentions: { parse: [] }, // Never ping on hints
    });

    // Mark master session completed in Supabase
    state.status = 'completed';
    await updateDailySessionState(sessionRecord.id, state);

    logger.info(`Daily timed quiz session for ${dateStr} completed successfully! ✅`, {
      totalQuestions: questions.length,
      participants: sortedRankings.length,
    });

    return {
      success: true,
      completed: true,
      participantsCount: sortedRankings.length,
      totalQuestions: questions.length,
    };
  } catch (err) {
    logger.error('Fatal error during daily timed quiz session execution', {
      error: err.message,
      stack: err.stack,
      dateStr,
    });
    return { success: false, error: err.message };
  } finally {
    isSessionRunning = false;
  }
}

/**
 * Reconciles and resumes any active or interrupted daily session on bot reboot.
 */
export async function reconcileDailySessionOnStartup(client) {
  try {
    const today = getKolkataDateString();
    const channelId = config.discord.channels.quiz;
    if (!channelId) return;

    const existing = await getDailySessionRecord(today);
    if (!existing) return;

    const state = existing.sessionState;
    if (state && state.status === 'in_progress') {
      logger.warn(`Interrupted daily session detected for today (${today}). Resuming session...`, {
        questionIndex: state.currentQuestionIndex,
        announcementAlreadySent: state.announcementSent,
      });

      // Resume session safely without re-announcing @everyone
      runDailyTimedSession({
        client,
        channelId,
        dateStr: today,
        suppressEveryonePing: true, // Guarantees no duplicate @everyone ping on restart!
      }).catch((err) => {
        logger.error('Failed to resume daily session on startup', { error: err.message });
      });
    }
  } catch (err) {
    logger.error('Error during daily session startup reconciliation', { error: err.message });
  }
}

