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
 */
export async function updateMemberPoints(discordId, pointsDelta = 0, xpDelta = 0) {
  // First ensure member exists
  const member = await getMemberByDiscordId(discordId);
  if (!member) {
    throw new Error(`Member with discord_id ${discordId} not found.`);
  }

  const updatedPoints = Math.max(0, (member.total_points || 0) + pointsDelta);
  const updatedXp = Math.max(0, (member.total_xp || 0) + xpDelta);
  // Level curve: Level = 1 + floor(sqrt(XP / 50))
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

/**
 * Updates a member's daily activity streak.
 */
export async function updateMemberStreak(discordId, streakIncrement = true) {
  const member = await getMemberByDiscordId(discordId);
  if (!member) return null;

  const newStreak = streakIncrement ? (member.streak_current || 0) + 1 : 1;
  const newMaxStreak = Math.max(member.streak_max || 0, newStreak);

  const { data, error } = await supabaseAdmin
    .from('members')
    .update({
      streak_current: newStreak,
      streak_max: newMaxStreak,
      last_active_at: new Date().toISOString(),
    })
    .eq('discord_id', discordId)
    .select()
    .single();

  if (error) {
    logger.error('Error updating member streak', { discordId, error: error.message });
    throw error;
  }
  return data;
}
