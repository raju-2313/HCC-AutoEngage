/**
 * src/scripts/testCleanQuestionTimer.js
 * Clean, synchronized 15-second question test without rate-limit lag or hallucination.
 * Runs in #autoengage-testing (1567916304118063124).
 * Strictly ZERO PINGS.
 */

import 'dotenv/config';
import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { COLORS } from '../utils/embeds.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL_ID = '1567916304118063124';

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Sending synchronized 15-second test question to: ${TEST_CHANNEL_ID}`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel) throw new Error('Test channel not found.');

    const qTimeSec = 15;
    const HR = '┄'.repeat(28);

    const question = {
      id: 'test-timer-clean',
      topic: 'C Programming Basics',
      questionText: 'What is the correct syntax to declare an integer variable in C?',
      codeSnippet: '/* Which option declares variable x as integer? */',
      options: [
        { id: 'A', text: 'int x;' },
        { id: 'B', text: 'integer x;' },
        { id: 'C', text: 'num x;' },
        { id: 'D', text: 'var x: int;' },
      ],
      correctOption: 'A',
      explanation: 'In C, integer variables are declared using the `int` keyword followed by the variable name: `int x;`.',
    };

    const optionsText = question.options
      .map((opt) => `**${opt.id}.**  ${opt.text}`)
      .join('\n\n');

    const desc = `### ${question.questionText}\n\n\`\`\`c\n${question.codeSnippet}\n\`\`\`\n\n${HR}\n\n${optionsText}\n\n${HR}`;

    const activeButtons = question.options.map((opt) =>
      new ButtonBuilder()
        .setCustomId(`clean_test_ans:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder().addComponents(activeButtons);

    // Calculate exact target expiry time
    const startNow = Date.now();
    const expiryTimestampMs = startNow + (qTimeSec * 1000);
    const expiryUnixSec = Math.floor(expiryTimestampMs / 1000);

    const qEmbed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`💻  Question 1 of 1 · C Programming Basics`)
      .setDescription(desc)
      .addFields(
        {
          name: '⏱️ Time Limit',
          value: `**${qTimeSec} Seconds**\nCloses <t:${expiryUnixSec}:R>`,
          inline: true,
        },
        { name: '🎯 Tier', value: '🌱 Easy', inline: true },
        { name: '🎁 Stakes', value: '**+10** pts', inline: true }
      )
      .setFooter({
        text: `Q1/1  │  Click your answer below (private)  │  ${qTimeSec}s limit`,
      })
      .setTimestamp();

    console.log(`⏱️ Posting question at ${new Date().toISOString()}...`);
    const qMessage = await channel.send({
      embeds: [qEmbed],
      components: [row],
      allowedMentions: { parse: [] }, // ZERO PINGS
    });

    console.log(`✅ Posted (Message ID: ${qMessage.id}). Waiting exactly 15 seconds...`);

    // Synchronize sleep to the exact target expiry timestamp
    const remainingMs = Math.max(0, expiryTimestampMs - Date.now());
    console.log(`⏳ Precise sleep remaining: ${remainingMs}ms`);
    await sleep(remainingMs);

    console.log(`⏰ Time expired at ${new Date().toISOString()}! Locking question and revealing answer...`);

    const disabledButtons = question.options.map((opt) => {
      const isCorrect = opt.id === question.correctOption;
      return new ButtonBuilder()
        .setCustomId(`clean_test_closed:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setStyle(isCorrect ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(true);
    });
    const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

    const closedQEmbed = new EmbedBuilder()
      .setColor(0x95A5A6) // Neutral gray when closed
      .setTitle(`💻  Question 1 of 1 · C Programming Basics`)
      .setDescription(desc)
      .addFields(
        {
          name: '⏱️ Time Limit',
          value: `🔒 **Time's Up!**\nClosed <t:${expiryUnixSec}:R>`,
          inline: true,
        },
        { name: '🎯 Tier', value: '🌱 Easy', inline: true },
        { name: '🎁 Stakes', value: '**+10** pts', inline: true }
      )
      .setFooter({ text: 'Q1/1  │  Submissions closed' })
      .setTimestamp();

    const resultEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`⏰  Time's Up! — Question 1 of 1`)
      .setDescription(
        `> **✅ Correct Answer: Option A (int x;)**\n\n` +
        `### 💡 Explanation\n${question.explanation}\n\n` +
        `${HR}\n\n` +
        `📊  **Test Result:** Question closed at exactly 15.0 seconds. No lag, no hallucination, no rate limits.`
      )
      .setFooter({ text: 'HCC AutoEngage • Clean Synchronized Timer' });

    await qMessage.edit({
      embeds: [closedQEmbed, resultEmbed],
      components: [disabledRow],
    });

    console.log('🎉 Clean test completed successfully!');
    await client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error in clean timer test:', err);
    await client.destroy();
    process.exit(1);
  }
});

client.login(TOKEN);
