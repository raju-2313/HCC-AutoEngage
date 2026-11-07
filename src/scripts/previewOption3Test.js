/**
 * src/scripts/previewOption3Test.js
 * Sends Option 3 teaser embed to the TEST channel (1567916304118063124)
 * with ZERO pings, then automatically deletes it after 10 seconds.
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL_ID = '1567916304118063124'; // autoengage-testing

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Sending Option 3 preview to test channel: ${TEST_CHANNEL_ID}`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel) throw new Error(`Channel ${TEST_CHANNEL_ID} not found`);

    const HR = '───────────────────────';

    const teaserEmbed = new EmbedBuilder()
      .setColor(0x8E44AD) // Mystic Royal Violet
      .setAuthor({
        name: 'Whispers from the Mod  🤫',
        iconURL: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f575-fe0f.png',
      })
      .setTitle('👁️  Transmission from the Moderation Shadows')
      .setDescription(
        `> Rumor has it this channel won't be quiet much longer.\n${HR}\n\n` +
        `Starting **Monday at 09:00 AM IST**, every interaction is being tracked:\n\n` +
        `⚡  **Rapid Daily Quizzes** — 10 questions, 15 seconds on the clock\n` +
        `💬  **Channel Discussions** — thoughtful answers & active debug help\n` +
        `🎙️  **Voice Study Rooms** — real-time collaborative learning\n` +
        `🔥  **Daily Streaks** — consistency that compounds on your profile\n\n` +
        `${HR}\n\n` +
        `> *The new community engine wakes up in less than 31 hours.*\n` +
        `> **Keep your eyes on this space.** 🎯`
      )
      .setFooter({ text: 'HCC AutoEngage • Preview Mode • Auto-deleting in 10s' })
      .setTimestamp();

    const msg = await channel.send({
      embeds: [teaserEmbed],
      allowedMentions: { parse: [] }, // STRICT ZERO MENTIONS
    });

    console.log(`📨 Preview message sent (ID: ${msg.id}). Auto-deleting in 10 seconds…`);

    setTimeout(async () => {
      await msg.delete().catch(() => {});
      console.log('🗑️ Preview message auto-deleted successfully.');
      client.destroy();
      process.exit(0);
    }, 10_000);

  } catch (err) {
    console.error('❌ Error sending preview:', err.message);
    client.destroy();
    process.exit(1);
  }
});

client.login(TOKEN);

