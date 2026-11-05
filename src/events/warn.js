/**
 * src/events/warn.js
 * Logs Discord client warnings.
 */

import { logger } from '../utils/logger.js';

export const name = 'warn';
export const once = false;

export function execute(message) {
  logger.warn('Discord client warning', { message });
}

