/**
 * src/bot/commandLoader.js
 * Dynamically discovers and loads all command modules from src/commands/.
 */

import { Collection } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = join(__dirname, '..', 'commands');

/**
 * Loads all .js command files from the commands directory.
 * Returns a Collection<commandName, commandModule>.
 */
export async function loadCommands() {
  const commands = new Collection();
  const files = readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const filePath = join(COMMANDS_DIR, file);
    const fileUrl  = pathToFileURL(filePath).href;

    try {
      const module = await import(fileUrl);

      if (!module.data || !module.execute) {
        logger.warn(`Command file missing "data" or "execute" export`, { file });
        continue;
      }

      commands.set(module.data.name, module);
      logger.debug(`Loaded command: /${module.data.name}`, { file });
    } catch (err) {
      logger.error(`Failed to load command file: ${file}`, { error: err.message });
    }
  }

  logger.info(`Commands loaded`, { count: commands.size });
  return commands;
}
