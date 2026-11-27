/**
 * src/commands/learning.js
 * Slash command: /learning progress (all members), /learning admin-drop (admins only)
 */

import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ChannelType,
} from 'discord.js';
import {
  buildMorningAnnouncementPayload,
  buildPersonalProgressEmbed,
  getGitProgrammeQuestionBank,
} from '../services/learning/gitLearningManager.js';
import { getMemberByDiscordId } from '../database/queries/members.js';
import { runDailyTimedSession } from '../services/quiz/dailyTimedSessionEngine.js';
import { errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

export const data = new SlashCommandBuilder()
  .setName('learning')
  .setDescription('HCC 15-Day Git & GitHub Learning Programme.')
  .addSubcommand((sub) =>
    sub
      .setName('progress')
      .setDescription('View your personal 15-day Git & GitHub progress, practical tasks, and quiz scores.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('admin-drop')
      .setDescription('[Admin] Manually trigger a morning learning card or launch evening quiz for testing.')
      .addIntegerOption((opt) =>
        opt
          .setName('day')
          .setDescription('Programme day number (1–15)')
          .setMinValue(1)
          .setMaxValue(15)
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName('action')
          .setDescription('Action to trigger')
          .setRequired(true)
          .addChoices(
            { name: '📢 Morning Announcement & Resources', value: 'morning' },
            { name: '🧠 Evening 10-Question Timed Quiz', value: 'quiz' }
          )
      )
      .addChannelOption((opt) =>
        opt
          .setName('channel')
          .setDescription('Target Discord channel (defaults to test channel or quiz channel)')
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(false)
      )
      .addBooleanOption((opt) =>
        opt
          .setName('ping-everyone')
          .setDescription('Whether to ping @everyone (defaults to false for safety)')
          .setRequired(false)
      )
  );

export async function execute(interaction) {
  const subcommand = interaction.options.getSubcommand();

  // ── /learning progress ──────────────────────────────────────────────────────
  if (subcommand === 'progress') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      const member = await getMemberByDiscordId(interaction.user.id);
      const embed = await buildPersonalProgressEmbed(member, interaction.user.id);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error rendering /learning progress', { error: err.message });
      return interaction.editReply({
        embeds: [errorEmbed('Progress Error', 'Could not load your progress tracker right now.')],
      });
    }
  }

  // ── /learning admin-drop ────────────────────────────────────────────────────
  if (subcommand === 'admin-drop') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) &&
        !interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        embeds: [errorEmbed('Permission Denied', 'Only server administrators can use this command.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const day = interaction.options.getInteger('day');
    const action = interaction.options.getString('action');
    const channel = interaction.options.getChannel('channel') ||
                    (await interaction.client.channels.fetch(config.discord.channels.test).catch(() => null)) ||
                    interaction.channel;
    const pingEveryone = interaction.options.getBoolean('ping-everyone') ?? false;

    if (!channel) {
      return interaction.editReply({
        embeds: [errorEmbed('Channel Error', 'Could not resolve target channel.')],
      });
    }

    try {
      if (action === 'morning') {
        const payload = buildMorningAnnouncementPayload(day);
        if (!pingEveryone) {
          payload.content = payload.content.replace('@everyone', '**[Test Mode — Ping Suppressed]**');
        }

        const sentMsg = await channel.send({
          ...payload,
          allowedMentions: pingEveryone ? { parse: ['everyone'] } : { parse: [] },
        });

        return interaction.editReply({
          embeds: [successEmbed('Morning Announcement Published', `Published Day ${day} announcement in <#${channel.id}>! [Jump to Message](${sentMsg.url})`)],
        });
      }

      if (action === 'quiz') {
        const questionBank = getGitProgrammeQuestionBank(day);

        interaction.editReply({
          embeds: [successEmbed('Launching Git Evening Quiz', `Starting 10-Question timed quiz session for **Day ${day}: ${questionBank.meta.topic}** in <#${channel.id}>!\nAll points and XP will update the existing leaderboard.`)],
        });

        // Launch timed session asynchronously
        runDailyTimedSession({
          client: interaction.client,
          channelId: channel.id,
          suppressEveryonePing: !pingEveryone,
          questionBankOverride: questionBank,
          customAnnouncementText: pingEveryone
            ? `📢 **@everyone — The Evening Git & GitHub Quiz (Day ${day}: ${questionBank.meta.topic}) is starting in 30 seconds!**\nGet ready for 10 questions (15s per question) to climb the community leaderboard! ⚡`
            : `📢 **[Test Mode] Evening Git & GitHub Quiz (Day ${day}: ${questionBank.meta.topic}) is starting in 30 seconds!**\n10 questions (15s per question) — points & XP update existing leaderboard:`,
        }).catch((sessionErr) => {
          logger.error('Failed to run git quiz session from admin-drop', { error: sessionErr.message, day });
        });
      }
    } catch (err) {
      logger.error('Failed executing /learning admin-drop', { error: err.message, day, action });
      return interaction.editReply({
        embeds: [errorEmbed('Execution Failed', `An error occurred: \`${err.message}\``)],
      });
    }
  }
}
