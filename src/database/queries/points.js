/**
 * src/database/queries/points.js
 * Database operations for points_history table.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Appends an entry to the immutable points history ledger.
 */
export async function logPointsHistory({
  memberId,
  discordId,
  amount,
  xpAmount = 0,
  reason,
  referenceId = null,
  awardedBy = 'system',
}) {
  const { data, error } = await supabaseAdmin
    .from('points_history')
    .insert({
      member_id: memberId,
      discord_id: discordId,
      amount,
      xp_amount: xpAmount,
      reason,
      reference_id: referenceId,
      awarded_by: awardedBy,
    })
    .select()
    .single();

  if (error) {
    logger.error('Error logging points history', { discordId, amount, reason, error: error.message });
    throw error;
  }
  return data;
}

/**
 * Retrieves recent points transactions for a user.
 */
export async function getMemberPointsHistory(discordId, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from('points_history')
    .select('*')
    .eq('discord_id', discordId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    logger.error('Error fetching member points history', { discordId, error: error.message });
    throw error;
  }
  return data || [];
}

