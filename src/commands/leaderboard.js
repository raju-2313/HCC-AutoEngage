/**
 * src/commands/leaderboard.js
 * /leaderboard – View the HCC Community Overall and Learning leaderboards.
 */

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  buildWeeklyLeaderboardEmbed,
  buildMonthlyLeaderboardEmbed,
  buildAlltimeLeaderboardEmbed,
} from '../services/recognition/leaderboardService.js';
import {
  buildOverallLeaderboardEmbed,
  buildCategoryLeaderboardEmbed,
} from '../services/recognition/engagementScoringService.js';
import { errorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View HCC community leaderboards and rankings.')
  .addSubcommand((sub) =>
    sub
      .setName('overall')
      .setDescription('Primary community engagement leaderboard (Learning + Social + Voice + Contributions).')
      .addStringOption((opt) =>
        opt
          .setName('period')
          .setDescription('Time period (default: weekly)')
          .addChoices(
            { name: 'Weekly (Last 7 Days)', value: 'weekly' },
            { name: 'Monthly (This Month)', value: 'monthly' },
            { name: 'All-Time', value: 'all_time' }
          )
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('learning')
      .setDescription('Learning & challenges leaderboard (Quizzes, DSA & XP).')
      .addStringOption((opt) =>
        opt
          .setName('period')
          .setDescription('Time period (default: weekly)')
          .addChoices(
            { name: 'Weekly', value: 'weekly' },
            { name: 'Monthly', value: 'monthly' },
            { name: 'All-Time', value: 'all_time' }
          )
          .setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName('social')
      .setDescription('Social & text channel participation rankings.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('voice')
      .setDescription('Voice channel & study session participation rankings.')
  )
  // Backwards-compatibility subcommands
  .addSubcommand((sub) =>
    sub
      .setName('weekly')
      .setDescription('Top 10 members by points earned in the last 7 days.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('monthly')
      .setDescription('Top 10 members by points earned this calendar month.')
  )
  .addSubcommand((sub) =>
    sub
      .setName('alltime')
      .setDescription('Top 10 members by all-time total points.')
  );

export async function execute(interaction) {
  await interaction.deferReply();

  const sub = interaction.options.getSubcommand();
  const period = interaction.options.getString('period') || 'weekly';

  try {
    let embed;

    if (sub === 'overall') {
      embed = await buildOverallLeaderboardEmbed(period);
    } else if (sub === 'learning') {
      if (period === 'monthly') {
        embed = await buildMonthlyLeaderboardEmbed();
      } else if (period === 'all_time') {
        embed = await buildAlltimeLeaderboardEmbed();
      } else {
        embed = await buildWeeklyLeaderboardEmbed();
      }
    } else if (sub === 'social') {
      embed = await buildCategoryLeaderboardEmbed('social', period);
    } else if (sub === 'voice') {
      embed = await buildCategoryLeaderboardEmbed('voice', period);
    } else if (sub === 'weekly') {
      embed = await buildWeeklyLeaderboardEmbed();
    } else if (sub === 'monthly') {
      embed = await buildMonthlyLeaderboardEmbed();
    } else if (sub === 'alltime') {
      embed = await buildAlltimeLeaderboardEmbed();
    } else {
      await interaction.editReply({ content: 'Unknown subcommand.', flags: MessageFlags.Ephemeral });
      return;
    }

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    logger.error('Error in /leaderboard command', { sub, error: err.message });
    await interaction.editReply({
      embeds: [errorEmbed('Leaderboard Unavailable', 'Could not load the leaderboard right now. Please try again later.')],
    });
  }
}
