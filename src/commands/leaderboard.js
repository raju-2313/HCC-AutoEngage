/**
 * src/commands/leaderboard.js
 * Single unified /leaderboard command for the entire HCC community.
 *
 * Ranks all members across Learning (40%), Discussions (25%), Voice (15%),
 * Reactions (10%), and Contributions (10%) with interactive timeframe switching.
 */

import { SlashCommandBuilder } from 'discord.js';
import {
  buildOverallLeaderboardEmbed,
  buildLeaderboardActionRow,
} from '../services/recognition/engagementScoringService.js';
import { errorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the official HCC community engagement leaderboard.')
  .addStringOption((opt) =>
    opt
      .setName('timeframe')
      .setDescription('Timeframe for standings (default: Weekly)')
      .addChoices(
        { name: '⚡ Weekly (Last 7 Days)', value: 'weekly' },
        { name: '📅 Monthly (This Month)', value: 'monthly' },
        { name: '🏆 All-Time Hall of Fame', value: 'all_time' }
      )
      .setRequired(false)
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const timeframe = interaction.options.getString('timeframe') || 'weekly';

  try {
    const embed = await buildOverallLeaderboardEmbed(timeframe);
    const row   = buildLeaderboardActionRow(timeframe);

    await interaction.editReply({
      embeds: [embed],
      components: [row],
    });
  } catch (err) {
    logger.error('Error executing /leaderboard', { error: err.message, stack: err.stack });
    await interaction.editReply({
      embeds: [errorEmbed('Leaderboard Unavailable', 'Could not load community standings right now. Please try again later.')],
    });
  }
}
