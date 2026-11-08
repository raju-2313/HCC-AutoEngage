/**
 * src/services/recognition/leaderboardService.js
 * Builds rich, beautifully formatted leaderboard embeds, computes monthly winners, and manages snapshots.
 */

import { EmbedBuilder } from 'discord.js';
import { supabaseAdmin } from '../../database/client.js';
import { getTopMembersByPoints, saveLeaderboardSnapshot, recordMonthlyReward } from '../../database/queries/leaderboard.js';
import { COLORS } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

// ─── Helpers & Design Constants ───────────────────────────────────────────────

const HR = '┄'.repeat(28);

const RANK_MEDALS = ['🥇', '🥈', '🥉'];

function rankLabel(index) {
  return RANK_MEDALS[index] ?? `\`#${String(index + 1).padStart(2, '0')}\``;
}

function signed(n) {
  return n >= 0 ? `+${n}` : `${n}`;
}

function levelBadge(level) {
  if (level >= 10) return '💎';
  if (level >= 7)  return '🔮';
  if (level >= 5)  return '⚡';
  if (level >= 3)  return '🌟';
  if (level >= 2)  return '✨';
  return '🌱';
}

function currentISOWeek() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - startOfYear) / 86_400_000 + startOfYear.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function currentMonthYear() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function leaderboardFooter(count, period) {
  return `HCC AutoEngage • HackerRank Campus Crew  │  ${count} participant${count !== 1 ? 's' : ''}  │  ${period}`;
}

/** Formats podium + table rows for standard leaderboard embeds */
function formatLeaderboardRows(rows, showPeriodPoints = false) {
  if (!rows || rows.length === 0) {
    return '> *No activity recorded yet for this period!*';
  }

  const maxPoints = Math.max(1, rows[0]?.period_points ?? rows[0]?.total_points ?? 1);

  return rows.map((m, i) => {
    const medal = rankLabel(i);
    const badge = levelBadge(m.level ?? 1);
    const userMention = m.discord_id ? `<@${m.discord_id}>` : `**${m.username}**`;
    const ptsValue = showPeriodPoints ? (m.period_points ?? m.total_points ?? 0) : (m.total_points ?? 0);
    const pts = signed(ptsValue);
    const xp = m.total_xp ? ` · ${m.total_xp} XP` : '';
    const bar = '█'.repeat(Math.min(8, Math.max(1, Math.round(((ptsValue) / maxPoints) * 8)))).padEnd(8, '░');

    if (i < 3) {
      // Highlight top 3 prominently with user mention
      return `${medal}  ${userMention}\n╰  \`${bar}\`  **${pts} pts**${xp}  ·  Lv ${m.level ?? 1} ${badge}`;
    }
    // Standard rows for 4-10
    return `${medal}  ${userMention} — \`${pts} pts\` · Lv ${m.level ?? 1} ${badge}`;
  }).join('\n\n');
}

// ─── Weekly Leaderboard ───────────────────────────────────────────────────────

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
    .setTitle('⚡  Weekly Leaderboard — Top 10')
    .setDescription(
      `> Top competitors ranked by points earned over the last 7 days.\n${HR}\n\n` +
      formatLeaderboardRows(rows, true) +
      `\n\n${HR}\n_Ranks reset every 7 days. Keep playing to maintain your standing!_`
    )
    .setTimestamp()
    .setFooter({ text: leaderboardFooter(rows.length, 'Last 7 Days') });

  return embed;
}

// ─── Monthly Leaderboard ──────────────────────────────────────────────────────

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
    .setColor(0x5865F2)
    .setTitle(`📅  Monthly Leaderboard — ${monthLabel}`)
    .setDescription(
      `> Current month standings for the **HCC Monthly Championship**.\n${HR}\n\n` +
      formatLeaderboardRows(rows, true) +
      `\n\n${HR}\n_Top 3 at month-end earn exclusive titles and recognition!_`
    )
    .setTimestamp()
    .setFooter({ text: leaderboardFooter(rows.length, monthLabel) });

  return embed;
}

// ─── All-Time Leaderboard ─────────────────────────────────────────────────────

export async function buildAlltimeLeaderboardEmbed() {
  const members = await getTopMembersByPoints(10);

  const embed = new EmbedBuilder()
    .setColor(0xFFD700) // Gold
    .setTitle('🏆  All-Time Hall of Fame — Top 10')
    .setDescription(
      `> Cumulative all-time leaderboard of the most active members.\n${HR}\n\n` +
      formatLeaderboardRows(members, false) +
      `\n\n${HR}\n_Consistency is key — streaks and accuracy build lasting status!_`
    )
    .setTimestamp()
    .setFooter({ text: leaderboardFooter(members.length, 'All-Time Records') });

  return embed;
}

// ─── Monthly Winner Computation ───────────────────────────────────────────────

const REWARD_TITLES = {
  1: '🥇 Monthly Champion',
  2: '🥈 Monthly Runner-Up',
  3: '🥉 Monthly Third Place',
};

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
      logger.warn('Monthly reward already recorded or insert error', { monthYear, rank, error: err.message });
      saved.push({ ...w, rank });
    }
  }

  logger.info('Monthly winners computed', { monthYear, count: saved.length });
  return saved;
}

// ─── Monthly Winner Announcement Embed ───────────────────────────────────────

export function buildMonthlyWinnerAnnouncement(winners) {
  const monthLabel = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const lines = winners.map((w, idx) => {
    const medal = RANK_MEDALS[idx] || `**#${idx + 1}**`;
    const badge = levelBadge(w.level ?? 1);
    const userMention = w.discord_id ? `<@${w.discord_id}>` : `**${w.username}**`;
    return `${medal}  ${userMention}\n╰  **${w.total_points} Points** · ${w.total_xp || 0} XP · Lv ${w.level ?? 1} ${badge}`;
  });

  return new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle(`🎉  ${monthLabel} — Monthly Champions Crowned!`)
    .setDescription(
      `Congratulations to this month's highest achieving community members!\n${HR}\n\n` +
      lines.join('\n\n') +
      `\n\n${HR}\n*A brand new month has begun. Daily quizzes are your chance to reach next month's podium!*`
    )
    .setTimestamp()
    .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew  │  Monthly Recognition' });
}

// ─── Snapshot ─────────────────────────────────────────────────────────────────

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
