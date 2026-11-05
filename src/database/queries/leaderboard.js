/**
 * src/database/queries/leaderboard.js
 * Database operations for leaderboards and monthly rewards.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Retrieves top members ordered by total points.
 */
export async function getTopMembersByPoints(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select('id, discord_id, username, total_points, total_xp, level, quizzes_completed, streak_current')
    .order('total_points', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching top members by points', { error: error.message });
    throw error;
  }
  return data || [];
}

/**
 * Retrieves top members ordered by XP.
 */
export async function getTopMembersByXP(limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select('id, discord_id, username, total_points, total_xp, level, quizzes_completed, streak_current')
    .order('total_xp', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching top members by XP', { error: error.message });
    throw error;
  }
  return data || [];
}

/**
 * Records a snapshot of current standings for a given period (e.g., 'weekly', '2026-W45').
 */
export async function saveLeaderboardSnapshot({ periodType, periodIdentifier, entries }) {
  const rows = entries.map((entry, index) => ({
    period_type: periodType,
    period_identifier: periodIdentifier,
    rank: index + 1,
    member_id: entry.id,
    discord_id: entry.discord_id,
    username: entry.username,
    points: entry.total_points,
    xp: entry.total_xp,
  }));

  const { data, error } = await supabaseAdmin
    .from('leaderboard_snapshots')
    .insert(rows)
    .select();

  if (error) {
    logger.error('Error saving leaderboard snapshot', { periodType, periodIdentifier, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Records a monthly winner in monthly_rewards.
 */
export async function recordMonthlyReward({ monthYear, memberId, discordId, rank, rewardTitle, rewardDetails = null }) {
  const { data, error } = await supabaseAdmin
    .from('monthly_rewards')
    .insert({
      month_year: monthYear,
      member_id: memberId,
      discord_id: discordId,
      rank,
      reward_title: rewardTitle,
      reward_details: rewardDetails,
      announced: false,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error recording monthly reward', { monthYear, discordId, rank, error: error.message });
    throw error;
  }
  return data;
}

