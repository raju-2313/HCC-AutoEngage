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
    name: '🏆 Points & Leaderboard  *(coming in Phase 4)*',
    commands: [
      { name: '/leaderboard weekly',  desc: 'Weekly top-10 ranking.' },
      { name: '/leaderboard monthly', desc: 'Monthly top-10 ranking.' },
      { name: '/profile',             desc: 'Your XP, points and achievements.' },
    ],
  },
  {
    name: '🛠️ Admin  *(restricted)*',
    commands: [
      { name: '/admin quiz publish', desc: 'Publish a quiz to the quiz channel.' },
      { name: '/admin stats',        desc: 'View participation statistics.' },
      { name: '/admin announce',     desc: 'Post a winner announcement.' },
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

  await interaction.reply({ embeds: [embed], ephemeral: false });
}
