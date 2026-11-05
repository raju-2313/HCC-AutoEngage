/**
 * src/events/voiceStateUpdate.js
 * Listens for Discord voice channel joins, leaves, and transitions.
 */

import { handleVoiceStateChange } from '../services/voice/voiceService.js';
import { logger } from '../utils/logger.js';

export const name = 'voiceStateUpdate';
export const once = false;

export async function execute(oldState, newState) {
  try {
    await handleVoiceStateChange(oldState, newState);
  } catch (err) {
    logger.debug('Error in voiceStateUpdate event handler', { error: err.message });
  }
}

