/**
 * src/scripts/deployCommands.js
 * Registers (or updates) slash commands with Discord's API.
 *
 * Run once manually after adding / editing commands:
 *   node src/scripts/deployCommands.js
 *
 * Guild-scoped registration (DISCORD_GUILD_ID set) → updates appear instantly.
 * Global registration (comment out guildId) → takes up to 1 hour to propagate.
 */

import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { logger } from '../utils/logger.js';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const CMDS_DIR   = join(__dirname, '..', 'commands');

const TOKEN     = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID  = process.env.DISCORD_GUILD_ID;

if (!TOKEN || TOKEN.startsWith('your_'))     { console.error('DISCORD_TOKEN is not set.'); process.exit(1); }
if (!CLIENT_ID || CLIENT_ID.startsWith('your_')) { console.error('DISCORD_CLIENT_ID is not set.'); process.exit(1); }
if (!GUILD_ID || GUILD_ID.startsWith('your_'))   { console.error('DISCORD_GUILD_ID is not set.'); process.exit(1); }

async function deploy() {
  const commandData = [];
  const files = readdirSync(CMDS_DIR).filter((f) => f.endsWith('.js'));

  for (const file of files) {
    const url = pathToFileURL(join(CMDS_DIR, file)).href;
    const mod  = await import(url);
    if (mod.data) {
      commandData.push(mod.data.toJSON());
      logger.info(`Collected command for deployment`, { name: mod.data.name });
    }
  }

  const rest = new REST({ version: '10' }).setToken(TOKEN);

  logger.info(`Deploying ${commandData.length} command(s) to guild`, { guildId: GUILD_ID });

  const result = await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commandData }
  );

  logger.info(`Successfully registered commands`, { count: result.length });
}

deploy().catch((err) => {
  logger.error('Command deployment failed', { error: err.message });
  process.exit(1);
});

