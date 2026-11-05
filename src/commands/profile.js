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

// ─── Constants ────────────────────────────────────────────────────────────────

const HR = '┄'.repeat(28);

// ─── Level curve: level = 1 + floor(sqrt(XP / 50)) ──────────────────────────

function computeLevel(xp) {
  return 1 + Math.floor(Math.sqrt((xp || 0) / 50));
}

function xpForLevel(level) {
  return (level - 1) ** 2 * 50;
}

// ─── Visual helpers ───────────────────────────────────────────────────────────

/**
 * 12-segment smooth XP progress bar.
 * Uses a gradient feel: filled=🟩, partial="🟨" at boundary, empty=⬛
 */
function xpProgressBar(current, total) {
  const SEGMENTS = 12;
  if (total === 0) return '🟩'.repeat(SEGMENTS);
  const pct    = Math.min(1, current / total);
  const filled = Math.floor(pct * SEGMENTS);
  const frac   = (pct * SEGMENTS) - filled;

  let bar = '🟩'.repeat(filled);
  if (filled < SEGMENTS) {
    bar += frac >= 0.5 ? '🟨' : '⬛'; // mid-segment indicator
    bar += '⬛'.repeat(SEGMENTS - filled - 1);
  }
  return bar;
}

/** Level tier badge and color accent. */
function levelTier(level) {
  if (level >= 10) return { badge: '💎', title: 'Diamond', color: 0x00BFFF };
  if (level >= 7)  return { badge: '🔮', title: 'Master',  color: 0x9B59B6 };
  if (level >= 5)  return { badge: '⚡', title: 'Expert',  color: 0xF39C12 };
  if (level >= 3)  return { badge: '🌟', title: 'Rising',  color: 0x2ECC71 };
  if (level >= 2)  return { badge: '✨', title: 'Learner', color: COLORS.primary };
  return             { badge: '🌱', title: 'Rookie',  color: COLORS.info };
}

/** Win-rate ring (ASCII arc). */
function winRateRing(pct) {
  if (pct >= 80) return '🏆';
  if (pct >= 60) return '🎯';
  if (pct >= 40) return '📈';
  if (pct >= 20) return '📊';
  return '📉';
}

/** Streak label with intensity scaling. */
function streakLabel(streak) {
  if (streak >= 30) return `🔥🔥🔥  **${streak} days** — LEGENDARY`;
  if (streak >= 14) return `🔥🔥  **${streak} days** — On Fire!`;
  if (streak >= 7)  return `🔥  **${streak} days** — Unstoppable`;
  if (streak >= 3)  return `🔥  **${streak} days** — Building Up`;
  if (streak >= 1)  return `🔥  **${streak} day${streak !== 1 ? 's' : ''}**`;
  return '—  *No active streak*';
}

// ─── Achievement definitions ──────────────────────────────────────────────────

const ACHIEVEMENTS = [
  {
    emoji: '🎯',
    label: 'First Blood',
    hint: 'Complete your first quiz',
    earned: (m) => (m.quizzes_completed ?? 0) >= 1,
  },
  {
    emoji: '📅',
    label: 'Consistent',
    hint: 'Complete 5 quizzes',
    earned: (m) => (m.quizzes_completed ?? 0) >= 5,
  },
  {
    emoji: '🧠',
    label: 'Quiz Master',
    hint: 'Win 10 quizzes',
    earned: (m) => (m.quizzes_won ?? 0) >= 10,
  },
  {
    emoji: '🔥',
    label: 'On Fire',
    hint: '3-day streak',
    earned: (m) => (m.streak_current ?? 0) >= 3,
  },
  {
    emoji: '⚡',
    label: 'Unstoppable',
    hint: '7-day streak',
    earned: (m) => (m.streak_current ?? 0) >= 7,
  },
  {
    emoji: '🌟',
    label: 'Century Club',
    hint: 'Earn 100+ total XP',
    earned: (m) => (m.total_xp ?? 0) >= 100,
  },
  {
    emoji: '🏆',
    label: 'Points Elite',
    hint: 'Reach 100+ total points',
    earned: (m) => (m.total_points ?? 0) >= 100,
  },
  {
    emoji: '💎',
    label: 'Elite Scholar',
    hint: 'Reach Level 5',
    earned: (m) => (m.level ?? 1) >= 5,
  },
];

// ─── Badge grid renderer ──────────────────────────────────────────────────────

/**
 * Renders unlocked achievements as a 2-column inline grid:
 *   🎯 First Blood    ⚡ Unstoppable
 *   🔥 On Fire        🌟 Century Club
 *
 * Locked badges are shown as a compact locked line at the bottom.
 */
