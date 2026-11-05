/**
 * src/commands/engagement.js
 * Community engagement profiles, activity breakdowns, and peer recognition.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { buildMemberEngagementCard } from '../services/recognition/engagementScoringService.js';
import { awardCommunityContribution } from '../database/queries/engagement.js';
import { COLORS, errorEmbed, successEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('engagement')
  .setDescription('HCC Community engagement metrics, personal scores, and peer recognition.')
  .addSubcommand((sub) =>
    sub
      .setName('me')
      .setDescription('View your 30-day community engagement breakdown.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('stats')
      .setDescription('View engagement statistics for another community member.')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('The member to view')
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('thank')
      .setDescription('Acknowledge a peer for helping or sharing a useful resource (+5 pts).')
      .addUserOption((opt) =>
        opt
          .setName('user')
          .setDescription('The member who helped you')
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName('reason')
          .setDescription('What did they help you with?')
          .setRequired(true)
      )
  );

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  // ── /engagement me ───────────────────────────────────────────────────────────
  if (sub === 'me') {
    await interaction.deferReply();
    try {
      const embed = await buildMemberEngagementCard(interaction.user);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /engagement me', { error: err.message });
      return interaction.editReply({
        embeds: [errorEmbed('Profile Error', 'Could not load your engagement scorecard. Please try again.')],
      });
    }
  }

  // ── /engagement stats [user] ─────────────────────────────────────────────────
  if (sub === 'stats') {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('user', true);
    try {
      const embed = await buildMemberEngagementCard(targetUser);
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Error in /engagement stats', { error: err.message });
      return interaction.editReply({
        embeds: [errorEmbed('Profile Error', `Could not load stats for ${targetUser.username}.`)],
      });
    }
  }

  // ── /engagement thank <user> <reason> ────────────────────────────────────────
  if (sub === 'thank') {
    await interaction.deferReply();
    const targetUser = interaction.options.getUser('user', true);
    const reason     = interaction.options.getString('reason', true);

    if (targetUser.id === interaction.user.id) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Action', 'You cannot thank yourself! Peer recognition is meant for acknowledging others.')],
      });
    }

    if (targetUser.bot) {
      return interaction.editReply({
        embeds: [errorEmbed('Invalid Action', 'Bots do not participate in community recognition.')],
      });
    }

    try {
      await awardCommunityContribution({
        recipientDiscordId: targetUser.id,
        recipientUsername: targetUser.username,
        giverDiscordId: interaction.user.id,
        type: 'peer_thanks',
        points: 5.0,
        reason,
        channelId: interaction.channelId,
      });

      const embed = new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle('🤝  Peer Recognition Recorded!')
        .setDescription(
          `**Thank you!** <@${interaction.user.id}> recognized <@${targetUser.id}> for their contribution.\n\n` +
          `• **Awarded:** **+5 Community Points** & **+10 XP**\n` +
          `• **Reason:** _${reason}_\n\n` +
          `_Peer acknowledgments encourage helping others and sharing knowledge!_`
        )
        .setFooter({ text: 'HCC AutoEngage • Peer Recognition (1 per friend per 24h limit)' })
        .setTimestamp();

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      if (err.message.includes('COOLDOWN_ACTIVE')) {
        return interaction.editReply({
          embeds: [errorEmbed('Cooldown Active', 'You have already thanked this member in the last 24 hours. Spread the love to other peers!')],
        });
      }

      logger.error('Error in /engagement thank', { error: err.message });
      return interaction.editReply({
        embeds: [errorEmbed('Recognition Failed', err.message || 'An error occurred while recording peer recognition.')],
      });
    }
  }
}

