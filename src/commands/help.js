/**
 * src/commands/help.js
 * /help – Lists all available commands with descriptions.
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../utils/embeds.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show all available HCC AutoEngage commands and how to use them.');

const COMMAND_GROUPS = [
  {
    name: '🤖 General',
    commands: [
      { name: '/ping',  desc: 'Check bot status and measure latency.' },
      { name: '/help',  desc: 'Display this help message.' },
    ],
  },
  {
    name: '📚 Quiz & Learning  *(Active)*',
    commands: [
      { name: '/quiz today', desc: "View today's active quiz challenge." },
      { name: '/quiz stats', desc: 'View your quiz accuracy, completed count, and daily streak.' },
    ],
  },
  {
    name: '🏆 Points & Leaderboard  *(Active)*',
    commands: [
      { name: '/leaderboard weekly',  desc: 'Top 10 members by points earned in the last 7 days.' },
      { name: '/leaderboard monthly', desc: 'Top 10 members by points earned this calendar month.' },
      { name: '/leaderboard alltime', desc: 'Top 10 members by all-time total points.' },
      { name: '/profile',             desc: 'Your XP, level, points, streaks, and achievement badges.' },
      { name: '/profile @user',       desc: 'View another member\'s profile.' },
    ],
  },
  {
    name: '🛠️ Admin  *(Restricted)*',
    commands: [
      { name: '/admin stats',                 desc: 'View server health and quiz engagement metrics.' },
      { name: '/admin quiz publish',         desc: 'Publish a daily quiz to the quiz channel.' },
      { name: '/admin quiz close',           desc: 'Close the currently active quiz.' },
      { name: '/admin points grant',         desc: 'Grant or adjust points/XP for a member.' },
      { name: '/admin announce winners',     desc: 'Crown monthly champions and announce results.' },
      { name: '/admin streak reset',         desc: 'Reset a member\'s daily streak.' },
    ],
  },
];

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('📖 HCC AutoEngage – Command Reference')
    .setDescription(
      'Welcome to **HCC AutoEngage**, the HackerRank Campus Crew engagement bot!\n' +
      'Participate in daily quizzes, earn XP, and climb the leaderboard.\n\u200b'
    )
    .setTimestamp()
    .setFooter({ text: 'HCC AutoEngage • More features arriving soon!' });

  for (const group of COMMAND_GROUPS) {
    const value = group.commands
      .map((c) => `\`${c.name}\` — ${c.desc}`)
      .join('\n');
    embed.addFields({ name: group.name, value, inline: false });
  }

  await interaction.reply({ embeds: [embed] });
}
