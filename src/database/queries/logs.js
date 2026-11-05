/**
 * src/database/queries/logs.js
 * Database operations for activity_logs table.
 */

import { supabaseAdmin } from '../client.js';
import { logger } from '../../utils/logger.js';

/**
 * Logs an administrative or automated system event in activity_logs.
 */
export async function logActivity(actionType, actorDiscordId = 'system', details = {}) {
  try {
    const { data, error } = await supabaseAdmin
      .from('activity_logs')
      .insert({
        action_type: actionType,
        actor_discord_id: actorDiscordId,
        details,
      })
      .select()
      .single();

    if (error) {
      logger.warn('Failed to insert activity log', { actionType, error: error.message });
      return null;
    }
    return data;
  } catch (err) {
    logger.warn('Exception during activity log write', { actionType, error: err.message });
    return null;
  }
}
