/**
 * src/scripts/runGeneralChannelTest.js
 * Executes a silent diagnostic check in the general channel.
 *
 * Guarantees:
 *   - ZERO mentions/pings (allowedMentions: { parse: [] })
 *   - No questions or quiz data
 *   - Auto-deletes itself in 10 seconds
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { runChannelSelfTestJob } from '../services/automation/scheduler.js';

const TOKEN = process.env.DISCORD_TOKEN;
const GENERAL_CHANNEL_ID = process.env.DISCORD_QUIZ_CHANNEL_ID || '1538470672722952303';

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Sending silent self-test to general channel: ${GENERAL_CHANNEL_ID}`);
  console.log(`⏱️ Auto-delete window: 10 seconds | Zero mentions`);

  const result = await runChannelSelfTestJob(client, {
    channelId: GENERAL_CHANNEL_ID,
    autoDeleteSeconds: 10,
  });

  if (result.success) {
    console.log(`✅ Message posted (ID: ${result.messageId}). Waiting 10s for auto-deletion…`);
    setTimeout(() => {
      console.log('🗑️ Auto-delete timer elapsed. Cleaning up.');
      client.destroy();
      process.exit(0);
    }, 11_000);
  } else {
    console.error('❌ Test failed:', result.error || result.reason);
    client.destroy();
    process.exit(1);
  }
});

client.login(TOKEN);
