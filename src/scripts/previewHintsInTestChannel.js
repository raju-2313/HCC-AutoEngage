/**
 * src/scripts/previewHintsInTestChannel.js
 * Sends a preview showcase of the "Whispers from the Mod" hints to the TEST channel
 * so the team can review how they look in Discord.
 *
 * Target: 1567916304118063124 (autoengage-testing)
 * Zero user/role mentions.
 */

import 'dotenv/config';
import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { VAGUE_LEADERBOARD_TIPS, getRandomLeaderboardTip } from '../utils/leaderboardTips.js';

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
  console.log(`📡 Sending hints preview to test channel: ${TEST_CHANNEL_ID}`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel) throw new Error(`Test channel ${TEST_CHANNEL_ID} not found`);

    const HR = '───────────────────────';

    // 1. Showcase Embed with all 10 hints
    const showcaseEmbed = new EmbedBuilder()
      .setColor(0x5865F2) // Discord Blurple
      .setTitle('💡  Whispers from the Mod — Complete Hints Catalog')
      .setDescription(
        `> Below are all **10 vague community hints** that rotate randomly at the end of daily quizzes, weekly roundups, and \`/leaderboard\` checks:\n${HR}\n\n` +
        VAGUE_LEADERBOARD_TIPS.map((tip, idx) => `**#${idx + 1}**  ${tip}`).join('\n\n') +
        `\n\n${HR}\n` +
        `-# 🎯 *These hints nudge members to chat, join voice study, maintain streaks, and help peers without revealing the exact math.*`
      )
      .setFooter({ text: 'HCC AutoEngage • Hints Showcase' })
      .setTimestamp();

    // 2. Simulated Quiz Results Wrap-up Embed showing how a random hint looks in real context
    const randomTip = getRandomLeaderboardTip();
    const quizWrapUpSampleEmbed = new EmbedBuilder()
      .setColor(0xFFD700) // Gold
      .setTitle('🏆  HCC Daily Tech Challenge: Python Basics — Complete!  (Sample Preview)')
      .setDescription(
        `## 🏁  **Day 1 of 7: Python Basics — Final Results**\n\n${HR}\n\n` +
        `### 🌟  **TODAY\'S WINNERS & PODIUM**  🌟\n` +
        `🥇 👑 **CHAMPION**: @Member1  —  **100 pts**  ·  10/10 correct (100% accuracy)\n` +
        `🥈 ⚡ **RUNNER-UP**: @Member2  —  **90 pts**  ·  9/10 correct (90% accuracy)\n` +
        `🥉 🌟 **3RD PLACE**: @Member3  —  **80 pts**  ·  8/10 correct (80% accuracy)\n\n${HR}\n\n` +
        `🎉  Huge shoutout to all participants for testing your skills today!\n` +
        `⚡  **Rewards:** All points, XP, and daily streaks have been locked into your profile.\n\n` +
        `💡  **Whispers from the Mod:**\n` +
        `> ${randomTip}\n\n` +
        `> _Check your overall rank anytime with \`/leaderboard\` and inspect your badges with \`/profile\`!_`
      )
      .setFooter({ text: 'HCC AutoEngage • Day 1/7 Complete' })
      .setTimestamp();

    await channel.send({
      embeds: [showcaseEmbed, quizWrapUpSampleEmbed],
      allowedMentions: { parse: [] }, // ZERO PINGS
    });

    console.log('✅ Hints showcase sent successfully to test channel!');
  } catch (err) {
    console.error('❌ Error sending hints preview:', err.message);
  } finally {
    client.destroy();
    process.exit(0);
  }
});

client.login(TOKEN);

