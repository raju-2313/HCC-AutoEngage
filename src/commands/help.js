/**
 * src/commands/help.js
 * /help – Lists all available commands with descriptions.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
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
    name: '🏆 Leaderboard & Community Rankings',
    commands: [
      { name: '/leaderboard',         desc: 'View the unified HCC community leaderboard (Learning, Discussions, Voice, Reactions, and Contributions).' },
      { name: '/leaderboard [timeframe]', desc: 'Switch directly between Weekly, Monthly, or All-Time standings.' },
      { name: '/engagement me',       desc: 'Your 30-day personal engagement scorecard & category breakdown.' },
      { name: '/engagement thank',    desc: 'Acknowledge and thank a peer for helpful contributions (+5 pts).' },
    ],
  },
  {
    name: '👤 Profile & Stats',
    commands: [
      { name: '/profile',             desc: 'Your XP, level, points, streaks, and achievement badges.' },
      { name: '/profile @user',       desc: 'View another member\'s profile.' },
    ],
  },
  {
    name: '🎨 Sticker Discovery & Moderation',
    commands: [
      { name: '/sticker slots',               desc: 'View server sticker capacity, used slots, and free slots.' },
      { name: '/sticker list',                desc: 'List all custom stickers installed on this server.' },
      { name: '/sticker discover [limit]',    desc: 'Scan for new trending Gen Z developer & college stickers (Admin).' },
      { name: '/sticker review',              desc: 'Interactive administrator queue to review and approve stickers (Admin).' },
      { name: '/sticker approve [id|pack]',   desc: 'Approve selected candidate or pack and upload to Discord (Admin).' },
      { name: '/sticker reject [id|pack]',    desc: 'Reject selected candidate or pack with reason (Admin).' },
      { name: '/sticker scan',                desc: 'Re-run content safety and licensing checks on pending candidates (Admin).' },
    ],
  },
  {
    name: '😀 Custom Emoji Discovery & Management',
    commands: [
      { name: '/emoji slots',                 desc: 'View server emoji capacity (50 static/animated), used, and remaining slots.' },
      { name: '/emoji list',                  desc: 'List all custom emojis installed on this server.' },
      { name: '/emoji discover [limit]',      desc: 'Scan 50 popular, non-vulgar Gen Z and tech emojis (Admin).' },
      { name: '/emoji review',                desc: 'Interactive administrator queue to review and approve emojis (Admin).' },
      { name: '/emoji approve [id|pack]',     desc: 'Approve selected emoji candidate or pack and upload to Discord (Admin).' },
      { name: '/emoji reject [id|pack]',      desc: 'Reject selected emoji candidate or pack with reason (Admin).' },
      { name: '/emoji scan',                  desc: 'Re-run safety and licensing checks on pending emoji candidates (Admin).' },
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
      { name: '/admin purge [amount]',       desc: 'Delete bot messages in this channel (1–100, default 50).' },
      { name: '/purge [amount]',             desc: 'Shortcut to delete bot messages in this channel (1–100, default 50).' },
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

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
