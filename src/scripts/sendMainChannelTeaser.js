/**
 * src/scripts/sendMainChannelTeaser.js
 * Sends the polished, high-production curiosity teaser to the MAIN channel (1538470672722952303).
 *
 * Guarantees:
 *   - Strictly ZERO pings (allowedMentions: { parse: [] })
 *   - Dynamic Discord relative timestamp <t:...:R> for Monday 09:00 AM IST
 *   - High-contrast visual typography
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';

const TOKEN = process.env.DISCORD_TOKEN;
const MAIN_CHANNEL_ID = process.env.DISCORD_QUIZ_CHANNEL_ID || '1538470672722952303';

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Sending official curiosity teaser to MAIN channel: ${MAIN_CHANNEL_ID}`);

  try {
    const channel = await client.channels.fetch(MAIN_CHANNEL_ID);
    if (!channel) throw new Error(`Main channel ${MAIN_CHANNEL_ID} not accessible.`);

    const HR = '───────────────────────';

    // Monday, Nov 9, 2026 @ 09:00:00 AM IST = 03:30:00 AM UTC
    const launchDate = new Date('2026-11-09T03:30:00Z');
    const launchUnix = Math.floor(launchDate.getTime() / 1000);

    const teaserEmbed = new EmbedBuilder()
      .setColor(0x8E44AD) // Mystic Royal Amethyst
      .setAuthor({
        name: 'HackerRank Campus Crew • Community Dispatch',
        iconURL: 'https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f575-fe0f.png',
      })
      .setTitle('👁️  Transmission from the Moderation Shadows')
      .setThumbnail('https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/231b.png')
      .setDescription(
        `> *"Rumor has it this channel won't be quiet much longer..."*\n${HR}\n\n` +
        `### ⚡  **The HCC 7-Day Sprint Is Activating**\n\n` +
        `Starting **Monday at 09:00 AM IST**, an automated engine begins tracking community participation right here:\n\n` +
        `🧠  **Rapid-Fire Quizzes**  ·  *10 daily challenges · 15s per question*\n` +
        `💬  **Technical Discussions**  ·  *Active code discussions & peer debugging*\n` +
        `🎙️  **Voice Study Rooms**  ·  *Real-time collaborative study sessions*\n` +
        `🔥  **Daily Streaks**  ·  *Compounding consistency multipliers on your profile*\n\n` +
        `${HR}\n\n` +
        `> 🏆  **Day 1 (Python Basics) drops <t:${launchUnix}:R>.**\n` +
        `> *XP, points, and weekly championship honors are on the line.*\n\n` +
        `_Keep your notifications ready. See you on the podium._ 🎯`
      )
      .addFields(
        { name: '⏳ Launch Time', value: `<t:${launchUnix}:F>\n(<t:${launchUnix}:R>)`, inline: true },
        { name: '📚 Day 1 Topic',  value: '🐍 **Python Basics**', inline: true },
        { name: '⏱️ Format',       value: '**10 Qs · 15s / Q**', inline: true }
      )
      .setFooter({ text: 'HCC AutoEngage • HackerRank Campus Crew  │  Standby Mode' })
      .setTimestamp();

    const sentMessage = await channel.send({
      embeds: [teaserEmbed],
      allowedMentions: { parse: [] }, // STRICTLY ZERO PINGS
    });

    console.log(`\n🎉 Official curiosity teaser published to #${channel.name || 'main'} (ID: ${sentMessage.id})!`);
  } catch (err) {
    console.error('❌ Error publishing teaser:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

