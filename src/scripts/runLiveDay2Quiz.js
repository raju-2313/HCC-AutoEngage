/**
 * src/scripts/runLiveDay2Quiz.js
 * 
 * Manual trigger script to run Day 2 (C Programming Basics) live in #💬・general.
 * Sends the @everyone apology + start announcement, followed by all 10 curated questions
 * with the synchronized 15-second countdown timer and final podium wrap-up.
 */

import { Client, GatewayIntentBits } from 'discord.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { runDailyTimedSession } from '../services/quiz/dailyTimedSessionEngine.js';
import { handleQuizAnswerInteraction } from '../services/quiz/quizService.js';

async function main() {
  const targetChannelId = config.discord.channels.quiz || '1538470672722952303';
  const targetDateStr = '2026-11-10';

  logger.info('Initializing live Day 2 runner...', {
    targetChannelId,
    targetDateStr,
  });

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
    ],
  });

  // Attach button interaction handler so answers submitted during the live session are captured
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() && interaction.customId.startsWith('quiz_ans:')) {
      try {
        await handleQuizAnswerInteraction(interaction);
      } catch (err) {
        logger.warn('Button interaction error (may have been acknowledged already):', {
          error: err.message,
          customId: interaction.customId,
        });
      }
    }
  });

  await client.login(config.discord.token);
  logger.info(`Logged in as ${client.user.tag}. Starting live Day 2 quiz session...`);

  const apologyAnnouncement = `🔔 **@everyone — Apologies for the brief technical glitch! The HCC Daily Tech Challenge: Day 2 (C Programming Basics) is starting NOW! Get ready — Question 1 drops in 20 seconds!**`;

  const result = await runDailyTimedSession({
    client,
    channelId: targetChannelId,
    dateStr: targetDateStr,
    forceNewAnnouncement: true,
    customAnnouncementText: apologyAnnouncement,
    customCountdownSeconds: 20,
    customQuestionTimeSeconds: 15,
    customIntermissionSeconds: 6,
    suppressEveryonePing: false, // Ensure @everyone pings are delivered
  });

  logger.info('Live Day 2 quiz session completed with result:', result);

  // Allow 5 seconds for any trailing DB writes
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await client.destroy();
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal error details:', err.message, err.stack);
  logger.error('Fatal error in runLiveDay2Quiz script:', { error: err.message, stack: err.stack });
  process.exit(1);
});
