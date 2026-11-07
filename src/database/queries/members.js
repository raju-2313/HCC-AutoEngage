/**
 * src/database/queries/members.js
 * Database operations for members table.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Fetches a member by their Discord ID.
 */
export async function getMemberByDiscordId(discordId) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .select('*')
    .eq('discord_id', discordId)
    .maybeSingle();

  if (error) {
    logger.error('Error fetching member by discord_id', { discordId, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Creates or updates a member's core Discord profile information.
 */
export async function upsertMember({ discordId, username, discriminator = '0', avatarUrl = null }) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .upsert(
      {
        discord_id: discordId,
        username,
        discriminator,
        avatar_url: avatarUrl,
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'discord_id' }
    )
    .select()
    .single();

  if (error) {
    logger.error('Error upserting member', { discordId, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Updates a member's XP and points with atomic increment logic.
 * Uses record_points_transaction RPC for row-locked ACID updates when available.
 */
export async function updateMemberPoints(
  discordId,
  pointsDelta = 0,
  xpDelta = 0,
  reason = 'points_update',
  referenceId = null,
  awardedBy = 'system'
) {
  // 1. Try atomic PostgreSQL transaction procedure
  const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('record_points_transaction', {
    p_discord_id: discordId,
    p_points_delta: pointsDelta,
    p_xp_delta: xpDelta,
    p_reason: reason,
    p_reference_id: referenceId,
    p_awarded_by: awardedBy,
  });

  if (!rpcError && rpcData && rpcData.length > 0) {
    return rpcData[0];
  }

  // 2. Direct fallback
  const member = await getMemberByDiscordId(discordId);
  if (!member) {
    throw new Error(`Member with discord_id ${discordId} not found.`);
  }

  const updatedPoints = Math.max(0, (member.total_points || 0) + pointsDelta);
  const updatedXp = Math.max(0, (member.total_xp || 0) + xpDelta);
  const newLevel = 1 + Math.floor(Math.sqrt(updatedXp / 50));

  const { data, error } = await supabaseAdmin
    .from('members')
    .update({
      total_points: updatedPoints,
      total_xp: updatedXp,
      level: newLevel,
      last_active_at: new Date().toISOString(),
    })
    .eq('discord_id', discordId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating member points', { discordId, error: error.message });
    throw error;
  }
  return data;
}

export function getKolkataDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Records daily active participation and calculates calendar-based consecutive streak.
 * Ensures a member can only increment streak once per calendar day (Asia/Kolkata).
 * Active participation includes:
 *   - Daily login & slash commands
 *   - Quiz answering
 *   - Sending chat messages in channels
 *   - Adding emoji reactions
 *   - Joining voice study sessions
 */
export async function recordDailyParticipation(discordId, activityType = 'general_activity') {
  // Try atomic PostgreSQL procedure first
  try {
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('update_member_streak_atomic', {
      p_discord_id: discordId,
    });
    if (!rpcErr && rpcData && rpcData.length > 0) {
      return rpcData[0];
    }
  } catch {
    // Fallback to JS logic below
  }

  const member = await getMemberByDiscordId(discordId);
  if (!member) return null;

  const now = new Date();
  const todayStr = getKolkataDateString(now);

  const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getKolkataDateString(yesterdayDate);

  let lastActiveStr = null;
  if (member.last_active_at) {
    lastActiveStr = getKolkataDateString(new Date(member.last_active_at));
  }

  let newStreak = member.streak_current || 0;
  let incremented = false;

  if (lastActiveStr === todayStr) {
    // Already active today; streak stays unchanged, but guaranteed at least 1
    newStreak = Math.max(1, member.streak_current || 1);
    incremented = false;
  } else if (lastActiveStr === yesterdayStr) {
    // Consecutive day participation!
    newStreak = (member.streak_current || 0) + 1;
    incremented = true;
  } else {
    // First time or missed more than 1 day
    newStreak = 1;
    incremented = (member.streak_current === 0);
  }

  const newMaxStreak = Math.max(member.streak_max || 0, newStreak);

  const { data, error } = await supabaseAdmin
    .from('members')
    .update({
      streak_current: newStreak,
      streak_max: newMaxStreak,
      last_active_at: now.toISOString(),
    })
    .eq('discord_id', discordId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating member daily participation streak', { discordId, error: error.message });
    return member;
  }

  logger.debug('Daily participation streak updated', {
    user: member.username,
    activityType,
    streak: newStreak,
    incremented,
  });

  return data;
}

/**
 * Updates a member's daily activity streak.
 */
export async function updateMemberStreak(discordId, streakIncrement = true) {
  return recordDailyParticipation(discordId, 'manual_streak_update');
}

/**
 * Resets streaks for members whose last activity was more than cutoffHours ago.
 */
export async function resetInactiveStreaks(cutoffHours = 48) {
  const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabaseAdmin
    .from('members')
    .update({ streak_current: 0 })
    .gt('streak_current', 0)
    .lt('last_active_at', cutoff)
    .select('id, discord_id, username, streak_max');

  if (error) {
    logger.error('Error resetting inactive streaks', { error: error.message });
    throw error;
  }
  return data || [];
}

/**
 * Explicitly resets a specific member's streak.
 */
export async function resetMemberStreak(discordId) {
  const { data, error } = await supabaseAdmin
    .from('members')
    .update({ streak_current: 0 })
    .eq('discord_id', discordId)
    .select()
    .single();

  if (error) {
    logger.error('Error resetting member streak', { discordId, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Fetches server-wide aggregate stats (total members, total points, total XP, quizzes completed).
 */
export async function getServerMemberStats() {
  const { data: members, error: mError } = await supabaseAdmin
    .from('members')
    .select('id, total_points, total_xp, quizzes_completed, streak_current');

  if (mError) {
    logger.error('Error fetching server member stats', { error: mError.message });
    throw mError;
  }

  const { count: quizCount, error: qError } = await supabaseAdmin
    .from('quizzes')
    .select('id', { count: 'exact', head: true });

  const { count: attemptCount, error: aError } = await supabaseAdmin
    .from('quiz_attempts')
    .select('id', { count: 'exact', head: true });

  const totalMembers = members?.length || 0;
  const totalPoints = members?.reduce((sum, m) => sum + (m.total_points || 0), 0) || 0;
  const totalXP = members?.reduce((sum, m) => sum + (m.total_xp || 0), 0) || 0;
  const activeStreaks = members?.filter((m) => (m.streak_current || 0) > 0).length || 0;

  return {
    totalMembers,
    totalPoints,
    totalXP,
    activeStreaks,
    totalQuizzes: quizCount || 0,
    totalAttempts: attemptCount || 0,
  };
}

