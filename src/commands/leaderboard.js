/**
 * src/commands/leaderboard.js
 * /leaderboard – Weekly, monthly, and all-time rankings.
 */

import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  buildWeeklyLeaderboardEmbed,
  buildMonthlyLeaderboardEmbed,
  buildAlltimeLeaderboardEmbed,
} from '../services/recognition/leaderboardService.js';
import { errorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('leaderboard')
  .setDescription('View the HCC quiz leaderboard rankings.')
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

  try {
    let embed;

    if (sub === 'weekly') {
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

