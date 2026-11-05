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
import { startHealthServer } from './server/healthServer.js';

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

  // Shard & Gateway connectivity monitoring
  client.rest.on('rateLimited', (info) => {
    logger.warn('Discord API rate limited', {
      timeToReset: info.timeToReset,
      limit: info.limit,
      method: info.method,
      url: info.url,
      global: info.global,
    });
  });

  client.on('shardError', (error, shardId) => {
    logger.error(`Discord Shard ${shardId} encountered an error`, { error: error.message });
  });

  client.on('shardDisconnect', (event, shardId) => {
    logger.warn(`Discord Shard ${shardId} disconnected`, { code: event.code, reason: event.reason });
  });

  client.on('shardReconnecting', (shardId) => {
    logger.info(`Discord Shard ${shardId} reconnecting…`);
  });

  client.on('shardResume', (shardId, replayedEvents) => {
    logger.info(`Discord Shard ${shardId} resumed connection`, { replayedEvents });
  });

  // Start Production Health Check HTTP Server immediately (port 8080 or PORT env)
  const healthServer = startHealthServer(client);

  // Connect to Discord Gateway
  const cleanToken = (config.discord.token || '').trim().replace(/^["']|["']$/g, '');
  logger.info(`Connecting to Discord Gateway (token length: ${cleanToken.length})…`);

  try {
    await client.login(cleanToken);
    logger.info('Discord Gateway login call returned — awaiting READY event…');
  } catch (err) {
    logger.error('Discord Gateway authentication error', {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1); // Force restart on bad token
  }

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`Received ${signal} – shutting down gracefully…`);
    healthServer.close();
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
    logger.error('Uncaught exception intercepted', { error: err.message, stack: err.stack });
    // Keep process alive for non-fatal errors; exit only if fatal memory corruption
    if (err.message && err.message.includes('out of memory')) {
      setTimeout(() => process.exit(1), 500);
    }
  });
}

main().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

