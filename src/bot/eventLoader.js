/**
 * src/bot/eventLoader.js
 * Dynamically discovers and registers all event handlers from src/events/.
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = join(__dirname, '..', 'events');

/**
 * Loads all event files and registers them on the Discord client.
 * Event modules export: name (string), once (boolean), execute (function).
 */
export async function loadEvents(client) {
  const files = readdirSync(EVENTS_DIR).filter((f) => f.endsWith('.js'));
  let count = 0;

  for (const file of files) {
    const filePath = join(EVENTS_DIR, file);
    const fileUrl  = pathToFileURL(filePath).href;

    try {
      const event = await import(fileUrl);

      if (!event.name || !event.execute) {
        logger.warn(`Event file missing "name" or "execute"`, { file });
        continue;
      }

      const handler = (...args) => event.execute(...args, client);

      if (event.once) {
        client.once(event.name, handler);
      } else {
        client.on(event.name, handler);
      }

      logger.debug(`Registered event handler`, { event: event.name, once: !!event.once });
      count++;
    } catch (err) {
      logger.error(`Failed to load event: ${file}`, { error: err.message });
    }
  }

  logger.info(`Event handlers registered`, { count });
}

