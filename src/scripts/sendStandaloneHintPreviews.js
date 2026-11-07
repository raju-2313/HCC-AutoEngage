/**
 * src/scripts/sendStandaloneHintPreviews.js
 * Sends 3 distinct standalone "Whispers from the Mod" cards to the TEST channel.
 * Target: 1567916304118063124
 */

import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { VAGUE_LEADERBOARD_TIPS, buildStandaloneHintEmbed } from '../utils/leaderboardTips.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL_ID = '1567916304118063124';

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Sending 3 standalone hint preview cards to: ${TEST_CHANNEL_ID}`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel) throw new Error(`Test channel ${TEST_CHANNEL_ID} not found`);

    // Pick 3 diverse hints from the pool
    const selectedHints = [
      VAGUE_LEADERBOARD_TIPS[0], // Chat discussions hint
      VAGUE_LEADERBOARD_TIPS[1], // Voice study sessions hint
      VAGUE_LEADERBOARD_TIPS[2], // Multi-category synergy hint
    ];

    for (let i = 0; i < selectedHints.length; i++) {
      const embed = buildStandaloneHintEmbed(selectedHints[i]);
      await channel.send({
        embeds: [embed],
        allowedMentions: { parse: [] }, // Never ping
      });
      console.log(`  ✅ Sent standalone hint preview #${i + 1}`);
      await new Promise((r) => setTimeout(r, 1200)); // Brief pause between sends
    }

    console.log('\n🎉 All 3 preview hint cards sent successfully!');
  } catch (err) {
    console.error('❌ Error sending hint previews:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

