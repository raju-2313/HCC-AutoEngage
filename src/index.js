/**
 * src/index.js
 * HCC AutoEngage – Main entry point.
 *
 * Boot sequence:
 *   1. Load & validate config
 *   2. Create Discord client
 *   3. Load event handlers
 *   4. Load slash commands into client.commands
 *   5. Log in to Discord Gateway
 *   6. Register graceful-shutdown hooks
 */

import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { createClient } from './bot/client.js';
import { loadEvents } from './bot/eventLoader.js';
import { loadCommands } from './bot/commandLoader.js';
import { testDatabaseConnection } from './database/client.js';

async function main() {
  logger.info('═══════════════════════════════════════════');
  logger.info('  HCC AutoEngage – Starting up…');
  logger.info(`  Environment : ${config.app.env}`);
  logger.info(`  Timezone    : ${config.app.timezone}`);
  logger.info('═══════════════════════════════════════════');

  // Verify Supabase Database Connection
  logger.info('Checking Supabase connection…');
  const dbStatus = await testDatabaseConnection();
  if (dbStatus.ok) {
    logger.info('Supabase database connection verified ✅');
  } else {
    logger.warn('Supabase database check:', {
      code: dbStatus.code,
      message: dbStatus.message,
    });
  }

  // Create Discord client
  const client = createClient();

  // Attach the commands collection to the client so event handlers can access it
  client.commands = await loadCommands();

  // Register event listeners
  await loadEvents(client);

  // Connect to Discord Gateway
  logger.info('Connecting to Discord Gateway…');
  await client.login(config.discord.token);

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal} – shutting down gracefully…`);
    client.destroy();
    logger.info('Discord client disconnected. Goodbye!');
    process.exit(0);
  };

  process.on('SIGINT',  () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Prevent unhandled rejections from crashing the process silently
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });

  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
    // Give the logger a tick to flush, then exit
    setTimeout(() => process.exit(1), 500);
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

