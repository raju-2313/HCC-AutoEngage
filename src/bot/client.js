/**
 * src/bot/client.js
 * Creates and configures the Discord.js Client with minimal required intents.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';

/**
 * Intents used (principle of least privilege):
 *   Guilds          – required for guild/channel cache and slash commands
 *   GuildMessages   – required to send messages in channels
 *
 * GuildMembers is a PRIVILEGED intent that must be explicitly enabled in the
 * Discord Developer Portal (Bot → Privileged Gateway Intents → Server Members Intent).
 * It is NOT needed for Phase 1 (slash commands only). It will be re-added in
 * Phase 6 when admin role lookups require it.
 *
 * MessageContent is intentionally NOT requested — the bot uses slash commands
 * exclusively and never reads raw message text.
 */
export function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMessageReactions,
      GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.Reaction],
    // Disable unnecessary caching to reduce memory footprint
    sweepers: {
      messages: { interval: 300, lifetime: 600 },
    },
    // Reject on invalid tokens immediately
    failIfNotExists: false,
  });
}

