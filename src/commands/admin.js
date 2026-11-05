/**
 * src/commands/admin.js
 * Comprehensive Administrative Suite (Phase 6).
 *
 * Restricted to members with Administrator permissions or the designated 'HCC Admin' role.
 *
 * Subcommands:
 *   - /admin stats                     : High-level community engagement metrics
 *   - /admin quiz publish [question_id]: Manually publish a daily quiz
 *   - /admin quiz close                : Force close the active quiz
 *   - /admin points grant <user> <points> [xp] [reason] : Manually award points/XP
 *   - /admin announce winners          : Force calculate and announce monthly champions
 *   - /admin streak reset <user>       : Reset a member's daily streak
 */

import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { isAdmin } from '../utils/permissions.js';
import { COLORS, errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import {
  getServerMemberStats,
  updateMemberPoints,
  resetMemberStreak,
  getMemberByDiscordId,
  upsertMember,
} from '../database/queries/members.js';
import { getActiveQuiz, closeQuiz } from '../database/queries/quizzes.js';
import { publishDailyQuiz } from '../services/quiz/quizService.js';
import { QUESTION_BANK } from '../services/quiz/questionBank.js';
import { runMonthlyWinnerJob } from '../services/automation/scheduler.js';
import { logActivity } from '../database/queries/logs.js';

const HR = '┄'.repeat(28);

export const data = new SlashCommandBuilder()
  .setName('admin')
  .setDescription('HCC AutoEngage administrative and moderator commands.')
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('View server-wide community engagement and quiz metrics.')
  )
  .addSubcommandGroup((group) =>
    group
      .setName('quiz')
      .setDescription('Administrative quiz management.')
      .addSubcommand((sub) =>
        sub
          .setName('publish')
          .setDescription('Publish a daily quiz challenge immediately.')
          .addStringOption((opt) =>
            opt
              .setName('question_id')
              .setDescription('Optional specific Question Bank ID (e.g. js-001, dsa-001)')
              .setRequired(false)
          )
      )
      .addSubcommand((sub) =>
        sub
          .setName('close')
          .setDescription('Close the currently active quiz.')
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('points')
      .setDescription('Grant or adjust points and XP for a member.')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('Target member')
          .setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('amount')
          .setDescription('Points to award (positive or negative)')
          .setRequired(true)
      )
      .addIntegerOption((opt) =>
        opt
          .setName('xp')
          .setDescription('XP to award (default: 2x points)')
          .setRequired(false)
      )
      .addStringOption((opt) =>
        opt
          .setName('reason')
          .setDescription('Reason for granting points')
          .setRequired(false)
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName('announce')
      .setDescription('Trigger server-wide community announcements.')
      .addSubcommand((sub) =>
        sub
          .setName('winners')
          .setDescription('Calculate and post this month\'s champion podium.')
      )
  )
  .addSubcommandGroup((group) =>
    group
      .setName('streak')
      .setDescription('Member streak management.')
      .addSubcommand((sub) =>
        sub
          .setName('reset')
          .setDescription('Reset a member\'s daily streak to 0.')
          .addUserOption((opt) =>
            opt
              .setName('user')
              .setDescription('Target member')
              .setRequired(true)
          )
      )
  );

export async function execute(interaction) {
  // Permission verification
  if (!isAdmin(interaction)) {
    return interaction.reply({
      embeds: [
        errorEmbed(
          'Access Denied',
          `You need Administrator permissions or the designated \`${config.app.adminRoleName}\` role to execute this command.`
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
  }

  const group = interaction.options.getSubcommandGroup(false);
  const sub   = interaction.options.getSubcommand();

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // ── 1. /admin stats ───────────────────────────────────────────────────────
    if (!group && sub === 'stats') {
      const stats = await getServerMemberStats();

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📊  HCC AutoEngage — Server Health & Metrics')
        .setDescription(`> Administrative overview for **${interaction.guild?.name || 'HCC Server'}**\n${HR}`)
        .addFields(
          { name: '👥  Registered Members', value: `**${stats.totalMembers}** profiles`,  inline: true },
          { name: '🔥  Active Streaks',     value: `**${stats.activeStreaks}** members`,   inline: true },
          { name: '💰  Points Circulating', value: `**${stats.totalPoints}** pts`,       inline: true },
          { name: '⭐  Total XP Earned',    value: `**${stats.totalXP}** XP`,             inline: true },
          { name: '📚  Quizzes Published',  value: `**${stats.totalQuizzes}** total`,      inline: true },
          { name: '📝  Total Submissions',  value: `**${stats.totalAttempts}** attempts`,  inline: true }
        )
        .setFooter({ text: 'HCC AutoEngage • Administrator Panel' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── 2. /admin quiz publish ────────────────────────────────────────────────
    if (group === 'quiz' && sub === 'publish') {
      const channelId = config.discord.channels.quiz || interaction.channelId;
      const questionId = interaction.options.getString('question_id');

      let qData = null;
      if (questionId) {
        qData = QUESTION_BANK.find((q) => q.id.toLowerCase() === questionId.toLowerCase());
        if (!qData) {
          return interaction.editReply({
            embeds: [errorEmbed('Question Not Found', `No question with ID \`${questionId}\` found in question bank.`)],
          });
        }
      }

      const result = await publishDailyQuiz({
        client: interaction.client,
        channelId,
        questionData: qData,
      });

      await logActivity('admin_quiz_publish', interaction.user.id, {
        quizId: result.quiz.id,
        channelId,
      });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Quiz Published Successfully',
            `Quiz **${result.quiz.title}** is now active in <#${channelId}>!`
          ),
        ],
      });
    }

    // ── 3. /admin quiz close ──────────────────────────────────────────────────
    if (group === 'quiz' && sub === 'close') {
      const active = await getActiveQuiz();
      if (!active) {
        return interaction.editReply({
          embeds: [errorEmbed('No Active Quiz', 'There is currently no active quiz to close.')],
        });
      }

      await closeQuiz(active.id);
      await logActivity('admin_quiz_close', interaction.user.id, { quizId: active.id });

      return interaction.editReply({
        embeds: [successEmbed('Quiz Closed', `Active quiz **${active.title}** has been closed.`)],
      });
    }

    // ── 4. /admin points grant ────────────────────────────────────────────────
    if (!group && sub === 'points') {
      const targetUser = interaction.options.getUser('user', true);
      const amount     = interaction.options.getInteger('amount', true);
      const xpAmount   = interaction.options.getInteger('xp') ?? (amount * 2);
      const reason     = interaction.options.getString('reason') ?? 'Admin adjustment';

      // Ensure member exists
      await upsertMember({
        discordId: targetUser.id,
        username: targetUser.username,
        avatarUrl: targetUser.displayAvatarURL(),
      });

      const updated = await updateMemberPoints(
        targetUser.id,
        amount,
        xpAmount,
        `admin:${reason}`,
        null,
        interaction.user.id
      );

      await logActivity('admin_points_grant', interaction.user.id, {
        targetDiscordId: targetUser.id,
        points: amount,
        xp: xpAmount,
        reason,
      });

      const embed = new EmbedBuilder()
        .setColor(amount >= 0 ? COLORS.success : COLORS.warning)
        .setTitle('✅  Points & XP Adjusted')
        .setDescription(
          `Successfully updated balance for <@${targetUser.id}>!\n${HR}\n\n` +
          `• **Points Delta:** \`${amount >= 0 ? `+${amount}` : amount} pts\`\n` +
          `• **XP Delta:** \`${xpAmount >= 0 ? `+${xpAmount}` : xpAmount} XP\`\n` +
          `• **New Balance:** **${updated.total_points}** pts  ·  **${updated.total_xp}** XP (Level ${updated.level})\n` +
          `• **Reason:** _${reason}_\n` +
          `• **Authorized By:** <@${interaction.user.id}>`
        )
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    }

    // ── 5. /admin announce winners ────────────────────────────────────────────
    if (group === 'announce' && sub === 'winners') {
      const result = await runMonthlyWinnerJob(interaction.client);

      if (!result.success) {
        return interaction.editReply({
          embeds: [errorEmbed('Announcement Failed', result.error || 'Could not process winners.')],
        });
      }

      await logActivity('admin_announce_winners', interaction.user.id, {
        winnersCount: result.winners?.length || 0,
      });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Winners Announced',
            `Successfully computed standings and crowned **${result.winners?.length || 0}** champions!`
          ),
        ],
      });
    }

    // ── 6. /admin streak reset ────────────────────────────────────────────────
    if (group === 'streak' && sub === 'reset') {
      const targetUser = interaction.options.getUser('user', true);
      const member = await getMemberByDiscordId(targetUser.id);

      if (!member) {
        return interaction.editReply({
          embeds: [errorEmbed('Member Not Found', `No profile found for <@${targetUser.id}>.`)],
        });
      }

      await resetMemberStreak(targetUser.id);
      await logActivity('admin_streak_reset', interaction.user.id, { targetDiscordId: targetUser.id });

      return interaction.editReply({
        embeds: [
          successEmbed(
            'Streak Reset',
            `Daily streak for <@${targetUser.id}> has been reset to **0 days** (Max streak of ${member.streak_max} preserved).`
          ),
        ],
      });
    }

    return interaction.editReply({ content: 'Unknown admin subcommand.' });
  } catch (err) {
    logger.error('Error executing admin command', { group, sub, error: err.message, stack: err.stack });
    return interaction.editReply({
      embeds: [errorEmbed('Command Error', `An error occurred: \`${err.message}\``)],
    });
  }
}

