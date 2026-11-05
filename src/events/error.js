/**
 * src/events/error.js
 * Handles Discord client-level errors to prevent crashes.
 */

import { logger } from '../utils/logger.js';

export const name = 'error';
export const once = false;

export function execute(error) {
  logger.error('Discord client error', { message: error.message, stack: error.stack });
}
