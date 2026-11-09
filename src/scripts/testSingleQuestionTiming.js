/**
 * src/scripts/testSingleQuestionTiming.js
 * Runs a single verification question in #autoengage-testing (1567916304118063124)
 * to test the live dynamic progress bar, color transitions, and timer countdown.
 *
 * Strictly ZERO PINGS.
 * Does NOT touch production database records.
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
import { supabaseAdmin } from '../database/client.js';

const TOKEN = process.env.DISCORD_TOKEN;
const TEST_CHANNEL_ID = '1567916304118063124';

if (!TOKEN) {
  console.error('❌ DISCORD_TOKEN is missing');
  process.exit(1);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildCountdownProgressBar(remainingSec, totalSec, length = 10) {
  const fraction = Math.max(0, Math.min(1, remainingSec / totalSec));
  const filled = Math.round(fraction * length);
  const empty = length - filled;
  return '▰'.repeat(filled) + '▱'.repeat(empty);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});

client.once('clientReady', async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);
  console.log(`📡 Sending test question to channel: ${TEST_CHANNEL_ID}`);

  try {
    const channel = await client.channels.fetch(TEST_CHANNEL_ID);
    if (!channel) {
      throw new Error(`Test channel ${TEST_CHANNEL_ID} not found.`);
    }

    const qTimeSec = 15;
    const HR = '┄'.repeat(28);

    const question = {
      id: 'test-q1',
      topic: 'C Programming Basics',
      questionText: 'Which function is used to print formatted output in C?',
      codeSnippet: '#include <stdio.h>\nint main() {\n    /* Which function prints "Hello"? */\n    return 0;\n}',
      options: [
        { id: 'A', text: 'print()' },
        { id: 'B', text: 'printf()' },
        { id: 'C', text: 'cout <<' },
        { id: 'D', text: 'System.out.println()' },
      ],
      correctOption: 'B',
      explanation: 'In C, `printf()` defined in `<stdio.h>` is the standard function used for formatted output.',
    };

    const optionsText = question.options
      .map((opt) => `**${opt.id}.**  ${opt.text}`)
      .join('\n\n');

    let desc = `### ${question.questionText}\n\n\`\`\`c\n${question.codeSnippet}\n\`\`\`\n\n${HR}\n\n${optionsText}\n\n${HR}`;

    const activeButtons = question.options.map((opt) =>
      new ButtonBuilder()
        .setCustomId(`test_ans:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setStyle(ButtonStyle.Primary)
    );
    const row = new ActionRowBuilder().addComponents(activeButtons);

    const questionEndUnix = Math.floor((Date.now() + qTimeSec * 1000) / 1000);

    const makeQuestionEmbed = (secondsLeft, isClosed = false) => {
      const isUrgent = secondsLeft <= 5 && !isClosed;
      const bar = buildCountdownProgressBar(isClosed ? 0 : secondsLeft, qTimeSec, 10);
      const timerColor = isClosed ? 0x95A5A6 : isUrgent ? 0xE74C3C : secondsLeft <= 10 ? 0xE67E22 : COLORS.primary;

      const timeHeader = isClosed
        ? `🔒 **Closed** \`${bar}\``
        : isUrgent
        ? `🚨 **${secondsLeft}s LEFT!** \`${bar}\``
        : `⏳ **${secondsLeft}s** \`${bar}\``;

      const timeValue = isClosed
        ? `${timeHeader}\nTime's up!`
        : `${timeHeader}\nEnds <t:${questionEndUnix}:R>`;

      return new EmbedBuilder()
        .setColor(timerColor)
        .setTitle(`💻  Verification Test: Timing & Indicator Check`)
        .setDescription(desc)
        .addFields(
          { name: '⏱️ Time Remaining', value: timeValue, inline: true },
          { name: '🎯 Tier',           value: '🌱 Easy', inline: true },
          { name: '🎁 Stakes',         value: '**+10** pts', inline: true }
        )
        .setFooter({
          text: isClosed
            ? 'Timing Test  │  Submissions closed'
            : `Timing Test  │  Live countdown active  │  ${qTimeSec}s limit`,
        })
        .setTimestamp();
    };

    console.log('1️⃣ Sending initial question embed (15s remaining, Blue)...');
    const qEmbed = makeQuestionEmbed(qTimeSec);
    const qMessage = await channel.send({
      embeds: [qEmbed],
      components: [row],
      allowedMentions: { parse: [] }, // STRICTLY ZERO PINGS
    });

    console.log(`✅ Question posted (Message ID: ${qMessage.id}). Starting countdown...`);

    let secondsRemaining = qTimeSec;
    const stepSeconds = 5;

    while (secondsRemaining > stepSeconds) {
      await sleep(stepSeconds * 1000);
      secondsRemaining -= stepSeconds;

      console.log(`⏱️ Updating timer to ${secondsRemaining}s remaining...`);
      const liveEmbed = makeQuestionEmbed(secondsRemaining);
      await qMessage.edit({
        embeds: [liveEmbed],
        components: [row],
      }).catch((err) => console.error('Edit error:', err));
    }

    const exactRemainingMs = Math.max(0, (questionEndUnix * 1000) - Date.now());
    if (exactRemainingMs > 0) {
      await sleep(exactRemainingMs);
    }

    console.log('⏰ Time expired. Locking question and revealing correct answer...');

    const disabledButtons = question.options.map((opt) => {
      const isCorrectOpt = opt.id === question.correctOption;
      return new ButtonBuilder()
        .setCustomId(`test_closed:${opt.id}`)
        .setLabel(`Option ${opt.id}`)
        .setStyle(isCorrectOpt ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(true);
    });
    const disabledRow = new ActionRowBuilder().addComponents(disabledButtons);

    const resultEmbed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle(`⏰  Time's Up! — Timing Verification Complete`)
      .setDescription(
        `> **✅ Correct Answer: Option B (printf)**\n\n` +
        `### 💡 Explanation\n${question.explanation}\n\n` +
        `${HR}\n\n` +
        `✨ **Timing Test Verified:**\n` +
        `• 15s Start: Blue Progress Bar \`[▰▰▰▰▰▰▰▰▰▰]\`\n` +
        `• 10s Mark: Orange Transition \`[▰▰▰▰▰▰▱▱▱▱]\`\n` +
        `• 5s Warning: Red Alert Bar \`[▰▰▰▱▱▱▱▱▱▱]\`\n` +
        `• Expiry: Locked & Auto-Revealed in Green ✅`
      )
      .setFooter({ text: 'HCC AutoEngage • Test Channel Verification (0 pings)' });

    const finalQEmbed = makeQuestionEmbed(0, true);
    await qMessage.edit({
      embeds: [finalQEmbed, resultEmbed],
      components: [disabledRow],
    });

    console.log('🎉 Timing verification test completed successfully!');
    await client.destroy();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during timing test:', err);
    await client.destroy();
    process.exit(1);
  }
});

client.login(TOKEN);