function renderAchievements(member) {
  const earned    = ACHIEVEMENTS.filter((a) => a.earned(member));
  const locked    = ACHIEVEMENTS.filter((a) => !a.earned(member));

  if (earned.length === 0) {
    return {
      earnedSection: `*No badges yet — complete your first quiz to start!*`,
      lockedSection: locked.map((a) => `🔒 ~~**${a.label}**~~  _${a.hint}_`).join('\n'),
      count: 0,
    };
  }

  // Grid: 2 columns per row
  const rows = [];
  for (let i = 0; i < earned.length; i += 2) {
    const left  = earned[i];
    const right = earned[i + 1];
    const leftStr  = `${left.emoji}  **${left.label}**`;
    const rightStr = right ? `${right.emoji}  **${right.label}**` : '';
    rows.push(`${leftStr.padEnd(22)}${rightStr}`);
  }

  const earnedSection = rows.join('\n');
  const lockedSection = locked.length > 0
    ? locked.map((a) => `🔒  ~~${a.label}~~  —  _${a.hint}_`).join('\n')
    : '🎊  *All badges unlocked — you\'re a legend!*';

  return { earnedSection, lockedSection, count: earned.length };
}

// ─── Main command ──────────────────────────────────────────────────────────────

export async function execute(interaction) {
  await interaction.deferReply();

  const targetUser = interaction.options.getUser('user') ?? interaction.user;
  const discordId  = targetUser.id;
  const username   = targetUser.username;

  try {
    let member = await getMemberByDiscordId(discordId);

    if (!member) {
      member = await upsertMember({
        discordId,
        username,
        discriminator: targetUser.discriminator ?? '0',
        avatarUrl: targetUser.displayAvatarURL({ size: 256 }) ?? null,
      });
    }

    if (!member) {
      await interaction.editReply({
        embeds: [errorEmbed('Profile Not Found', `No profile found for **${username}**. Play a quiz first!`)],
      });
      return;
    }

    // ── Computed stats ────────────────────────────────────────────────────────
    const level       = computeLevel(member.total_xp ?? 0);
    const thisLvlXP   = xpForLevel(level);
    const nextLvlXP   = xpForLevel(level + 1);
    const xpIntoLevel = (member.total_xp ?? 0) - thisLvlXP;
    const xpSpan      = nextLvlXP - thisLvlXP;
    const bar         = xpProgressBar(xpIntoLevel, xpSpan);
    const tier        = levelTier(level);

    const completed   = member.quizzes_completed ?? 0;
    const won         = member.quizzes_won        ?? 0;
    const winPct      = completed > 0 ? Math.round((won / completed) * 100) : 0;
    const ring        = winRateRing(winPct);
    const streak      = member.streak_current ?? 0;
    const streakMax   = member.streak_max     ?? 0;

    const isSelf      = targetUser.id === interaction.user.id;
    const { earnedSection, lockedSection, count: badgeCount } = renderAchievements(member);

    const memberSince = new Date(member.created_at ?? Date.now()).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });

    // ── Embed ─────────────────────────────────────────────────────────────────
    const embed = new EmbedBuilder()
      .setColor(tier.color)
      .setTitle(`${tier.badge}  ${member.username}  ·  ${tier.title}`)
      .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
      .setDescription(
        `> ${isSelf ? '**Your** HackerRank Campus Crew profile' : `**${member.username}**'s HCC profile`}\n${HR}`
      )
      .addFields(
        // ── XP & Level block ────────────────────────────────────────────────
        {
          name: `⚡  Level ${level}  ${tier.badge}  —  ${tier.title}`,
          value: [
            `${bar}`,
            `\`${xpIntoLevel} / ${xpSpan} XP\`  to Level **${level + 1}**`,
            `Total XP: **${member.total_xp ?? 0}**`,
          ].join('\n'),
          inline: false,
        },
        // ── Three-column stats row ───────────────────────────────────────────
        {
          name: '💰  Total Points',
          value: `**${member.total_points ?? 0}** pts`,
          inline: true,
        },
        {
          name: `${ring}  Win Rate`,
          value: `**${winPct}%**\n${won}/${completed} wins`,
          inline: true,
        },
        {
          name: `${streakLabel(streak).split('  ')[0]}  Streak`,
          value: `Current: **${streak}** day${streak !== 1 ? 's' : ''}\nBest: **${streakMax}** days`,
          inline: true,
        },
        // ── Divider ──────────────────────────────────────────────────────────
        {
          name: '\u200b',
          value: HR,
          inline: false,
        },
        // ── Achievement badges ───────────────────────────────────────────────
        {
          name: `🏅  Badges  ·  ${badgeCount} / ${ACHIEVEMENTS.length} unlocked`,
          value: earnedSection,
          inline: false,
        },
        {
          name: '🔒  Locked',
          value: lockedSection,
          inline: false,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `HCC AutoEngage • HackerRank Campus Crew  │  Member since ${memberSince}`,
      });

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    logger.error('Error in /profile command', { discordId, error: err.message });
    await interaction.editReply({
      embeds: [errorEmbed('Profile Error', 'Could not load the profile right now. Please try again later.')],
    });
  }
}
