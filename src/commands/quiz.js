/**
 * src/commands/quiz.js
 * Slash commands for members: /quiz today, /quiz stats, /quiz live
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getActiveQuiz } from '../database/queries/quizzes.js';
import { getMemberByDiscordId } from '../database/queries/members.js';
import { getMemberQuizAttempts } from '../database/queries/attempts.js';
import { buildQuizMessage } from '../services/quiz/quizService.js';
import { runLiveQuizSession } from '../services/quiz/liveQuizRunner.js';
import { COLORS, errorEmbed, infoEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('quiz')
  .setDescription('HCC AutoEngage daily quizzes and personal statistics.')
  .addSubcommand((sub) =>
    sub
      .setName('today')
      .setDescription('View and interact with today\'s active quiz.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('View your quiz participation, win rate, and current streak.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('live')
      .setDescription('Launch a live automated multi-question quiz challenge in this channel.')
      .addIntegerOption((opt) =>
        opt
          .setName('questions')
          .setDescription('Number of questions (default: 10)')
          .setMinValue(1)
          .setMaxValue(15)
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('timer')
          .setDescription('Seconds per question (default: 25s)')
          .setMinValue(10)
          .setMaxValue(60)
          .setRequired(false)
      )
  );

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HR = '┄'.repeat(28);

function computeLevel(xp) {
  return 1 + Math.floor(Math.sqrt((xp || 0) / 50));
}

function miniProgressBar(current, total, segments = 8) {
  if (total === 0) return '█'.repeat(segments);
  const filled = Math.round(Math.min(1, current / total) * segments);
  return '█'.repeat(filled) + '░'.repeat(segments - filled);
}

function winRateColor(pct) {
  if (pct >= 70) return COLORS.success;
  if (pct >= 40) return COLORS.warning;
  return COLORS.info;
}

/** Formats a recent attempt history row. */
function formatAttemptRow(att) {
  const icon      = att.is_correct ? '✅' : '❌';
  const title     = att.quizzes?.title ?? 'Daily Quiz';
  const pts       = att.points_awarded > 0 ? `+${att.points_awarded} pts` : '+0 pts';
  const xp        = att.xp_awarded   > 0 ? `+${att.xp_awarded} XP`   : '+0 XP';
  // Truncate long titles to keep the layout clean
  const shortTitle = title.length > 32 ? title.slice(0, 29) + '…' : title;
  return `${icon}  **${shortTitle}**\n╰  \`${pts}\` · \`${xp}\``;
}

// ─── Main execute ─────────────────────────────────────────────────────────────

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // ── /quiz live ───────────────────────────────────────────────────────────────
  if (subcommand === 'live') {
    const questionsCount = interaction.options.getInteger('questions') || 10;
    const timerSeconds   = interaction.options.getInteger('timer')     || 25;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('⚡  Live Quiz Session Launching!')
          .setDescription(
            `### ${questionsCount}-Question Blitz  ·  ${timerSeconds}s per question\n\n` +
            `The session is starting in this channel right now.\n` +
            `Watch for the first question — click your answer before the timer runs out!`
          )
          .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' }),
      ],
      flags: MessageFlags.Ephemeral,
    });

    runLiveQuizSession({
      client: interaction.client,
      channelId: interaction.channelId,
      questionCount: questionsCount,
      secondsPerQuestion: timerSeconds,
    }).catch((err) => {
      logger.error('Error during live quiz session', { error: err.message, channelId: interaction.channelId });
    });
    return;
  }

  // ── /quiz today ──────────────────────────────────────────────────────────────
  if (subcommand === 'today') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const activeQuiz = await getActiveQuiz();
    if (!activeQuiz || !activeQuiz.quiz_questions || activeQuiz.quiz_questions.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('📭  No Active Quiz Right Now')
            .setDescription(
              `> Daily quizzes drop every morning at **09:00 AM** IST!\n\n` +
              `${HR}\n\n` +
              `📌  **What to do next:**\n` +
              `• Use \`/quiz stats\` to review your past performance\n` +
              `• Use \`/leaderboard weekly\` to see the current rankings\n` +
              `• Use \`/profile\` to check your XP and badges\n\n` +
              `See you tomorrow! 👋`
            )
            .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' })
            .setTimestamp(),
        ],
      });
    }

    const question       = activeQuiz.quiz_questions[0];
    const messagePayload = buildQuizMessage(activeQuiz, question);

    return interaction.editReply({
      content: null,
      embeds: messagePayload.embeds,
      components: messagePayload.components,
    });
  }

  // ── /quiz stats ──────────────────────────────────────────────────────────────
  if (subcommand === 'stats') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const member = await getMemberByDiscordId(interaction.user.id);
    if (!member || (member.quizzes_completed ?? 0) === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(COLORS.info)
            .setTitle('📋  No Quiz History Yet')
            .setDescription(
              `> You haven\'t completed any quizzes yet, **${interaction.user.username}**!\n\n` +
              `${HR}\n\n` +
              `🎯  Join our daily live challenge sessions at 09:00 AM IST to build your streak.\n` +
              `🏆  Correct answers earn Points and XP toward your profile rank.\n` +
              `📈  Streaks multiply your standing on the weekly leaderboard.`
            )
            .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew' })
            .setTimestamp(),
        ],
      });
    }

    const completed = member.quizzes_completed ?? 0;
    const won       = member.quizzes_won       ?? 0;
    const winPct    = completed > 0 ? Math.round((won / completed) * 100) : 0;
    const level     = computeLevel(member.total_xp ?? 0);
    const streak    = member.streak_current ?? 0;
    const color     = winRateColor(winPct);

    // Mini win-rate bar
    const winBar    = miniProgressBar(won, completed, 10);

    // Streak fire intensity
    const streakFire = streak >= 7 ? '🔥🔥🔥' : streak >= 3 ? '🔥🔥' : '🔥';

    const recentAttempts = await getMemberQuizAttempts(interaction.user.id, 5);

    const statsEmbed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`📊  ${interaction.user.username}  ·  Quiz Stats`)
      .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
      .setDescription(
        `> Your personal HCC quiz performance summary\n${HR}`
      )
      .addFields(
        // Row 1: core numbers
        {
          name: '📝  Completed',
          value: `**${completed}** quizzes`,
          inline: true,
        },
        {
          name: '🎯  Accuracy',
          value: `**${winPct}%**\n${won} correct`,
          inline: true,
        },
        {
          name: `${streakFire}  Streak`,
          value: `**${streak}** day${streak !== 1 ? 's' : ''}\nBest: **${member.streak_max ?? 0}**`,
          inline: true,
        },
        // Row 2: win rate bar + level
        {
          name: '📈  Win Rate',
          value: `\`${winBar}\`  ${winPct}%`,
          inline: true,
        },
        {
          name: '⭐  Level',
          value: `**Level ${level}**\n${member.total_xp ?? 0} XP`,
          inline: true,
        },
        {
          name: '💰  Points',
          value: `**${member.total_points ?? 0}** total`,
          inline: true,
        },
      )
      .setTimestamp()
      .setFooter({ text: 'HCC AutoEngage • Keep your daily streak alive!  │  Use /profile for full stats' });

    // Recent submission history
    if (recentAttempts.length > 0) {
      const historyLines = recentAttempts.map(formatAttemptRow).join('\n\n');

      statsEmbed.addFields(
        {
          name: '\u200b',
          value: HR,
          inline: false,
        },
        {
          name: '🕒  Recent Submissions',
          value: historyLines,
          inline: false,
        }
      );
    }

    return interaction.editReply({ embeds: [statsEmbed] });
  }
}
