/**
 * src/services/recognition/leaderboardService.js
 * Builds leaderboard embeds, computes monthly winners, and manages snapshots.
 */

import { EmbedBuilder } from 'discord.js';
import { supabaseAdmin } from '../../database/client.js';
import { getTopMembersByPoints, saveLeaderboardSnapshot, recordMonthlyReward } from '../../database/queries/leaderboard.js';
import { COLORS } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns medal emoji for rank 1-3, numbered string for 4+. */
function rankLabel(index) {
  return ['🥇', '🥈', '🥉'][index] ?? `${index + 1}.`;
}

/** Formats a number with leading sign (e.g. +120, -5). */
function signed(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

/** Returns level badge emoji based on level. */
function levelBadge(level) {
  if (level >= 10) return '💎';
  if (level >= 7)  return '🔮';
  if (level >= 5)  return '⚡';
  if (level >= 3)  return '🌟';
  if (level >= 2)  return '✨';
  return '🌱';
}

/** ISO week string like 2026-W45. */
function currentISOWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86_400_000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

/** Start of current calendar month as ISO timestamp. */
function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

/** YYYY-MM label for current month. */
function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Shared embed footer ─────────────────────────────────────────────────────

function leaderboardFooter(count, period) {
  return `HCC AutoEngage • HackerRank Campus Crew | ${count} participant${count !== 1 ? 's' : ''} | ${period}`;
}

// ─── Weekly Leaderboard ───────────────────────────────────────────────────────

/**
 * Calls the get_leaderboard_standings RPC for the last 7 days and returns
 * a rich embed with the top 10 members.
 */
export async function buildWeeklyLeaderboardEmbed() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin.rpc('get_leaderboard_standings', {
    p_since: since,
    p_limit: 10,
  });

  if (error) {
    logger.error('Error fetching weekly leaderboard', { error: error.message });
    throw error;
  }

  const rows = data || [];

  const embed = new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle('📊 Weekly Leaderboard — Top 10')
    .setDescription(rows.length === 0
      ? '*No quiz activity this week yet. Play a quiz to get on the board!*'
      : rows.map((m, i) =>
          `${rankLabel(i)} ${levelBadge(m.level ?? 1)} **${m.username}** — ${signed(m.total_points)} pts \\| Lv ${m.level ?? 1}`
        ).join('\n')
    )
    .setTimestamp()
    .setFooter({ text: leaderboardFooter(rows.length, 'Last 7 days') });

  return embed;
}

// ─── Monthly Leaderboard ──────────────────────────────────────────────────────

/**
 * Calls the get_leaderboard_standings RPC from the start of the current month.
 */
export async function buildMonthlyLeaderboardEmbed() {
  const since = startOfCurrentMonth();
  const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const { data, error } = await supabaseAdmin.rpc('get_leaderboard_standings', {
    p_since: since,
    p_limit: 10,
  });

  if (error) {
    logger.error('Error fetching monthly leaderboard', { error: error.message });
    throw error;
  }

  const rows = data || [];

  const embed = new EmbedBuilder()
    .setColor(COLORS.info)
    .setTitle(`📅 Monthly Leaderboard — ${monthLabel}`)
    .setDescription(rows.length === 0
      ? '*No quiz activity this month yet. Play a quiz to get on the board!*'
      : rows.map((m, i) =>
          `${rankLabel(i)} ${levelBadge(m.level ?? 1)} **${m.username}** — ${signed(m.total_points)} pts \\| Lv ${m.level ?? 1}`
        ).join('\n')
    )
    .setTimestamp()
    .setFooter({ text: leaderboardFooter(rows.length, monthLabel) });

  return embed;
}

// ─── All-Time Leaderboard ─────────────────────────────────────────────────────

/**
 * Queries members table directly for all-time top 10 by total_points.
 */
export async function buildAlltimeLeaderboardEmbed() {
  const members = await getTopMembersByPoints(10);

  const embed = new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle('🏆 All-Time Leaderboard — Top 10')
    .setDescription(members.length === 0
      ? '*No members yet. Play a quiz to get started!*'
      : members.map((m, i) =>
          `${rankLabel(i)} ${levelBadge(m.level ?? 1)} **${m.username}** — ${m.total_points} pts \\| ${m.total_xp} XP \\| Lv ${m.level ?? 1}`
        ).join('\n')
    )
    .setTimestamp()
    .setFooter({ text: leaderboardFooter(members.length, 'All time') });

  return embed;
}

// ─── Monthly Winner Computation ───────────────────────────────────────────────

const REWARD_TITLES = {
  1: '🥇 Monthly Champion',
  2: '🥈 Monthly Runner-Up',
  3: '🥉 Monthly Third Place',
};

/**
 * Computes top 3 from the monthly standings, writes them to monthly_rewards,
 * and returns the winners array for announcement.
 */
export async function computeMonthlyWinners() {
  const since = startOfCurrentMonth();
  const monthYear = currentMonthYear();

  const { data, error } = await supabaseAdmin.rpc('get_leaderboard_standings', {
    p_since: since,
    p_limit: 3,
  });

  if (error) {
    logger.error('Error computing monthly winners', { error: error.message });
    throw error;
  }

  const winners = data || [];
  const saved = [];

  for (let i = 0; i < winners.length; i++) {
    const w = winners[i];
    const rank = i + 1;
    try {
      const reward = await recordMonthlyReward({
        monthYear,
        memberId: w.id,
        discordId: w.discord_id,
        rank,
        rewardTitle: REWARD_TITLES[rank] ?? `Rank ${rank}`,
        rewardDetails: { total_points: w.total_points, total_xp: w.total_xp, level: w.level },
      });
      saved.push({ ...w, rank, reward });
    } catch (err) {
      // Duplicate entry for this month/rank — skip gracefully
      logger.warn('Monthly reward already recorded or insert error', { monthYear, rank, error: err.message });
      saved.push({ ...w, rank });
    }
  }

  logger.info('Monthly winners computed', { monthYear, count: saved.length });
  return saved;
}

// ─── Monthly Winner Announcement Embed ───────────────────────────────────────

/**
 * Builds a rich announcement embed from a computeMonthlyWinners() result.
 */
export function buildMonthlyWinnerAnnouncement(winners) {
  const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const lines = winners.map((w) =>
    `${rankLabel(w.rank - 1)} **${w.username}** — ${w.total_points} pts | ${w.total_xp} XP | Lv ${w.level ?? 1}`
  );

  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setTitle(`🎉 ${monthLabel} — Monthly Winners Announced!`)
    .setDescription(
      `Congratulations to this month's top performers in the HCC Quiz League!\n\n` +
      lines.join('\n') +
      `\n\n*Keep playing daily quizzes to climb the leaderboard next month!*`
    )
    .setTimestamp()
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew | Monthly Recognition' });
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

/**
 * Saves a snapshot of current all-time standings to leaderboard_snapshots.
 * @param {string} periodType  - e.g. 'weekly' | 'monthly' | 'alltime'
 * @param {string} [periodIdentifier] - e.g. '2026-W45' | '2026-11' (auto-computed if omitted)
 */
export async function takeLeaderboardSnapshot(periodType = 'weekly', periodIdentifier = null) {
  const identifier = periodIdentifier ?? (periodType === 'monthly' ? currentMonthYear() : currentISOWeek());
  const members = await getTopMembersByPoints(10);

  const snapshot = await saveLeaderboardSnapshot({
    periodType,
    periodIdentifier: identifier,
    entries: members,
  });

  logger.info('Leaderboard snapshot saved', { periodType, identifier, count: members.length });
  return snapshot;
}
