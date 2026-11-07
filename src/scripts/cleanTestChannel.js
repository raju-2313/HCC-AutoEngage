/**
 * src/scripts/cleanTestChannel.js
 * Fetches and deletes all messages sent by the bot in the TEST channel to leave it 100% clean.
 *
 * Target: 1567916304118063124 (autoengage-testing)
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL_ID = '1567916304118063124';

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Cleaning bot messages in test channel: ${TEST_CHANNEL_ID}…`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Channel ${TEST_CHANNEL_ID} not found or not text-based.`);
    }

    let totalDeleted = 0;
    let keepScanning = true;

    while (keepScanning) {
      // Fetch up to 100 messages at a time
      const fetched = await channel.messages.fetch({ limit: 100 });
      if (fetched.size === 0) {
        keepScanning = false;
        break;
      }

      // Filter messages sent by our bot
      const botMessages = fetched.filter((msg) => msg.author.id === client.user.id);

      if (botMessages.size === 0) {
        keepScanning = false;
        break;
      }

      console.log(`  🔍 Found ${botMessages.size} bot message(s) in batch of ${fetched.size}…`);

      // Try bulk delete first (for messages under 14 days old)
      try {
        const deleted = await channel.bulkDelete(botMessages, true);
        totalDeleted += deleted.size;
        console.log(`  🗑️ Bulk deleted ${deleted.size} message(s).`);

        // If bulkDelete couldn't delete some because they were older, delete individually
        if (deleted.size < botMessages.size) {
          const remaining = botMessages.filter((m) => !deleted.has(m.id));
          for (const msg of remaining.values()) {
            await msg.delete().catch(() => {});
            totalDeleted++;
            await new Promise((r) => setTimeout(r, 300));
          }
        }
      } catch (bulkErr) {
        // Fallback to individual deletion if bulk delete fails
        console.warn('  ⚠️ Bulk delete fallback to sequential delete:', bulkErr.message);
        for (const msg of botMessages.values()) {
          await msg.delete().catch(() => {});
          totalDeleted++;
          await new Promise((r) => setTimeout(r, 400));
        }
      }

      // Brief pause between fetch batches to prevent rate limits
      await new Promise((r) => setTimeout(r, 1000));
    }

    console.log(`\n✨ Channel cleanup complete! Deleted ${totalDeleted} bot message(s) from #${channel.name || 'test-channel'}.`);
  } catch (err) {
    console.error('❌ Error during channel cleanup:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);
