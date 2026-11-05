/**
 * src/commands/profile.js
 * /profile [user] – View a member's XP, level, points, and achievements.
 */

import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getMemberByDiscordId, upsertMember } from '../database/queries/members.js';
import { COLORS } from '../utils/embeds.js';
import { errorEmbed } from '../utils/embeds.js';
import { logger } from '../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('profile')
  .setDescription('View your HCC profile — XP, level, points, achievements, and streaks.')
  .addUserOption((opt) =>
    opt
      .setName('user')
      .setDescription('The Discord member to look up (defaults to you).')
      .setRequired(false)
  );

// ─── Level curve: level = 1 + floor(sqrt(XP / 50)) ──────────────────────────

function computeLevel(xp) {
  return 1 + Math.floor(Math.sqrt((xp || 0) / 50));
}

/** XP needed to reach a given level. */
function xpForLevel(level) {
  return (level - 1) ** 2 * 50;
}

/**
 * Builds a 10-block Unicode progress bar.
 * @param {number} current  XP above current level threshold
 * @param {number} total    XP span of current level
 */
function progressBar(current, total) {
  const pct = total === 0 ? 1 : Math.min(1, current / total);
  const filled = Math.round(pct * 10);
  return '🟩'.repeat(filled) + '⬛'.repeat(10 - filled);
}

// ─── Achievement definitions ─────────────────────────────────────────────────

const ACHIEVEMENTS = [
  {
    emoji: '🎯',
    label: 'First Blood',
    desc: 'Completed at least 1 quiz.',
    earned: (m) => (m.quizzes_completed ?? 0) >= 1,
  },
  {
    emoji: '🔥',
    label: 'On Fire',
    desc: '3-day answer streak.',
    earned: (m) => (m.streak_current ?? 0) >= 3,
  },
  {
    emoji: '⚡',
    label: 'Unstoppable',
    desc: '7-day answer streak.',
    earned: (m) => (m.streak_current ?? 0) >= 7,
  },
  {
    emoji: '🧠',
    label: 'Quiz Master',
    desc: 'Won 10 or more quizzes.',
    earned: (m) => (m.quizzes_won ?? 0) >= 10,
  },
  {
    emoji: '🌟',
    label: 'Century Club',
    desc: 'Earned 100+ total XP.',
    earned: (m) => (m.total_xp ?? 0) >= 100,
  },
  {
    emoji: '🏆',
    label: 'Points Elite',
    desc: 'Accumulated 100+ total points.',
    earned: (m) => (m.total_points ?? 0) >= 100,
  },
  {
    emoji: '📅',
    label: 'Consistent',
    desc: 'Completed 5+ quizzes.',
    earned: (m) => (m.quizzes_completed ?? 0) >= 5,
  },
  {
    emoji: '💎',
    label: 'Elite Scholar',
    desc: 'Reached level 5.',
    earned: (m) => (m.level ?? 1) >= 5,
  },
];

// ─── Level badge helper ───────────────────────────────────────────────────────

function levelBadge(level) {
  if (level >= 10) return '💎';
  if (level >= 7)  return '🔮';
  if (level >= 5)  return '⚡';
  if (level >= 3)  return '🌟';
  if (level >= 2)  return '✨';
  return '🌱';
}

// ─── Main command ─────────────────────────────────────────────────────────────

export async function execute(interaction) {
  await interaction.deferReply();

  // Determine target user
  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId = targetUser.id;
  const username  = targetUser.username;

  try {
    // Fetch or auto-create member record
    let member = await getMemberByDiscordId(discordId);

    if (!member) {
      // Auto-register on first profile lookup
      member = await upsertMember({
        discordId,
        username,
        discriminator: targetUser.discriminator ?? '0',
        avatarUrl: targetUser.displayAvatarURL({ size: 128 }) ?? null,
      });
    }

    if (!member) {
      await interaction.editReply({
        embeds: [errorEmbed('Profile Not Found', `No profile found for **${username}**. Play a quiz first!`)],
      });
      return;
    }

    // ── Level & XP progress ──────────────────────────────────────────────────
    const level       = computeLevel(member.total_xp ?? 0);
    const thisLvlXP   = xpForLevel(level);
    const nextLvlXP   = xpForLevel(level + 1);
    const xpIntoLevel = (member.total_xp ?? 0) - thisLvlXP;
    const xpSpan      = nextLvlXP - thisLvlXP;
    const bar         = progressBar(xpIntoLevel, xpSpan);

    // ── Win rate ─────────────────────────────────────────────────────────────
    const completed = member.quizzes_completed ?? 0;
    const won       = member.quizzes_won       ?? 0;
    const winRate   = completed > 0 ? ((won / completed) * 100).toFixed(1) : '0.0';

    // ── Achievements ─────────────────────────────────────────────────────────
    const earned    = ACHIEVEMENTS.filter((a) => a.earned(member));
    const notEarned = ACHIEVEMENTS.filter((a) => !a.earned(member));

    const earnedStr = earned.length > 0
      ? earned.map((a) => `${a.emoji} **${a.label}** — ${a.desc}`).join('\n')
      : '*None yet — start playing to unlock achievements!*';

    const lockedStr = notEarned.length > 0
      ? notEarned.map((a) => `🔒 ~~${a.label}~~ — ${a.desc}`).join('\n')
      : '*All achievements unlocked!* 🎊';

    // ── Embed ─────────────────────────────────────────────────────────────────
    const avatarUrl = targetUser.displayAvatarURL({ size: 128 });
    const isSelf    = targetUser.id === interaction.user.id;

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`${levelBadge(level)} ${member.username}'s HCC Profile`)
      .setThumbnail(avatarUrl)
      .setDescription(
        `> ${isSelf ? 'Your' : `**${member.username}**'s`} HackerRank Campus Crew stats`
      )
      .addFields(
        {
          name: '⚡ Level & XP',
          value: [
            `**Level ${level}** ${levelBadge(level)}`,
            `${bar}`,
            `${xpIntoLevel} / ${xpSpan} XP to Level ${level + 1}`,
            `Total XP: **${member.total_xp ?? 0}**`,
          ].join('\n'),
          inline: false,
        },
        {
          name: '💰 Points',
          value: `**${member.total_points ?? 0}** total points`,
          inline: true,
        },
        {
          name: '📚 Quiz Stats',
          value: [
            `Completed: **${completed}**`,
            `Won: **${won}** (${winRate}% win rate)`,
          ].join('\n'),
          inline: true,
        },
        {
          name: '🔥 Streak',
          value: [
            `Current: **${member.streak_current ?? 0}** days`,
            `Best: **${member.streak_max ?? 0}** days`,
          ].join('\n'),
          inline: true,
        },
        {
          name: `🏅 Achievements (${earned.length}/${ACHIEVEMENTS.length} unlocked)`,
          value: earnedStr,
          inline: false,
        },
        {
          name: '🔒 Locked',
          value: lockedStr,
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({ text: `HCC AutoEngage • HackerRank Campus Crew | Member since ${new Date(member.created_at ?? Date.now()).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}` });

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    logger.error('Error in /profile command', { discordId, error: err.message });
    await interaction.editReply({
      embeds: [errorEmbed('Profile Error', 'Could not load the profile right now. Please try again later.')],
    });
  }
}
