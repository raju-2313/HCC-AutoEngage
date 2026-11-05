/**
 * src/bot/client.js
 * Creates and configures the Discord.js Client with minimal required intents.
 */

import { Client, GatewayIntentBits, Partials } from 'discord.js';

/**
 * Intents used (principle of least privilege):
 *   Guilds          – required for guild/channel cache and slash commands
 *   GuildMessages   – required to send messages in channels
 *   GuildMembers    – required to look up member roles (for admin checks)
 *
 * MessageContent intent is intentionally NOT requested because the bot
 * uses slash commands exclusively and never reads user message text.
 */
export function createClient() {
  return new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Channel],
    // Disable unnecessary caching to reduce memory footprint
    sweepers: {
      messages: { interval: 300, lifetime: 600 },
    },
    // Reject on invalid tokens immediately
    failIfNotExists: false,
  });
}
